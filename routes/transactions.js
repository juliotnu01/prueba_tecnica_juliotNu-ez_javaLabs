const express = require('express');
const router = express.Router();
const TransactionService = require('../services/transactionService');

class TransactionController {
    constructor(transactionService) {
        this.transactionService = transactionService;
    }

    async createTransaction(req, res) {
        const { user_id, amount, type } = req.body;

        try {
            // Validación básica
            if (!user_id || !amount || !type) {
                return res.status(400).json({
                    error: 'Todos los campos son requeridos (user_id, amount, type)'
                });
            }

            const transaction = await this.transactionService.createTransaction(user_id, amount, type);
            res.status(201).json({
                message: 'Transacción creada exitosamente',
                transaction
            });

        } catch (error) {
            if (error.type === 'VALIDATION') {
                return res.status(400).json({ error: error.message });
            }
            if (error.type === 'INSUFFICIENT_FUNDS') {
                return res.status(400).json({ error: 'Saldo insuficiente' });
            }
            console.error('Error al crear transacción:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async getTransactionsByUser(req, res) {
        const { user_id } = req.params;

        try {
            const transactions = await this.transactionService.getTransactionsByUser(user_id);
            res.json(transactions);
        } catch (error) {
            console.error('Error al obtener transacciones:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
}

//  inicialización para usar el middleware
router.use((req, res, next) => {
    const transactionService = new TransactionService(req.db);
    req.transactionController = new TransactionController(transactionService);
    next();
});

// rutas para usar el controlador desde el request
router.post('/', (req, res) => req.transactionController.createTransaction(req, res));
router.get('/:user_id', (req, res) => req.transactionController.getTransactionsByUser(req, res));

module.exports = router; 