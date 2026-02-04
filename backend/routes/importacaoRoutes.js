const express = require('express');
const router = express.Router();
const importacaoController = require('../controllers/importacaoController');
const { protect, authorize } = require('../middleware/auth');

// Rota para importar múltiplas OS
// Apenas super_admin e admin podem fazer importação em lote
router.post('/ordens-servico', protect, authorize('super_admin', 'admin'), importacaoController.importarOrdensServico);

module.exports = router;
