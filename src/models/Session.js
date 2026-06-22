const { pool } = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

const Session = {
    async create({ user_id, refresh_token_hash, adresse_ip, user_agent, expires_at }) {
        const id = uuidv4();
        await pool.query(
            `INSERT INTO sessions (id, user_id, refresh_token_hash, adresse_ip, user_agent, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, user_id, refresh_token_hash, adresse_ip || null, user_agent || null, expires_at]
        );
        return id;
    },

    async findById(id) {
        const [rows] = await pool.query(
            'SELECT * FROM sessions WHERE id = ? AND revoked = FALSE LIMIT 1',
            [id]
        );
        return rows[0] || null;
    },

    async touchActivity(id) {
        await pool.query('UPDATE sessions SET last_activity_at = NOW() WHERE id = ?', [id]);
    },

    /**
     * Vérifie si une session a dépassé le délai d'inactivité autorisé.
     */
    async isExpiredByInactivity(id, inactivityMinutes) {
        const [rows] = await pool.query(
            `SELECT TIMESTAMPDIFF(MINUTE, last_activity_at, NOW()) AS minutes_inactif
             FROM sessions WHERE id = ?`,
            [id]
        );
        if (!rows[0]) return true;
        return rows[0].minutes_inactif > inactivityMinutes;
    },

    async revoke(id) {
        await pool.query('UPDATE sessions SET revoked = TRUE WHERE id = ?', [id]);
    },

    async revokeAllForUser(userId) {
        await pool.query('UPDATE sessions SET revoked = TRUE WHERE user_id = ?', [userId]);
    },

    async deleteExpired() {
        await pool.query('DELETE FROM sessions WHERE expires_at < NOW() OR revoked = TRUE');
    },
};

module.exports = Session;
