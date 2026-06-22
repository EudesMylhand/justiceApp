const { AuthService } = require('../services/authService');
const User = require('../models/User');

const authController = {
    async login(req, res, next) {
        try {
            const { identifier, password } = req.body;
            if (!identifier || !password) {
                return res.status(400).json({ error: 'CHAMPS_MANQUANTS', message: 'Identifiant et mot de passe requis.' });
            }

            const ip = req.ip;
            const userAgent = req.headers['user-agent'];

            const result = await AuthService.login({ identifier, password, ip, userAgent });
            return res.json(result);
        } catch (err) {
            next(err);
        }
    },

    async verifyTwoFactor(req, res, next) {
        try {
            const { challengeToken, code } = req.body;
            if (!challengeToken || !code) {
                return res.status(400).json({ error: 'CHAMPS_MANQUANTS', message: 'Jeton de vérification et code requis.' });
            }
            const ip = req.ip;
            const userAgent = req.headers['user-agent'];

            const result = await AuthService.verifyTwoFactorAndLogin({ challengeToken, code, ip, userAgent });
            return res.json(result);
        } catch (err) {
            next(err);
        }
    },

    async setupTwoFactor(req, res, next) {
        try {
            const result = await AuthService.setupTwoFactor(req.user.id);
            return res.json(result);
        } catch (err) {
            next(err);
        }
    },

    async confirmTwoFactor(req, res, next) {
        try {
            const { code } = req.body;
            await AuthService.confirmTwoFactorSetup(req.user.id, code);
            return res.json({ message: 'Authentification à deux facteurs activée avec succès.' });
        } catch (err) {
            next(err);
        }
    },

    async disableTwoFactor(req, res, next) {
        try {
            await AuthService.disableTwoFactor(req.user.id);
            return res.json({ message: 'Authentification à deux facteurs désactivée.' });
        } catch (err) {
            next(err);
        }
    },

    async requestPasswordReset(req, res, next) {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ error: 'CHAMPS_MANQUANTS', message: 'Email requis.' });
            }
            const result = await AuthService.requestPasswordReset(email);

            // TODO Phase suivante : envoyer réellement l'email via nodemailer (config SMTP dans .env)
            if (result) {
                console.log(`📧 [DEV] Lien de réinitialisation pour ${email} : /reset-password?token=${result.token}`);
            }

            // Réponse identique que l'email existe ou non (sécurité anti-énumération)
            return res.json({
                message: 'Si cet email existe dans notre système, un lien de réinitialisation a été envoyé.',
            });
        } catch (err) {
            next(err);
        }
    },

    async resetPassword(req, res, next) {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                return res.status(400).json({ error: 'CHAMPS_MANQUANTS', message: 'Jeton et nouveau mot de passe requis.' });
            }
            if (newPassword.length < 8) {
                return res.status(400).json({
                    error: 'MOT_DE_PASSE_FAIBLE',
                    message: 'Le mot de passe doit contenir au moins 8 caractères.',
                });
            }
            await AuthService.resetPassword(token, newPassword);
            return res.json({ message: 'Mot de passe réinitialisé avec succès.' });
        } catch (err) {
            next(err);
        }
    },

    async changeOwnPassword(req, res, next) {
        try {
            const { newPassword } = req.body;
            if (!newPassword || newPassword.length < 8) {
                return res.status(400).json({
                    error: 'MOT_DE_PASSE_FAIBLE',
                    message: 'Le mot de passe doit contenir au moins 8 caractères.',
                });
            }
            const hash = await AuthService.hashPassword(newPassword);
            await User.updatePassword(req.user.id, hash);
            return res.json({ message: 'Mot de passe mis à jour avec succès.' });
        } catch (err) {
            next(err);
        }
    },

    async me(req, res, next) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) return res.status(404).json({ error: 'UTILISATEUR_INTROUVABLE', message: 'Utilisateur introuvable.' });

            const { password_hash, two_factor_secret, reset_password_token, ...safeUser } = user;
            return res.json({ user: safeUser, permissions: req.user.permissions });
        } catch (err) {
            next(err);
        }
    },

    async logout(req, res, next) {
        try {
            const Session = require('../models/Session');
            if (req.sessionId) {
                await Session.revoke(req.sessionId);
            }
            return res.json({ message: 'Déconnexion réussie.' });
        } catch (err) {
            next(err);
        }
    },
};

module.exports = authController;
