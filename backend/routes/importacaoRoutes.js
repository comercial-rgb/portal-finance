const express = require('express');
const router = express.Router();
const importacaoController = require('../controllers/importacaoController');
const { protect, adminOnly } = require('../middleware/auth');

// Rota para importar múltiplas OS
// Apenas admin pode fazer importação em lote
router.post('/ordens-servico', protect, adminOnly, importacaoController.importarOrdensServico);

module.exports = router;
