const { Pool } = require('pg');

// Configuración del pool de conexiones
const pool = new Pool({
    user: process.env.DB_USER || 'root',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'pass',
    port: process.env.DB_PORT || 5432,
    // Configuraciones óptimas para el pool
    max: 20, // máximo de conexiones en el pool
    idleTimeoutMillis: 30000, // tiempo máximo que una conexión puede estar inactiva
    connectionTimeoutMillis: 2000, // tiempo máximo para establecer una conexión
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Evento para monitorear errores en el pool
pool.on('error', (err) => {
    console.error('Error inesperado en el pool de PostgreSQL', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    // Método para transacciones
    getClient: async () => {
        const client = await pool.connect();
        const query = client.query;
        const release = client.release;

        // Establecer timeout para queries
        const timeout = setTimeout(() => {
            console.error('Un cliente ha estado checkeado por más de 5 segundos');
        }, 5000);

        // Interceptar para manejar timeouts y releases
        client.query = (...args) => {
            client.lastQuery = args;
            return query.apply(client, args);
        };

        client.release = () => {
            clearTimeout(timeout);
            client.query = query;
            client.release = release;
            return release.apply(client);
        };

        return client;
    }
}; 