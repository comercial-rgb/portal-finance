const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getRelatorioGerencial } = require('../controllers/relatorioGerencialController');

// GET /api/relatorio-gerencial - Somente admin e gerente
router.get('/', protect, authorize('super_admin', 'admin', 'gerente'), getRelatorioGerencial);

module.exports = router;
