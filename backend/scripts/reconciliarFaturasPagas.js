require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const OrdemPagamento = require('../models/OrdemPagamento');
const Fatura = require('../models/Fatura');
const OrdemServico = require('../models/OrdemServico');

/**
 * Reconcilia faturas a partir das Ordens de Pagamento pagas.
 *
 * Para cada Fatura que possui OPs (status Paga) vinculadas:
 *   - Soma o total pago das OPs pagas dessa fatura.
 *   - Se o total cobrir valorDevido: marca todas as OS da fatura como Paga.
 *   - Se for parcial: marca OS proporcionalmente até cobrir o total pago.
 *   - Salva a fatura (pre-save recalcula statusFatura / valorPago / valorRestante).
 *   - Atualiza OrdemServico.status = 'Paga' para as OS tocadas.
 *
 * Uso:
 *   cd backend && node scripts/reconciliarFaturasPagas.js          # simulação (dry-run)
 *   cd backend && node scripts/reconciliarFaturasPagas.js --aplicar
 */

const reconciliar = async () => {
  const aplicar = process.argv.includes('--aplicar');

  try {
    console.log('🔄 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado');

    if (!aplicar) {
      console.log('\n⚠️  MODO SIMULAÇÃO (dry-run). Use --aplicar para persistir as alterações.\n');
    } else {
      console.log('\n🟢 MODO APLICAR: as alterações serão persistidas.\n');
    }

    // Faturas distintas que tenham OP paga vinculada
    const faturaIds = await OrdemPagamento.distinct('fatura', {
      status: 'Paga',
      ativo: true,
      fatura: { $ne: null }
    });

    console.log(`📄 Faturas candidatas à reconciliação: ${faturaIds.length}`);

    const resumo = {
      faturasProcessadas: 0,
      faturasAtualizadas: 0,
      faturasIgnoradas: 0,
      osAtualizadas: 0,
      erros: []
    };

    for (const faturaId of faturaIds) {
      try {
        const fatura = await Fatura.findById(faturaId);
        if (!fatura || !fatura.ativo) {
          resumo.faturasIgnoradas++;
          continue;
        }

        const ordensPagas = await OrdemPagamento.find({
          fatura: faturaId,
          status: 'Paga',
          ativo: true
        }).lean();

        const totalPagoOPs = ordensPagas.reduce((sum, op) => sum + (op.valor || 0), 0);
        const valorDevido = fatura.valorDevido || 0;
        const dataPagamentoRef = ordensPagas
          .map(op => op.dataPagamento)
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0] || new Date();

        const osIdsAtualizadas = [];
        const statusOriginal = fatura.statusFatura;

        if (totalPagoOPs >= valorDevido) {
          fatura.ordensServico.forEach(os => {
            if (os.statusPagamento !== 'Paga') {
              os.statusPagamento = 'Paga';
              os.dataPagamento = os.dataPagamento || dataPagamentoRef;
              osIdsAtualizadas.push(os.ordemServico);
            }
          });
        } else {
          let restante = totalPagoOPs;
          // desconta o que já estava pago
          const jaPago = fatura.ordensServico
            .filter(os => os.statusPagamento === 'Paga')
            .reduce((s, os) => s + (os.valorOS || 0), 0);
          restante = Math.max(0, totalPagoOPs - jaPago);

          for (const os of fatura.ordensServico) {
            if (os.statusPagamento !== 'Paga' && restante > 0) {
              if (restante >= (os.valorOS || 0)) {
                os.statusPagamento = 'Paga';
                os.dataPagamento = os.dataPagamento || dataPagamentoRef;
                osIdsAtualizadas.push(os.ordemServico);
                restante -= (os.valorOS || 0);
              } else {
                break;
              }
            }
          }
        }

        const mudou = osIdsAtualizadas.length > 0;
        // Também reconcilia status da fatura quando há divergência
        // (ex.: OPs cobrem valorDevido mas statusFatura ainda é Aguardando).
        const statusEsperado = totalPagoOPs >= valorDevido
          ? 'Paga'
          : (totalPagoOPs > 0 ? 'Parcialmente paga' : fatura.statusFatura);
        const statusDivergente = statusEsperado !== fatura.statusFatura;
        const precisaSalvar = mudou || statusDivergente;

        console.log(
          `  • Fatura ${fatura.numeroFatura || fatura._id}: ` +
          `valorDevido=${valorDevido.toFixed(2)}, pagoOPs=${totalPagoOPs.toFixed(2)}, ` +
          `OS atualizadas=${osIdsAtualizadas.length}, ` +
          `status: ${statusOriginal}${statusDivergente ? ` → ${statusEsperado}` : ' (ok)'}`
        );

        if (aplicar && precisaSalvar) {
          await fatura.save(); // pre-save recalcula statusFatura, valorPago, valorRestante
          if (osIdsAtualizadas.length > 0) {
            await OrdemServico.updateMany(
              { _id: { $in: osIdsAtualizadas } },
              { $set: { status: 'Paga' } }
            );
          }
          resumo.faturasAtualizadas++;
          resumo.osAtualizadas += osIdsAtualizadas.length;
        } else if (precisaSalvar) {
          resumo.faturasAtualizadas++;
          resumo.osAtualizadas += osIdsAtualizadas.length;
        }

        resumo.faturasProcessadas++;
      } catch (err) {
        console.error(`❌ Erro na fatura ${faturaId}:`, err.message);
        resumo.erros.push({ faturaId: String(faturaId), erro: err.message });
      }
    }

    console.log('\n================ RESUMO ================');
    console.log(`Faturas processadas : ${resumo.faturasProcessadas}`);
    console.log(`Faturas com mudança : ${resumo.faturasAtualizadas}`);
    console.log(`Faturas ignoradas   : ${resumo.faturasIgnoradas}`);
    console.log(`OS atualizadas      : ${resumo.osAtualizadas}`);
    console.log(`Erros               : ${resumo.erros.length}`);
    if (resumo.erros.length > 0) {
      console.log('\nErros detalhados:');
      resumo.erros.forEach(e => console.log(`  - ${e.faturaId}: ${e.erro}`));
    }
    if (!aplicar) {
      console.log('\n⚠️  Nenhuma alteração foi persistida. Execute com --aplicar para gravar.');
    } else {
      console.log('\n✅ Reconciliação concluída.');
    }
  } catch (err) {
    console.error('❌ Erro geral:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
};

reconciliar();
