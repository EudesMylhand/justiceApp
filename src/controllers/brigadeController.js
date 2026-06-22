const Brigade = require('../models/Brigade');
const AuditLog = require('../models/AuditLog');

const brigadeController = {
    async list(req, res, next) {
        try {
            const brigades = await Brigade.findAll();
            return res.json({ brigades });
        } catch (err) {
            next(err);
        }
    },

    async getOne(req, res, next) {
        try {
            const brigade = await Brigade.findById(req.params.id);
            if (!brigade) {
                return res.status(404).json({ error: 'BRIGADE_INTROUVABLE', message: 'Brigade introuvable.' });
            }
            return res.json({ brigade });
        } catch (err) {
            next(err);
        }
    },

    async create(req, res, next) {
        try {
            const { nom, code, departement_id, ville_id } = req.body;
            if (!nom || !code || !departement_id || !ville_id) {
                return res.status(400).json({
                    error: 'CHAMPS_MANQUANTS',
                    message: 'Nom, code, département et ville sont obligatoires.',
                });
            }

            const id = await Brigade.create(req.body);

            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'BRIGADE_CREATED',
                module: 'BRIGADE',
                entite_type: 'brigade',
                entite_id: id,
                details: { nom, code },
                adresse_ip: req.ip,
            });

            return res.status(201).json({ message: 'Brigade créée avec succès.', id });
        } catch (err) {
            next(err);
        }
    },

    async update(req, res, next) {
        try {
            const updated = await Brigade.update(req.params.id, req.body);
            if (!updated) {
                return res.status(400).json({ error: 'AUCUNE_MODIFICATION', message: 'Aucun champ valide à mettre à jour.' });
            }

            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'BRIGADE_UPDATED',
                module: 'BRIGADE',
                entite_type: 'brigade',
                entite_id: req.params.id,
                details: req.body,
                adresse_ip: req.ip,
            });

            return res.json({ message: 'Brigade mise à jour avec succès.' });
        } catch (err) {
            next(err);
        }
    },

    async deactivate(req, res, next) {
        try {
            await Brigade.setStatut(req.params.id, 'INACTIF');
            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'BRIGADE_DEACTIVATED',
                module: 'BRIGADE',
                entite_type: 'brigade',
                entite_id: req.params.id,
                adresse_ip: req.ip,
            });
            return res.json({ message: 'Brigade désactivée avec succès.' });
        } catch (err) {
            next(err);
        }
    },

    async reactivate(req, res, next) {
        try {
            await Brigade.setStatut(req.params.id, 'ACTIF');
            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'BRIGADE_REACTIVATED',
                module: 'BRIGADE',
                entite_type: 'brigade',
                entite_id: req.params.id,
                adresse_ip: req.ip,
            });
            return res.json({ message: 'Brigade réactivée avec succès.' });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = brigadeController;
