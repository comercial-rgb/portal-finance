const express = require('express');
const router = express.Router();
const webhookCombustivelController = require('../controllers/webhookCombustivelController');

/**
 * Rotas de webhook para integração com sistema de combustível
 * 
 * Protegidas por token secreto compartilhado entre os sistemas
 */

// Middleware de validação de token secreto
const validarTokenWebhook = (req, res, next) => {
  const tokenRecebido = req.headers['x-webhook-token'] || req.query.token;
  const tokenEsperado = process.env.WEBHOOK_COMBUSTIVEL_TOKEN || process.env.WEBHOOK_FROTA_TOKEN || 'seu-token-secreto-aqui';

  if (!tokenRecebido) {
    return res.status(401).json({ 
      success: false,
      message: 'Token de autenticação não fornecido. Use o header X-Webhook-Token ou query param ?token=' 
    });
  }

  if (tokenRecebido !== tokenEsperado) {
    console.warn('⚠️ Tentativa de acesso ao webhook combustível com token inválido:', tokenRecebido);
    return res.status(403).json({ 
      success: false,
      message: 'Token de autenticação inválido' 
    });
  }

  next();
};

// Teste de conexão (público para health check)
router.get('/teste', webhookCombustivelController.testeConexao);

// Receber abastecimento individual (protegido por token)
router.post('/receber-abastecimento', validarTokenWebhook, webhookCombustivelController.receberAbastecimento);

// Receber lote de abastecimentos (protegido por token)
router.post('/receber-lote', validarTokenWebhook, webhookCombustivelController.receberLote);

module.exports = router;
