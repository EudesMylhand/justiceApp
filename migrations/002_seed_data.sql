-- ============================================================================
-- DONNÉES INITIALES (SEED) - Rôles, Permissions, Services
-- À exécuter après 001_schema_socle.sql
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- SERVICES
-- ----------------------------------------------------------------------------
INSERT INTO services (code, nom, description) VALUES
('POLICE', 'Police Nationale', 'Police Nationale de la République du Congo'),
('GENDARMERIE', 'Gendarmerie Nationale', 'Gendarmerie Nationale de la République du Congo'),
('JUSTICE', 'Justice', 'Parquets, Tribunaux et services judiciaires'),
('PENITENTIAIRE', 'Administration Pénitentiaire', 'Gestion des établissements pénitentiaires'),
('MIN_INTERIEUR', 'Ministère de l''Intérieur', 'Tutelle Police et Gendarmerie'),
('MIN_JUSTICE', 'Ministère de la Justice', 'Tutelle Parquets, Tribunaux et Prisons')
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- RÔLES
-- ----------------------------------------------------------------------------

-- Rôle transverse (sans service)
INSERT INTO roles (code, nom, service_id, description, niveau_hierarchique) VALUES
('SUPER_ADMIN', 'Super Administrateur National', NULL, 'Accès total à la plateforme', 100)
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- Ministère de l'Intérieur
INSERT INTO roles (code, nom, service_id, description, niveau_hierarchique)
SELECT 'ADMIN_MIN_INTERIEUR', 'Administrateur Ministère de l''Intérieur', id, 'Gestion Police et Gendarmerie', 90
FROM services WHERE code = 'MIN_INTERIEUR'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- Ministère de la Justice
INSERT INTO roles (code, nom, service_id, description, niveau_hierarchique)
SELECT 'ADMIN_MIN_JUSTICE', 'Administrateur Ministère de la Justice', id, 'Gestion Parquets, Tribunaux et Prisons', 90
FROM services WHERE code = 'MIN_JUSTICE'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- Police Nationale
INSERT INTO roles (code, nom, service_id, description, niveau_hierarchique)
SELECT r.code, r.nom, s.id, r.description, r.niveau
FROM services s
JOIN (
    SELECT 'AGENT_POLICE' AS code, 'Agent de Police' AS nom, 'Consultation et saisie selon les droits accordés' AS description, 10 AS niveau
    UNION ALL SELECT 'OPJ_POLICE', 'Officier de Police Judiciaire (OPJ)', 'Gestion des enquêtes', 30
    UNION ALL SELECT 'CHEF_COMMISSARIAT', 'Chef de Commissariat / Commissaire', 'Gestion de son commissariat', 60
) r
WHERE s.code = 'POLICE'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- Gendarmerie Nationale
INSERT INTO roles (code, nom, service_id, description, niveau_hierarchique)
SELECT r.code, r.nom, s.id, r.description, r.niveau
FROM services s
JOIN (
    SELECT 'AGENT_GENDARMERIE' AS code, 'Agent de Gendarmerie' AS nom, 'Consultation et saisie selon les droits accordés' AS description, 10 AS niveau
    UNION ALL SELECT 'OPJ_GENDARMERIE', 'Officier de Police Judiciaire (Gendarmerie)', 'Gestion des enquêtes', 30
    UNION ALL SELECT 'COMMANDANT_BRIGADE', 'Commandant de Brigade', 'Gestion de sa brigade', 60
) r
WHERE s.code = 'GENDARMERIE'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- Justice
INSERT INTO roles (code, nom, service_id, description, niveau_hierarchique)
SELECT r.code, r.nom, s.id, r.description, r.niveau
FROM services s
JOIN (
    SELECT 'PROCUREUR' AS code, 'Procureur' AS nom, 'Gestion de son parquet, des procédures et de l''activité pénale' AS description, 70 AS niveau
    UNION ALL SELECT 'SUBSTITUT_PROCUREUR', 'Substitut du Procureur', 'Assiste le Procureur dans la gestion des procédures', 50
    UNION ALL SELECT 'JUGE_INSTRUCTION', 'Juge d''Instruction', 'Gestion des dossiers judiciaires en instruction', 60
    UNION ALL SELECT 'JUGE', 'Juge', 'Gestion des dossiers judiciaires', 60
    UNION ALL SELECT 'PRESIDENT_TRIBUNAL', 'Président du Tribunal', 'Gestion du tribunal et des audiences', 70
    UNION ALL SELECT 'GREFFIER', 'Greffier', 'Gestion administrative et documentaire des audiences', 30
) r
WHERE s.code = 'JUSTICE'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- Administration Pénitentiaire
INSERT INTO roles (code, nom, service_id, description, niveau_hierarchique)
SELECT r.code, r.nom, s.id, r.description, r.niveau
FROM services s
JOIN (
    SELECT 'REGISSEUR' AS code, 'Régisseur de Prison' AS nom, 'Gestion pénitentiaire de sa prison' AS description, 60 AS niveau
    UNION ALL SELECT 'SURVEILLANT_PENITENTIAIRE', 'Surveillant Pénitentiaire', 'Surveillance et mouvements internes', 20
    UNION ALL SELECT 'DIRECTEUR_PRISON', 'Directeur de Prison', 'Direction de l''établissement pénitentiaire', 70
) r
WHERE s.code = 'PENITENTIAIRE'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- PERMISSIONS (socle : utilisateurs, territoire, commissariats, brigades, audit)
-- ----------------------------------------------------------------------------
INSERT INTO permissions (code, module, description) VALUES
-- Utilisateurs
('USERS_VIEW_ALL', 'USERS', 'Consulter tous les utilisateurs de la plateforme'),
('USERS_VIEW_SERVICE', 'USERS', 'Consulter les utilisateurs de son service uniquement'),
('USERS_VIEW_UNIT', 'USERS', 'Consulter les utilisateurs de sa structure (commissariat/brigade/etc.)'),
('USERS_CREATE', 'USERS', 'Créer un utilisateur'),
('USERS_UPDATE', 'USERS', 'Modifier un utilisateur'),
('USERS_DELETE', 'USERS', 'Supprimer / désactiver un utilisateur'),
('USERS_MANAGE_ROLES', 'USERS', 'Attribuer ou modifier les rôles des utilisateurs'),

