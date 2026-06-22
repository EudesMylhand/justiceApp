-- ============================================================================
-- SCHÉMA DE BASE DE DONNÉES - MODULE PLAINTES (Phase 2)
-- À exécuter après 001_schema_socle.sql et 002_seed_data.sql
-- Moteur: MySQL 8.0+
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- 1. PLAINTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS plaintes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_unique VARCHAR(30) NOT NULL UNIQUE, -- ex: PL-2026-000123

    -- Qualification de l'infraction
    nature_infraction VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    date_infraction DATETIME NULL,
    date_enregistrement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Localisation (niveau quartier/arrondissement, conformément au socle territorial)
    departement_id INT NOT NULL,
    ville_id INT NOT NULL,
    arrondissement_id INT NULL,
    quartier_id INT NULL,
    lieu_precis VARCHAR(255), -- complément texte libre (ex: "près du marché central")

    -- Structure rattachée (l'une des deux selon le service du déclarant)
    commissariat_id INT NULL,
    brigade_id INT NULL,

    -- Suivi
    statut ENUM(
        'ENREGISTREE',
        'EN_ENQUETE',
        'TRANSMISE_PARQUET',
        'CLASSEE_SANS_SUITE',
        'CLOTUREE'
    ) NOT NULL DEFAULT 'ENREGISTREE',

    declarant_id INT NOT NULL, -- OPJ ayant enregistré la plainte
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (departement_id) REFERENCES departements(id) ON DELETE RESTRICT,
    FOREIGN KEY (ville_id) REFERENCES villes(id) ON DELETE RESTRICT,
    FOREIGN KEY (arrondissement_id) REFERENCES arrondissements(id) ON DELETE SET NULL,
    FOREIGN KEY (quartier_id) REFERENCES quartiers(id) ON DELETE SET NULL,
    FOREIGN KEY (commissariat_id) REFERENCES commissariats(id) ON DELETE SET NULL,
    FOREIGN KEY (brigade_id) REFERENCES brigades(id) ON DELETE SET NULL,
    FOREIGN KEY (declarant_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 2. VICTIMES
-- ============================================================================

CREATE TABLE IF NOT EXISTS plainte_victimes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plainte_id INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    date_naissance DATE NULL,
    sexe ENUM('M', 'F') NULL,
    telephone VARCHAR(30),
    adresse TEXT,
    piece_identite_type VARCHAR(50), -- ex: CNI, Passeport, Acte de naissance
    piece_identite_numero VARCHAR(50),
    observations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (plainte_id) REFERENCES plaintes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 3. TÉMOINS
-- ============================================================================

CREATE TABLE IF NOT EXISTS plainte_temoins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plainte_id INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    telephone VARCHAR(30),
    adresse TEXT,
    declaration TEXT, -- résumé du témoignage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (plainte_id) REFERENCES plaintes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 4. SUSPECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS plainte_suspects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plainte_id INT NOT NULL,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    surnom VARCHAR(100),
    description_physique TEXT, -- utile si identité inconnue
    date_naissance DATE NULL,
    adresse TEXT,
    statut ENUM('RECHERCHE', 'IDENTIFIE', 'INTERPELLE', 'MIS_HORS_DE_CAUSE') NOT NULL DEFAULT 'RECHERCHE',
    observations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (plainte_id) REFERENCES plaintes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 5. PIÈCES JOINTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS plainte_pieces_jointes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plainte_id INT NOT NULL,
    nom_original VARCHAR(255) NOT NULL,
    nom_fichier_stocke VARCHAR(255) NOT NULL, -- nom unique sur disque (UUID + extension)
    chemin_relatif VARCHAR(500) NOT NULL,     -- chemin relatif dans /uploads
    type_mime VARCHAR(100),
    taille_octets INT,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (plainte_id) REFERENCES plaintes(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 6. HISTORIQUE DES ACTIONS SUR LA PLAINTE (traçabilité métier, distincte de l'audit technique)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plainte_historique (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plainte_id INT NOT NULL,
    action VARCHAR(100) NOT NULL, -- ex: CREATION, CHANGEMENT_STATUT, AJOUT_VICTIME, AJOUT_PIECE_JOINTE
    description TEXT,
    ancien_statut VARCHAR(30) NULL,
    nouveau_statut VARCHAR(30) NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (plainte_id) REFERENCES plaintes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- INDEX POUR PERFORMANCE (recherche multicritère)
-- ============================================================================

CREATE INDEX idx_plaintes_numero ON plaintes(numero_unique);
CREATE INDEX idx_plaintes_statut ON plaintes(statut);
CREATE INDEX idx_plaintes_date_enregistrement ON plaintes(date_enregistrement);
CREATE INDEX idx_plaintes_commissariat ON plaintes(commissariat_id);
CREATE INDEX idx_plaintes_brigade ON plaintes(brigade_id);
CREATE INDEX idx_plaintes_declarant ON plaintes(declarant_id);
CREATE INDEX idx_plaintes_quartier ON plaintes(quartier_id);
CREATE INDEX idx_plainte_victimes_nom ON plainte_victimes(nom, prenom);
CREATE INDEX idx_plainte_suspects_nom ON plainte_suspects(nom, prenom);
CREATE INDEX idx_plainte_historique_plainte ON plainte_historique(plainte_id);

SET FOREIGN_KEY_CHECKS = 1;
