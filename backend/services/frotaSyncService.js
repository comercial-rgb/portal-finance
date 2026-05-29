const axios = require('axios');

const FROTA_API_URL = process.env.FROTA_API_URL || 'https://app.frotainstasolutions.com.br';
// Token compartilhado nos dois sentidos da integração com o frotas
const WEBHOOK_TOKEN = process.env.WEBHOOK_FROTA_TOKEN || 'instasolutions_webhook_frota_2025';
const TIMEOUT = 10000; // 10 segundos

/**
 * Normaliza a data de pagamento para o formato YYYY-MM-DD esperado pelo frotas.
 * Aceita Date, string ISO completa ou string já no formato de data.
 */
function formatarData(data) {
  if (!data) return new Date().toISOString().split('T')[0];
  if (data instanceof Date) return data.toISOString().split('T')[0];
  // string: pega só a parte da data (antes do 'T', se houver)
  return String(data).split('T')[0];
}

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
        data_pagamento: formatarData(dataPagamento)
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
