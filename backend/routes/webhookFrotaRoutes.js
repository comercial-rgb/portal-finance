const express = require('express');
const router = express.Router();
const webhookFrotaController = require('../controllers/webhookFrotaController');

/**
 * Rotas de webhook para integração com sistema de frotas
 * 
 * IMPORTANTE: Estas rotas são públicas mas devem ser protegidas
 * por um token secreto compartilhado entre os sistemas
 */

// Middleware de validação de token secreto
const validarTokenWebhook = (req, res, next) => {
  const tokenRecebido = req.headers['x-webhook-token'] || req.query.token;
  const tokenEsperado = process.env.WEBHOOK_FROTA_TOKEN || 'seu-token-secreto-aqui';

  if (!tokenRecebido) {
    return res.status(401).json({ 
      success: false,
      message: 'Token de autenticação não fornecido. Use o header X-Webhook-Token ou query param ?token=' 
    });
  }

  if (tokenRecebido !== tokenEsperado) {
    console.warn('⚠️  Tentativa de acesso com token inválido:', tokenRecebido);
    return res.status(403).json({ 
      success: false,
      message: 'Token de autenticação inválido' 
    });
  }

  next();
};

// Teste de conexão (público para health check)
router.get('/teste', webhookFrotaController.testeConexao);

// Receber OS do sistema de frotas (protegido por token)
router.post('/receber-os', validarTokenWebhook, webhookFrotaController.receberOSFrota);

module.exports = router;
