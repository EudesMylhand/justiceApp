-- ============================================================================
-- DONNÉES INITIALES (SEED) - Permissions du module Plaintes (Phase 2)
-- À exécuter après 003_schema_plaintes.sql
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- PERMISSIONS
-- ----------------------------------------------------------------------------
INSERT INTO permissions (code, module, description) VALUES
('PLAINTE_CREATE', 'PLAINTE', 'Créer une plainte (réservé aux OPJ)'),
('PLAINTE_VIEW_ALL', 'PLAINTE', 'Consulter toutes les plaintes de la plateforme'),
('PLAINTE_VIEW_SERVICE', 'PLAINTE', 'Consulter les plaintes de son service (Police ou Gendarmerie)'),
('PLAINTE_VIEW_UNIT', 'PLAINTE', 'Consulter les plaintes de son commissariat ou de sa brigade'),
('PLAINTE_UPDATE', 'PLAINTE', 'Modifier une plainte (statut, informations, parties)'),
('PLAINTE_ADD_PIECE_JOINTE', 'PLAINTE', 'Ajouter une pièce jointe à une plainte'),
('PLAINTE_DELETE_PIECE_JOINTE', 'PLAINTE', 'Supprimer une pièce jointe d''une plainte')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ----------------------------------------------------------------------------
-- ATTRIBUTION AUX RÔLES
-- ----------------------------------------------------------------------------

-- SUPER_ADMIN : déjà toutes les permissions via la règle globale en Phase 1,
-- mais on s'assure explicitement de la couverture pour les nouvelles permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'SUPER_ADMIN' AND p.module = 'PLAINTE'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ADMIN_MIN_INTERIEUR : vue nationale sur les plaintes (Police + Gendarmerie)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN_MIN_INTERIEUR'
AND p.code IN ('PLAINTE_VIEW_ALL')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ADMIN_MIN_JUSTICE : vue nationale également (suivi statistique national de l'activité pénale)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN_MIN_JUSTICE'
AND p.code IN ('PLAINTE_VIEW_ALL')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- OPJ (Police et Gendarmerie) : peuvent créer, consulter et modifier les plaintes de leur unité
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('OPJ_POLICE', 'OPJ_GENDARMERIE')
AND p.code IN ('PLAINTE_CREATE', 'PLAINTE_VIEW_UNIT', 'PLAINTE_UPDATE', 'PLAINTE_ADD_PIECE_JOINTE')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- CHEF_COMMISSARIAT (Commissaire) : vue sur toutes les plaintes de son commissariat
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'CHEF_COMMISSARIAT'
AND p.code IN ('PLAINTE_VIEW_UNIT', 'PLAINTE_UPDATE', 'PLAINTE_ADD_PIECE_JOINTE', 'PLAINTE_DELETE_PIECE_JOINTE')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- COMMANDANT_BRIGADE : idem pour sa brigade
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'COMMANDANT_BRIGADE'
AND p.code IN ('PLAINTE_VIEW_UNIT', 'PLAINTE_UPDATE', 'PLAINTE_ADD_PIECE_JOINTE', 'PLAINTE_DELETE_PIECE_JOINTE')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Agents simples (Police, Gendarmerie) : consultation uniquement, pas de création (conforme à la décision produit)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('AGENT_POLICE', 'AGENT_GENDARMERIE')
AND p.code IN ('PLAINTE_VIEW_UNIT')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- PROCUREUR / SUBSTITUT / JUGE_INSTRUCTION : vue nationale nécessaire pour le suivi de l'activité pénale
-- (les plaintes leur seront transmises via le futur module "Soit-Transmis")
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('PROCUREUR', 'SUBSTITUT_PROCUREUR', 'JUGE_INSTRUCTION')
AND p.code IN ('PLAINTE_VIEW_ALL')
ON DUPLICATE KEY UPDATE role_id = role_id;
