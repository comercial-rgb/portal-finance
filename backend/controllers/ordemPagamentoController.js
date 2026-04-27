const OrdemPagamento = require('../models/OrdemPagamento');
const Fornecedor = require('../models/Fornecedor');
const Cliente = require('../models/Cliente');
const Fatura = require('../models/Fatura');
const OrdemServico = require('../models/OrdemServico');
const Abastecimento = require('../models/Abastecimento');
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
      .select('-comprovante') // base64 pode ser MUITO grande; carregado sob demanda
      .populate('cliente', 'razaoSocial nomeFantasia cnpjCpf')
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf banco tipoConta agencia conta chavePix tipoChavePix')
      .populate('fatura', 'numeroFatura valorDevido statusFatura')
      .sort({ createdAt: -1 })
      .lean();

    // Adiciona flag booleana indicando se a OP possui comprovante armazenado.
    // Query separada só com _id (bem mais leve que trazer o base64).
    const idsComComprovante = await OrdemPagamento.find(
      { ...query, $and: [{ comprovante: { $exists: true } }, { comprovante: { $ne: null } }, { comprovante: { $ne: '' } }] },
      { _id: 1 }
    ).lean();
    const setComComprovante = new Set(idsComComprovante.map(o => String(o._id)));
    for (const ordem of ordens) {
      ordem.temComprovante = setComComprovante.has(String(ordem._id));
    }

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
    const match = { ativo: true };

    if (user.role === 'fornecedor' && user.fornecedorId) {
      match.fornecedor = new (require('mongoose').Types.ObjectId)(user.fornecedorId);
    }

    // Aggregate ao invés de buscar todos os documentos e iterar em memória.
    const agg = await OrdemPagamento.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          valor: { $sum: { $ifNull: ['$valor', 0] } }
        }
      }
    ]);

    let totalOrdens = 0;
    let pendentes = 0;
    let pagas = 0;
    let valorTotalPendente = 0;
    let valorTotalPago = 0;

    for (const g of agg) {
      totalOrdens += g.count;
      if (g._id === 'Pendente') {
        pendentes = g.count;
        valorTotalPendente = g.valor;
      } else if (g._id === 'Paga') {
        pagas = g.count;
        valorTotalPago = g.valor;
      }
    }

    res.json({
      success: true,
      data: { totalOrdens, pendentes, pagas, valorTotalPendente, valorTotalPago }
    });
  } catch (error) {
    console.error('Erro ao gerar resumo:', error);
    res.status(500).json({ message: 'Erro ao gerar resumo', error: error.message });
  }
};

