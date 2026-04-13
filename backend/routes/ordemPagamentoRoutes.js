const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ordemPagamentoCtrl = require('../controllers/ordemPagamentoController');

// Todas as rotas requerem autenticação
router.use(protect);

// Rotas de consulta (antes das rotas com :id)
router.get('/resumo', ordemPagamentoCtrl.resumo);
router.get('/finsystem-status', authorize('super_admin', 'admin', 'gerente'), ordemPagamentoCtrl.finsystemStatus);
router.post('/sincronizar-lote', authorize('super_admin', 'admin'), ordemPagamentoCtrl.sincronizarLote);
router.get('/faturas-fornecedor/:fornecedorId', ordemPagamentoCtrl.faturasFornecedor);

// CRUD
router.get('/', ordemPagamentoCtrl.listar);
router.post('/', authorize('super_admin', 'admin', 'gerente'), ordemPagamentoCtrl.criar);

// Ações sobre uma ordem específica
router.put('/:id/pagar', authorize('super_admin', 'admin', 'gerente'), ordemPagamentoCtrl.pagar);
router.put('/:id/vincular-fatura', authorize('super_admin', 'admin', 'gerente'), ordemPagamentoCtrl.vincularFatura);
router.post('/:id/resincronizar', authorize('super_admin', 'admin'), ordemPagamentoCtrl.resincronizar);

module.exports = router;
