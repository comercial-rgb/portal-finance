const OrdemPagamento = require('../models/OrdemPagamento');
const Fatura = require('../models/Fatura');
const Fornecedor = require('../models/Fornecedor');
const Cliente = require('../models/Cliente');
const mongoose = require('mongoose');

// @desc    Listar ordens de pagamento
// @route   GET /api/ordens-pagamento
exports.listarOrdensPagamento = async (req, res) => {
  try {
    const user = req.user;
    let query = {};

    // Fornecedor só vê suas próprias ordens
    if (user.role === 'fornecedor' && user.fornecedorId) {
      query.fornecedor = user.fornecedorId;
    } else if (!['super_admin', 'admin', 'gerente'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Sem permissão para acessar ordens de pagamento' });
    }

    // Filtros opcionais
    const { status, fornecedorId, clienteId, dataInicio, dataFim } = req.query;
    if (status) query.status = status;
    if (fornecedorId && user.role !== 'fornecedor') query.fornecedor = fornecedorId;
    if (clienteId) query.cliente = clienteId;
    if (dataInicio || dataFim) {
      query.dataGeracao = {};
      if (dataInicio) query.dataGeracao.$gte = new Date(dataInicio);
      if (dataFim) query.dataGeracao.$lte = new Date(dataFim);
    }

    const ordens = await OrdemPagamento.find(query)
      .populate('cliente', 'razaoSocial nomeFantasia cnpj')
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf banco tipoConta agencia conta chavePix tipoChavePix')
      .populate('fatura', 'numeroFatura valorDevido statusFatura')
      .populate('faturaVinculada', 'numeroFatura')
      .populate('criadoPor', 'nome')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: ordens });
  } catch (error) {
    console.error('Erro ao listar ordens de pagamento:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar ordens de pagamento', error: error.message });
  }
};

// @desc    Criar ordem de pagamento
// @route   POST /api/ordens-pagamento
exports.criarOrdemPagamento = async (req, res) => {
  try {
    const user = req.user;

    // Apenas admins podem criar
    if (!['super_admin', 'admin', 'gerente'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Sem permissão para criar ordens de pagamento' });
    }

    const { cliente, fornecedor, fatura, faturaNumeroManual, valor, dataGeracao, observacoes } = req.body;

    // Validações
    if (!cliente || !fornecedor || !valor || !dataGeracao) {
      return res.status(400).json({ success: false, message: 'Cliente, fornecedor, valor e data são obrigatórios' });
    }

    if (valor <= 0) {
      return res.status(400).json({ success: false, message: 'Valor deve ser maior que zero' });
    }

    // Verificar se cliente existe
    const clienteExists = await Cliente.findById(cliente).lean();
    if (!clienteExists) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    }

    // Verificar se fornecedor existe
    const fornecedorExists = await Fornecedor.findById(fornecedor).lean();
    if (!fornecedorExists) {
      return res.status(404).json({ success: false, message: 'Fornecedor não encontrado' });
    }

    // Verificar fatura se fornecida
    if (fatura) {
      const faturaExists = await Fatura.findById(fatura).lean();
      if (!faturaExists) {
        return res.status(404).json({ success: false, message: 'Fatura não encontrada' });
      }
    }

    const ordem = new OrdemPagamento({
      cliente,
      fornecedor,
      fatura: fatura || null,
      faturaNumeroManual: faturaNumeroManual || null,
      valor: Math.round(valor * 100) / 100,
      dataGeracao: new Date(dataGeracao),
      observacoes: observacoes || '',
      criadoPor: user._id
    });

    await ordem.save();

    // Populate para retornar dados completos
    const ordemPopulada = await OrdemPagamento.findById(ordem._id)
      .populate('cliente', 'razaoSocial nomeFantasia cnpj')
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf banco tipoConta agencia conta chavePix tipoChavePix')
      .populate('fatura', 'numeroFatura valorDevido statusFatura')
      .populate('criadoPor', 'nome')
      .lean();

    res.status(201).json({ success: true, data: ordemPopulada });
  } catch (error) {
    console.error('Erro ao criar ordem de pagamento:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Ordem de pagamento duplicada. Tente novamente.' });
    }
    res.status(500).json({ success: false, message: 'Erro ao criar ordem de pagamento', error: error.message });
  }
};

