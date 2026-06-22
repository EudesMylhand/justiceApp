const { pool } = require('../../config/database');

const Role = {
    async findAll() {
        const [rows] = await pool.query(
            `SELECT r.*, s.code AS service_code, s.nom AS service_nom
             FROM roles r
             LEFT JOIN services s ON s.id = r.service_id
             ORDER BY r.niveau_hierarchique DESC`
        );
        return rows;
    },

    async findById(id) {
        const [rows] = await pool.query('SELECT * FROM roles WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
    },

    async findByCode(code) {
        const [rows] = await pool.query('SELECT * FROM roles WHERE code = ? LIMIT 1', [code]);
        return rows[0] || null;
    },

    /**
     * Récupère la liste des codes de permissions associées à un rôle.
     */
    async getPermissions(roleId) {
        const [rows] = await pool.query(
            `SELECT p.code
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = ?`,
            [roleId]
        );
        return rows.map((r) => r.code);
    },
};

module.exports = Role;
