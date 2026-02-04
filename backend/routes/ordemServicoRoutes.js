const express = require('express');
const router = express.Router();
const ordemServicoController = require('../controllers/ordemServicoController');
const { protect } = require('../middleware/auth');
const { invalidateCache } = require('../middleware/cache');
const { filterByFornecedor, fornecedorReadOnly } = require('../middleware/fornecedor');
const { filterByCliente, clienteReadOnly } = require('../middleware/cliente');

router.get('/', protect, filterByFornecedor, filterByCliente, ordemServicoController.getOrdensServico);
router.get('/:id', protect, filterByFornecedor, filterByCliente, ordemServicoController.getOrdemServicoById);
router.post('/', protect, fornecedorReadOnly, clienteReadOnly, invalidateCache(['/contratos', '/clientes', '/empenhos']), ordemServicoController.createOrdemServico);
router.post('/delete-multiple', protect, fornecedorReadOnly, clienteReadOnly, invalidateCache(['/contratos', '/clientes', '/empenhos']), ordemServicoController.deleteMultiple);
router.put('/:id', protect, fornecedorReadOnly, clienteReadOnly, invalidateCache(['/contratos', '/clientes', '/empenhos']), ordemServicoController.updateOrdemServico);
router.delete('/:id', protect, fornecedorReadOnly, clienteReadOnly, invalidateCache(['/contratos', '/clientes', '/empenhos']), ordemServicoController.deleteOrdemServico);
router.patch('/:id/status', protect, fornecedorReadOnly, clienteReadOnly, invalidateCache(['/contratos', '/clientes', '/empenhos']), ordemServicoController.updateStatus);

module.exports = router;
