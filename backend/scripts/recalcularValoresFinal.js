require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const OrdemServico = require('../models/OrdemServico');

const recalcularValoresFinal = async () => {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    console.log('\n📊 Buscando todas as OS...');
    const ordensServico = await OrdemServico.find({});
    console.log(`📋 Total de OS encontradas: ${ordensServico.length}`);

    let atualizadas = 0;
    let erros = 0;

    for (const os of ordensServico) {
      try {
        const valorFinalAntigo = os.valorFinal;

        // Recalcula valores com desconto
        os.valorPecasComDesconto = os.valorPecas - (os.valorPecas * os.descontoPecasPerc / 100);
        os.valorServicoComDesconto = os.valorServico - (os.valorServico * os.descontoServicoPerc / 100);
        os.valorFinal = os.valorPecasComDesconto + os.valorServicoComDesconto;

        const valorFinalNovo = os.valorFinal;

        // Só salva se mudou
        if (Math.abs(valorFinalAntigo - valorFinalNovo) > 0.01) {
          await os.save();
          console.log(`✅ OS ${os.codigo}: R$ ${valorFinalAntigo.toFixed(2)} → R$ ${valorFinalNovo.toFixed(2)}`);
          atualizadas++;
        }
      } catch (error) {
        console.error(`❌ Erro ao processar OS ${os.codigo}:`, error.message);
        erros++;
      }
    }

    console.log('\n📊 Resumo:');
    console.log(`✅ OS atualizadas: ${atualizadas}`);
    console.log(`⏭️  OS já corretas: ${ordensServico.length - atualizadas - erros}`);
    console.log(`❌ Erros: ${erros}`);

    await mongoose.connection.close();
    console.log('\n✅ Script concluído!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
};

recalcularValoresFinal();
