const OrdemPagamento = require('../models/OrdemPagamento');
const Fornecedor = require('../models/Fornecedor');
const Cliente = require('../models/Cliente');
const Fatura = require('../models/Fatura');
const OrdemServico = require('../models/OrdemServico');
const finsystemService = require('../services/finsystemService');

// @desc    Listar ordens de pagamento
// @route   GET /api/ordens-pagamento
exports.listar = async (req, res) => {
  try {
    const user = req.user;
    const query = { ativo: true };

    // Fornecedor vê apenas suas ordens
    if (user.role === 'fornecedor' && user.fornecedorId) {
      query.fornecedor = user.fornecedorId;
    }

    const ordens = await OrdemPagamento.find(query)
      .populate('cliente', 'razaoSocial nomeFantasia cnpjCpf')
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf dadosBancarios')
      .populate('fatura', 'numeroFatura valorDevido statusFatura')
      .populate('criadoPor', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: ordens });
  } catch (error) {
    console.error('Erro ao listar ordens de pagamento:', error);
    res.status(500).json({ message: 'Erro ao listar ordens de pagamento', error: error.message });
  }
};

// @desc    Resumo das ordens de pagamento
// @route   GET /api/ordens-pagamento/resumo
exports.resumo = async (req, res) => {
  try {
    const user = req.user;
    const query = { ativo: true };

    if (user.role === 'fornecedor' && user.fornecedorId) {
      query.fornecedor = user.fornecedorId;
    }

    const ordens = await OrdemPagamento.find(query);

    const pendentes = ordens.filter(o => o.status === 'Pendente');
    const pagas = ordens.filter(o => o.status === 'Paga');

    res.json({
      success: true,
      data: {
        totalOrdens: ordens.length,
        pendentes: pendentes.length,
        pagas: pagas.length,
        valorTotalPendente: pendentes.reduce((acc, o) => acc + (o.valor || 0), 0),
        valorTotalPago: pagas.reduce((acc, o) => acc + (o.valor || 0), 0)
      }
    });
  } catch (error) {
    console.error('Erro ao gerar resumo:', error);
    res.status(500).json({ message: 'Erro ao gerar resumo', error: error.message });
  }
};

// @desc    Buscar faturas abertas de um fornecedor
// @route   GET /api/ordens-pagamento/faturas-fornecedor/:fornecedorId
exports.faturasFornecedor = async (req, res) => {
  try {
    const faturas = await Fatura.find({
      fornecedor: req.params.fornecedorId,
      tipo: 'Fornecedor',
      ativo: true,
      statusFatura: { $in: ['Aguardando pagamento', 'Parcialmente paga'] }
    }).select('numeroFatura valorDevido valorRestante statusFatura periodoInicio periodoFim');

    res.json({ success: true, data: faturas });
  } catch (error) {
    console.error('Erro ao buscar faturas do fornecedor:', error);
    res.status(500).json({ message: 'Erro ao buscar faturas', error: error.message });
  }
};

