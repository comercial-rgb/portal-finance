require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Fatura = require('../models/Fatura');
const OrdemServico = require('../models/OrdemServico');
const ImpostosRetencoes = require('../models/ImpostosRetencoes');

/**
 * Script para recalcular valorTaxasOperacao e valorDevido em faturas existentes.
 * 
 * BUG CORRIGIDO: A taxa de operação era calculada sobre valorComDesconto (antes dos impostos),
 * mas o cálculo correto é sobre (valorComDesconto - valorImpostos) = valor após impostos.
 * 
 * Este erro afetava APENAS faturas de fornecedores não optantes pelo Simples Nacional
 * (pois são as únicas com impostos > 0).
 * 
 * Uso: cd backend && node scripts/recalcularTaxasFaturas.js
 * Para aplicar de fato: node scripts/recalcularTaxasFaturas.js --aplicar
 */

const recalcularTaxasFaturas = async () => {
  const aplicar = process.argv.includes('--aplicar');

  try {
    console.log('🔄 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    if (!aplicar) {
      console.log('\n⚠️  MODO SIMULAÇÃO (dry-run). Para aplicar as correções, execute com --aplicar');
    }

    // Buscar todas as faturas ativas de fornecedor com impostos > 0
    const faturas = await Fatura.find({ 
      ativo: true, 
      tipo: 'Fornecedor',
      valorImpostos: { $gt: 0 },
      valorTaxasOperacao: { $gt: 0 }
    }).populate({
      path: 'ordensServico.ordemServico',
      populate: [
        { path: 'cliente', select: 'tipoTaxa taxaOperacao taxasAntecipacao' },
        { path: 'fornecedor', select: 'naoOptanteSimples razaoSocial' }
      ]
    });

    console.log(`\n📋 Faturas afetadas encontradas: ${faturas.length}`);

    let corrigidas = 0;
    let erros = 0;
    let jaCorretas = 0;

    for (const fatura of faturas) {
      try {
        const valorComDesconto = fatura.valorComDesconto || 0;
        const valorImpostos = fatura.valorImpostos || 0;
        const valorAposImpostos = valorComDesconto - valorImpostos;

        // Descobrir a taxa percentual aplicada
        let taxaPerc = 0;

        // Primeiro: tentar pegar da OS (taxaAplicada)
        const primeiraOS = fatura.ordensServico[0]?.ordemServico;
        if (primeiraOS?.taxaAplicada > 0) {
          taxaPerc = primeiraOS.taxaAplicada;
        } else if (primeiraOS?.cliente) {
          const cliente = primeiraOS.cliente;
          if (cliente.tipoTaxa === 'operacao') {
            taxaPerc = cliente.taxaOperacao || 15;
          } else if (cliente.tipoTaxa === 'antecipacao_variavel') {
            // Tentar deduzir a taxa a partir do valor antigo
            if (valorComDesconto > 0) {
              taxaPerc = Math.round((fatura.valorTaxasOperacao / valorComDesconto) * 100 * 100) / 100;
            }
          }
        }

        if (taxaPerc <= 0) {
          // Deduzir taxa do valor antigo (era calculada sobre valorComDesconto)
          if (valorComDesconto > 0) {
            taxaPerc = Math.round((fatura.valorTaxasOperacao / valorComDesconto) * 100 * 100) / 100;
          }
        }

        // Calcular novo valor correto da taxa (sobre valorAposImpostos)
        const novoValorTaxa = Math.round((valorAposImpostos * taxaPerc / 100) * 100) / 100;
        const novoValorDevido = Math.round((valorAposImpostos - novoValorTaxa) * 100) / 100;

        const diferenca = Math.abs(fatura.valorTaxasOperacao - novoValorTaxa);

        if (diferenca < 0.01) {
          jaCorretas++;
          continue;
        }

        console.log(`\n📄 Fatura ${fatura.numeroFatura}:`);
        console.log(`   Valor com Desconto: R$ ${valorComDesconto.toFixed(2)}`);
        console.log(`   Impostos: R$ ${valorImpostos.toFixed(2)}`);
        console.log(`   Valor após Impostos: R$ ${valorAposImpostos.toFixed(2)}`);
        console.log(`   Taxa: ${taxaPerc}%`);
        console.log(`   Taxa ANTIGA (errada, sobre valorComDesconto): R$ ${fatura.valorTaxasOperacao.toFixed(2)}`);
        console.log(`   Taxa CORRETA (sobre valorAposImpostos): R$ ${novoValorTaxa.toFixed(2)}`);
        console.log(`   Valor Devido ANTIGO: R$ ${fatura.valorDevido.toFixed(2)}`);
        console.log(`   Valor Devido CORRETO: R$ ${novoValorDevido.toFixed(2)}`);
        console.log(`   Diferença: R$ ${(novoValorDevido - fatura.valorDevido).toFixed(2)} (a mais para o fornecedor)`);

        if (aplicar) {
          await Fatura.updateOne(
            { _id: fatura._id },
            { 
              $set: { 
                valorTaxasOperacao: novoValorTaxa,
                valorDevido: novoValorDevido,
                valorRestante: Math.round((novoValorDevido - (fatura.valorPago || 0)) * 100) / 100
              } 
            }
          );
          console.log(`   ✅ CORRIGIDA!`);
        } else {
          console.log(`   ⏳ Será corrigida com --aplicar`);
        }

        corrigidas++;
      } catch (error) {
        console.error(`❌ Erro ao processar fatura ${fatura.numeroFatura}:`, error.message);
        erros++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Resumo:');
    console.log(`   ${aplicar ? '✅ Corrigidas' : '⏳ A corrigir'}: ${corrigidas}`);
    console.log(`   ✅ Já corretas: ${jaCorretas}`);
    console.log(`   ❌ Erros: ${erros}`);
    
    if (!aplicar && corrigidas > 0) {
      console.log(`\n💡 Para aplicar as correções, execute:`);
      console.log(`   node scripts/recalcularTaxasFaturas.js --aplicar`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Script concluído!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
};

recalcularTaxasFaturas();
