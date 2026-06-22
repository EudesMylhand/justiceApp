const { pool } = require('../../config/database');

const Brigade = {
    async findAll() {
        const [rows] = await pool.query(
            `SELECT b.*, d.nom AS departement_nom, v.nom AS ville_nom, q.nom AS quartier_nom,
                    CONCAT(u1.prenom, ' ', u1.nom) AS commandant_nom,
                    CONCAT(u2.prenom, ' ', u2.nom) AS commandant_adjoint_nom
             FROM brigades b
             JOIN departements d ON d.id = b.departement_id
             JOIN villes v ON v.id = b.ville_id
             LEFT JOIN quartiers q ON q.id = b.quartier_id
             LEFT JOIN users u1 ON u1.id = b.commandant_id
             LEFT JOIN users u2 ON u2.id = b.commandant_adjoint_id
             ORDER BY b.nom`
        );
        return rows;
    },

    async findById(id) {
        const [rows] = await pool.query(
            `SELECT b.*, d.nom AS departement_nom, v.nom AS ville_nom, q.nom AS quartier_nom
             FROM brigades b
             JOIN departements d ON d.id = b.departement_id
             JOIN villes v ON v.id = b.ville_id
             LEFT JOIN quartiers q ON q.id = b.quartier_id
             WHERE b.id = ?
             LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },

    async create(data) {
        const {
            nom, code, type, departement_id, ville_id, quartier_id, adresse_complete,
            gps_latitude, gps_longitude, commandant_id, commandant_adjoint_id,
            nombre_opj, nombre_apj, nombre_agents_total, telephone, email_officiel, date_creation,
        } = data;

        const [result] = await pool.query(
            `INSERT INTO brigades
                (nom, code, type, departement_id, ville_id, quartier_id, adresse_complete,
                 gps_latitude, gps_longitude, commandant_id, commandant_adjoint_id,
                 nombre_opj, nombre_apj, nombre_agents_total, telephone, email_officiel, date_creation)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nom, code, type || 'TERRITORIALE', departement_id, ville_id, quartier_id || null,
                adresse_complete || null, gps_latitude || null, gps_longitude || null,
                commandant_id || null, commandant_adjoint_id || null, nombre_opj || 0,
                nombre_apj || 0, nombre_agents_total || 0, telephone || null,
                email_officiel || null, date_creation || null,
            ]
        );
        return result.insertId;
    },

    async update(id, data) {
        const fields = [];
        const values = [];
        const allowedFields = [
            'nom', 'type', 'departement_id', 'ville_id', 'quartier_id', 'adresse_complete',
            'gps_latitude', 'gps_longitude', 'commandant_id', 'commandant_adjoint_id',
            'nombre_opj', 'nombre_apj', 'nombre_agents_total', 'telephone', 'email_officiel', 'statut',
        ];
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        if (fields.length === 0) return false;
        values.push(id);
        await pool.query(`UPDATE brigades SET ${fields.join(', ')} WHERE id = ?`, values);
        return true;
    },

    async setStatut(id, statut) {
        await pool.query('UPDATE brigades SET statut = ? WHERE id = ?', [statut, id]);
    },

    async countAll() {
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM brigades');
        return rows[0].total;
    },

    async countActifs() {
        const [rows] = await pool.query("SELECT COUNT(*) AS total FROM brigades WHERE statut = 'ACTIF'");
        return rows[0].total;
    },
};

module.exports = Brigade;
