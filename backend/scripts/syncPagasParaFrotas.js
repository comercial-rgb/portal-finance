/**
 * Script para sincronizar OS marcadas como "Paga" no portal
 * que ainda estão pendentes no frotas.
 *
 * Uso:
 *   DRY RUN (apenas lista):
 *     node backend/scripts/syncPagasParaFrotas.js
 *
 *   EXECUÇÃO REAL:
 *     node backend/scripts/syncPagasParaFrotas.js --execute
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const FROTA_API_URL = process.env.FROTA_API_URL || 'https://app.frotainstasolutions.com.br';
const WEBHOOK_TOKEN = process.env.WEBHOOK_FROTA_TOKEN || 'instasolutions_webhook_frota_2025';
const EXECUTE = process.argv.includes('--execute');

async function main() {
  console.log('='.repeat(70));
  console.log(EXECUTE
    ? '🔧 MODO EXECUÇÃO — Vai sincronizar OS pagas com o frotas'
    : '🔍 MODO DRY RUN — Apenas listando, nada será alterado');
  console.log('='.repeat(70));
  console.log(`FROTA_API_URL: ${FROTA_API_URL}`);
  console.log('');

  if (!MONGO_URI) {
    console.error('❌ MONGODB_URI não configurada. Configure no .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅ Conectado ao MongoDB');

  const OrdemServico = require('../models/OrdemServico');

  // Buscar todas as OS com status "Paga" no portal
  const osPagas = await OrdemServico.find({
    status: 'Paga',
    ativo: true,
    numeroOrdemServico: { $exists: true, $ne: null, $ne: '' }
  }).select('codigo numeroOrdemServico status updatedAt').lean();

  console.log(`\nOS com status "Paga" no portal: ${osPagas.length}\n`);

  let synced = 0;
  let alreadyPaid = 0;
  let errors = 0;
  let skipped = 0;

  for (const os of osPagas) {
    const label = `${os.numeroOrdemServico} (portal: ${os.codigo})`;

    if (!EXECUTE) {
      console.log(`📋 ${label} — será sincronizada`);
      synced++;
      continue;
    }

    try {
      const response = await axios.post(
        `${FROTA_API_URL}/api/v2/webhook/portal_finance/mark_paid`,
        {
          numero_ordem_servico: os.numeroOrdemServico,
          data_pagamento: os.updatedAt
            ? new Date(os.updatedAt).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Token': WEBHOOK_TOKEN
          },
          timeout: 15000
        }
      );

      const msg = response.data?.message || 'OK';
      if (msg.includes('já está como Paga')) {
        console.log(`  ✓ ${label} — já estava Paga no frotas`);
        alreadyPaid++;
      } else {
        console.log(`  ✅ ${label} — sincronizada com sucesso`);
        synced++;
      }
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.error || error.message;

      if (status === 422) {
        // OS em status que não permite avançar (ex: Em aberto, Aprovada)
        console.log(`  ⏭️  ${label} — ignorada (${msg})`);
        skipped++;
      } else if (status === 404) {
        console.log(`  ⚠️  ${label} — não encontrada no frotas`);
        skipped++;
      } else {
        console.log(`  ❌ ${label} — erro: ${msg}`);
        errors++;
      }
    }

    // Pequena pausa para não sobrecarregar o frotas
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n' + '='.repeat(70));
  console.log('RESULTADO:');
  console.log(`  Sincronizadas:         ${synced}`);
  console.log(`  Já pagas no frotas:    ${alreadyPaid}`);
  console.log(`  Ignoradas (status):    ${skipped}`);
  if (errors > 0) console.log(`  ❌ Erros:              ${errors}`);
  console.log('='.repeat(70));

  if (!EXECUTE) {
    console.log('\nℹ️  Para executar: node backend/scripts/syncPagasParaFrotas.js --execute');
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
