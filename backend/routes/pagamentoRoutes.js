const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  listarPagamentos,
  listarMinhasAntecipacoes,
  adicionarComprovante,
  resumoPagamentos
} = require('../controllers/pagamentoController');

// Todas as rotas são protegidas
router.use(protect);

// Rotas
router.get('/', listarPagamentos);
router.get('/antecipacoes', listarMinhasAntecipacoes);
router.get('/resumo', resumoPagamentos);
router.put('/:faturaId/os/:osId/comprovante', adicionarComprovante);

module.exports = router;
