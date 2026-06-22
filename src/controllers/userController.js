const User = require('../models/User');
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');
const { AuthService } = require('../services/authService');
const crypto = require('crypto');

function generateMatricule(roleCode) {
    const prefix = roleCode.slice(0, 3).toUpperCase();
    const random = crypto.randomInt(100000, 999999);
    return `${prefix}-${random}`;
}

function generateTemporaryPassword() {
    return crypto.randomBytes(6).toString('hex'); // 12 caractères hexadécimaux
}

const userController = {
    async list(req, res, next) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 50;
            const offset = (page - 1) * limit;

            const users = await User.findAll({ limit, offset });
            const total = await User.count();

            return res.json({ users, total, page, limit });
        } catch (err) {
            next(err);
        }
    },

    async getOne(req, res, next) {
        try {
            const user = await User.findById(req.params.id);
            if (!user) return res.status(404).json({ error: 'UTILISATEUR_INTROUVABLE', message: 'Utilisateur introuvable.' });

            const { password_hash, two_factor_secret, reset_password_token, ...safeUser } = user;
            return res.json({ user: safeUser });
        } catch (err) {
            next(err);
        }
    },

    async create(req, res, next) {
        try {
            const {
                nom, prenom, email, telephone, role_id, grade,
                commissariat_id, brigade_id, parquet_id, tribunal_id, prison_id, ministere_id,
            } = req.body;

            if (!nom || !prenom || !email || !role_id) {
                return res.status(400).json({
                    error: 'CHAMPS_MANQUANTS',
                    message: 'Nom, prénom, email et rôle sont obligatoires.',
                });
            }

            const role = await Role.findById(role_id);
            if (!role) {
                return res.status(400).json({ error: 'ROLE_INVALIDE', message: 'Le rôle spécifié n\'existe pas.' });
            }

            const matricule = generateMatricule(role.code);
            const tempPassword = generateTemporaryPassword();
            const password_hash = await AuthService.hashPassword(tempPassword);

            const newUserId = await User.create({
                matricule, nom, prenom, email, telephone, password_hash, role_id, grade,
                commissariat_id, brigade_id, parquet_id, tribunal_id, prison_id, ministere_id,
                created_by: req.user.id,
            });

            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'USER_CREATED',
                module: 'USERS',
                entite_type: 'user',
                entite_id: newUserId,
                details: { matricule, role: role.code },
                adresse_ip: req.ip,
            });

            // TODO Phase suivante : envoyer matricule + mot de passe temporaire par email/SMS plutôt que de l'exposer ici
            return res.status(201).json({
                message: 'Utilisateur créé avec succès.',
                userId: newUserId,
                matricule,
                temporaryPassword: tempPassword, // À transmettre de façon sécurisée en production (email chiffré, remise en main propre, etc.)
            });
        } catch (err) {
            next(err);
        }
    },

    async update(req, res, next) {
        try {
            const updated = await User.update(req.params.id, req.body);
            if (!updated) {
                return res.status(400).json({ error: 'AUCUNE_MODIFICATION', message: 'Aucun champ valide à mettre à jour.' });
            }

            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'USER_UPDATED',
                module: 'USERS',
                entite_type: 'user',
                entite_id: req.params.id,
                details: req.body,
                adresse_ip: req.ip,
            });

            return res.json({ message: 'Utilisateur mis à jour avec succès.' });
        } catch (err) {
            next(err);
        }
    },

    async deactivate(req, res, next) {
        try {
            await User.setStatut(req.params.id, 'INACTIF');
            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'USER_DEACTIVATED',
                module: 'USERS',
                entite_type: 'user',
                entite_id: req.params.id,
                adresse_ip: req.ip,
            });
            return res.json({ message: 'Utilisateur désactivé avec succès.' });
        } catch (err) {
            next(err);
        }
    },

    async reactivate(req, res, next) {
        try {
            await User.setStatut(req.params.id, 'ACTIF');
            await AuditLog.logAction({
                user_id: req.user.id,
                action: 'USER_REACTIVATED',
                module: 'USERS',
                entite_type: 'user',
                entite_id: req.params.id,
                adresse_ip: req.ip,
            });
            return res.json({ message: 'Utilisateur réactivé avec succès.' });
        } catch (err) {
            next(err);
        }
    },

    async listRoles(req, res, next) {
        try {
            const roles = await Role.findAll();
            return res.json({ roles });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = userController;