-- Territoire
('TERRITOIRE_VIEW', 'TERRITOIRE', 'Consulter la structure territoriale'),
('TERRITOIRE_MANAGE', 'TERRITOIRE', 'Créer/modifier départements, villes, arrondissements, quartiers'),

-- Commissariats
('COMMISSARIAT_VIEW_ALL', 'COMMISSARIAT', 'Consulter tous les commissariats'),
('COMMISSARIAT_VIEW_OWN', 'COMMISSARIAT', 'Consulter son propre commissariat'),
('COMMISSARIAT_CREATE', 'COMMISSARIAT', 'Créer un commissariat'),
('COMMISSARIAT_UPDATE_ALL', 'COMMISSARIAT', 'Modifier n''importe quel commissariat'),
('COMMISSARIAT_UPDATE_OWN', 'COMMISSARIAT', 'Modifier son propre commissariat'),
('COMMISSARIAT_DELETE', 'COMMISSARIAT', 'Supprimer / désactiver un commissariat'),

-- Brigades
('BRIGADE_VIEW_ALL', 'BRIGADE', 'Consulter toutes les brigades'),
('BRIGADE_VIEW_OWN', 'BRIGADE', 'Consulter sa propre brigade'),
('BRIGADE_CREATE', 'BRIGADE', 'Créer une brigade'),
('BRIGADE_UPDATE_ALL', 'BRIGADE', 'Modifier n''importe quelle brigade'),
('BRIGADE_UPDATE_OWN', 'BRIGADE', 'Modifier sa propre brigade'),
('BRIGADE_DELETE', 'BRIGADE', 'Supprimer / désactiver une brigade'),

-- Dashboard / Statistiques
('DASHBOARD_NATIONAL_VIEW', 'DASHBOARD', 'Voir le tableau de bord national complet'),
('DASHBOARD_SERVICE_VIEW', 'DASHBOARD', 'Voir le tableau de bord de son service'),
('DASHBOARD_UNIT_VIEW', 'DASHBOARD', 'Voir le tableau de bord de sa structure'),

-- Audit
('AUDIT_VIEW', 'AUDIT', 'Consulter les journaux d''audit et de connexion')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ----------------------------------------------------------------------------
-- ATTRIBUTION DES PERMISSIONS AUX RÔLES
-- ----------------------------------------------------------------------------

