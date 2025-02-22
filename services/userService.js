class UserService {
    constructor(db) {
        this.db = db;
    }

    async getAllUsers() {
        try {
            const result = await this.db.query('SELECT * FROM users');
            return result.rows;
        } catch (error) {
            throw { type: 'DB_ERROR', message: error.message };
        }
    }

    async createUser(name, email) {
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw { type: 'VALIDATION', message: 'El formato del email no es válido' };
        }

        try {
            const result = await this.db.query(
                'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at',
                [name, email]
            );
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') { // Código PostgreSQL para violación de restricción única
                throw { type: 'DUPLICATE_EMAIL', message: 'El email ya está registrado' };
            }
            throw { type: 'DB_ERROR', message: error.message };
        }
    }
}

module.exports = UserService; 