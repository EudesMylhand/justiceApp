/**
 * Script d'exécution des migrations SQL.
 * Usage : npm run migrate
 *
 * Lit tous les fichiers .sql du dossier /migrations (triés par nom)
 * et les exécute dans l'ordre sur la base de données configurée dans .env
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = __dirname;

async function run() {
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

    if (!DB_HOST || !DB_USER || !DB_NAME) {
        console.error('❌ Variables de connexion manquantes. Vérifiez votre fichier .env (DB_HOST, DB_USER, DB_NAME, DB_PASSWORD).');
        process.exit(1);
    }

    console.log(`🔌 Connexion à MySQL sur ${DB_HOST}:${DB_PORT || 3306}...`);

    let connection;
    try {
        // Connexion sans sélectionner de base, pour pouvoir la créer si besoin
        connection = await mysql.createConnection({
            host: DB_HOST,
            port: DB_PORT || 3306,
            user: DB_USER,
            password: DB_PASSWORD,
            multipleStatements: true,
        });
    } catch (err) {
        console.error('❌ Impossible de se connecter au serveur MySQL.');
        console.error('   Détail :', err.message);
        console.error('   Vérifiez host/port/identifiants dans .env et que le serveur autorise les connexions distantes.');
        process.exit(1);
    }

    try {
        console.log(`📦 Création de la base "${DB_NAME}" si elle n'existe pas...`);
        await connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        );
        await connection.changeUser({ database: DB_NAME });

        const files = fs
            .readdirSync(MIGRATIONS_DIR)
            .filter((f) => f.endsWith('.sql'))
            .sort();

        if (files.length === 0) {
            console.log('⚠️  Aucun fichier de migration trouvé.');
        }

        for (const file of files) {
            const filePath = path.join(MIGRATIONS_DIR, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            console.log(`▶️  Exécution de ${file}...`);
            try {
                await connection.query(sql);
                console.log(`✅ ${file} appliqué avec succès.`);
            } catch (err) {
                console.error(`❌ Erreur lors de l'exécution de ${file} :`);
                console.error('   ', err.message);
                throw err;
            }
        }

        console.log('\n🎉 Toutes les migrations ont été appliquées avec succès.');
    } finally {
        await connection.end();
    }
}

run().catch((err) => {
    console.error('\n💥 Migration interrompue suite à une erreur.');
    process.exit(1);
});
