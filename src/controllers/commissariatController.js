const Commissariat = require('../models/Commissariat');
const AuditLog = require('../models/AuditLog');

const commissariatController = {
    async list(req, res, next) {
        try {
            const commissariats = await Commissariat.findAll();
            return res.json({ commissariats });
        } catch (err) {
            next(err);
        }
    },

    async getOne(req, res, next) {
        try {
            const commissariat = await Commissariat.findById(req.params.id);
            if (!commissariat) {
                return res.status(404).json({ error: 'COMMISSARIAT_INTROUVABLE', message: 'Commissariat introuvable.' });
            }
            return res.json({ commissariat });
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

            const id = await Commissariat.create(req.body);

            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'COMMISSARIAT_CREATED',
                module: 'COMMISSARIAT',
                entite_type: 'commissariat',
                entite_id: id,
                details: { nom, code },
                adresse_ip: req.ip,
            });

            return res.status(201).json({ message: 'Commissariat créé avec succès.', id });
        } catch (err) {
            next(err);
        }
    },

    async update(req, res, next) {
        try {
            const updated = await Commissariat.update(req.params.id, req.body);
            if (!updated) {
                return res.status(400).json({ error: 'AUCUNE_MODIFICATION', message: 'Aucun champ valide à mettre à jour.' });
            }

            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'COMMISSARIAT_UPDATED',
                module: 'COMMISSARIAT',
                entite_type: 'commissariat',
                entite_id: req.params.id,
                details: req.body,
                adresse_ip: req.ip,
            });

            return res.json({ message: 'Commissariat mis à jour avec succès.' });
        } catch (err) {
            next(err);
        }
    },

    async deactivate(req, res, next) {
        try {
            await Commissariat.setStatut(req.params.id, 'INACTIF');
            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'COMMISSARIAT_DEACTIVATED',
                module: 'COMMISSARIAT',
                entite_type: 'commissariat',
                entite_id: req.params.id,
                adresse_ip: req.ip,
            });
            return res.json({ message: 'Commissariat désactivé avec succès.' });
        } catch (err) {
            next(err);
        }
    },

    async reactivate(req, res, next) {
        try {
            await Commissariat.setStatut(req.params.id, 'ACTIF');
            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'COMMISSARIAT_REACTIVATED',
                module: 'COMMISSARIAT',
                entite_type: 'commissariat',
                entite_id: req.params.id,
                adresse_ip: req.ip,
            });
            return res.json({ message: 'Commissariat réactivé avec succès.' });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = commissariatController;
