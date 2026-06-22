# Plateforme Justice & Sécurité — République du Congo

Plateforme web centralisée et sécurisée pour la Police, la Gendarmerie, la Justice et
l'Administration Pénitentiaire.

**Phase actuelle : Socle (Phase 1) + Module Plaintes (Phase 2)**
Authentification sécurisée, RBAC, gestion territoriale, commissariats, brigades,
dashboard administrateur national, journalisation complète, et désormais la
gestion complète des plaintes (création, victimes/témoins/suspects, pièces
jointes, historique, recherche multicritère).

Les modules métier restants (Enquêtes, Gardes à vue, Mandats, Gestion
pénitentiaire, Statistiques avancées...) seront livrés dans les phases suivantes.

---

## 1. Prérequis

- Node.js ≥ 18
- Un serveur MySQL 8.0+ accessible (local ou distant), avec un utilisateur disposant
  des droits de création de base de données.

## 2. Installation

```bash
cd plateforme-justice
npm install
```

## 3. Configuration

Copiez le fichier d'exemple et renseignez vos identifiants réels :

```bash
cp .env.example .env
```

Ouvrez `.env` et complétez au minimum :

```
DB_HOST=votre_host_mysql
DB_PORT=3306
DB_NAME=plateforme_justice
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe

JWT_SECRET=une_chaine_aleatoire_longue_et_secrete
JWT_REFRESH_SECRET=une_autre_chaine_aleatoire_longue_et_secrete
```

Pour générer des secrets robustes :

```bash
openssl rand -hex 64
```

## 4. Initialisation de la base de données

Cette commande crée la base si elle n'existe pas, applique le schéma complet
(`migrations/001_schema_socle.sql`) puis les données de référence — rôles,
permissions, services, départements du Congo (`migrations/002_seed_data.sql`).

```bash
npm run migrate
```

## 5. Création du compte Super Administrateur

Indispensable : sans cette étape, aucune connexion n'est possible.

```bash
npm run seed
```

Le script affiche **une seule fois** le matricule et le mot de passe temporaire
du compte Super Administrateur National. Notez-les immédiatement.

Vous pouvez personnaliser l'email et le mot de passe initial en les définissant
dans `.env` avant de lancer le seed :

```
SEED_ADMIN_EMAIL=admin@interieur.gouv.cg
SEED_ADMIN_PASSWORD=UnMotDePasseTemporaireSolide123
```

## 6. Démarrage

```bash
npm start
```

Ou en mode développement (rechargement automatique) :

```bash
npm run dev
```

L'application est accessible sur **http://localhost:3000**

- Page de connexion : `http://localhost:3000/connexion.html`
- Vérification de l'API : `http://localhost:3000/api/health`

À la première connexion, un changement de mot de passe est exigé.

---

## Structure du projet

```
plateforme-justice/
├── config/
│   └── database.js          # Pool de connexions MySQL
├── migrations/
│   ├── 001_schema_socle.sql # Schéma complet (tables, contraintes, index)
│   ├── 002_seed_data.sql    # Rôles, permissions, services, départements
│   ├── 003_schema_plaintes.sql      # Schéma du module Plaintes
│   ├── 004_seed_plaintes.sql        # Permissions du module Plaintes
│   ├── 005_seed_territoire_villes_quartiers.sql  # Villes, arrondissements, quartiers
│   ├── run-migrations.js    # Exécution automatique des migrations
│   └── seed.js               # Création du compte Super Administrateur
├── src/
│   ├── controllers/          # Logique des routes API
│   ├── middlewares/           # Auth JWT, RBAC, gestion d'erreurs
│   ├── models/                 # Accès aux données (requêtes SQL)
│   ├── routes/                  # Définition des routes Express
│   ├── services/                 # Logique métier (authentification, 2FA...)
│   └── server.js                  # Point d'entrée de l'application
├── public/                  # Frontend HTML/CSS/JS vanilla
│   ├── connexion.html
│   ├── changer-mot-de-passe.html
│   ├── dashboard.html
│   ├── utilisateurs.html
│   ├── commissariats.html
│   ├── brigades.html
│   ├── territoire.html
│   ├── journaux.html
│   ├── css/style.css
│   └── js/{api.js, layout.js}
├── .env.example
└── package.json
```

## Sécurité intégrée dans le socle

- Mots de passe hashés avec bcrypt (12 rounds)
- Authentification à deux facteurs (TOTP / Google Authenticator compatible)
- Verrouillage de compte après échecs répétés (configurable via `.env`)
- Déconnexion automatique après inactivité (configurable via `.env`)
- Journalisation de toutes les connexions (réussies et échouées)
- Journalisation de toutes les actions administratives sensibles (audit trail)
- RBAC granulaire : 17 rôles, permissions par module, contrôlé côté serveur
- Tokens JWT signés, sessions révocables côté serveur

## Module Plaintes (Phase 2)

- **Création** réservée aux OPJ (Police et Gendarmerie) ; le commissariat ou la
  brigade de rattachement est déduit automatiquement du profil de l'agent.
- **Numérotation automatique** au format `PL-AAAA-NNNNNN`, garantie unique même
  en cas de créations simultanées (transaction SQL).
- **Victimes, témoins, suspects** : gérés via des formulaires dédiés sur la
  fiche de la plainte (`/plainte-detail.html?id=...`).
- **Pièces jointes** : stockées sur disque dans `uploads/plaintes/` (chemin
  configurable via `UPLOAD_DIR` dans `.env`), limitées aux formats image, PDF
  et Word, taille maximale configurable (`UPLOAD_MAX_SIZE_MB`).
- **Historique** : chaque action sur une plainte (création, changement de
  statut, ajout de personne ou de pièce jointe) est tracée et consultable.
- **Recherche multicritère** : numéro, nom de personne, statut, nature de
  l'infraction, période, quartier — automatiquement restreinte selon les
  droits de l'utilisateur (vue nationale, par service, ou par unité).

⚠️ Le dossier `uploads/` n'est pas suivi par git (voir `.gitignore`). Pensez à
le sauvegarder régulièrement en production, séparément de la base de données.

## Données territoriales

La migration `005_seed_territoire_villes_quartiers.sql` pré-remplit les
villes, arrondissements et quartiers nécessaires au fonctionnement des
cascades de sélection (formulaires de commissariats, brigades, plaintes).
Sans cette migration, les listes déroulantes "Ville" et "Quartier" restent
vides après sélection d'un département.

Brazzaville (9 arrondissements) et Pointe-Noire (6 arrondissements) sont
détaillées selon leurs arrondissements officiels. Les autres départements
utilisent leur chef-lieu avec un arrondissement générique "Centre" et
quelques quartiers de référence — à compléter via la page **Gestion
territoriale** selon les besoins réels du terrain.

## Identifiants par défaut

Aucun compte par défaut n'est créé automatiquement à la migration. Le seul moyen
d'obtenir un premier accès est `npm run seed`, qui crée le compte Super
Administrateur National avec un mot de passe temporaire affiché une seule fois
en console.

## Prochaines phases (modules métier)

- Gestion des enquêtes
- Gardes à vue
- Mandats judiciaires
- Gestion pénitentiaire
- Statistiques décisionnelles avancées

====================================
# ==========================================
# Auteur: Eudes Mylhand
# Date:
#
# ==========================================