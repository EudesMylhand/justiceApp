-- ============================================================================
-- DONNÉES TERRITORIALES DÉTAILLÉES : VILLES, ARRONDISSEMENTS, QUARTIERS
-- À exécuter après 002_seed_data.sql (qui crée les 12 départements)
--
-- Sans ce fichier, les sélecteurs "Ville" et "Quartier" des formulaires de
-- création (commissariats, brigades, plaintes...) restent vides après
-- sélection d'un département, car la table `villes` est vide tant qu'aucune
-- ville n'a été insérée.
--
-- Brazzaville et Pointe-Noire sont des municipalités à statut particulier :
-- leurs subdivisions sont de véritables arrondissements administratifs.
-- Pour les autres départements, on utilise le chef-lieu (et une ville
-- secondaire quand pertinent) avec des quartiers rattachés directement
-- (arrondissement_id NULL n'étant pas autorisé par le schéma, on crée un
-- arrondissement générique "Centre" par ville pour rester cohérent).
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- BRAZZAVILLE — 9 arrondissements officiels
-- ----------------------------------------------------------------------------
INSERT INTO villes (departement_id, nom, code)
SELECT id, 'Brazzaville', 'BZV-VILLE' FROM departements WHERE code = 'BZV'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT v.id, arr.nom, arr.code
FROM villes v
JOIN (
    SELECT 'Bacongo' AS nom, 'ARR01' AS code
    UNION ALL SELECT 'Makélékélé', 'ARR02'
    UNION ALL SELECT 'Poto-Poto', 'ARR03'
    UNION ALL SELECT 'Moungali', 'ARR04'
    UNION ALL SELECT 'Ouenzé', 'ARR05'
    UNION ALL SELECT 'Talangaï', 'ARR06'
    UNION ALL SELECT 'Mfilou', 'ARR07'
    UNION ALL SELECT 'Madibou', 'ARR08'
    UNION ALL SELECT 'Djiri', 'ARR09'
) arr
WHERE v.code = 'BZV-VILLE'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- POINTE-NOIRE — arrondissements officiels
-- ----------------------------------------------------------------------------
INSERT INTO villes (departement_id, nom, code)
SELECT id, 'Pointe-Noire', 'PNR-VILLE' FROM departements WHERE code = 'PNR'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT v.id, arr.nom, arr.code
FROM villes v
JOIN (
    SELECT 'Lumumba' AS nom, 'ARR01' AS code
    UNION ALL SELECT 'Tié-Tié', 'ARR02'
    UNION ALL SELECT 'Loandjili', 'ARR03'
    UNION ALL SELECT 'Mongo-Mpoukou', 'ARR04'
    UNION ALL SELECT 'Ngoyo', 'ARR05'
    UNION ALL SELECT 'Centre-ville', 'ARR06'
) arr
WHERE v.code = 'PNR-VILLE'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- BOUENZA — Madingou (chef-lieu) et Nkayi
-- ----------------------------------------------------------------------------
INSERT INTO villes (departement_id, nom, code)
SELECT d.id, v.nom, v.code FROM departements d
JOIN (SELECT 'Madingou' AS nom, 'BOU-MAD' AS code UNION ALL SELECT 'Nkayi', 'BOU-NKA') v
WHERE d.code = 'BOU'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT v.id, arr.nom, 'ARR01'
FROM villes v JOIN (SELECT 'Centre' AS nom) arr WHERE v.code = 'BOU-MAD'
UNION ALL
SELECT v.id, arr.nom, 'ARR01'
FROM villes v JOIN (SELECT 'Centre' AS nom) arr WHERE v.code = 'BOU-NKA'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- CUVETTE — Owando
-- ----------------------------------------------------------------------------
INSERT INTO villes (departement_id, nom, code)
SELECT id, 'Owando', 'CUV-OWA' FROM departements WHERE code = 'CUV'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT id, 'Centre-ville', 'ARR01' FROM villes WHERE code = 'CUV-OWA'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- CUVETTE-OUEST — Ewo
-- ----------------------------------------------------------------------------
INSERT INTO villes (departement_id, nom, code)
SELECT id, 'Ewo', 'CUO-EWO' FROM departements WHERE code = 'CUO'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT id, 'Centre', 'ARR01' FROM villes WHERE code = 'CUO-EWO'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- KOUILOU — Loango / Hinda (chef-lieu administratif)
-- ----------------------------------------------------------------------------
INSERT INTO villes (departement_id, nom, code)
SELECT id, 'Loango', 'KOU-LOA' FROM departements WHERE code = 'KOU'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT id, 'Centre', 'ARR01' FROM villes WHERE code = 'KOU-LOA'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- LÉKOUMOU — Sibiti
-- ----------------------------------------------------------------------------
INSERT INTO villes (departement_id, nom, code)
SELECT id, 'Sibiti', 'LEK-SIB' FROM departements WHERE code = 'LEK'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT id, 'Centre', 'ARR01' FROM villes WHERE code = 'LEK-SIB'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- LIKOUALA — Impfondo
-- ----------------------------------------------------------------------------
INSERT INTO villes (departement_id, nom, code)
SELECT id, 'Impfondo', 'LIK-IMP' FROM departements WHERE code = 'LIK'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT id, 'Centre', 'ARR01' FROM villes WHERE code = 'LIK-IMP'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- NIARI — Dolisie
-- ----------------------------------------------------------------------------
INSERT INTO villes (departement_id, nom, code)
SELECT id, 'Dolisie', 'NIA-DOL' FROM departements WHERE code = 'NIA'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT id, 'Centre-ville', 'ARR01' FROM villes WHERE code = 'NIA-DOL'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- PLATEAUX — Djambala (chef-lieu) et Gamboma
-- ----------------------------------------------------------------------------
INSERT INTO villes (departement_id, nom, code)
SELECT d.id, v.nom, v.code FROM departements d
JOIN (SELECT 'Djambala' AS nom, 'PLA-DJA' AS code UNION ALL SELECT 'Gamboma', 'PLA-GAM') v
WHERE d.code = 'PLA'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT id, 'Centre', 'ARR01' FROM villes WHERE code = 'PLA-DJA'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT id, 'Centre', 'ARR01' FROM villes WHERE code = 'PLA-GAM'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- POOL — Kinkala
-- ----------------------------------------------------------------------------
INSERT INTO villes (departement_id, nom, code)
SELECT id, 'Kinkala', 'POO-KIN' FROM departements WHERE code = 'POO'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT id, 'Centre', 'ARR01' FROM villes WHERE code = 'POO-KIN'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ----------------------------------------------------------------------------
-- SANGHA — Ouesso
-- ----------------------------------------------------------------------------
INSERT INTO villes (departement_id, nom, code)
SELECT id, 'Ouesso', 'SAN-OUE' FROM departements WHERE code = 'SAN'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO arrondissements (ville_id, nom, code)
SELECT id, 'Centre-ville', 'ARR01' FROM villes WHERE code = 'SAN-OUE'
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- ============================================================================
-- QUARTIERS (rattachés aux arrondissements ci-dessus)
-- ============================================================================

