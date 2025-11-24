const express = require('express');
const router = express.Router();
const tipoServicoController = require('../controllers/tipoServicoController');
const { protect } = require('../middleware/auth');

// Rotas para Tipo
router.get('/tipos', protect, tipoServicoController.getTipos);
router.post('/tipos', protect, tipoServicoController.createTipo);
router.put('/tipos/:id', protect, tipoServicoController.updateTipo);
router.delete('/tipos/:id', protect, tipoServicoController.deleteTipo);

// Rotas para Tipo Serviço Solicitado
router.get('/tipos-servico-solicitado', protect, tipoServicoController.getTiposServicoSolicitado);
router.post('/tipos-servico-solicitado', protect, tipoServicoController.createTipoServicoSolicitado);
router.put('/tipos-servico-solicitado/:id', protect, tipoServicoController.updateTipoServicoSolicitado);
router.delete('/tipos-servico-solicitado/:id', protect, tipoServicoController.deleteTipoServicoSolicitado);

module.exports = router;