// @desc    Editar ordem de pagamento
// @route   PUT /api/ordens-pagamento/:id
exports.editarOrdemPagamento = async (req, res) => {
  try {
    const user = req.user;

    if (!['super_admin', 'admin', 'gerente'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Sem permissão para editar ordens de pagamento' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const ordem = await OrdemPagamento.findById(id);
    if (!ordem) {
      return res.status(404).json({ success: false, message: 'Ordem de pagamento não encontrada' });
    }

    const { cliente, fornecedor, fatura, faturaNumeroManual, valor, dataGeracao, observacoes } = req.body;

    if (valor !== undefined) {
      if (valor <= 0) return res.status(400).json({ success: false, message: 'Valor deve ser maior que zero' });
      ordem.valor = Math.round(valor * 100) / 100;
    }
    if (cliente) {
      const clienteExists = await Cliente.findById(cliente).lean();
      if (!clienteExists) return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
      ordem.cliente = cliente;
    }
    if (fornecedor) {
      const fornecedorExists = await Fornecedor.findById(fornecedor).lean();
      if (!fornecedorExists) return res.status(404).json({ success: false, message: 'Fornecedor não encontrado' });
      ordem.fornecedor = fornecedor;
    }
    if (fatura !== undefined) ordem.fatura = fatura || null;
    if (faturaNumeroManual !== undefined) ordem.faturaNumeroManual = faturaNumeroManual || null;
    if (dataGeracao) ordem.dataGeracao = new Date(dataGeracao);
    if (observacoes !== undefined) ordem.observacoes = observacoes;

    await ordem.save();

    const ordemPopulada = await OrdemPagamento.findById(ordem._id)
      .populate('cliente', 'razaoSocial nomeFantasia cnpj')
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf banco tipoConta agencia conta chavePix tipoChavePix')
      .populate('fatura', 'numeroFatura valorDevido statusFatura')
      .populate('faturaVinculada', 'numeroFatura')
      .populate('criadoPor', 'nome')
      .lean();

    res.json({ success: true, data: ordemPopulada, message: 'Ordem atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao editar ordem de pagamento:', error);
    res.status(500).json({ success: false, message: 'Erro ao editar ordem de pagamento', error: error.message });
  }
};

// @desc    Marcar ordem como paga e anexar comprovante
// @route   PUT /api/ordens-pagamento/:id/pagar
exports.pagarOrdemPagamento = async (req, res) => {
  try {
    const user = req.user;

    if (!['super_admin', 'admin', 'gerente'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Sem permissão para registrar pagamento' });
    }

    const { id } = req.params;
    const { comprovante } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    if (!comprovante) {
      return res.status(400).json({ success: false, message: 'Comprovante é obrigatório para registrar pagamento' });
    }

    // Validar tamanho do base64 (~7MB raw = ~5MB file)
    if (comprovante.length > 7 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Arquivo muito grande. Máximo 5MB.' });
    }

    const ordem = await OrdemPagamento.findById(id);
    if (!ordem) {
      return res.status(404).json({ success: false, message: 'Ordem de pagamento não encontrada' });
    }

    if (ordem.status === 'Paga') {
      return res.status(400).json({ success: false, message: 'Ordem já está paga' });
    }

    ordem.status = 'Paga';
    ordem.dataPagamento = new Date();
    ordem.comprovante = comprovante;
    await ordem.save();

    const ordemPopulada = await OrdemPagamento.findById(ordem._id)
      .populate('cliente', 'razaoSocial nomeFantasia cnpj')
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf banco tipoConta agencia conta chavePix tipoChavePix')
      .populate('fatura', 'numeroFatura valorDevido statusFatura')
      .populate('faturaVinculada', 'numeroFatura')
      .populate('criadoPor', 'nome')
      .lean();

    res.json({ success: true, data: ordemPopulada, message: 'Pagamento registrado com sucesso' });
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    res.status(500).json({ success: false, message: 'Erro ao registrar pagamento', error: error.message });
  }
};

// @desc    Vincular ordem de pagamento a uma fatura
// @route   PUT /api/ordens-pagamento/:id/vincular-fatura
exports.vincularFatura = async (req, res) => {
  try {
    const user = req.user;

    if (!['super_admin', 'admin', 'gerente'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Sem permissão para vincular fatura' });
    }

    const { id } = req.params;
    const { faturaId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID da ordem inválido' });
    }

    if (!faturaId || !mongoose.Types.ObjectId.isValid(faturaId)) {
      return res.status(400).json({ success: false, message: 'ID da fatura inválido' });
    }

    const ordem = await OrdemPagamento.findById(id);
    if (!ordem) {
      return res.status(404).json({ success: false, message: 'Ordem de pagamento não encontrada' });
    }

    if (ordem.status !== 'Paga') {
      return res.status(400).json({ success: false, message: 'Apenas ordens pagas podem ser vinculadas a uma fatura' });
    }

    const faturaDestino = await Fatura.findById(faturaId);
    if (!faturaDestino) {
      return res.status(404).json({ success: false, message: 'Fatura não encontrada' });
    }

    ordem.faturaVinculada = faturaId;
    await ordem.save();

    const ordemPopulada = await OrdemPagamento.findById(ordem._id)
      .populate('cliente', 'razaoSocial nomeFantasia cnpj')
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf banco tipoConta agencia conta chavePix tipoChavePix')
      .populate('fatura', 'numeroFatura valorDevido statusFatura')
      .populate('faturaVinculada', 'numeroFatura')
      .populate('criadoPor', 'nome')
      .lean();

    res.json({ success: true, data: ordemPopulada, message: 'Fatura vinculada com sucesso' });
  } catch (error) {
    console.error('Erro ao vincular fatura:', error);
    res.status(500).json({ success: false, message: 'Erro ao vincular fatura', error: error.message });
  }
};

// @desc    Buscar faturas abertas de um fornecedor
// @route   GET /api/ordens-pagamento/faturas-fornecedor/:fornecedorId
exports.faturasAbertasFornecedor = async (req, res) => {
  try {
    const user = req.user;

    if (!['super_admin', 'admin', 'gerente'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Sem permissão' });
    }

    const { fornecedorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fornecedorId)) {
      return res.status(400).json({ success: false, message: 'ID do fornecedor inválido' });
    }

    const faturas = await Fatura.find({
      fornecedor: fornecedorId,
      tipo: 'Fornecedor',
      statusFatura: { $in: ['Aguardando pagamento', 'Parcialmente paga'] },
      ativo: true
    })
      .select('numeroFatura valorDevido valorRestante statusFatura dataVencimento')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: faturas });
  } catch (error) {
    console.error('Erro ao buscar faturas do fornecedor:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar faturas', error: error.message });
  }
};

// @desc    Resumo de ordens de pagamento
// @route   GET /api/ordens-pagamento/resumo
exports.resumoOrdensPagamento = async (req, res) => {
  try {
    const user = req.user;
    let query = {};

    if (user.role === 'fornecedor' && user.fornecedorId) {
      query.fornecedor = user.fornecedorId;
    } else if (!['super_admin', 'admin', 'gerente'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Sem permissão' });
    }

    const ordens = await OrdemPagamento.find(query).lean();

    const totalOrdens = ordens.length;
    const ordensPendentes = ordens.filter(o => o.status === 'Pendente');
    const ordensPagas = ordens.filter(o => o.status === 'Paga');

    const resumo = {
      totalOrdens,
      pendentes: ordensPendentes.length,
      pagas: ordensPagas.length,
      valorTotalPendente: ordensPendentes.reduce((sum, o) => sum + o.valor, 0),
      valorTotalPago: ordensPagas.reduce((sum, o) => sum + o.valor, 0)
    };

    res.json({ success: true, data: resumo });
  } catch (error) {
    console.error('Erro ao obter resumo:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter resumo', error: error.message });
  }
};
