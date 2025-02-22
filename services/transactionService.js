class TransactionService {
    constructor(db) {
        this.db = db;
    }

    async createTransaction(user_id, amount, type) {
        // Validar tipo de transacción
        if (!['deposit', 'withdrawal'].includes(type)) {
            throw { type: 'VALIDATION', message: 'Tipo de transacción inválido' };
        }

        // Validar monto positivo
        if (amount <= 0) {
            throw { type: 'VALIDATION', message: 'El monto debe ser positivo' };
        }

        const client = await this.db.getClient();

        try {
            await client.query('BEGIN');

            let currentBalance = 0;
            const balanceResult = await client.query(
                `SELECT COALESCE(
                    (SELECT SUM(CASE 
                        WHEN type = 'deposit' THEN amount 
                        WHEN type = 'withdrawal' THEN -amount 
                    END)
                    FROM transactions 
                    WHERE user_id = $1), 0) as balance`,
                [user_id]
            );

            currentBalance = parseFloat(balanceResult.rows[0].balance);

            // Si es un retiro, verificar saldo suficiente
            if (type === 'withdrawal') {
                if (currentBalance < amount) {
                    throw { type: 'INSUFFICIENT_FUNDS', message: 'Saldo insuficiente' };
                }
            }

            // Crear la transacción
            const result = await client.query(
                `INSERT INTO transactions (user_id, amount, type) 
                 VALUES ($1, $2, $3) 
                 RETURNING id, user_id, amount, type, created_at`,
                [user_id, amount, type]
            );

            // Calcular nuevo saldo
            const newBalance = type === 'deposit' 
                ? currentBalance + amount 
                : currentBalance - amount;

            await client.query('COMMIT');

            // Retornar la transacción con el saldo actualizado
            return {
                ...result.rows[0],
                previous_balance: currentBalance,
                new_balance: newBalance
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getTransactionsByUser(user_id) {
        const result = await this.db.query(
            `SELECT t.*, 
                    (SELECT COALESCE(SUM(CASE 
                        WHEN type = 'deposit' THEN amount 
                        WHEN type = 'withdrawal' THEN -amount 
                    END), 0)
                    FROM transactions 
                    WHERE user_id = $1 AND created_at <= t.created_at) as balance_after_transaction
             FROM transactions t 
             WHERE t.user_id = $1 
             ORDER BY t.created_at DESC`,
            [user_id]
        );

        return result.rows;
    }
}

module.exports = TransactionService; 