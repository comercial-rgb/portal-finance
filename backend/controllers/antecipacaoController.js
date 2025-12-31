const Antecipacao = require('../models/Antecipacao');
const Fatura = require('../models/Fatura');
const ImpostosRetencoes = require('../models/ImpostosRetencoes');
const Fornecedor = require('../models/Fornecedor');
const Notificacao = require('../models/Notificacao');
const User = require('../models/User');

// Função para criar notificação
const criarNotificacao = async (dados) => {
  try {
    await Notificacao.create(dados);
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
  }
};

// Calcular taxa baseada nos dias de antecipação
const calcularTaxa = (diasAntecipados, taxas) => {
  if (diasAntecipados >= 25 && diasAntecipados <= 30) {
    return taxas.faixa30a25 || 10;
  } else if (diasAntecipados >= 19 && diasAntecipados <= 24) {
    return taxas.faixa24a19 || 8;
  } else if (diasAntecipados >= 12 && diasAntecipados <= 18) {
    return taxas.faixa18a12 || 6;
  } else if (diasAntecipados >= 6 && diasAntecipados <= 11) {
    return taxas.faixa11a06 || 4;
  } else if (diasAntecipados >= 1 && diasAntecipados <= 5) {
    return taxas.faixa05a01 || 2.5;
  }
  return 0;
};

