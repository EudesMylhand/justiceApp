const path = require('path');
const fs = require('fs');
const Plainte = require('../models/Plainte');
const AuditLog = require('../models/AuditLog');
const { determinerPorteePlaintes } = require('../services/scopeService');
const { UPLOAD_DIR, PLAINTES_SUBDIR } = require('../middlewares/upload');

const plainteController = {
    /**
     * Création d'une plainte. Réservé aux OPJ (vérifié via permission PLAINTE_CREATE).
     * Le commissariat ou la brigade de rattachement est automatiquement déduit
     * du profil de l'OPJ déclarant (cohérence avec son affectation réelle).
     */
    async create(req, res, next) {
        try {
            const {
                nature_infraction, description, date_infraction,
                departement_id, ville_id, arrondissement_id, quartier_id, lieu_precis,
            } = req.body;

            if (!nature_infraction || !description || !departement_id || !ville_id) {
                return res.status(400).json({
                    error: 'CHAMPS_MANQUANTS',
                    message: 'Nature de l\'infraction, description, département et ville sont obligatoires.',
                });
            }

            const User = require('../models/User');
            const declarant = await User.findById(req.user.id);

            const result = await Plainte.create({
                nature_infraction, description, date_infraction,
                departement_id, ville_id, arrondissement_id, quartier_id, lieu_precis,
                commissariat_id: declarant.commissariat_id || null,
                brigade_id: declarant.brigade_id || null,
                declarant_id: req.user.id,
            });

            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'PLAINTE_CREATED',
                module: 'PLAINTE',
                entite_type: 'plainte',
                entite_id: result.id,
                details: { numero_unique: result.numero_unique },
                adresse_ip: req.ip,
            });

            return res.status(201).json({
                message: 'Plainte enregistrée avec succès.',
                id: result.id,
                numero_unique: result.numero_unique,
            });
        } catch (err) {
            next(err);
        }
    },

    async getOne(req, res, next) {
        try {
            const plainte = await Plainte.findById(req.params.id);
            if (!plainte) {
                return res.status(404).json({ error: 'PLAINTE_INTROUVABLE', message: 'Plainte introuvable.' });
            }

            // Vérification de portée : un utilisateur à portée UNIT ne peut consulter
            // que les plaintes de son commissariat/brigade
            const portee = await determinerPorteePlaintes(req.user);
            if (portee.scope === 'UNIT') {
                const memeCommissariat = portee.commissariatId && plainte.commissariat_id === portee.commissariatId;
                const memeBrigade = portee.brigadeId && plainte.brigade_id === portee.brigadeId;
                if (!memeCommissariat && !memeBrigade) {
                    return res.status(403).json({ error: 'ACCES_REFUSE', message: 'Cette plainte n\'appartient pas à votre unité.' });
                }
            }

            const [victimes, temoins, suspects, piecesJointes, historique] = await Promise.all([
                Plainte.getVictimes(plainte.id),
                Plainte.getTemoins(plainte.id),
                Plainte.getSuspects(plainte.id),
                Plainte.getPiecesJointes(plainte.id),
                Plainte.getHistorique(plainte.id),
            ]);

            return res.json({ plainte, victimes, temoins, suspects, piecesJointes, historique });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Recherche multicritère, automatiquement restreinte selon la portée RBAC de l'utilisateur.
     */
    async search(req, res, next) {
        try {
            const portee = await determinerPorteePlaintes(req.user);

            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 50;
            const offset = (page - 1) * limit;

            const result = await Plainte.search({
                numero_unique: req.query.numero,
                statut: req.query.statut,
                nature_infraction: req.query.nature,
                quartier_id: req.query.quartier_id,
                arrondissement_id: req.query.arrondissement_id,
                dateDebut: req.query.date_debut,
                dateFin: req.query.date_fin,
                nomPersonne: req.query.nom,
                scope: portee.scope,
                commissariatId: portee.commissariatId,
                brigadeId: portee.brigadeId,
                limit,
                offset,
            });

            return res.json({ ...result, page, limit });
        } catch (err) {
            next(err);
        }
    },

    async update(req, res, next) {
        try {
            const updated = await Plainte.update(req.params.id, req.body);
            if (!updated) {
                return res.status(400).json({ error: 'AUCUNE_MODIFICATION', message: 'Aucun champ valide à mettre à jour.' });
            }

            await Plainte.addHistorique({
                plainte_id: req.params.id,
                action: 'MODIFICATION',
                description: 'Informations générales de la plainte modifiées.',
                user_id: req.user.id,
            });

            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'PLAINTE_UPDATED',
                module: 'PLAINTE',
                entite_type: 'plainte',
                entite_id: req.params.id,
                details: req.body,
                adresse_ip: req.ip,
            });

            return res.json({ message: 'Plainte mise à jour avec succès.' });
        } catch (err) {
            next(err);
        }
    },

    async updateStatut(req, res, next) {
        try {
            const { statut, commentaire } = req.body;
            const statutsValides = ['ENREGISTREE', 'EN_ENQUETE', 'TRANSMISE_PARQUET', 'CLASSEE_SANS_SUITE', 'CLOTUREE'];
            if (!statut || !statutsValides.includes(statut)) {
                return res.status(400).json({ error: 'STATUT_INVALIDE', message: 'Statut invalide.' });
            }

            await Plainte.updateStatut(req.params.id, statut, req.user.id, commentaire);

            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'PLAINTE_STATUT_CHANGED',
                module: 'PLAINTE',
                entite_type: 'plainte',
                entite_id: req.params.id,
                details: { nouveauStatut: statut },
                adresse_ip: req.ip,
            });

            return res.json({ message: 'Statut de la plainte mis à jour.' });
        } catch (err) {
            next(err);
        }
    },

    // ---- Victimes ----
    async addVictime(req, res, next) {
        try {
            const { nom, prenom } = req.body;
            if (!nom || !prenom) {
                return res.status(400).json({ error: 'CHAMPS_MANQUANTS', message: 'Nom et prénom de la victime sont requis.' });
            }
            const id = await Plainte.addVictime(req.params.id, req.body);
            await Plainte.addHistorique({
                plainte_id: req.params.id, action: 'AJOUT_VICTIME',
                description: `Victime ajoutée : ${prenom} ${nom}.`, user_id: req.user.id,
            });
            return res.status(201).json({ message: 'Victime ajoutée avec succès.', id });
        } catch (err) {
            next(err);
        }
    },

    // ---- Témoins ----
    async addTemoin(req, res, next) {
        try {
            const { nom, prenom } = req.body;
            if (!nom || !prenom) {
                return res.status(400).json({ error: 'CHAMPS_MANQUANTS', message: 'Nom et prénom du témoin sont requis.' });
            }
            const id = await Plainte.addTemoin(req.params.id, req.body);
            await Plainte.addHistorique({
                plainte_id: req.params.id, action: 'AJOUT_TEMOIN',
                description: `Témoin ajouté : ${prenom} ${nom}.`, user_id: req.user.id,
            });
            return res.status(201).json({ message: 'Témoin ajouté avec succès.', id });
        } catch (err) {
            next(err);
        }
    },

    // ---- Suspects ----
    async addSuspect(req, res, next) {
        try {
            const { nom, prenom, surnom } = req.body;
            if (!nom && !surnom) {
                return res.status(400).json({
                    error: 'CHAMPS_MANQUANTS',
                    message: 'Au moins le nom ou le surnom du suspect doit être renseigné.',
                });
            }
            const id = await Plainte.addSuspect(req.params.id, req.body);
            await Plainte.addHistorique({
                plainte_id: req.params.id, action: 'AJOUT_SUSPECT',
                description: `Suspect ajouté : ${prenom || ''} ${nom || surnom || ''}.`.trim(),
                user_id: req.user.id,
            });
            return res.status(201).json({ message: 'Suspect ajouté avec succès.', id });
        } catch (err) {
            next(err);
        }
    },

    async updateSuspectStatut(req, res, next) {
        try {
            const { statut } = req.body;
            const statutsValides = ['RECHERCHE', 'IDENTIFIE', 'INTERPELLE', 'MIS_HORS_DE_CAUSE'];
            if (!statutsValides.includes(statut)) {
                return res.status(400).json({ error: 'STATUT_INVALIDE', message: 'Statut de suspect invalide.' });
            }
            await Plainte.updateSuspectStatut(req.params.suspectId, statut);
            await Plainte.addHistorique({
                plainte_id: req.params.id, action: 'MODIFICATION_STATUT_SUSPECT',
                description: `Statut du suspect mis à jour : ${statut}.`, user_id: req.user.id,
            });
            return res.json({ message: 'Statut du suspect mis à jour.' });
        } catch (err) {
            next(err);
        }
    },

    // ---- Pièces jointes ----
    async uploadPieceJointe(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'FICHIER_MANQUANT', message: 'Aucun fichier reçu.' });
            }

            const cheminRelatif = path.join(PLAINTES_SUBDIR, req.file.filename);

            const id = await Plainte.addPieceJointe(req.params.id, {
                nom_original: req.file.originalname,
                nom_fichier_stocke: req.file.filename,
                chemin_relatif: cheminRelatif,
                type_mime: req.file.mimetype,
                taille_octets: req.file.size,
                uploaded_by: req.user.id,
            });

            await Plainte.addHistorique({
                plainte_id: req.params.id, action: 'AJOUT_PIECE_JOINTE',
                description: `Pièce jointe ajoutée : ${req.file.originalname}.`, user_id: req.user.id,
            });

            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'PLAINTE_PIECE_JOINTE_ADDED',
                module: 'PLAINTE',
                entite_type: 'plainte',
                entite_id: req.params.id,
                details: { nomFichier: req.file.originalname },
                adresse_ip: req.ip,
            });

            return res.status(201).json({ message: 'Pièce jointe ajoutée avec succès.', id });
        } catch (err) {
            next(err);
        }
    },

    async downloadPieceJointe(req, res, next) {
        try {
            const piece = await Plainte.findPieceJointeById(req.params.pieceId);
            if (!piece) {
                return res.status(404).json({ error: 'PIECE_INTROUVABLE', message: 'Pièce jointe introuvable.' });
            }
            const cheminAbsolu = path.join(process.cwd(), UPLOAD_DIR, piece.chemin_relatif);
            if (!fs.existsSync(cheminAbsolu)) {
                return res.status(404).json({ error: 'FICHIER_INTROUVABLE', message: 'Le fichier n\'existe plus sur le serveur.' });
            }
            return res.download(cheminAbsolu, piece.nom_original);
        } catch (err) {
            next(err);
        }
    },

    async deletePieceJointe(req, res, next) {
        try {
            const piece = await Plainte.findPieceJointeById(req.params.pieceId);
            if (!piece) {
                return res.status(404).json({ error: 'PIECE_INTROUVABLE', message: 'Pièce jointe introuvable.' });
            }

            const cheminAbsolu = path.join(process.cwd(), UPLOAD_DIR, piece.chemin_relatif);
            if (fs.existsSync(cheminAbsolu)) {
                fs.unlinkSync(cheminAbsolu);
            }

            await Plainte.deletePieceJointe(req.params.pieceId);

            await Plainte.addHistorique({
                plainte_id: req.params.id, action: 'SUPPRESSION_PIECE_JOINTE',
                description: `Pièce jointe supprimée : ${piece.nom_original}.`, user_id: req.user.id,
            });

            return res.json({ message: 'Pièce jointe supprimée avec succès.' });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = plainteController;
