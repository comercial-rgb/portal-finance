const axios = require('axios');

const FROTA_API_URL = process.env.FROTA_API_URL || 'https://app.frotainstasolutions.com.br';
const WEBHOOK_TOKEN = process.env.WEBHOOK_FROTA_TOKEN || '30bfff7ce392036b19d87dd6336c6e326d5312b943e01e3e8926c7aa22136b14';
const TIMEOUT = 10000; // 10 segundos

/**
 * Notifica o sistema de frotas que uma OS foi marcada como paga.
 * Não bloqueia o fluxo principal — erros são logados mas não impedem o pagamento no portal.
 */
async function notifyOSPaid(numeroOrdemServico, dataPagamento) {
  try {
    const response = await axios.post(
      `${FROTA_API_URL}/api/v2/webhook/portal_finance/mark_paid`,
      {
        numero_ordem_servico: numeroOrdemServico,
        data_pagamento: dataPagamento || new Date().toISOString().split('T')[0]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Token': WEBHOOK_TOKEN
        },
        timeout: TIMEOUT
      }
    );

    console.log(`✅ [FrotaSync] OS ${numeroOrdemServico} sincronizada como Paga no Frotas:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    const msg = error.response?.data?.error || error.message;
    console.error(`⚠️ [FrotaSync] Falha ao sincronizar OS ${numeroOrdemServico} no Frotas: ${msg}`);
    // Não lança erro — o pagamento no portal continua normalmente
    return { success: false, error: msg };
  }
}

module.exports = { notifyOSPaid };
