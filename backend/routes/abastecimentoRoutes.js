const express = require('express');
const router = express.Router();
const abastecimentoController = require('../controllers/abastecimentoController');
const { protect } = require('../middleware/auth');
const { filterByFornecedor, fornecedorReadOnly } = require('../middleware/fornecedor');
const { filterByCliente, clienteReadOnly } = require('../middleware/cliente');

// Rota de não-faturados precisa estar antes de /:id
router.get('/nao-faturados', protect, filterByFornecedor, filterByCliente, abastecimentoController.getNaoFaturados);

router.get('/', protect, filterByFornecedor, filterByCliente, abastecimentoController.getAbastecimentos);
router.get('/:id', protect, filterByFornecedor, filterByCliente, abastecimentoController.getAbastecimentoById);
router.post('/', protect, fornecedorReadOnly, clienteReadOnly, abastecimentoController.criarAbastecimento);
router.put('/:id', protect, fornecedorReadOnly, clienteReadOnly, abastecimentoController.atualizarAbastecimento);
router.delete('/:id', protect, fornecedorReadOnly, clienteReadOnly, abastecimentoController.excluirAbastecimento);

module.exports = router;
