/**
 * Module partagé : appels API authentifiés, gestion du token et de la session.
 * NB: localStorage est utilisé ici car ce frontend est servi par notre propre
 * serveur Express (pas un artifact claude.ai où localStorage est interdit).
 */

const API_BASE = '/api';

const Auth = {
    getToken() {
        return localStorage.getItem('accessToken');
    },
    getSessionId() {
        return localStorage.getItem('sessionId');
    },
    getUser() {
        const raw = localStorage.getItem('currentUser');
        return raw ? JSON.parse(raw) : null;
    },
    setSession({ accessToken, sessionId, user }) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('sessionId', sessionId);
        localStorage.setItem('currentUser', JSON.stringify(user));
    },
    clearSession() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('currentUser');
    },
    isLoggedIn() {
        return !!this.getToken();
    },
    redirectToLogin() {
        this.clearSession();
        window.location.href = '/connexion.html';
    },
};

/**
 * Wrapper fetch qui injecte automatiquement le token JWT et le session-id,
 * et redirige vers la page de connexion en cas de session expirée/invalide.
 */
async function apiFetch(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const sessionId = Auth.getSessionId();
    if (sessionId) headers['X-Session-Id'] = sessionId;

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (response.status === 401) {
        const data = await response.json().catch(() => ({}));
        if (['TOKEN_EXPIRE', 'SESSION_INACTIVE', 'SESSION_INVALIDE', 'TOKEN_INVALIDE'].includes(data.error)) {
            alert(data.message || 'Votre session a expiré. Veuillez vous reconnecter.');
            Auth.redirectToLogin();
            return null;
        }
    }

    return response;
}

/**
 * Vérifie que l'utilisateur est connecté ; sinon redirige vers la page de connexion.
 * À appeler en haut de chaque page protégée.
 */
function requireLoginOrRedirect() {
    if (!Auth.isLoggedIn()) {
        window.location.href = '/connexion.html';
        return false;
    }
    return true;
}

/**
 * Affiche un message d'erreur dans un élément donné (id) et le rend visible.
 */
function afficherErreur(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
}

function masquerErreur(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.remove('visible');
}

function afficherSucces(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
}
