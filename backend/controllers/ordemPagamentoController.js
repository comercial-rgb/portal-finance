const OrdemPagamento = require('../models/OrdemPagamento');
const Fornecedor = require('../models/Fornecedor');
const Cliente = require('../models/Cliente');
const Fatura = require('../models/Fatura');
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
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf banco tipoConta agencia conta chavePix tipoChavePix')
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

    // Criar ordem com retry para evitar conflito de código duplicado
    let ordem;
    let tentativas = 0;
    const maxTentativas = 3;

    while (tentativas < maxTentativas) {
      try {
        ordem = new OrdemPagamento({
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
        break; // Sucesso, sai do loop
      } catch (saveError) {
        tentativas++;
        if (saveError.code === 11000 && tentativas < maxTentativas) {
          // Código duplicado, tentar novamente (pre-save irá gerar novo código)
          console.warn(`⚠️ Conflito de código OP, tentativa ${tentativas}/${maxTentativas}`);
          continue;
        }
        throw saveError; // Outro erro ou esgotou tentativas
      }
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
      .populate('cliente', 'razaoSocial nomeFantasia')
      .populate('fatura', 'numeroFatura');

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

// @desc    Sincronizar em lote todas as ordens não sincronizadas com FinSystem
// @route   POST /api/ordens-pagamento/sincronizar-lote
exports.sincronizarLote = async (req, res) => {
  try {
    const dataMinima = new Date('2026-04-09T00:00:00.000Z');
    const ordensNaoSincronizadas = await OrdemPagamento.find({
      ativo: true,
      finsystemSincronizado: { $ne: true },
      finsystemIgnorado: { $ne: true },
      createdAt: { $gte: dataMinima }
    })
      .populate('fornecedor', 'razaoSocial nomeFantasia')
      .populate('cliente', 'razaoSocial nomeFantasia')
      .populate('fatura', 'numeroFatura');

    if (ordensNaoSincronizadas.length === 0) {
      return res.json({ success: true, message: 'Todas as ordens já estão sincronizadas', resultados: { total: 0, sucesso: 0, falha: 0, detalhes: [] } });
    }

    const resultados = { total: ordensNaoSincronizadas.length, sucesso: 0, falha: 0, detalhes: [] };

    for (const ordem of ordensNaoSincronizadas) {
      try {
        const resultado = await finsystemService.criarRepasseFornecedor(ordem, ordem.fornecedor, ordem.cliente);

        await OrdemPagamento.findByIdAndUpdate(ordem._id, {
          finsystemSincronizado: resultado.success,
          finsystemId: resultado.finsystemId,
          finsystemErro: resultado.error
        });

        if (resultado.success) {
          resultados.sucesso++;
          resultados.detalhes.push({ codigo: ordem.codigo, status: 'sucesso', finsystemId: resultado.finsystemId });
        } else {
          resultados.falha++;
          resultados.detalhes.push({ codigo: ordem.codigo, status: 'falha', erro: resultado.error });
        }
      } catch (err) {
        resultados.falha++;
        resultados.detalhes.push({ codigo: ordem.codigo, status: 'falha', erro: err.message });
        await OrdemPagamento.findByIdAndUpdate(ordem._id, {
          finsystemSincronizado: false,
          finsystemErro: err.message
        });
      }
    }

    const mensagem = `Sincronização concluída: ${resultados.sucesso}/${resultados.total} com sucesso`;
    console.log(`📊 ${mensagem}`);
    res.json({ success: true, message: mensagem, resultados });
  } catch (error) {
    console.error('Erro na sincronização em lote:', error);
    res.status(500).json({ message: 'Erro na sincronização em lote', error: error.message });
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

// @desc    Ignorar sincronização FinSystem para uma ordem
// @route   POST /api/ordens-pagamento/:id/ignorar-sync
exports.ignorarSync = async (req, res) => {
  try {
    const ordem = await OrdemPagamento.findByIdAndUpdate(
      req.params.id,
      { finsystemIgnorado: true, finsystemSincronizado: true, finsystemErro: null },
      { new: true }
    );
    if (!ordem) return res.status(404).json({ message: 'Ordem não encontrada' });
    res.json({ success: true, message: 'Sincronização ignorada com sucesso' });
  } catch (error) {
    console.error('Erro ao ignorar sync:', error);
    res.status(500).json({ message: 'Erro ao ignorar sincronização', error: error.message });
  }
};

// @desc    Anexar/atualizar nota de comissão PDF
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

// @desc    Editar ordem de pagamento
// @route   PUT /api/ordens-pagamento/:id
exports.editar = async (req, res) => {
  try {
    const { valor, dataGeracao, observacoes, faturaNumeroManual } = req.body;
    const updateData = {};
    if (valor !== undefined) updateData.valor = valor;
    if (dataGeracao !== undefined) updateData.dataGeracao = dataGeracao;
    if (observacoes !== undefined) updateData.observacoes = observacoes;
    if (faturaNumeroManual !== undefined) updateData.faturaNumeroManual = faturaNumeroManual;

    const ordem = await OrdemPagamento.findOneAndUpdate(
      { _id: req.params.id, ativo: true },
      updateData,
      { new: true }
    );
    if (!ordem) return res.status(404).json({ message: 'Ordem não encontrada' });
    res.json({ success: true, message: 'Ordem atualizada com sucesso', data: ordem });
  } catch (error) {
    console.error('Erro ao editar ordem:', error);
    res.status(500).json({ message: 'Erro ao editar ordem', error: error.message });
  }
};