-- SUPER_ADMIN : toutes les permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ADMIN_MIN_INTERIEUR : gestion Police + Gendarmerie (vue large, pas suppression d'utilisateurs hors périmètre)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN_MIN_INTERIEUR'
AND p.code IN (
    'USERS_VIEW_ALL', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_MANAGE_ROLES',
    'TERRITOIRE_VIEW',
    'COMMISSARIAT_VIEW_ALL', 'COMMISSARIAT_CREATE', 'COMMISSARIAT_UPDATE_ALL', 'COMMISSARIAT_DELETE',
    'BRIGADE_VIEW_ALL', 'BRIGADE_CREATE', 'BRIGADE_UPDATE_ALL', 'BRIGADE_DELETE',
    'DASHBOARD_NATIONAL_VIEW', 'DASHBOARD_SERVICE_VIEW',
    'AUDIT_VIEW'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ADMIN_MIN_JUSTICE : gestion Parquets/Tribunaux/Prisons (socle limité ici aux droits transverses pertinents)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN_MIN_JUSTICE'
AND p.code IN (
    'USERS_VIEW_ALL', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_MANAGE_ROLES',
    'TERRITOIRE_VIEW',
    'DASHBOARD_NATIONAL_VIEW', 'DASHBOARD_SERVICE_VIEW',
    'AUDIT_VIEW'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- CHEF_COMMISSARIAT (Commissaire) : gestion de son commissariat uniquement
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'CHEF_COMMISSARIAT'
AND p.code IN (
    'USERS_VIEW_UNIT', 'USERS_CREATE', 'USERS_UPDATE',
    'TERRITOIRE_VIEW',
    'COMMISSARIAT_VIEW_OWN', 'COMMISSARIAT_UPDATE_OWN',
    'DASHBOARD_UNIT_VIEW'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- COMMANDANT_BRIGADE : gestion de sa brigade uniquement
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'COMMANDANT_BRIGADE'
AND p.code IN (
    'USERS_VIEW_UNIT', 'USERS_CREATE', 'USERS_UPDATE',
    'TERRITOIRE_VIEW',
    'BRIGADE_VIEW_OWN', 'BRIGADE_UPDATE_OWN',
    'DASHBOARD_UNIT_VIEW'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- OPJ (Police et Gendarmerie) : consultation + saisie de base
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('OPJ_POLICE', 'OPJ_GENDARMERIE')
AND p.code IN ('USERS_VIEW_UNIT', 'DASHBOARD_UNIT_VIEW')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Agents : consultation minimale
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('AGENT_POLICE', 'AGENT_GENDARMERIE')
AND p.code IN ('DASHBOARD_UNIT_VIEW')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- PROCUREUR : gestion de son parquet
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'PROCUREUR'
AND p.code IN ('USERS_VIEW_UNIT', 'DASHBOARD_UNIT_VIEW')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- REGISSEUR : gestion de sa prison
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'REGISSEUR'
AND p.code IN ('USERS_VIEW_UNIT', 'USERS_CREATE', 'USERS_UPDATE', 'DASHBOARD_UNIT_VIEW')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ----------------------------------------------------------------------------
-- DONNÉES TERRITORIALES DE BASE (Départements de la République du Congo)
-- ----------------------------------------------------------------------------
INSERT INTO departements (nom, code, chef_lieu) VALUES
('Brazzaville', 'BZV', 'Brazzaville'),
('Pointe-Noire', 'PNR', 'Pointe-Noire'),
('Bouenza', 'BOU', 'Madingou'),
('Cuvette', 'CUV', 'Owando'),
('Cuvette-Ouest', 'CUO', 'Ewo'),
('Kouilou', 'KOU', 'Hinda'),
('Lékoumou', 'LEK', 'Sibiti'),
('Likouala', 'LIK', 'Impfondo'),
('Niari', 'NIA', 'Dolisie'),
('Plateaux', 'PLA', 'Djambala'),
('Pool', 'POO', 'Kinkala'),
('Sangha', 'SAN', 'Ouesso')
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- MINISTÈRES
-- ----------------------------------------------------------------------------
INSERT INTO ministeres (nom, code) VALUES
('Ministère de l''Intérieur et de la Décentralisation', 'MIN_INTERIEUR'),
('Ministère de la Justice, des Droits Humains et de la Promotion des Peuples Autochtones', 'MIN_JUSTICE')
ON DUPLICATE KEY UPDATE nom = VALUES(nom);
