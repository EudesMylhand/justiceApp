const { pool } = require('../../config/database');

const Commissariat = {
    async findAll() {
        const [rows] = await pool.query(
            `SELECT c.*, d.nom AS departement_nom, v.nom AS ville_nom,
                    a.nom AS arrondissement_nom, q.nom AS quartier_nom,
                    CONCAT(u1.prenom, ' ', u1.nom) AS commissaire_nom,
                    CONCAT(u2.prenom, ' ', u2.nom) AS commissaire_adjoint_nom
             FROM commissariats c
             JOIN departements d ON d.id = c.departement_id
             JOIN villes v ON v.id = c.ville_id
             LEFT JOIN arrondissements a ON a.id = c.arrondissement_id
             LEFT JOIN quartiers q ON q.id = c.quartier_id
             LEFT JOIN users u1 ON u1.id = c.commissaire_id
             LEFT JOIN users u2 ON u2.id = c.commissaire_adjoint_id
             ORDER BY c.nom`
        );
        return rows;
    },

    async findById(id) {
        const [rows] = await pool.query(
            `SELECT c.*, d.nom AS departement_nom, v.nom AS ville_nom,
                    a.nom AS arrondissement_nom, q.nom AS quartier_nom
             FROM commissariats c
             JOIN departements d ON d.id = c.departement_id
             JOIN villes v ON v.id = c.ville_id
             LEFT JOIN arrondissements a ON a.id = c.arrondissement_id
             LEFT JOIN quartiers q ON q.id = c.quartier_id
             WHERE c.id = ?
             LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },

    async create(data) {
        const {
            nom, code, type, departement_id, ville_id, arrondissement_id, quartier_id,
            adresse_complete, gps_latitude, gps_longitude, commissaire_id, commissaire_adjoint_id,
            nombre_opj, nombre_apj, nombre_agents_total, telephone, email_officiel, date_creation,
        } = data;

        const [result] = await pool.query(
            `INSERT INTO commissariats
                (nom, code, type, departement_id, ville_id, arrondissement_id, quartier_id,
                 adresse_complete, gps_latitude, gps_longitude, commissaire_id, commissaire_adjoint_id,
                 nombre_opj, nombre_apj, nombre_agents_total, telephone, email_officiel, date_creation)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nom, code, type || 'ARRONDISSEMENT', departement_id, ville_id,
                arrondissement_id || null, quartier_id || null, adresse_complete || null,
                gps_latitude || null, gps_longitude || null, commissaire_id || null,
                commissaire_adjoint_id || null, nombre_opj || 0, nombre_apj || 0,
                nombre_agents_total || 0, telephone || null, email_officiel || null,
                date_creation || null,
            ]
        );
        return result.insertId;
    },

    async update(id, data) {
        const fields = [];
        const values = [];
        const allowedFields = [
            'nom', 'type', 'departement_id', 'ville_id', 'arrondissement_id', 'quartier_id',
            'adresse_complete', 'gps_latitude', 'gps_longitude', 'commissaire_id',
            'commissaire_adjoint_id', 'nombre_opj', 'nombre_apj', 'nombre_agents_total',
            'telephone', 'email_officiel', 'statut',
        ];
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        if (fields.length === 0) return false;
        values.push(id);
        await pool.query(`UPDATE commissariats SET ${fields.join(', ')} WHERE id = ?`, values);
        return true;
    },

    async setStatut(id, statut) {
        await pool.query('UPDATE commissariats SET statut = ? WHERE id = ?', [statut, id]);
    },

    async countAll() {
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM commissariats');
        return rows[0].total;
    },

    async countActifs() {
        const [rows] = await pool.query(
            "SELECT COUNT(*) AS total FROM commissariats WHERE statut = 'ACTIF'"
        );
        return rows[0].total;
    },
};

module.exports = Commissariat;
