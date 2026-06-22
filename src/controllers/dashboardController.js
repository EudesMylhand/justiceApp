const { pool } = require('../../config/database');
const Commissariat = require('../models/Commissariat');
const Brigade = require('../models/Brigade');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const dashboardController = {
    /**
     * Vue d'ensemble nationale : compteurs globaux affichés sur le dashboard Super Admin.
     */
    async vueEnsemble(req, res, next) {
        try {
            const [
                [commissariatsRows],
                [brigadesRows],
                [agentsRows],
                [magistratsRows],
                [plaintesRows],
            ] = await Promise.all([
                pool.query('SELECT COUNT(*) AS total FROM commissariats'),
                pool.query('SELECT COUNT(*) AS total FROM brigades'),
                pool.query(
                    `SELECT COUNT(*) AS total FROM users u
                     JOIN roles r ON r.id = u.role_id
                     JOIN services s ON s.id = r.service_id
                     WHERE s.code IN ('POLICE', 'GENDARMERIE')`
                ),
                pool.query(
                    `SELECT COUNT(*) AS total FROM users u
                     JOIN roles r ON r.id = u.role_id
                     JOIN services s ON s.id = r.service_id
                     WHERE s.code = 'JUSTICE'`
                ),
                // Le module Plaintes n'existe pas encore (Phase 2) ; on retourne 0 pour l'instant
                Promise.resolve([[{ total: 0 }]]),
            ]);

            // Établissements pénitentiaires
            const [prisonsRows] = await pool.query('SELECT COUNT(*) AS total FROM prisons');
            const [detenusRows] = await Promise.resolve([[{ total: 0 }]]); // Module pénitentiaire à venir (Phase suivante)

            return res.json({
                nombreCommissariats: commissariatsRows[0].total,
                nombreBrigades: brigadesRows[0].total,
                nombreAgents: agentsRows[0].total,
                nombreMagistrats: magistratsRows[0].total,
                nombreDetenus: detenusRows[0].total,
                nombrePlaintes: plaintesRows[0].total,
                nombreProceduresEnCours: 0, // Module Enquêtes à venir
                nombreEtablissementsPenitentiaires: prisonsRows[0].total,
                note: 'Les compteurs liés aux Plaintes, Procédures et Détenus seront alimentés lors de l\'implémentation des modules métier correspondants.',
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Statistiques RH globales.
     */
    async statistiquesRH(req, res, next) {
        try {
            const [rows] = await pool.query(
                `SELECT s.code AS service_code, s.nom AS service_nom, COUNT(u.id) AS total
                 FROM services s
                 LEFT JOIN roles r ON r.service_id = s.id
                 LEFT JOIN users u ON u.role_id = r.id AND u.statut = 'ACTIF'
                 GROUP BY s.id, s.code, s.nom`
            );
            return res.json({ statistiquesParService: rows });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Liste de toutes les structures pour affichage sur carte interactive
     * (commissariats + brigades, avec coordonnées GPS et compteurs).
     */
    async carteInteractive(req, res, next) {
        try {
            const commissariats = await Commissariat.findAll();
            const brigades = await Brigade.findAll();

            const points = [
                ...commissariats.map((c) => ({
                    type: 'COMMISSARIAT',
                    id: c.id,
                    nom: c.nom,
                    statut: c.statut,
                    latitude: c.gps_latitude,
                    longitude: c.gps_longitude,
                    nombreAgents: c.nombre_agents_total,
                    departement: c.departement_nom,
                    ville: c.ville_nom,
                })),
                ...brigades.map((b) => ({
                    type: 'BRIGADE',
                    id: b.id,
                    nom: b.nom,
                    statut: b.statut,
                    latitude: b.gps_latitude,
                    longitude: b.gps_longitude,
                    nombreAgents: b.nombre_agents_total,
                    departement: b.departement_nom,
                    ville: b.ville_nom,
                })),
            ];

            return res.json({ points });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Journaux d'audit et de connexion (accès réservé, ex: AUDIT_VIEW).
     */
    async journaux(req, res, next) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 100;
            const offset = (page - 1) * limit;

            const connexions = await AuditLog.getConnexionLogs({ limit, offset });
            const actions = await AuditLog.getAuditLogs({ limit, offset });

            return res.json({ connexions, actions, page, limit });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = dashboardController;
