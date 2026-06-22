const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const crypto = require('crypto');

const User = require('../models/User');
const Role = require('../models/Role');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5;
const LOGIN_LOCKOUT_MINUTES = parseInt(process.env.LOGIN_LOCKOUT_MINUTES, 10) || 15;

const AuthService = {
    /**
     * Étape 1 du login : vérifie identifiant + mot de passe.
     * Retourne soit un succès direct (si 2FA désactivée), soit une demande de code 2FA.
     */
    async login({ identifier, password, ip, userAgent }) {
        const user = await User.findByLoginIdentifier(identifier);

        if (!user) {
            await AuditLog.logConnexion({
                matricule_ou_email_saisi: identifier,
                statut: 'ECHEC_MOT_DE_PASSE',
                adresse_ip: ip,
                user_agent: userAgent,
            });
            throw new AuthError('IDENTIFIANTS_INVALIDES', 'Identifiant ou mot de passe incorrect.');
        }

        // Vérification du verrouillage du compte
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            await AuditLog.logConnexion({
                user_id: user.id,
                matricule_ou_email_saisi: identifier,
                statut: 'COMPTE_BLOQUE',
                adresse_ip: ip,
                user_agent: userAgent,
            });
            throw new AuthError(
                'COMPTE_BLOQUE',
                `Compte temporairement bloqué suite à plusieurs échecs. Réessayez plus tard.`
            );
        }

        if (user.statut !== 'ACTIF') {
            await AuditLog.logConnexion({
                user_id: user.id,
                matricule_ou_email_saisi: identifier,
                statut: 'COMPTE_INACTIF',
                adresse_ip: ip,
                user_agent: userAgent,
            });
            throw new AuthError('COMPTE_INACTIF', 'Ce compte est inactif ou suspendu.');
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatches) {
            await User.incrementFailedAttempts(user.id);

            const updatedAttempts = user.failed_login_attempts + 1;
            if (updatedAttempts >= MAX_LOGIN_ATTEMPTS) {
                const lockUntil = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000);
                await User.lockUntil(user.id, lockUntil);
            }

            await AuditLog.logConnexion({
                user_id: user.id,
                matricule_ou_email_saisi: identifier,
                statut: 'ECHEC_MOT_DE_PASSE',
                adresse_ip: ip,
                user_agent: userAgent,
            });
            throw new AuthError('IDENTIFIANTS_INVALIDES', 'Identifiant ou mot de passe incorrect.');
        }

        // Mot de passe correct : reset des compteurs d'échec
        await User.resetFailedAttempts(user.id);

        // Si 2FA activée, on ne génère pas encore le token final
        if (user.two_factor_enabled) {
            const challengeToken = jwt.sign(
                { sub: user.id, type: '2fa_challenge' },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );
            return { requiresTwoFactor: true, challengeToken };
        }

        return this._finalizeLogin({ user, ip, userAgent });
    },

    /**
     * Étape 2 du login (si 2FA activée) : vérifie le code TOTP puis finalise.
     */
    async verifyTwoFactorAndLogin({ challengeToken, code, ip, userAgent }) {
        let payload;
        try {
            payload = jwt.verify(challengeToken, process.env.JWT_SECRET);
        } catch {
            throw new AuthError('CHALLENGE_INVALIDE', 'Session de vérification expirée, veuillez vous reconnecter.');
        }
        if (payload.type !== '2fa_challenge') {
            throw new AuthError('CHALLENGE_INVALIDE', 'Jeton de vérification invalide.');
        }

        const user = await User.findById(payload.sub);
        if (!user) throw new AuthError('IDENTIFIANTS_INVALIDES', 'Utilisateur introuvable.');

        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: code,
            window: 1,
        });

        if (!verified) {
            await AuditLog.logConnexion({
                user_id: user.id,
                statut: 'ECHEC_2FA',
                adresse_ip: ip,
                user_agent: userAgent,
            });
            throw new AuthError('CODE_2FA_INVALIDE', 'Code de vérification incorrect.');
        }

        return this._finalizeLogin({ user, ip, userAgent });
    },

    async _finalizeLogin({ user, ip, userAgent }) {
        const permissions = await Role.getPermissions(user.role_id);

        const accessToken = jwt.sign(
            {
                sub: user.id,
                matricule: user.matricule,
                role: user.role_code,
                permissions,
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        const refreshTokenRaw = crypto.randomBytes(40).toString('hex');
        const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours par défaut
        const sessionId = await Session.create({
            user_id: user.id,
            refresh_token_hash: refreshTokenHash,
            adresse_ip: ip,
            user_agent: userAgent,
            expires_at: expiresAt,
        });

        await User.updateLastLogin(user.id);
        await AuditLog.logConnexion({
            user_id: user.id,
            statut: 'SUCCES',
            adresse_ip: ip,
            user_agent: userAgent,
        });

        return {
            requiresTwoFactor: false,
            accessToken,
            refreshToken: refreshTokenRaw,
            sessionId,
            mustChangePassword: !!user.must_change_password,
            user: {
                id: user.id,
                matricule: user.matricule,
                nom: user.nom,
                prenom: user.prenom,
                email: user.email,
                role: user.role_code,
                roleNom: user.role_nom,
            },
        };
    },

    /**
     * Initialise l'activation de la 2FA : génère un secret et un QR code à scanner.
     */
    async setupTwoFactor(userId) {
        const user = await User.findById(userId);
        if (!user) throw new AuthError('UTILISATEUR_INTROUVABLE', 'Utilisateur introuvable.');

        const secret = speakeasy.generateSecret({
            name: `${process.env.TWO_FACTOR_APP_NAME || 'PlateformeJustice'} (${user.matricule})`,
        });

        await User.setTwoFactorSecret(userId, secret.base32);
        return { otpauthUrl: secret.otpauth_url, base32Secret: secret.base32 };
    },

    async confirmTwoFactorSetup(userId, code) {
        const user = await User.findById(userId);
        if (!user || !user.two_factor_secret) {
            throw new AuthError('2FA_NON_INITIALISEE', 'Veuillez d\'abord initialiser la 2FA.');
        }
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: code,
            window: 1,
        });
        if (!verified) throw new AuthError('CODE_2FA_INVALIDE', 'Code de vérification incorrect.');

        await User.enableTwoFactor(userId);
        return true;
    },

    async disableTwoFactor(userId) {
        await User.disableTwoFactor(userId);
    },

    /**
     * Génère un token de réinitialisation de mot de passe (à envoyer par email).
     */
    async requestPasswordReset(email) {
        const user = await User.findByEmail(email);
        // On ne révèle pas si l'email existe ou non (sécurité)
        if (!user) return null;

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
        await User.setResetToken(user.id, token, expires);
        return { token, user };
    },

    async resetPassword(token, newPassword) {
        const user = await User.findByResetToken(token);
        if (!user) {
            throw new AuthError('TOKEN_INVALIDE', 'Lien de réinitialisation invalide ou expiré.');
        }
        const hash = await bcrypt.hash(newPassword, 12);
        await User.updatePassword(user.id, hash);
        await User.clearResetToken(user.id);
        await Session.revokeAllForUser(user.id); // sécurité : on déconnecte toutes les sessions
        return true;
    },

    async hashPassword(password) {
        return bcrypt.hash(password, 12);
    },
};

class AuthError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'AuthError';
    }
}

module.exports = { AuthService, AuthError };
