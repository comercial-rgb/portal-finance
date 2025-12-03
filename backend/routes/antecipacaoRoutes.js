const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  listarAntecipacoes,
  buscarAntecipacao,
  calcularAntecipacao,
  criarAntecipacao,
  aprovarAntecipacao,
  rejeitarAntecipacao,
  pagarAntecipacao,
  cancelarAntecipacao,
  obterValoresPendentes
} = require('../controllers/antecipacaoController');

// Todas as rotas são protegidas
router.use(protect);

// Rotas para fornecedores
router.get('/valores-pendentes', obterValoresPendentes);
router.post('/calcular', calcularAntecipacao);
router.post('/', criarAntecipacao);
router.put('/:id/cancelar', cancelarAntecipacao);

// Rotas gerais
router.get('/', listarAntecipacoes);
router.get('/:id', buscarAntecipacao);

// Rotas para admins
router.put('/:id/aprovar', aprovarAntecipacao);
router.put('/:id/rejeitar', rejeitarAntecipacao);
router.put('/:id/pagar', pagarAntecipacao);

module.exports = router;
