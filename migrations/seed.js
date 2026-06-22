/**
 * Script de création du compte Super Administrateur National initial.
 * Usage : npm run seed
 *
 * À exécuter une seule fois après "npm run migrate", sur une base déjà initialisée.
 * Sans ce script, aucun utilisateur n'existe et il est impossible de se connecter
 * à la plateforme pour la première fois.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function run() {
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

    if (!DB_HOST || !DB_USER || !DB_NAME) {
        console.error('❌ Variables de connexion manquantes. Vérifiez votre fichier .env.');
        process.exit(1);
    }

    const connection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT || 3306,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
    });

    try {
        const [existing] = await connection.query(
            `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'SUPER_ADMIN' LIMIT 1`
        );

        if (existing.length > 0) {
            console.log('ℹ️  Un compte Super Administrateur existe déjà. Aucune action effectuée.');
            return;
        }

        const [roles] = await connection.query(`SELECT id FROM roles WHERE code = 'SUPER_ADMIN' LIMIT 1`);
        if (roles.length === 0) {
            console.error('❌ Le rôle SUPER_ADMIN n\'existe pas. Avez-vous exécuté "npm run migrate" ?');
            process.exit(1);
        }
        const roleId = roles[0].id;

        const matricule = 'ADM-000001';
        const email = process.env.SEED_ADMIN_EMAIL || 'admin@plateforme-justice.cg';
        const tempPassword = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(6).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        const [result] = await connection.query(
            `INSERT INTO users
                (matricule, nom, prenom, email, password_hash, role_id, grade, statut, must_change_password)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIF', TRUE)`,
            [matricule, 'Administrateur', 'National', email, passwordHash, roleId, 'Super Administrateur']
        );

        console.log('🎉 Compte Super Administrateur créé avec succès.');
        console.log('-----------------------------------------------');
        console.log(`   Matricule        : ${matricule}`);
        console.log(`   Email            : ${email}`);
        console.log(`   Mot de passe     : ${tempPassword}`);
        console.log('-----------------------------------------------');
        console.log('⚠️  Notez ce mot de passe : il ne sera plus affiché.');
        console.log('⚠️  Un changement de mot de passe sera demandé à la première connexion.');
        console.log(`   (ID utilisateur créé : ${result.insertId})`);
    } finally {
        await connection.end();
    }
}

run().catch((err) => {
    console.error('💥 Erreur lors du seed :', err.message);
    process.exit(1);
});
