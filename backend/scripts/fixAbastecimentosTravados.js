/**
 * Script one-time: libera abastecimentos que ficaram travados como
 * faturadoFornecedor=true / faturadoCliente=true por faturas excluídas.
 *
 * Lógica: se o abastecimento está marcado como faturado mas NÃO aparece
 * em nenhuma fatura ativa (ativo=true), ele deve ser liberado.
 *
 * Uso: node backend/scripts/fixAbastecimentosTravados.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado ao MongoDB');

  const db = mongoose.connection.db;
  const faturas = db.collection('faturas');
  const abastecimentos = db.collection('abastecimentos');

  // 1. Coletar todos os IDs de abastecimentos que estão em faturas ATIVAS
  const faturasAtivas = await faturas
    .find({ ativo: true, 'abastecimentosVinculados.0': { $exists: true } })
    .project({ abastecimentosVinculados: 1 })
    .toArray();

  const idsEmFaturaAtiva = new Set();
  for (const f of faturasAtivas) {
    for (const item of f.abastecimentosVinculados || []) {
      idsEmFaturaAtiva.add(String(item.abastecimento));
    }
  }

  console.log(`📋 Abastecimentos em faturas ativas: ${idsEmFaturaAtiva.size}`);

  // 2. Buscar abastecimentos travados como faturadoFornecedor=true mas fora de fatura ativa
  const travadosFornecedor = await abastecimentos
    .find({ faturadoFornecedor: true, ativo: { $ne: false } })
    .project({ _id: 1, status: 1, tipoFatura: 1 })
    .toArray();

  const paraLiberarFornecedor = travadosFornecedor.filter(
    ab => !idsEmFaturaAtiva.has(String(ab._id))
  );

  // 3. Buscar abastecimentos travados como faturadoCliente=true mas fora de fatura ativa
  const travadosCliente = await abastecimentos
    .find({ faturadoCliente: true, ativo: { $ne: false } })
    .project({ _id: 1, status: 1, tipoFatura: 1 })
    .toArray();

  const paraLiberarCliente = travadosCliente.filter(
    ab => !idsEmFaturaAtiva.has(String(ab._id))
  );

  console.log(`🔒 Travados como Fornecedor fora de fatura ativa: ${paraLiberarFornecedor.length}`);
  console.log(`🔒 Travados como Cliente fora de fatura ativa: ${paraLiberarCliente.length}`);

  if (paraLiberarFornecedor.length === 0 && paraLiberarCliente.length === 0) {
    console.log('✅ Nada a corrigir!');
    await mongoose.disconnect();
    return;
  }

  // 4. Liberar os travados como Fornecedor
  if (paraLiberarFornecedor.length > 0) {
    const ids = paraLiberarFornecedor.map(ab => ab._id);
    const result = await abastecimentos.updateMany(
      { _id: { $in: ids } },
      { $set: { faturadoFornecedor: false, status: 'Autorizada', tipoFatura: null } }
    );
    console.log(`✅ Liberados (Fornecedor): ${result.modifiedCount} abastecimentos`);
    ids.forEach(id => console.log('   -', id));
  }

  // 5. Liberar os travados como Cliente
  if (paraLiberarCliente.length > 0) {
    const ids = paraLiberarCliente.map(ab => ab._id);
    const result = await abastecimentos.updateMany(
      { _id: { $in: ids } },
      { $set: { faturadoCliente: false, status: 'Autorizada', tipoFatura: null } }
    );
    console.log(`✅ Liberados (Cliente): ${result.modifiedCount} abastecimentos`);
    ids.forEach(id => console.log('   -', id));
  }

  await mongoose.disconnect();
  console.log('🏁 Concluído!');
}

run().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