// @desc    Obter comprovante de uma OP sob demanda (evita trafegar base64 na listagem)
// @route   GET /api/ordens-pagamento/:id/comprovante
exports.obterComprovante = async (req, res) => {
  try {
    const user = req.user;
    const query = { _id: req.params.id, ativo: true };
    if (user.role === 'fornecedor' && user.fornecedorId) {
      query.fornecedor = user.fornecedorId;
    }
    const ordem = await OrdemPagamento.findOne(query).select('comprovante codigo').lean();
    if (!ordem) return res.status(404).json({ message: 'Ordem não encontrada' });
    res.json({ success: true, data: { comprovante: ordem.comprovante || null, codigo: ordem.codigo } });
  } catch (error) {
    console.error('Erro ao obter comprovante:', error);
    res.status(500).json({ message: 'Erro ao obter comprovante', error: error.message });
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

    if (fatura) {
      const faturaDoc = await Fatura.findOne({
        _id: fatura,
        ativo: true,
        fornecedor,
        tipo: 'Fornecedor'
      }).select('_id');

      if (!faturaDoc) {
        return res.status(400).json({ message: 'Fatura inválida para o fornecedor informado' });
      }
    }

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

    let ultimaFalha = null;
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      try {
        await ordem.save();
        ultimaFalha = null;
        break;
      } catch (err) {
        const erroDuplicadoCodigo = err?.code === 11000 && err?.keyPattern?.codigo;
        if (erroDuplicadoCodigo && tentativa < 3) {
          console.warn(`⚠️ Código duplicado ao criar OP (tentativa ${tentativa}). Regenerando...`);
          ordem.codigo = undefined;
          ultimaFalha = err;
          continue;
        }
        throw err;
      }
    }

    if (ultimaFalha) {
      throw ultimaFalha;
    }

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
    if (error?.code === 11000) {
      return res.status(409).json({
        message: 'Conflito ao gerar código da ordem. Tente novamente.',
        error: error.message,
        keyPattern: error.keyPattern
      });
    }
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ message: 'Dados inválidos', error: error.message });
    }
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
        const abastecimentoIds = [];

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
          // Marcar todos os abastecimentos vinculados como pagos
          (fatura.abastecimentosVinculados || []).forEach(ab => {
            if (ab.statusPagamento !== 'Paga') {
              ab.statusPagamento = 'Paga';
              ab.dataPagamento = ordem.dataPagamento;
              ab.comprovante = ordem.comprovante || null;
              abastecimentoIds.push(ab.abastecimento);
            }
          });
        } else {
          // Pagamento parcial - marcar OS/abastecimentos proporcionalmente
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
          for (const ab of (fatura.abastecimentosVinculados || [])) {
            if (ab.statusPagamento !== 'Paga' && restante > 0) {
              if (restante >= (ab.valorAbastecimento || 0)) {
                ab.statusPagamento = 'Paga';
                ab.dataPagamento = ordem.dataPagamento;
                ab.comprovante = ordem.comprovante || null;
                abastecimentoIds.push(ab.abastecimento);
                restante -= (ab.valorAbastecimento || 0);
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

        // Atualizar status dos Abastecimentos
        if (abastecimentoIds.length > 0) {
          await Abastecimento.updateMany(
            { _id: { $in: abastecimentoIds } },
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
      const abastecimentoIds = [];

      if (totalPagoOPs >= valorDevido) {
        faturaDoc.ordensServico.forEach(os => {
          if (os.statusPagamento !== 'Paga') {
            os.statusPagamento = 'Paga';
            os.dataPagamento = ordem.dataPagamento || new Date();
            os.comprovante = ordem.comprovante || null;
            osIds.push(os.ordemServico);
          }
        });
        (faturaDoc.abastecimentosVinculados || []).forEach(ab => {
          if (ab.statusPagamento !== 'Paga') {
            ab.statusPagamento = 'Paga';
            ab.dataPagamento = ordem.dataPagamento || new Date();
            ab.comprovante = ordem.comprovante || null;
            abastecimentoIds.push(ab.abastecimento);
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
        for (const ab of (faturaDoc.abastecimentosVinculados || [])) {
          if (ab.statusPagamento !== 'Paga' && restante > 0) {
            if (restante >= (ab.valorAbastecimento || 0)) {
              ab.statusPagamento = 'Paga';
              ab.dataPagamento = ordem.dataPagamento || new Date();
              ab.comprovante = ordem.comprovante || null;
              abastecimentoIds.push(ab.abastecimento);
              restante -= (ab.valorAbastecimento || 0);
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

      if (abastecimentoIds.length > 0) {
        await Abastecimento.updateMany(
          { _id: { $in: abastecimentoIds } },
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
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf')
      .populate('cliente', 'razaoSocial nomeFantasia cnpjCpf')
      .populate('fatura', 'numeroFatura');

    if (!ordem) return res.status(404).json({ message: 'Ordem não encontrada' });

    if (ordem.finsystemSincronizado) {
      return res.json({ success: true, message: 'Ordem já está sincronizada', finsystemId: ordem.finsystemId });
    }

    // Verificar se FinSystem está configurado
    if (!finsystemService.isConfigured()) {
      await OrdemPagamento.findByIdAndUpdate(ordem._id, {
        finsystemSincronizado: false,
        finsystemErro: 'FinSystem não configurado'
      });
      return res.status(400).json({ success: false, message: 'FinSystem não está configurado. Configure as variáveis FINSYSTEM_API_URL e FINSYSTEM_API_KEY.' });
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
      res.status(502).json({ success: false, message: resultado.error });
    }
  } catch (error) {
    console.error('Erro ao resincronizar:', error);
    res.status(500).json({ message: 'Erro ao resincronizar', error: error.message });
  }
};

// @desc    Editar ordem de pagamento (apenas Pendente)
// @route   PUT /api/ordens-pagamento/:id
exports.editar = async (req, res) => {
  try {
    const { valor, dataGeracao, observacoes, faturaNumeroManual } = req.body;
    const updateData = {};
    if (valor !== undefined) updateData.valor = parseFloat(valor);
    if (dataGeracao !== undefined) updateData.dataGeracao = dataGeracao;
    if (observacoes !== undefined) updateData.observacoes = observacoes;
    if (faturaNumeroManual !== undefined) updateData.faturaNumeroManual = faturaNumeroManual;

    const ordem = await OrdemPagamento.findOneAndUpdate(
      { _id: req.params.id, ativo: true },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('cliente', 'razaoSocial nomeFantasia')
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf')
      .populate('fatura', 'numeroFatura');

    if (!ordem) return res.status(404).json({ message: 'Ordem não encontrada' });
    res.json({ success: true, message: 'Ordem atualizada com sucesso', data: ordem });
  } catch (error) {
    console.error('Erro ao editar ordem:', error);
    res.status(500).json({ message: 'Erro ao editar ordem', error: error.message });
  }
};

// @desc    Anexar/atualizar nota de comissão
// @route   PUT /api/ordens-pagamento/:id/nota-comissao
exports.notaComissao = async (req, res) => {
  try {
    const { notaComissao } = req.body;
    if (!notaComissao) return res.status(400).json({ message: 'Arquivo da nota de comissão é obrigatório' });

    const ordem = await OrdemPagamento.findOneAndUpdate(
      { _id: req.params.id, ativo: true },
      { notaComissao },
      { new: true }
    );
    if (!ordem) return res.status(404).json({ message: 'Ordem não encontrada' });
    res.json({ success: true, message: 'Nota de comissão anexada com sucesso' });
  } catch (error) {
    console.error('Erro ao anexar nota de comissão:', error);
    res.status(500).json({ message: 'Erro ao anexar nota de comissão', error: error.message });
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
