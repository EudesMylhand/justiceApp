const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');

// Limite stricte sur les tentatives de connexion pour contrer le brute-force
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 tentatives par IP sur la fenêtre (le verrouillage par compte est géré en plus, côté service)
    message: { error: 'TROP_DE_TENTATIVES', message: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- Routes publiques ---
router.post('/login', loginLimiter, authController.login);
router.post('/login/verify-2fa', loginLimiter, authController.verifyTwoFactor);
router.post('/password/forgot', authController.requestPasswordReset);
router.post('/password/reset', authController.resetPassword);

// --- Routes authentifiées ---
router.get('/me', requireAuth, authController.me);
router.post('/logout', requireAuth, authController.logout);
router.post('/password/change', requireAuth, authController.changeOwnPassword);
router.post('/2fa/setup', requireAuth, authController.setupTwoFactor);
router.post('/2fa/confirm', requireAuth, authController.confirmTwoFactor);
router.post('/2fa/disable', requireAuth, authController.disableTwoFactor);

module.exports = router;
