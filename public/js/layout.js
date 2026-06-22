/**
 * Construit le layout applicatif commun (sidebar + topbar) pour toutes les pages
 * authentifiées. Appeler injecterLayout('id-page-active') au chargement de chaque page.
 */

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Tableau de bord', href: '/dashboard.html', icone: '📊' },
    { id: 'plaintes', label: 'Plaintes', href: '/plaintes.html', icone: '📁' },
    { id: 'utilisateurs', label: 'Utilisateurs', href: '/utilisateurs.html', icone: '👤' },
    { id: 'commissariats', label: 'Commissariats', href: '/commissariats.html', icone: '🏛️' },
    { id: 'brigades', label: 'Brigades', href: '/brigades.html', icone: '🚓' },
    { id: 'territoire', label: 'Territoire', href: '/territoire.html', icone: '🗺️' },
    { id: 'journaux', label: "Journaux d'audit", href: '/journaux.html', icone: '📜' },
];

function injecterLayout(pageActiveId, titrePage) {
    if (!requireLoginOrRedirect()) return;

    const user = Auth.getUser();

    const navHtml = NAV_ITEMS.map((item) => `
        <a href="${item.href}" class="nav-item ${item.id === pageActiveId ? 'actif' : ''}" style="text-decoration:none;">
            <span>${item.icone}</span><span>${item.label}</span>
        </a>
    `).join('');

    document.body.insertAdjacentHTML('afterbegin', `
        <div class="app-layout">
            <nav class="sidebar">
                <div class="logo-zone">
                    <div class="titre-app">Plateforme Justice &amp; Sécurité</div>
                    <div class="sous-titre-app">République du Congo</div>
                </div>
                ${navHtml}
                <div class="sidebar-footer">
                    Version 1.1 — Phase 2 (Plaintes)
                </div>
            </nav>
            <main class="main-content">
                <div class="topbar">
                    <h2>${titrePage || ''}</h2>
                    <div class="utilisateur-courant">
                        <span>${user ? `${user.prenom} ${user.nom}` : ''}</span>
                        <span class="badge-role">${user && user.role ? user.role : ''}</span>
                        <button class="bouton-deconnexion" id="btn-deconnexion-globale">Déconnexion</button>
                    </div>
                </div>
                <div id="contenu-page"></div>
            </main>
        </div>
    `);

    document.getElementById('btn-deconnexion-globale').addEventListener('click', async () => {
        await apiFetch('/auth/logout', { method: 'POST' });
        Auth.redirectToLogin();
    });
}

/** Raccourci pour insérer du HTML dans la zone de contenu de la page. */
function definirContenuPage(html) {
    document.getElementById('contenu-page').innerHTML = html;
}
