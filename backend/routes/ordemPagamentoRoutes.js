const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  listarOrdensPagamento,
  criarOrdemPagamento,
  pagarOrdemPagamento,
  vincularFatura,
  faturasAbertasFornecedor,
  resumoOrdensPagamento
} = require('../controllers/ordemPagamentoController');

// Todas rotas precisam de autenticação
router.use(protect);

// Rotas de leitura (admin + fornecedor)
router.get('/', listarOrdensPagamento);
router.get('/resumo', resumoOrdensPagamento);

// Rotas admin only
router.post('/', authorize('super_admin', 'admin', 'gerente'), criarOrdemPagamento);
router.put('/:id/pagar', authorize('super_admin', 'admin', 'gerente'), pagarOrdemPagamento);
router.put('/:id/vincular-fatura', authorize('super_admin', 'admin', 'gerente'), vincularFatura);
router.get('/faturas-fornecedor/:fornecedorId', authorize('super_admin', 'admin', 'gerente'), faturasAbertasFornecedor);

module.exports = router;