// @desc    Criar ordem de pagamento (+ enviar ao FinSystem)
// @route   POST /api/ordens-pagamento
exports.criar = async (req, res) => {
  try {
    const { cliente, fornecedor, fatura, faturaNumeroManual, valor, dataGeracao, observacoes } = req.body;

    // Validações
    if (!cliente || !fornecedor || !valor || !dataGeracao) {
      return res.status(400).json({ message: 'Cliente, fornecedor, valor e data são obrigatórios' });
    }

    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      return res.status(400).json({ message: 'Valor deve ser maior que zero' });
    }

    // Verificar se cliente e fornecedor existem
    const [clienteDoc, fornecedorDoc] = await Promise.all([
      Cliente.findById(cliente),
      Fornecedor.findById(fornecedor)
    ]);

    if (!clienteDoc) return res.status(404).json({ message: 'Cliente não encontrado' });
    if (!fornecedorDoc) return res.status(404).json({ message: 'Fornecedor não encontrado' });

    // Criar ordem
    const ordem = new OrdemPagamento({
      cliente,
      fornecedor,
      fatura: fatura || null,
      faturaNumeroManual: faturaNumeroManual || null,
      valor: valorNumerico,
      dataGeracao,
      observacoes: observacoes || '',
      criadoPor: req.user._id,
      status: 'Pendente'
    });

    await ordem.save();

    // === INTEGRAÇÃO COM FINSYSTEM ===
    // Enviar movimentação como repasse a fornecedor (assíncrono - não bloqueia)
    setImmediate(async () => {
      try {
        const resultado = await finsystemService.criarRepasseFornecedor(ordem, fornecedorDoc, clienteDoc);

        // Atualizar ordem com resultado da integração
        await OrdemPagamento.findByIdAndUpdate(ordem._id, {
          finsystemSincronizado: resultado.success,
          finsystemId: resultado.finsystemId,
          finsystemErro: resultado.error
        });

        if (resultado.success) {
          console.log(`✅ Ordem ${ordem.codigo} sincronizada com FinSystem (ID: ${resultado.finsystemId})`);
        } else {
          console.warn(`⚠️ Ordem ${ordem.codigo} criada mas NÃO sincronizada: ${resultado.error}`);
        }
      } catch (err) {
        console.error(`❌ Erro ao sincronizar ordem ${ordem.codigo} com FinSystem:`, err.message);
        await OrdemPagamento.findByIdAndUpdate(ordem._id, {
          finsystemSincronizado: false,
          finsystemErro: err.message
        });
      }
    });

    // Popular e retornar
    const ordemCompleta = await OrdemPagamento.findById(ordem._id)
      .populate('cliente', 'razaoSocial nomeFantasia')
      .populate('fornecedor', 'razaoSocial nomeFantasia')
      .populate('fatura', 'numeroFatura');

    res.status(201).json({
      success: true,
      message: 'Ordem de pagamento criada com sucesso! Sincronizando com FinSystem...',
      data: ordemCompleta
    });
  } catch (error) {
    console.error('Erro ao criar ordem de pagamento:', error);
    res.status(500).json({ message: 'Erro ao criar ordem de pagamento', error: error.message });
  }
};

// @desc    Marcar ordem como paga (com comprovante)
// @route   PUT /api/ordens-pagamento/:id/pagar
exports.pagar = async (req, res) => {
  try {
    const ordem = await OrdemPagamento.findOne({ _id: req.params.id, ativo: true });
    if (!ordem) return res.status(404).json({ message: 'Ordem não encontrada' });

    if (ordem.status === 'Paga') {
      return res.status(400).json({ message: 'Ordem já está paga' });
    }

    ordem.status = 'Paga';
    ordem.dataPagamento = new Date();
    if (req.body.comprovante) {
      ordem.comprovante = req.body.comprovante;
    }
    await ordem.save();

    // Sincronizar pagamento com a Fatura vinculada
    if (ordem.fatura) {
      const fatura = await Fatura.findById(ordem.fatura);
      if (fatura && fatura.ativo) {
        // Somar valor total pago por todas as OPs desta fatura
        const ordensPagasFatura = await OrdemPagamento.find({
          fatura: ordem.fatura,
          status: 'Paga',
          ativo: true
        }).lean();

        const totalPagoOPs = ordensPagasFatura.reduce((sum, op) => sum + (op.valor || 0), 0);
        const valorDevido = fatura.valorDevido || 0;

        const osIds = [];
        if (totalPagoOPs >= valorDevido) {
          // Pagamento cobre toda a fatura - marcar todas as OS como pagas
          fatura.ordensServico.forEach(os => {
            if (os.statusPagamento !== 'Paga') {
              os.statusPagamento = 'Paga';
              os.dataPagamento = ordem.dataPagamento;
              os.comprovante = ordem.comprovante || null;
              osIds.push(os.ordemServico);
            }
          });
        } else {
          // Pagamento parcial - marcar OS proporcionalmente até cobrir o valor pago
          let restante = totalPagoOPs;
          for (const os of fatura.ordensServico) {
            if (os.statusPagamento !== 'Paga' && restante > 0) {
              if (restante >= (os.valorOS || 0)) {
                os.statusPagamento = 'Paga';
                os.dataPagamento = ordem.dataPagamento;
                os.comprovante = ordem.comprovante || null;
                osIds.push(os.ordemServico);
                restante -= (os.valorOS || 0);
              } else {
                break;
              }
            }
          }
        }

        await fatura.save(); // pre-save recalcula statusFatura, valorPago, valorRestante

        // Atualizar status das OS no modelo OrdemServico
        if (osIds.length > 0) {
          await OrdemServico.updateMany(
            { _id: { $in: osIds } },
            { $set: { status: 'Paga' } }
          );
        }
      }
    }

    res.json({ success: true, message: 'Ordem marcada como paga', data: ordem });
  } catch (error) {
    console.error('Erro ao pagar ordem:', error);
    res.status(500).json({ message: 'Erro ao pagar ordem', error: error.message });
  }
};

