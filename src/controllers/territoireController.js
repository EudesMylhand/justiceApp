const Territoire = require('../models/Territoire');
const AuditLog = require('../models/AuditLog');

const territoireController = {
    async getDepartements(req, res, next) {
        try {
            const departements = await Territoire.getDepartements();
            return res.json({ departements });
        } catch (err) {
            next(err);
        }
    },

    async getVilles(req, res, next) {
        try {
            const villes = await Territoire.getVillesByDepartement(req.params.departementId);
            return res.json({ villes });
        } catch (err) {
            next(err);
        }
    },

    async getArrondissements(req, res, next) {
        try {
            const arrondissements = await Territoire.getArrondissementsByVille(req.params.villeId);
            return res.json({ arrondissements });
        } catch (err) {
            next(err);
        }
    },

    async getQuartiers(req, res, next) {
        try {
            const quartiers = await Territoire.getQuartiersByArrondissement(req.params.arrondissementId);
            return res.json({ quartiers });
        } catch (err) {
            next(err);
        }
    },

    async createDepartement(req, res, next) {
        try {
            const { nom, code, chef_lieu } = req.body;
            if (!nom || !code) {
                return res.status(400).json({ error: 'CHAMPS_MANQUANTS', message: 'Nom et code requis.' });
            }
            const id = await Territoire.createDepartement({ nom, code, chef_lieu });
            await AuditLog.logAction({
                user_id: req.user.id, action: 'DEPARTEMENT_CREATED', module: 'TERRITOIRE',
                entite_type: 'departement', entite_id: id, adresse_ip: req.ip,
            });
            return res.status(201).json({ message: 'Département créé avec succès.', id });
        } catch (err) {
            next(err);
        }
    },

    async createVille(req, res, next) {
        try {
            const { departement_id, nom, code } = req.body;
            if (!departement_id || !nom || !code) {
                return res.status(400).json({ error: 'CHAMPS_MANQUANTS', message: 'Département, nom et code requis.' });
            }
            const id = await Territoire.createVille({ departement_id, nom, code });
            await AuditLog.logAction({
                user_id: req.user.id, action: 'VILLE_CREATED', module: 'TERRITOIRE',
                entite_type: 'ville', entite_id: id, adresse_ip: req.ip,
            });
            return res.status(201).json({ message: 'Ville créée avec succès.', id });
        } catch (err) {
            next(err);
        }
    },

    async createArrondissement(req, res, next) {
        try {
            const { ville_id, nom, code } = req.body;
            if (!ville_id || !nom || !code) {
                return res.status(400).json({ error: 'CHAMPS_MANQUANTS', message: 'Ville, nom et code requis.' });
            }
            const id = await Territoire.createArrondissement({ ville_id, nom, code });
            await AuditLog.logAction({
                user_id: req.user.id, action: 'ARRONDISSEMENT_CREATED', module: 'TERRITOIRE',
                entite_type: 'arrondissement', entite_id: id, adresse_ip: req.ip,
            });
            return res.status(201).json({ message: 'Arrondissement créé avec succès.', id });
        } catch (err) {
            next(err);
        }
    },

    async createQuartier(req, res, next) {
        try {
            const { arrondissement_id, nom, code } = req.body;
            if (!arrondissement_id || !nom) {
                return res.status(400).json({ error: 'CHAMPS_MANQUANTS', message: 'Arrondissement et nom requis.' });
            }
            const id = await Territoire.createQuartier({ arrondissement_id, nom, code });
            await AuditLog.logAction({
                user_id: req.user.id, action: 'QUARTIER_CREATED', module: 'TERRITOIRE',
                entite_type: 'quartier', entite_id: id, adresse_ip: req.ip,
            });
            return res.status(201).json({ message: 'Quartier créé avec succès.', id });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = territoireController;
