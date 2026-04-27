const Fornecedor = require('../models/Fornecedor');
const Cliente = require('../models/Cliente');
const OrdemServico = require('../models/OrdemServico');
const Fatura = require('../models/Fatura');
const Abastecimento = require('../models/Abastecimento');
const OrdemPagamento = require('../models/OrdemPagamento');

// GET /api/relatorio-gerencial
exports.getRelatorioGerencial = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({
        success: false,
        message: 'Período de apuração (dataInicio e dataFim) é obrigatório'
      });
    }

    const inicio = new Date(dataInicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);

    const periodFilter = { createdAt: { $gte: inicio, $lte: fim } };

    // Execute all queries in parallel
    const [
      totalFornecedores,
      fornecedoresNovos,
      totalClientes,
      clientesAtivos,
      clientesNovos,
      ordensServico,
      faturas,
      abastecimentos,
      ordensPagamento
    ] = await Promise.all([
      // Fornecedores totais (all)
      Fornecedor.countDocuments({}),
      // Fornecedores novos no período
      Fornecedor.countDocuments(periodFilter),
      // Clientes totais
      Cliente.countDocuments({}),
      // Clientes ativos
      Cliente.countDocuments({ ativo: true }),
      // Clientes novos no período
      Cliente.countDocuments(periodFilter),
      // Ordens de Serviço no período
      OrdemServico.find({
        $or: [
          { createdAt: { $gte: inicio, $lte: fim } },
          { dataReferencia: { $gte: inicio, $lte: fim } }
        ]
      }).lean(),
      // Faturas no período
      Fatura.find({
        $or: [
          { createdAt: { $gte: inicio, $lte: fim } },
          { periodoInicio: { $lte: fim }, periodoFim: { $gte: inicio } }
        ]
      }).lean(),
      // Abastecimentos no período
      Abastecimento.find({
        $or: [
          { createdAt: { $gte: inicio, $lte: fim } },
          { dataReferencia: { $gte: inicio, $lte: fim } }
        ]
      }).lean(),
      // Ordens de Pagamento no período
      OrdemPagamento.find({
        $or: [
          { createdAt: { $gte: inicio, $lte: fim } },
          { dataGeracao: { $gte: inicio, $lte: fim } }
        ]
      }).lean()
    ]);

    // Process faturas
    const faturasGeradas = faturas.length;
    const faturasEmAberto = faturas.filter(f => 
      f.statusFatura === 'Aguardando pagamento' || f.statusFatura === 'Parcialmente paga'
    ).length;
    const faturasPagas = faturas.filter(f => f.statusFatura === 'Paga').length;
    const valorTotalFaturas = faturas.reduce((sum, f) => sum + (f.valorTotal || 0), 0);

    // Process ordens de pagamento
    const opCriadas = ordensPagamento.length;
    const opPendentes = ordensPagamento.filter(op => op.status === 'Pendente').length;
    const opPagas = ordensPagamento.filter(op => op.status === 'Paga').length;
    const opCanceladas = ordensPagamento.filter(op => op.status === 'Cancelada').length;
    const valorTotalOP = ordensPagamento.reduce((sum, op) => sum + (op.valor || 0), 0);

    // Process ordens de serviço
    const totalOS = ordensServico.length;
    const valorTotalOS = ordensServico.reduce((sum, os) => sum + (os.valorFinal || 0), 0);

    // Process abastecimentos
    const totalAbastecimentos = abastecimentos.length;
    const valorTotalAbastecimentos = abastecimentos.reduce(
      (sum, ab) => sum + (ab.valorFinal || ab.valorComDesconto || ab.valor || ab.valorTotal || 0),
      0
    );

    // Faturas por tipo
    const faturasFornecedor = faturas.filter(f => f.tipo === 'Fornecedor').length;
    const faturasCliente = faturas.filter(f => f.tipo === 'Cliente').length;

    res.json({
      success: true,
      periodo: { dataInicio: inicio, dataFim: fim },
      dados: {
        fornecedores: {
          totalAtivos: totalFornecedores,
          novosNoPeriodo: fornecedoresNovos
        },
        clientes: {
          totalCadastrados: totalClientes,
          ativos: clientesAtivos,
          novosNoPeriodo: clientesNovos
        },
        ordensServico: {
          total: totalOS,
          valorTotal: valorTotalOS
        },
        abastecimentos: {
          total: totalAbastecimentos,
          valorTotal: valorTotalAbastecimentos
        },
        faturas: {
          geradas: faturasGeradas,
          emAberto: faturasEmAberto,
          pagas: faturasPagas,
          valorTotal: valorTotalFaturas,
          porTipo: {
            fornecedor: faturasFornecedor,
            cliente: faturasCliente
          }
        },
        ordensPagamento: {
          criadas: opCriadas,
          pendentes: opPendentes,
          pagas: opPagas,
          canceladas: opCanceladas,
          valorTotal: valorTotalOP
        }
      }
    });
  } catch (error) {
    console.error('Erro ao gerar relatório gerencial:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório gerencial',
      error: error.message
    });
  }
};