// @desc    Vincular fatura a uma ordem
// @route   PUT /api/ordens-pagamento/:id/vincular-fatura
exports.vincularFatura = async (req, res) => {
  try {
    const { faturaId } = req.body;
    if (!faturaId) return res.status(400).json({ message: 'ID da fatura é obrigatório' });

    const ordem = await OrdemPagamento.findOne({ _id: req.params.id, ativo: true });
    if (!ordem) return res.status(404).json({ message: 'Ordem não encontrada' });

    const faturaDoc = await Fatura.findById(faturaId);
    if (!faturaDoc) return res.status(404).json({ message: 'Fatura não encontrada' });

    ordem.fatura = faturaId;
    ordem.faturaNumeroManual = null;
    await ordem.save();

    // Se a OP já está paga, sincronizar com a fatura vinculada
    if (ordem.status === 'Paga' && faturaDoc.ativo) {
      const ordensPagasFatura = await OrdemPagamento.find({
        fatura: faturaId,
        status: 'Paga',
        ativo: true
      }).lean();

      const totalPagoOPs = ordensPagasFatura.reduce((sum, op) => sum + (op.valor || 0), 0);
      const valorDevido = faturaDoc.valorDevido || 0;

      const osIds = [];
      if (totalPagoOPs >= valorDevido) {
        faturaDoc.ordensServico.forEach(os => {
          if (os.statusPagamento !== 'Paga') {
            os.statusPagamento = 'Paga';
            os.dataPagamento = ordem.dataPagamento || new Date();
            os.comprovante = ordem.comprovante || null;
            osIds.push(os.ordemServico);
          }
        });
      } else {
        let restante = totalPagoOPs;
        for (const os of faturaDoc.ordensServico) {
          if (os.statusPagamento !== 'Paga' && restante > 0) {
            if (restante >= (os.valorOS || 0)) {
              os.statusPagamento = 'Paga';
              os.dataPagamento = ordem.dataPagamento || new Date();
              os.comprovante = ordem.comprovante || null;
              osIds.push(os.ordemServico);
              restante -= (os.valorOS || 0);
            } else {
              break;
            }
          }
        }
      }

      await faturaDoc.save();

      if (osIds.length > 0) {
        await OrdemServico.updateMany(
          { _id: { $in: osIds } },
          { $set: { status: 'Paga' } }
        );
      }
    }

    res.json({ success: true, message: 'Fatura vinculada com sucesso', data: ordem });
  } catch (error) {
    console.error('Erro ao vincular fatura:', error);
    res.status(500).json({ message: 'Erro ao vincular fatura', error: error.message });
  }
};

// @desc    Retentar sincronização com FinSystem
// @route   POST /api/ordens-pagamento/:id/resincronizar
exports.resincronizar = async (req, res) => {
  try {
    const ordem = await OrdemPagamento.findOne({ _id: req.params.id, ativo: true })
      .populate('fornecedor', 'razaoSocial nomeFantasia')
      .populate('cliente', 'razaoSocial nomeFantasia');

    if (!ordem) return res.status(404).json({ message: 'Ordem não encontrada' });

    if (ordem.finsystemSincronizado) {
      return res.json({ success: true, message: 'Ordem já está sincronizada', finsystemId: ordem.finsystemId });
    }

    const resultado = await finsystemService.criarRepasseFornecedor(ordem, ordem.fornecedor, ordem.cliente);

    await OrdemPagamento.findByIdAndUpdate(ordem._id, {
      finsystemSincronizado: resultado.success,
      finsystemId: resultado.finsystemId,
      finsystemErro: resultado.error
    });

    if (resultado.success) {
      res.json({ success: true, message: 'Sincronizado com sucesso!', finsystemId: resultado.finsystemId });
    } else {
      res.status(502).json({ success: false, message: `Falha: ${resultado.error}` });
    }
  } catch (error) {
    console.error('Erro ao resincronizar:', error);
    res.status(500).json({ message: 'Erro ao resincronizar', error: error.message });
  }
};

// @desc    Health check do FinSystem
// @route   GET /api/ordens-pagamento/finsystem-status
exports.finsystemStatus = async (req, res) => {
  try {
    const status = await finsystemService.healthCheck();
    res.json({ success: true, finsystem: status });
  } catch (error) {
    res.status(500).json({ success: false, finsystem: { online: false } });
  }
};
