const { pool } = require('../../config/database');

const Territoire = {
    async getDepartements() {
        const [rows] = await pool.query('SELECT * FROM departements ORDER BY nom');
        return rows;
    },

    async getVillesByDepartement(departementId) {
        const [rows] = await pool.query(
            'SELECT * FROM villes WHERE departement_id = ? ORDER BY nom',
            [departementId]
        );
        return rows;
    },

    async getArrondissementsByVille(villeId) {
        const [rows] = await pool.query(
            'SELECT * FROM arrondissements WHERE ville_id = ? ORDER BY nom',
            [villeId]
        );
        return rows;
    },

    async getQuartiersByArrondissement(arrondissementId) {
        const [rows] = await pool.query(
            'SELECT * FROM quartiers WHERE arrondissement_id = ? ORDER BY nom',
            [arrondissementId]
        );
        return rows;
    },

    async createDepartement({ nom, code, chef_lieu }) {
        const [result] = await pool.query(
            'INSERT INTO departements (nom, code, chef_lieu) VALUES (?, ?, ?)',
            [nom, code, chef_lieu || null]
        );
        return result.insertId;
    },

    async createVille({ departement_id, nom, code }) {
        const [result] = await pool.query(
            'INSERT INTO villes (departement_id, nom, code) VALUES (?, ?, ?)',
            [departement_id, nom, code]
        );
        return result.insertId;
    },

    async createArrondissement({ ville_id, nom, code }) {
        const [result] = await pool.query(
            'INSERT INTO arrondissements (ville_id, nom, code) VALUES (?, ?, ?)',
            [ville_id, nom, code]
        );
        return result.insertId;
    },

    async createQuartier({ arrondissement_id, nom, code }) {
        const [result] = await pool.query(
            'INSERT INTO quartiers (arrondissement_id, nom, code) VALUES (?, ?, ?)',
            [arrondissement_id, nom, code || null]
        );
        return result.insertId;
    },
};

module.exports = Territoire;
