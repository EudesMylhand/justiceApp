const { pool } = require('../../config/database');

const Plainte = {
    /**
     * Génère le prochain numéro unique de plainte au format PL-AAAA-NNNNNN.
     */
    async genererNumeroUnique(connection) {
        const annee = new Date().getFullYear();
        const [rows] = await connection.query(
            `SELECT COUNT(*) AS total FROM plaintes WHERE numero_unique LIKE ?`,
            [`PL-${annee}-%`]
        );
        const prochainNumero = rows[0].total + 1;
        return `PL-${annee}-${String(prochainNumero).padStart(6, '0')}`;
    },

    async create(data) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const numero_unique = await this.genererNumeroUnique(connection);

            const {
                nature_infraction, description, date_infraction,
                departement_id, ville_id, arrondissement_id, quartier_id, lieu_precis,
                commissariat_id, brigade_id, declarant_id,
            } = data;

            const [result] = await connection.query(
                `INSERT INTO plaintes
                    (numero_unique, nature_infraction, description, date_infraction,
                     departement_id, ville_id, arrondissement_id, quartier_id, lieu_precis,
                     commissariat_id, brigade_id, declarant_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    numero_unique, nature_infraction, description, date_infraction || null,
                    departement_id, ville_id, arrondissement_id || null, quartier_id || null,
                    lieu_precis || null, commissariat_id || null, brigade_id || null, declarant_id,
                ]
            );

            const plainteId = result.insertId;

            await connection.query(
                `INSERT INTO plainte_historique (plainte_id, action, description, nouveau_statut, user_id)
                 VALUES (?, 'CREATION', ?, 'ENREGISTREE', ?)`,
                [plainteId, `Plainte ${numero_unique} enregistrée.`, declarant_id]
            );

            await connection.commit();
            return { id: plainteId, numero_unique };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    async findById(id) {
        const [rows] = await pool.query(
            `SELECT p.*, 
                    d.nom AS departement_nom, v.nom AS ville_nom,
                    a.nom AS arrondissement_nom, q.nom AS quartier_nom,
                    c.nom AS commissariat_nom, b.nom AS brigade_nom,
                    CONCAT(u.prenom, ' ', u.nom) AS declarant_nom, u.matricule AS declarant_matricule
             FROM plaintes p
             JOIN departements d ON d.id = p.departement_id
             JOIN villes v ON v.id = p.ville_id
             LEFT JOIN arrondissements a ON a.id = p.arrondissement_id
             LEFT JOIN quartiers q ON q.id = p.quartier_id
             LEFT JOIN commissariats c ON c.id = p.commissariat_id
             LEFT JOIN brigades b ON b.id = p.brigade_id
             JOIN users u ON u.id = p.declarant_id
             WHERE p.id = ?
             LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },

    async findByNumero(numero_unique) {
        const [rows] = await pool.query('SELECT * FROM plaintes WHERE numero_unique = ? LIMIT 1', [numero_unique]);
        return rows[0] || null;
    },

    /**
     * Recherche multicritère avec restriction de portée (RBAC) :
     * - scope = 'ALL' : aucune restriction (Super Admin, Ministères)
     * - scope = 'UNIT' : restreint au commissariat_id ou brigade_id de l'utilisateur
     */
    async search({
        numero_unique, statut, nature_infraction, quartier_id, arrondissement_id,
        dateDebut, dateFin, nomPersonne,
        scope, commissariatId, brigadeId,
        limit = 50, offset = 0,
    } = {}) {
        const conditions = [];
        const params = [];

        if (numero_unique) {
            conditions.push('p.numero_unique LIKE ?');
            params.push(`%${numero_unique}%`);
        }
        if (statut) {
            conditions.push('p.statut = ?');
            params.push(statut);
        }
        if (nature_infraction) {
            conditions.push('p.nature_infraction LIKE ?');
            params.push(`%${nature_infraction}%`);
        }
        if (quartier_id) {
            conditions.push('p.quartier_id = ?');
            params.push(quartier_id);
        }
        if (arrondissement_id) {
            conditions.push('p.arrondissement_id = ?');
            params.push(arrondissement_id);
        }
        if (dateDebut) {
            conditions.push('p.date_enregistrement >= ?');
            params.push(dateDebut);
        }
        if (dateFin) {
            conditions.push('p.date_enregistrement <= ?');
            params.push(dateFin);
        }
        if (nomPersonne) {
            conditions.push(`(
                EXISTS (SELECT 1 FROM plainte_victimes pv WHERE pv.plainte_id = p.id AND (pv.nom LIKE ? OR pv.prenom LIKE ?))
                OR EXISTS (SELECT 1 FROM plainte_suspects ps WHERE ps.plainte_id = p.id AND (ps.nom LIKE ? OR ps.prenom LIKE ?))
            )`);
            const like = `%${nomPersonne}%`;
            params.push(like, like, like, like);
        }

        // Restriction RBAC de portée
        if (scope === 'UNIT') {
            if (commissariatId) {
                conditions.push('p.commissariat_id = ?');
                params.push(commissariatId);
            } else if (brigadeId) {
                conditions.push('p.brigade_id = ?');
                params.push(brigadeId);
            } else {
                conditions.push('1 = 0');
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [rows] = await pool.query(
            `SELECT p.id, p.numero_unique, p.nature_infraction, p.statut, p.date_infraction,
                    p.date_enregistrement, v.nom AS ville_nom, q.nom AS quartier_nom,
                    c.nom AS commissariat_nom, b.nom AS brigade_nom,
                    CONCAT(u.prenom, ' ', u.nom) AS declarant_nom
             FROM plaintes p
             JOIN villes v ON v.id = p.ville_id
             LEFT JOIN quartiers q ON q.id = p.quartier_id
             LEFT JOIN commissariats c ON c.id = p.commissariat_id
             LEFT JOIN brigades b ON b.id = p.brigade_id
             JOIN users u ON u.id = p.declarant_id
             ${whereClause}
             ORDER BY p.date_enregistrement DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM plaintes p ${whereClause}`,
            params
        );

        return { plaintes: rows, total: countRows[0].total };
    },

    async updateStatut(id, nouveauStatut, userId, commentaire) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [rows] = await connection.query('SELECT statut FROM plaintes WHERE id = ? LIMIT 1', [id]);
            if (!rows[0]) throw new Error('PLAINTE_INTROUVABLE');
            const ancienStatut = rows[0].statut;

            await connection.query('UPDATE plaintes SET statut = ? WHERE id = ?', [nouveauStatut, id]);

            await connection.query(
                `INSERT INTO plainte_historique (plainte_id, action, description, ancien_statut, nouveau_statut, user_id)
                 VALUES (?, 'CHANGEMENT_STATUT', ?, ?, ?, ?)`,
                [id, commentaire || `Statut changé de ${ancienStatut} à ${nouveauStatut}.`, ancienStatut, nouveauStatut, userId]
            );

            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    async update(id, data) {
        const fields = [];
        const values = [];
        const allowedFields = [
            'nature_infraction', 'description', 'date_infraction',
            'arrondissement_id', 'quartier_id', 'lieu_precis',
        ];
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }
        if (fields.length === 0) return false;
        values.push(id);
        await pool.query(`UPDATE plaintes SET ${fields.join(', ')} WHERE id = ?`, values);
        return true;
    },

    // ---- Victimes ----
    async addVictime(plainteId, data) {
        const { nom, prenom, date_naissance, sexe, telephone, adresse, piece_identite_type, piece_identite_numero, observations } = data;
        const [result] = await pool.query(
            `INSERT INTO plainte_victimes
                (plainte_id, nom, prenom, date_naissance, sexe, telephone, adresse, piece_identite_type, piece_identite_numero, observations)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [plainteId, nom, prenom, date_naissance || null, sexe || null, telephone || null, adresse || null, piece_identite_type || null, piece_identite_numero || null, observations || null]
        );
        return result.insertId;
    },

    async getVictimes(plainteId) {
        const [rows] = await pool.query('SELECT * FROM plainte_victimes WHERE plainte_id = ? ORDER BY created_at', [plainteId]);
        return rows;
    },

    // ---- Témoins ----
    async addTemoin(plainteId, data) {
        const { nom, prenom, telephone, adresse, declaration } = data;
        const [result] = await pool.query(
            `INSERT INTO plainte_temoins (plainte_id, nom, prenom, telephone, adresse, declaration)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [plainteId, nom, prenom, telephone || null, adresse || null, declaration || null]
        );
        return result.insertId;
    },

    async getTemoins(plainteId) {
        const [rows] = await pool.query('SELECT * FROM plainte_temoins WHERE plainte_id = ? ORDER BY created_at', [plainteId]);
        return rows;
    },

    // ---- Suspects ----
    async addSuspect(plainteId, data) {
        const { nom, prenom, surnom, description_physique, date_naissance, adresse, statut, observations } = data;
        const [result] = await pool.query(
            `INSERT INTO plainte_suspects
                (plainte_id, nom, prenom, surnom, description_physique, date_naissance, adresse, statut, observations)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [plainteId, nom || null, prenom || null, surnom || null, description_physique || null, date_naissance || null, adresse || null, statut || 'RECHERCHE', observations || null]
        );
        return result.insertId;
    },

    async getSuspects(plainteId) {
        const [rows] = await pool.query('SELECT * FROM plainte_suspects WHERE plainte_id = ? ORDER BY created_at', [plainteId]);
        return rows;
    },

    async updateSuspectStatut(suspectId, statut) {
        await pool.query('UPDATE plainte_suspects SET statut = ? WHERE id = ?', [statut, suspectId]);
    },

    // ---- Pièces jointes ----
    async addPieceJointe(plainteId, data) {
        const { nom_original, nom_fichier_stocke, chemin_relatif, type_mime, taille_octets, uploaded_by } = data;
        const [result] = await pool.query(
            `INSERT INTO plainte_pieces_jointes
                (plainte_id, nom_original, nom_fichier_stocke, chemin_relatif, type_mime, taille_octets, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [plainteId, nom_original, nom_fichier_stocke, chemin_relatif, type_mime || null, taille_octets || null, uploaded_by]
        );
        return result.insertId;
    },

    async getPiecesJointes(plainteId) {
        const [rows] = await pool.query(
            `SELECT pj.*, CONCAT(u.prenom, ' ', u.nom) AS uploaded_by_nom
             FROM plainte_pieces_jointes pj
             JOIN users u ON u.id = pj.uploaded_by
             WHERE pj.plainte_id = ? ORDER BY pj.created_at`,
            [plainteId]
        );
        return rows;
    },

    async findPieceJointeById(id) {
        const [rows] = await pool.query('SELECT * FROM plainte_pieces_jointes WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
    },

    async deletePieceJointe(id) {
        await pool.query('DELETE FROM plainte_pieces_jointes WHERE id = ?', [id]);
    },

    // ---- Historique ----
    async getHistorique(plainteId) {
        const [rows] = await pool.query(
            `SELECT h.*, CONCAT(u.prenom, ' ', u.nom) AS user_nom
             FROM plainte_historique h
             JOIN users u ON u.id = h.user_id
             WHERE h.plainte_id = ? ORDER BY h.created_at DESC`,
            [plainteId]
        );
        return rows;
    },

    async addHistorique({ plainte_id, action, description, user_id }) {
        await pool.query(
            `INSERT INTO plainte_historique (plainte_id, action, description, user_id) VALUES (?, ?, ?, ?)`,
            [plainte_id, action, description || null, user_id]
        );
    },
};

module.exports = Plainte;
