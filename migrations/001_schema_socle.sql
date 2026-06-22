-- ============================================================================
-- SCHÉMA DE BASE DE DONNÉES - SOCLE (Phase 1)
-- Plateforme Web Centralisée - Police / Gendarmerie / Justice / Pénitentiaire
-- République du Congo
-- Moteur: MySQL 8.0+
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. GESTION TERRITORIALE
-- République du Congo → Départements → Villes → Arrondissements → Quartiers
-- ============================================================================

CREATE TABLE IF NOT EXISTS departements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    chef_lieu VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS villes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    departement_id INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (departement_id) REFERENCES departements(id) ON DELETE RESTRICT,
    UNIQUE KEY uniq_ville_departement (departement_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS arrondissements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ville_id INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ville_id) REFERENCES villes(id) ON DELETE RESTRICT,
    UNIQUE KEY uniq_arrondissement_ville (ville_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quartiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    arrondissement_id INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (arrondissement_id) REFERENCES arrondissements(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 2. RBAC : RÔLES, PERMISSIONS, SERVICES
-- ============================================================================

-- Grands services / administrations (Police, Gendarmerie, Justice, Pénitentiaire, Ministères)
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE, -- ex: POLICE, GENDARMERIE, JUSTICE, PENITENTIAIRE, MIN_INTERIEUR, MIN_JUSTICE
    nom VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    nom VARCHAR(150) NOT NULL,
    service_id INT NULL, -- NULL = rôle transverse (ex: super admin)
    description TEXT,
    niveau_hierarchique INT DEFAULT 0, -- pour ordonner / comparer les rôles
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE, -- ex: USERS_CREATE, COMMISSARIAT_MANAGE, PLAINTE_VIEW
    module VARCHAR(50) NOT NULL,       -- ex: USERS, TERRITOIRE, COMMISSARIAT, BRIGADE, PLAINTE...
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 3. COMMISSARIATS DE POLICE
-- ============================================================================

CREATE TABLE IF NOT EXISTS commissariats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    type ENUM('CENTRAL', 'ARRONDISSEMENT', 'SPECIALISE') NOT NULL DEFAULT 'ARRONDISSEMENT',

    -- Localisation
    departement_id INT NOT NULL,
    ville_id INT NOT NULL,
    arrondissement_id INT NULL,
    quartier_id INT NULL,
    adresse_complete TEXT,
    gps_latitude DECIMAL(10,7),
    gps_longitude DECIMAL(10,7),

    -- Ressources humaines (compteurs, peuvent aussi être calculés en vue)
    commissaire_id INT NULL,        -- FK vers users, défini après création de la table users
    commissaire_adjoint_id INT NULL,
    nombre_opj INT DEFAULT 0,
    nombre_apj INT DEFAULT 0,
    nombre_agents_total INT DEFAULT 0,

    -- Informations opérationnelles
    telephone VARCHAR(30),
    email_officiel VARCHAR(150),
    date_creation DATE,
    statut ENUM('ACTIF', 'INACTIF') NOT NULL DEFAULT 'ACTIF',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (departement_id) REFERENCES departements(id) ON DELETE RESTRICT,
    FOREIGN KEY (ville_id) REFERENCES villes(id) ON DELETE RESTRICT,
    FOREIGN KEY (arrondissement_id) REFERENCES arrondissements(id) ON DELETE SET NULL,
    FOREIGN KEY (quartier_id) REFERENCES quartiers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 4. BRIGADES DE GENDARMERIE
-- ============================================================================

CREATE TABLE IF NOT EXISTS brigades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    type ENUM('TERRITORIALE', 'MOBILE', 'FRONTALIERE', 'FLUVIALE') NOT NULL DEFAULT 'TERRITORIALE',

    -- Localisation
    departement_id INT NOT NULL,
    ville_id INT NOT NULL,
    quartier_id INT NULL,
    adresse_complete TEXT,
    gps_latitude DECIMAL(10,7),
    gps_longitude DECIMAL(10,7),

    -- Effectif
    commandant_id INT NULL,         -- FK vers users
    commandant_adjoint_id INT NULL,
    nombre_opj INT DEFAULT 0,
    nombre_apj INT DEFAULT 0,
    nombre_agents_total INT DEFAULT 0,

    telephone VARCHAR(30),
    email_officiel VARCHAR(150),
    date_creation DATE,
    statut ENUM('ACTIF', 'INACTIF') NOT NULL DEFAULT 'ACTIF',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (departement_id) REFERENCES departements(id) ON DELETE RESTRICT,
    FOREIGN KEY (ville_id) REFERENCES villes(id) ON DELETE RESTRICT,
    FOREIGN KEY (quartier_id) REFERENCES quartiers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 5. AUTRES STRUCTURES D'AFFECTATION (Parquets, Tribunaux, Prisons, Ministères)
-- Modélisées de façon légère ici ; seront enrichies dans les modules métier futurs
-- ============================================================================

CREATE TABLE IF NOT EXISTS parquets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    ville_id INT NOT NULL,
    statut ENUM('ACTIF', 'INACTIF') NOT NULL DEFAULT 'ACTIF',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ville_id) REFERENCES villes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tribunaux (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    ville_id INT NOT NULL,
    statut ENUM('ACTIF', 'INACTIF') NOT NULL DEFAULT 'ACTIF',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ville_id) REFERENCES villes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS prisons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    ville_id INT NOT NULL,
    capacite_max INT DEFAULT 0,
    statut ENUM('ACTIF', 'INACTIF') NOT NULL DEFAULT 'ACTIF',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ville_id) REFERENCES villes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ministeres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 6. UTILISATEURS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matricule VARCHAR(30) NOT NULL UNIQUE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telephone VARCHAR(30),

    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    grade VARCHAR(100),
    photo_url VARCHAR(255),

    -- Affectation (un seul de ces champs devrait être renseigné selon le type de structure)
    commissariat_id INT NULL,
    brigade_id INT NULL,
    parquet_id INT NULL,
    tribunal_id INT NULL,
    prison_id INT NULL,
    ministere_id INT NULL,

    -- Sécurité du compte
    statut ENUM('ACTIF', 'INACTIF', 'SUSPENDU') NOT NULL DEFAULT 'ACTIF',
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret VARCHAR(255) NULL,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,

    -- Réinitialisation mot de passe
    reset_password_token VARCHAR(255) NULL,
    reset_password_expires TIMESTAMP NULL,

    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    FOREIGN KEY (commissariat_id) REFERENCES commissariats(id) ON DELETE SET NULL,
    FOREIGN KEY (brigade_id) REFERENCES brigades(id) ON DELETE SET NULL,
    FOREIGN KEY (parquet_id) REFERENCES parquets(id) ON DELETE SET NULL,
    FOREIGN KEY (tribunal_id) REFERENCES tribunaux(id) ON DELETE SET NULL,
    FOREIGN KEY (prison_id) REFERENCES prisons(id) ON DELETE SET NULL,
    FOREIGN KEY (ministere_id) REFERENCES ministeres(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ajout des FK différées vers users pour commissariats / brigades (responsables)
ALTER TABLE commissariats
    ADD CONSTRAINT fk_commissariat_commissaire FOREIGN KEY (commissaire_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_commissariat_commissaire_adjoint FOREIGN KEY (commissaire_adjoint_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE brigades
    ADD CONSTRAINT fk_brigade_commandant FOREIGN KEY (commandant_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_brigade_commandant_adjoint FOREIGN KEY (commandant_adjoint_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- 7. JOURNALISATION DES CONNEXIONS ET ACTIONS (AUDIT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS connexion_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL, -- NULL si tentative avec identifiant inconnu
    matricule_ou_email_saisi VARCHAR(150),
    statut ENUM('SUCCES', 'ECHEC_MOT_DE_PASSE', 'ECHEC_2FA', 'COMPTE_BLOQUE', 'COMPTE_INACTIF') NOT NULL,
    adresse_ip VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,         -- ex: USER_CREATED, COMMISSARIAT_UPDATED, ROLE_CHANGED
    module VARCHAR(50) NOT NULL,
    entite_type VARCHAR(50),              -- ex: 'user', 'commissariat', 'brigade'
    entite_id INT,
    details JSON,
    adresse_ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 8. SESSIONS ACTIVES (pour gestion de l'inactivité et déconnexion forcée)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY, -- UUID
    user_id INT NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    adresse_ip VARCHAR(45),
    user_agent VARCHAR(255),
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- INDEX COMPLÉMENTAIRES POUR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_commissariat ON users(commissariat_id);
CREATE INDEX idx_users_brigade ON users(brigade_id);
CREATE INDEX idx_commissariats_statut ON commissariats(statut);
CREATE INDEX idx_brigades_statut ON brigades(statut);
CREATE INDEX idx_connexion_logs_user ON connexion_logs(user_id);
CREATE INDEX idx_connexion_logs_date ON connexion_logs(created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);

SET FOREIGN_KEY_CHECKS = 1;
