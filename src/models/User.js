const { pool } = require('../../config/database');

const User = {
    /**
     * Recherche un utilisateur par matricule OU email (pour le login),
     * avec les informations de rôle jointes.
     */
    async findByLoginIdentifier(identifier) {
        const [rows] = await pool.query(
            `SELECT u.*, r.code AS role_code, r.nom AS role_nom, r.service_id
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.matricule = ? OR u.email = ?
             LIMIT 1`,
            [identifier, identifier]
        );
        return rows[0] || null;
    },

    async findById(id) {
        const [rows] = await pool.query(
            `SELECT u.*, r.code AS role_code, r.nom AS role_nom, r.service_id
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.id = ?
             LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },

    async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        return rows[0] || null;
    },

    async findAll({ limit = 50, offset = 0 } = {}) {
        const [rows] = await pool.query(
            `SELECT u.id, u.matricule, u.nom, u.prenom, u.email, u.telephone, u.grade,
                    u.statut, u.last_login_at, u.created_at,
                    r.code AS role_code, r.nom AS role_nom,
                    s.code AS service_code, s.nom AS service_nom,
                    c.nom AS commissariat_nom, b.nom AS brigade_nom
             FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN services s ON s.id = r.service_id
             LEFT JOIN commissariats c ON c.id = u.commissariat_id
             LEFT JOIN brigades b ON b.id = u.brigade_id
             ORDER BY u.created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return rows;
    },

    async count() {
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM users');
        return rows[0].total;
    },

    async create(data) {
        const {
            matricule, nom, prenom, email, telephone, password_hash, role_id, grade,
            photo_url, commissariat_id, brigade_id, parquet_id, tribunal_id, prison_id,
            ministere_id, created_by,
        } = data;

        const [result] = await pool.query(
            `INSERT INTO users
                (matricule, nom, prenom, email, telephone, password_hash, role_id, grade,
                 photo_url, commissariat_id, brigade_id, parquet_id, tribunal_id, prison_id,
                 ministere_id, created_by, must_change_password)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [
                matricule, nom, prenom, email, telephone || null, password_hash, role_id, grade || null,
                photo_url || null, commissariat_id || null, brigade_id || null, parquet_id || null,
                tribunal_id || null, prison_id || null, ministere_id || null, created_by || null,
            ]
        );
        return result.insertId;
    },

    async update(id, data) {
        const fields = [];
        const values = [];
        const allowedFields = [
            'nom', 'prenom', 'email', 'telephone', 'role_id', 'grade', 'photo_url',
            'commissariat_id', 'brigade_id', 'parquet_id', 'tribunal_id', 'prison_id',
            'ministere_id', 'statut',
        ];
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        if (fields.length === 0) return false;
        values.push(id);
        await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
        return true;
    },

    async updatePassword(id, password_hash) {
        await pool.query(
            'UPDATE users SET password_hash = ?, must_change_password = FALSE WHERE id = ?',
            [password_hash, id]
        );
    },

    async setStatut(id, statut) {
        await pool.query('UPDATE users SET statut = ? WHERE id = ?', [statut, id]);
    },

    async incrementFailedAttempts(id) {
        await pool.query('UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?', [id]);
    },

    async resetFailedAttempts(id) {
        await pool.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [id]);
    },

    async lockUntil(id, lockedUntilDate) {
        await pool.query('UPDATE users SET locked_until = ? WHERE id = ?', [lockedUntilDate, id]);
    },

    async updateLastLogin(id) {
        await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
    },

    async setTwoFactorSecret(id, secret) {
        await pool.query('UPDATE users SET two_factor_secret = ? WHERE id = ?', [secret, id]);
    },

    async enableTwoFactor(id) {
        await pool.query('UPDATE users SET two_factor_enabled = TRUE WHERE id = ?', [id]);
    },

    async disableTwoFactor(id) {
        await pool.query(
            'UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = ?',
            [id]
        );
    },

    async setResetToken(id, token, expires) {
        await pool.query(
            'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
            [token, expires, id]
        );
    },

    async findByResetToken(token) {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW() LIMIT 1',
            [token]
        );
        return rows[0] || null;
    },

    async clearResetToken(id) {
        await pool.query(
            'UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
            [id]
        );
    },
};

module.exports = User;
