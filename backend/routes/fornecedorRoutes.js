const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  listarFornecedores,
  buscarFornecedor,
  criarFornecedor,
  atualizarFornecedor,
  excluirFornecedor,
  buscarConfiguracoes,
  salvarConfiguracoes,
  listarAdministradores,
  criarAdministrador,
  atualizarAdministrador,
  excluirAdministrador
} = require('../controllers/fornecedorController');

// Rotas de Fornecedores
router.get('/fornecedores', protect, listarFornecedores);
router.get('/fornecedores/:id', protect, buscarFornecedor);
router.post('/fornecedores', protect, criarFornecedor);
router.put('/fornecedores/:id', protect, atualizarFornecedor);
router.delete('/fornecedores/:id', protect, excluirFornecedor);

// Rotas de Configurações
router.get('/configuracoes', protect, buscarConfiguracoes);
router.post('/configuracoes', protect, salvarConfiguracoes);

// Rotas de Administradores
router.get('/administradores', protect, listarAdministradores);
router.post('/administradores', protect, criarAdministrador);
router.put('/administradores/:id', protect, atualizarAdministrador);
router.delete('/administradores/:id', protect, excluirAdministrador);

module.exports = router;
