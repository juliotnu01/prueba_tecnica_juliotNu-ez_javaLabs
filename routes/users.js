const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');

class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  async getAllUsers(req, res) {
    try {
      const users = await this.userService.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async createUser(req, res) {
    const { name, email } = req.body;

    // Validación básica de campos
    if (!name || !email) {
      return res.status(400).json({
        error: 'El nombre y email son campos requeridos'
      });
    }

    try {
      const user = await this.userService.createUser(name, email);
      res.status(201).json({
        message: 'Usuario creado exitosamente',
        user
      });
    } catch (error) {
      if (error.type === 'VALIDATION') {
        return res.status(400).json({ error: error.message });
      }
      if (error.type === 'DUPLICATE_EMAIL') {
        return res.status(409).json({ error: error.message });
      }
      console.error('Error al crear usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

// Middleware para inicializar el controlador
router.use((req, res, next) => {
  const userService = new UserService(req.db);
  req.userController = new UserController(userService);
  next();
});

// Definir rutas
router.get('/', (req, res) => req.userController.getAllUsers(req, res));
router.post('/add', (req, res) => req.userController.createUser(req, res));

module.exports = router;
