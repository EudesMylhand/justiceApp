/**
 * Pool de connexions MySQL partagé par toute l'application.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    queueLimit: 0,
    dateStrings: true,
});

/**
 * Vérifie que la connexion à la base fonctionne. À appeler au démarrage du serveur.
 */
async function testConnection() {
    try {
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        console.log('✅ Connexion MySQL établie avec succès.');
        return true;
    } catch (err) {
        console.error('❌ Échec de connexion à MySQL :', err.message);
        return false;
    }
}

module.exports = { pool, testConnection };
