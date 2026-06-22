const { pool } = require('../../config/database');

const AuditLog = {
    async logConnexion({ user_id, matricule_ou_email_saisi, statut, adresse_ip, user_agent }) {
        await pool.query(
            `INSERT INTO connexion_logs (user_id, matricule_ou_email_saisi, statut, adresse_ip, user_agent)
             VALUES (?, ?, ?, ?, ?)`,
            [user_id || null, matricule_ou_email_saisi || null, statut, adresse_ip || null, user_agent || null]
        );
    },

    async logAction({ user_id, action, module, entite_type, entite_id, details, adresse_ip }) {
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, module, entite_type, entite_id, details, adresse_ip)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id || null, action, module, entite_type || null, entite_id || null,
                details ? JSON.stringify(details) : null, adresse_ip || null,
            ]
        );
    },

    async getConnexionLogs({ limit = 100, offset = 0, userId = null } = {}) {
        if (userId) {
            const [rows] = await pool.query(
                `SELECT cl.*, CONCAT(u.prenom, ' ', u.nom) AS user_nom
                 FROM connexion_logs cl
                 LEFT JOIN users u ON u.id = cl.user_id
                 WHERE cl.user_id = ?
                 ORDER BY cl.created_at DESC LIMIT ? OFFSET ?`,
                [userId, limit, offset]
            );
            return rows;
        }
        const [rows] = await pool.query(
            `SELECT cl.*, CONCAT(u.prenom, ' ', u.nom) AS user_nom
             FROM connexion_logs cl
             LEFT JOIN users u ON u.id = cl.user_id
             ORDER BY cl.created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return rows;
    },

    async getAuditLogs({ limit = 100, offset = 0 } = {}) {
        const [rows] = await pool.query(
            `SELECT al.*, CONCAT(u.prenom, ' ', u.nom) AS user_nom
             FROM audit_logs al
             LEFT JOIN users u ON u.id = al.user_id
             ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return rows;
    },
};

module.exports = AuditLog;