-- Brazzaville : chaque arrondissement reçoit un quartier "Centre" par défaut
-- (l'utilisateur pourra en ajouter d'autres via la page Gestion territoriale)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, CONCAT(a.nom, ' Centre')
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
WHERE v.code = 'BZV-VILLE';

-- Pointe-Noire : un quartier "Centre" par arrondissement
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, CONCAT(a.nom, ' Centre')
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
WHERE v.code = 'PNR-VILLE';

-- Bouenza (Madingou)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, q.nom
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
JOIN (
    SELECT 'Centre' AS nom UNION ALL SELECT 'Mouindi' UNION ALL SELECT 'Kibangou'
) q
WHERE v.code = 'BOU-MAD' AND a.nom = 'Centre';

-- Bouenza (Nkayi)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, q.nom
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
JOIN (
    SELECT 'Mouana-Nto' AS nom UNION ALL SELECT 'Moukondo' UNION ALL SELECT 'Centre'
) q
WHERE v.code = 'BOU-NKA' AND a.nom = 'Centre';

-- Cuvette (Owando)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, q.nom
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
JOIN (
    SELECT 'Centre-ville' AS nom UNION ALL SELECT 'Mpouya' UNION ALL SELECT 'Ngouedi'
) q
WHERE v.code = 'CUV-OWA' AND a.nom = 'Centre-ville';

-- Cuvette-Ouest (Ewo)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, q.nom
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
JOIN (
    SELECT 'Centre' AS nom UNION ALL SELECT 'Madouma' UNION ALL SELECT 'Ekouassendé'
) q
WHERE v.code = 'CUO-EWO' AND a.nom = 'Centre';

-- Kouilou (Loango)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, q.nom
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
JOIN (
    SELECT 'Centre' AS nom UNION ALL SELECT 'Diosso' UNION ALL SELECT 'Tchimbamba'
) q
WHERE v.code = 'KOU-LOA' AND a.nom = 'Centre';

-- Lékoumou (Sibiti)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, q.nom
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
JOIN (
    SELECT 'Centre' AS nom UNION ALL SELECT 'Mouyondzi' UNION ALL SELECT 'Mabombo'
) q
WHERE v.code = 'LEK-SIB' AND a.nom = 'Centre';

-- Likouala (Impfondo)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, q.nom
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
JOIN (
    SELECT 'Centre' AS nom UNION ALL SELECT 'Bokiba' UNION ALL SELECT 'Dongou'
) q
WHERE v.code = 'LIK-IMP' AND a.nom = 'Centre';

-- Niari (Dolisie)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, q.nom
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
JOIN (
    SELECT 'Centre-ville' AS nom UNION ALL SELECT 'Mbounda' UNION ALL SELECT 'Ngouedi'
) q
WHERE v.code = 'NIA-DOL' AND a.nom = 'Centre-ville';

-- Plateaux (Djambala)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, q.nom
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
JOIN (
    SELECT 'Centre' AS nom UNION ALL SELECT 'Lébango' UNION ALL SELECT 'Allatara'
) q
WHERE v.code = 'PLA-DJA' AND a.nom = 'Centre';

-- Plateaux (Gamboma)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, q.nom
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
JOIN (
    SELECT 'Centre' AS nom UNION ALL SELECT 'Edou' UNION ALL SELECT 'Assikassia'
) q
WHERE v.code = 'PLA-GAM' AND a.nom = 'Centre';

-- Pool (Kinkala)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, q.nom
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
JOIN (
    SELECT 'Centre' AS nom UNION ALL SELECT 'Mbanza-Ndounga' UNION ALL SELECT 'Kindamba'
) q
WHERE v.code = 'POO-KIN' AND a.nom = 'Centre';

-- Sangha (Ouesso)
INSERT INTO quartiers (arrondissement_id, nom)
SELECT a.id, q.nom
FROM arrondissements a
JOIN villes v ON v.id = a.ville_id
JOIN (
    SELECT 'Centre-ville' AS nom UNION ALL SELECT 'Mokeko' UNION ALL SELECT 'Tongo'
) q
WHERE v.code = 'SAN-OUE' AND a.nom = 'Centre-ville';