// Calcular dias entre duas datas
const calcularDias = (dataDesejada, previsaoRecebimento) => {
  const data1 = new Date(dataDesejada);
  const data2 = new Date(previsaoRecebimento);
  const diffTime = data2.getTime() - data1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// @desc    Listar todas as antecipações (admin) ou do fornecedor logado
// @route   GET /api/antecipacoes
exports.listarAntecipacoes = async (req, res) => {
  try {
    const user = req.user;
    let query = { ativo: true };
    
    // Se for fornecedor, mostrar apenas suas antecipações
    if (user.role === 'fornecedor' && user.fornecedorId) {
      query.fornecedor = user.fornecedorId;
    }
    
    const antecipacoes = await Antecipacao.find(query)
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf')
      .populate('solicitadoPor', 'nome email')
      .populate('processadoPor', 'nome email')
      .populate('faturas.fatura', 'numeroFatura valorDevido previsaoRecebimento')
      .sort({ createdAt: -1 });
    
    res.json(antecipacoes);
  } catch (error) {
    console.error('Erro ao listar antecipações:', error);
    res.status(500).json({ message: 'Erro ao listar antecipações', error: error.message });
  }
};

// @desc    Buscar antecipação por ID
// @route   GET /api/antecipacoes/:id
exports.buscarAntecipacao = async (req, res) => {
  try {
    const antecipacao = await Antecipacao.findById(req.params.id)
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf')
      .populate('solicitadoPor', 'nome email')
      .populate('processadoPor', 'nome email')
      .populate('faturas.fatura', 'numeroFatura valorDevido previsaoRecebimento');
    
    if (!antecipacao) {
      return res.status(404).json({ message: 'Antecipação não encontrada' });
    }
    
    res.json(antecipacao);
  } catch (error) {
    console.error('Erro ao buscar antecipação:', error);
    res.status(500).json({ message: 'Erro ao buscar antecipação', error: error.message });
  }
};

// @desc    Calcular prévia de antecipação (sem salvar)
// @route   POST /api/antecipacoes/calcular
exports.calcularAntecipacao = async (req, res) => {
  try {
    const { valorSolicitado, dataDesejadaRecebimento, previsaoRecebimento } = req.body;
    
    // Buscar taxas configuradas
    const impostos = await ImpostosRetencoes.findOne({ ativo: true });
    const taxas = impostos?.taxasAntecipacaoFaixas || {
      faixa30a25: 10,
      faixa24a19: 8,
      faixa18a12: 6,
      faixa11a06: 4,
      faixa05a01: 2.5
    };
    
    // Calcular dias antecipados
    const diasAntecipados = calcularDias(dataDesejadaRecebimento, previsaoRecebimento);
    
    // Validar se está dentro do limite (máximo 30 dias)
    if (diasAntecipados < 1 || diasAntecipados > 30) {
      return res.status(400).json({ 
        message: 'A antecipação deve ser de 1 a 30 dias antes da previsão de recebimento' 
      });
    }
    
    // Calcular taxa
    const taxaAplicada = calcularTaxa(diasAntecipados, taxas);
    const valorDesconto = (valorSolicitado * taxaAplicada) / 100;
    const valorAReceber = valorSolicitado - valorDesconto;
    
    res.json({
      valorSolicitado,
      diasAntecipados,
      taxaAplicada,
      valorDesconto,
      valorAReceber,
      dataDesejadaRecebimento,
      previsaoRecebimento
    });
  } catch (error) {
    console.error('Erro ao calcular antecipação:', error);
    res.status(500).json({ message: 'Erro ao calcular antecipação', error: error.message });
  }
};

// @desc    Criar nova solicitação de antecipação
// @route   POST /api/antecipacoes
exports.criarAntecipacao = async (req, res) => {
  try {
    const user = req.user;
    const { 
      valorSolicitado, 
      dataDesejadaRecebimento, 
      faturasSelecionadas,
      observacoes 
    } = req.body;
    
    // Verificar se é fornecedor
    if (user.role !== 'fornecedor' || !user.fornecedorId) {
      return res.status(403).json({ message: 'Apenas fornecedores podem solicitar antecipação' });
    }
    
    // Buscar faturas pendentes do fornecedor
    const faturasPendentes = await Fatura.find({
      _id: { $in: faturasSelecionadas },
      fornecedor: user.fornecedorId,
      statusFatura: { $ne: 'Paga' },
      tipo: 'Fornecedor'
    });
    
    if (faturasPendentes.length === 0) {
      return res.status(400).json({ message: 'Nenhuma fatura pendente válida selecionada' });
    }
    
    // Calcular valor pendente total das faturas selecionadas
    const valorPendenteTotal = faturasPendentes.reduce((sum, f) => sum + (f.valorDevido - f.valorPago), 0);
    
    // Validar valor solicitado
    if (valorSolicitado > valorPendenteTotal) {
      return res.status(400).json({ 
        message: `Valor solicitado (R$ ${valorSolicitado.toFixed(2)}) maior que o valor pendente (R$ ${valorPendenteTotal.toFixed(2)})` 
      });
    }
    
    // Pegar previsão de recebimento da primeira fatura (ou a menor)
    const previsaoRecebimento = faturasPendentes
      .filter(f => f.previsaoRecebimento)
      .sort((a, b) => new Date(a.previsaoRecebimento) - new Date(b.previsaoRecebimento))[0]?.previsaoRecebimento;
    
    if (!previsaoRecebimento) {
      return res.status(400).json({ message: 'Faturas selecionadas não possuem previsão de recebimento' });
    }
    
    // Calcular dias antecipados
    const diasAntecipados = calcularDias(dataDesejadaRecebimento, previsaoRecebimento);
    
    // Validar se está dentro do limite (máximo 30 dias)
    if (diasAntecipados < 1 || diasAntecipados > 30) {
      return res.status(400).json({ 
        message: 'A antecipação deve ser de 1 a 30 dias antes da previsão de recebimento' 
      });
    }
    
    // Buscar taxas configuradas
    const impostos = await ImpostosRetencoes.findOne({ ativo: true });
    const taxas = impostos?.taxasAntecipacaoFaixas || {
      faixa30a25: 10,
      faixa24a19: 8,
      faixa18a12: 6,
      faixa11a06: 4,
      faixa05a01: 2.5
    };
    
    // Calcular taxa e valores
    const taxaAplicada = calcularTaxa(diasAntecipados, taxas);
    const valorDesconto = (valorSolicitado * taxaAplicada) / 100;
    const valorAReceber = valorSolicitado - valorDesconto;
    
    // Criar registro das faturas com valores distribuídos
    const faturasRegistro = [];
    let valorRestante = valorSolicitado;
    
    for (const fatura of faturasPendentes) {
      const valorDisponivel = fatura.valorDevido - fatura.valorPago;
      const valorUtilizado = Math.min(valorRestante, valorDisponivel);
      
      if (valorUtilizado > 0) {
        faturasRegistro.push({
          fatura: fatura._id,
          valorUtilizado
        });
        valorRestante -= valorUtilizado;
      }
      
      if (valorRestante <= 0) break;
    }
    
    // Criar antecipação
    const antecipacao = new Antecipacao({
      fornecedor: user.fornecedorId,
      solicitadoPor: user.id,
      faturas: faturasRegistro,
      valorSolicitado,
      taxaAplicada,
      valorDesconto,
      valorAReceber,
      dataDesejadaRecebimento: new Date(dataDesejadaRecebimento),
      previsaoRecebimentoOriginal: previsaoRecebimento,
      diasAntecipados,
      observacoes,
      status: 'Pendente'
    });
    
    await antecipacao.save();
    
    // Buscar fornecedor para nome na notificação
    const fornecedor = await Fornecedor.findById(user.fornecedorId);
    
    // Notificar admins sobre nova solicitação de antecipação
    const admins = await User.find({ role: { $in: ['super_admin', 'admin'] }, ativo: true });
    for (const admin of admins) {
      await criarNotificacao({
        usuario: admin._id,
        tipo: 'antecipacao',
        titulo: 'Nova Solicitação de Antecipação',
        mensagem: `${fornecedor?.razaoSocial || 'Fornecedor'} solicitou antecipação de R$ ${valorSolicitado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        link: '/antecipacoes',
        dados: { antecipacaoId: antecipacao._id }
      });
    }
    
    // Buscar com populações para retornar
    const antecipacaoCriada = await Antecipacao.findById(antecipacao._id)
      .populate('fornecedor', 'razaoSocial nomeFantasia')
      .populate('faturas.fatura', 'numeroFatura valorDevido');
    
    res.status(201).json(antecipacaoCriada);
  } catch (error) {
    console.error('Erro ao criar antecipação:', error);
    res.status(500).json({ message: 'Erro ao criar antecipação', error: error.message });
  }
};

// @desc    Aprovar antecipação (admin)
// @route   PUT /api/antecipacoes/:id/aprovar
exports.aprovarAntecipacao = async (req, res) => {
  try {
    const user = req.user;
    const { observacoesAdmin } = req.body;
    
    // Verificar permissão admin
    if (!['super_admin', 'admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão para aprovar antecipações' });
    }
    
    const antecipacao = await Antecipacao.findById(req.params.id)
      .populate('fornecedor', 'razaoSocial');
    
    if (!antecipacao) {
      return res.status(404).json({ message: 'Antecipação não encontrada' });
    }
    
    if (antecipacao.status !== 'Pendente') {
      return res.status(400).json({ message: 'Apenas antecipações pendentes podem ser aprovadas' });
    }
    
    antecipacao.status = 'Aprovada';
    antecipacao.processadoPor = user.id;
    antecipacao.dataProcessamento = new Date();
    antecipacao.observacoesAdmin = observacoesAdmin;
    
    await antecipacao.save();
    
    // Notificar fornecedor sobre aprovação
    const usuarioFornecedor = await User.findOne({ fornecedorId: antecipacao.fornecedor._id, ativo: true });
    if (usuarioFornecedor) {
      await criarNotificacao({
        usuario: usuarioFornecedor._id,
        tipo: 'antecipacao',
        titulo: 'Antecipação Aprovada',
        mensagem: `Sua solicitação de antecipação de R$ ${antecipacao.valorSolicitado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi aprovada!`,
        link: '/valores-pendentes',
        dados: { antecipacaoId: antecipacao._id }
      });
    }
    
    res.json({ message: 'Antecipação aprovada com sucesso', antecipacao });
  } catch (error) {
    console.error('Erro ao aprovar antecipação:', error);
    res.status(500).json({ message: 'Erro ao aprovar antecipação', error: error.message });
  }
};

// @desc    Rejeitar antecipação (admin)
// @route   PUT /api/antecipacoes/:id/rejeitar
exports.rejeitarAntecipacao = async (req, res) => {
  try {
    const user = req.user;
    const { observacoesAdmin } = req.body;
    
    // Verificar permissão admin
    if (!['super_admin', 'admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão para rejeitar antecipações' });
    }
    
    const antecipacao = await Antecipacao.findById(req.params.id);
    
    if (!antecipacao) {
      return res.status(404).json({ message: 'Antecipação não encontrada' });
    }
    
    if (antecipacao.status !== 'Pendente') {
      return res.status(400).json({ message: 'Apenas antecipações pendentes podem ser rejeitadas' });
    }
    
    antecipacao.status = 'Rejeitada';
    antecipacao.processadoPor = user.id;
    antecipacao.dataProcessamento = new Date();
    antecipacao.observacoesAdmin = observacoesAdmin;
    
    await antecipacao.save();
    
    res.json({ message: 'Antecipação rejeitada', antecipacao });
  } catch (error) {
    console.error('Erro ao rejeitar antecipação:', error);
    res.status(500).json({ message: 'Erro ao rejeitar antecipação', error: error.message });
  }
};

// @desc    Marcar antecipação como paga (admin)
// @route   PUT /api/antecipacoes/:id/pagar
exports.pagarAntecipacao = async (req, res) => {
  try {
    const user = req.user;
    const { comprovantePagamento, observacoesAdmin } = req.body;
    
    // Verificar permissão admin
    if (!['super_admin', 'admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão para processar pagamentos' });
    }
    
    const antecipacao = await Antecipacao.findById(req.params.id)
      .populate('fornecedor', 'razaoSocial');
    
    if (!antecipacao) {
      return res.status(404).json({ message: 'Antecipação não encontrada' });
    }
    
    if (antecipacao.status !== 'Aprovada') {
      return res.status(400).json({ message: 'Apenas antecipações aprovadas podem ser marcadas como pagas' });
    }
    
    // Deduzir valores das faturas relacionadas
    for (const faturaRef of antecipacao.faturas) {
      const fatura = await Fatura.findById(faturaRef.fatura);
      if (fatura) {
        // Adicionar o valor antecipado ao valorPago da fatura
        fatura.valorPago = (fatura.valorPago || 0) + faturaRef.valorUtilizado;
        
        // Recalcular valor restante
        fatura.valorRestante = fatura.valorDevido - fatura.valorPago;
        
        // Atualizar status da fatura
        if (fatura.valorPago >= fatura.valorDevido) {
          fatura.statusFatura = 'Paga';
        } else if (fatura.valorPago > 0) {
          fatura.statusFatura = 'Parcialmente paga';
        }
        
        await fatura.save();
      }
    }
    
    antecipacao.status = 'Paga';
    antecipacao.dataPagamento = new Date();
    antecipacao.comprovantePagamento = comprovantePagamento;
    if (observacoesAdmin) {
      antecipacao.observacoesAdmin = (antecipacao.observacoesAdmin || '') + '\n' + observacoesAdmin;
    }
    
    await antecipacao.save();
    
    // Notificar fornecedor sobre pagamento
    const usuarioFornecedor = await User.findOne({ fornecedorId: antecipacao.fornecedor._id, ativo: true });
    if (usuarioFornecedor) {
      await criarNotificacao({
        usuario: usuarioFornecedor._id,
        tipo: 'pagamento',
        titulo: 'Antecipação Paga',
        mensagem: `O pagamento da antecipação de R$ ${antecipacao.valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi realizado!`,
        link: '/pagamentos',
        dados: { antecipacaoId: antecipacao._id }
      });
    }
    
    res.json({ message: 'Antecipação paga com sucesso', antecipacao });
  } catch (error) {
    console.error('Erro ao pagar antecipação:', error);
    res.status(500).json({ message: 'Erro ao pagar antecipação', error: error.message });
  }
};

// @desc    Cancelar antecipação (fornecedor - apenas pendentes)
// @route   PUT /api/antecipacoes/:id/cancelar
exports.cancelarAntecipacao = async (req, res) => {
  try {
    const user = req.user;
    
    const antecipacao = await Antecipacao.findById(req.params.id);
    
    if (!antecipacao) {
      return res.status(404).json({ message: 'Antecipação não encontrada' });
    }
    
    // Fornecedor só pode cancelar suas próprias antecipações pendentes
    if (user.role === 'fornecedor') {
      if (antecipacao.fornecedor.toString() !== user.fornecedorId?.toString()) {
        return res.status(403).json({ message: 'Sem permissão para cancelar esta antecipação' });
      }
      if (antecipacao.status !== 'Pendente') {
        return res.status(400).json({ message: 'Apenas antecipações pendentes podem ser canceladas' });
      }
    }
    
    antecipacao.status = 'Cancelada';
    await antecipacao.save();
    
    res.json({ message: 'Antecipação cancelada', antecipacao });
  } catch (error) {
    console.error('Erro ao cancelar antecipação:', error);
    res.status(500).json({ message: 'Erro ao cancelar antecipação', error: error.message });
  }
};

// @desc    Obter valor pendente e faturas do fornecedor
// @route   GET /api/antecipacoes/valores-pendentes
exports.obterValoresPendentes = async (req, res) => {
  try {
    const user = req.user;
    const Cliente = require('../models/Cliente');
    
    if (user.role !== 'fornecedor' || !user.fornecedorId) {
      return res.status(403).json({ message: 'Apenas fornecedores podem acessar valores pendentes' });
    }
    
    // Buscar faturas pendentes do fornecedor
    const todasFaturasPendentes = await Fatura.find({
      fornecedor: user.fornecedorId,
      statusFatura: { $ne: 'Paga' },
      tipo: 'Fornecedor',
      ativo: true
    }).populate('cliente', 'tipoTaxa razaoSocial nomeFantasia').sort({ createdAt: -1 });
    
    // Filtrar apenas faturas de clientes com taxa antecipação/variável (NÃO taxa fixa/operacao)
    // Clientes com tipoTaxa === 'operacao' (Taxa Fixa) NÃO podem ter antecipação
    const faturasPendentes = todasFaturasPendentes.filter(f => {
      // Se não tem cliente ou cliente não tem tipoTaxa definido, permitir antecipação por padrão
      if (!f.cliente || !f.cliente.tipoTaxa) return true;
      // Bloquear se cliente tem Taxa Fixa (operacao)
      return f.cliente.tipoTaxa !== 'operacao';
    });
    
    // Faturas bloqueadas por taxa fixa (para informar ao fornecedor)
    const faturasBloqueadas = todasFaturasPendentes.filter(f => 
      f.cliente && f.cliente.tipoTaxa === 'operacao'
    );
    
    // Calcular valor total pendente (apenas faturas elegíveis para antecipação)
    const valorTotalPendente = faturasPendentes.reduce((sum, f) => sum + (f.valorDevido - f.valorPago), 0);
    
    // Valor bloqueado (faturas de clientes com taxa fixa)
    const valorBloqueadoTaxaFixa = faturasBloqueadas.reduce((sum, f) => sum + (f.valorDevido - f.valorPago), 0);
    
    // Buscar antecipações ativas (pendentes ou aprovadas) para deduzir
    const antecipacoesPendentes = await Antecipacao.find({
      fornecedor: user.fornecedorId,
      status: { $in: ['Pendente', 'Aprovada'] },
      ativo: true
    });
    
    const valorEmAntecipacao = antecipacoesPendentes.reduce((sum, a) => sum + a.valorSolicitado, 0);
    const valorDisponivelParaAntecipacao = valorTotalPendente - valorEmAntecipacao;
    
    res.json({
      valorTotalPendente,
      valorEmAntecipacao,
      valorDisponivelParaAntecipacao,
      valorBloqueadoTaxaFixa,
      faturasBloqueadasCount: faturasBloqueadas.length,
      faturas: faturasPendentes.map(f => ({
        _id: f._id,
        numeroFatura: f.numeroFatura,
        valorDevido: f.valorDevido,
        valorPago: f.valorPago,
        valorPendente: f.valorDevido - f.valorPago,
        previsaoRecebimento: f.previsaoRecebimento,
        statusFatura: f.statusFatura,
        periodoInicio: f.periodoInicio,
        periodoFim: f.periodoFim,
        cliente: f.cliente ? {
          _id: f.cliente._id,
          razaoSocial: f.cliente.razaoSocial,
          nomeFantasia: f.cliente.nomeFantasia
        } : null
      }))
    });
  } catch (error) {
    console.error('Erro ao obter valores pendentes:', error);
    res.status(500).json({ message: 'Erro ao obter valores pendentes', error: error.message });
  }
};
