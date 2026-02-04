const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const OrdemServico = require('../models/OrdemServico');

// Recalcular valores finais de todas as OS
router.post('/recalcular-valores-finais', protect, authorize('super_admin'), async (req, res) => {
  try {
    console.log('🔄 Iniciando recálculo de valores finais...');
    
    const ordensServico = await OrdemServico.find({});
    console.log(`📋 Total de OS encontradas: ${ordensServico.length}`);

    let atualizadas = 0;
    let erros = 0;
    const detalhes = [];

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
          detalhes.push({
            codigo: os.codigo,
            valorAntigo: valorFinalAntigo,
            valorNovo: valorFinalNovo
          });
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

    res.json({
      success: true,
      message: `Recálculo concluído: ${atualizadas} OS atualizadas`,
      resumo: {
        total: ordensServico.length,
        atualizadas,
        jaCorretas: ordensServico.length - atualizadas - erros,
        erros
      },
      detalhes: detalhes.slice(0, 20) // Primeiras 20 alterações
    });
  } catch (error) {
    console.error('❌ Erro no recálculo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao recalcular valores',
      error: error.message
    });
  }
});

module.exports = router;
