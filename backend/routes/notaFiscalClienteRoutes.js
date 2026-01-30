const express = require('express');
const router = express.Router();
const notaFiscalClienteController = require('../controllers/notaFiscalClienteController');
const { protect, authorize } = require('../middleware/auth');

// Todas as rotas requerem autenticação e role admin
router.use(protect);
router.use(authorize('super_admin', 'admin'));

// Criar nova nota fiscal
router.post('/', notaFiscalClienteController.criarNotaFiscal);

// Listar notas fiscais
router.get('/', notaFiscalClienteController.listarNotasFiscais);

// Buscar estatísticas
router.get('/estatisticas', notaFiscalClienteController.estatisticasNotasFiscais);

// Buscar nota fiscal por ID
router.get('/:id', notaFiscalClienteController.buscarNotaFiscalPorId);

// Atualizar nota fiscal
router.put('/:id', notaFiscalClienteController.atualizarNotaFiscal);

// Deletar nota fiscal
router.delete('/:id', notaFiscalClienteController.deletarNotaFiscal);

module.exports = router;
