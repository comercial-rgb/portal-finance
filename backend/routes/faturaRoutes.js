const express = require('express');
const router = express.Router();
const faturaController = require('../controllers/faturaController');
const { protect } = require('../middleware/auth');
const { filterByFornecedor, fornecedorReadOnly } = require('../middleware/fornecedor');
const { filterByCliente, clienteReadOnly } = require('../middleware/cliente');

// Todas as rotas requerem autenticação
router.use(protect);

// Listar faturas (com filtro para fornecedores e clientes)
router.get('/', filterByFornecedor, filterByCliente, faturaController.listar);

// Buscar fatura por ID (com filtro para fornecedores e clientes)
router.get('/:id', filterByFornecedor, filterByCliente, faturaController.buscarPorId);

// Criar nova fatura (bloqueado para fornecedores e clientes)
router.post('/', fornecedorReadOnly, clienteReadOnly, faturaController.criar);

// Atualizar fatura (bloqueado para fornecedores e clientes)
router.put('/:id', fornecedorReadOnly, clienteReadOnly, faturaController.atualizar);

// Remover ordem de serviço da fatura (bloqueado para fornecedores e clientes)
router.delete('/:id/ordem-servico/:ordemServicoId', fornecedorReadOnly, clienteReadOnly, faturaController.removerOrdemServico);

// Marcar ordem de serviço como paga (bloqueado para fornecedores e clientes)
router.patch('/:id/ordem-servico/:ordemServicoId/pagar', fornecedorReadOnly, clienteReadOnly, faturaController.marcarOSComoPaga);

// Desativar fatura (bloqueado para fornecedores e clientes)
router.delete('/:id', fornecedorReadOnly, clienteReadOnly, faturaController.desativar);

module.exports = router;
