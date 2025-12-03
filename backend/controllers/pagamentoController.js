const Fatura = require('../models/Fatura');
const OrdemServico = require('../models/OrdemServico');
const Antecipacao = require('../models/Antecipacao');

// @desc    Listar pagamentos (OS pagas) - para clientes e fornecedores
// @route   GET /api/pagamentos
exports.listarPagamentos = async (req, res) => {
  try {
    const user = req.user;
    let query = {};
    
    // Filtrar por tipo de usuário
    if (user.role === 'fornecedor' && user.fornecedorId) {
      query = {
        tipo: 'Fornecedor',
        fornecedor: user.fornecedorId,
        'ordensServico.statusPagamento': 'Paga'
      };
    } else if (user.role === 'cliente' && user.clienteId) {
      query = {
        tipo: 'Cliente',
        cliente: user.clienteId,
        'ordensServico.statusPagamento': 'Paga'
      };
    } else if (['super_admin', 'admin', 'gerente'].includes(user.role)) {
      // Admins veem todas
      query = {
        'ordensServico.statusPagamento': 'Paga'
      };
    } else {
      return res.status(403).json({ message: 'Sem permissão para acessar pagamentos' });
    }
    
    // Buscar faturas com OS pagas
    const faturas = await Fatura.find(query)
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf')
      .populate('cliente', 'razaoSocial nomeFantasia cnpjCpf')
      .populate({
        path: 'ordensServico.ordemServico',
        select: 'numeroOrdemServico codigo dataEmissao valorTotal'
      })
      .sort({ updatedAt: -1 });
    
    // Extrair apenas as OS pagas
    const pagamentos = [];
    
    for (const fatura of faturas) {
      for (const os of fatura.ordensServico) {
        if (os.statusPagamento === 'Paga') {
          pagamentos.push({
            _id: `${fatura._id}-${os.ordemServico?._id}`,
            faturaId: fatura._id,
            numeroFatura: fatura.numeroFatura,
            tipo: fatura.tipo,
            fornecedor: fatura.fornecedor,
            cliente: fatura.cliente,
            ordemServico: os.ordemServico,
            valorOS: os.valorOS,
            dataPagamento: os.dataPagamento,
            comprovante: os.comprovante || null
          });
        }
      }
    }
    
    res.json(pagamentos);
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error);
    res.status(500).json({ message: 'Erro ao listar pagamentos', error: error.message });
  }
};

// @desc    Listar antecipações do usuário
// @route   GET /api/pagamentos/antecipacoes
exports.listarMinhasAntecipacoes = async (req, res) => {
  try {
    const user = req.user;
    let query = { ativo: true };
    
    if (user.role === 'fornecedor' && user.fornecedorId) {
      query.fornecedor = user.fornecedorId;
    } else if (!['super_admin', 'admin', 'gerente'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão para acessar antecipações' });
    }
    
    const antecipacoes = await Antecipacao.find(query)
      .populate('fornecedor', 'razaoSocial nomeFantasia')
      .populate('faturas.fatura', 'numeroFatura valorDevido')
      .sort({ createdAt: -1 });
    
    res.json(antecipacoes);
  } catch (error) {
    console.error('Erro ao listar antecipações:', error);
    res.status(500).json({ message: 'Erro ao listar antecipações', error: error.message });
  }
};

// @desc    Adicionar comprovante a uma OS paga
// @route   PUT /api/pagamentos/:faturaId/os/:osId/comprovante
exports.adicionarComprovante = async (req, res) => {
  try {
    const user = req.user;
    const { faturaId, osId } = req.params;
    const { comprovante } = req.body;
    
    // Verificar permissão admin
    if (!['super_admin', 'admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão para adicionar comprovante' });
    }
    
    const fatura = await Fatura.findById(faturaId);
    
    if (!fatura) {
      return res.status(404).json({ message: 'Fatura não encontrada' });
    }
    
    // Encontrar a OS na fatura
    const osIndex = fatura.ordensServico.findIndex(
      os => os.ordemServico.toString() === osId
    );
    
    if (osIndex === -1) {
      return res.status(404).json({ message: 'Ordem de serviço não encontrada na fatura' });
    }
    
    // Adicionar comprovante
    fatura.ordensServico[osIndex].comprovante = comprovante;
    await fatura.save();
    
    res.json({ message: 'Comprovante adicionado com sucesso' });
  } catch (error) {
    console.error('Erro ao adicionar comprovante:', error);
    res.status(500).json({ message: 'Erro ao adicionar comprovante', error: error.message });
  }
};

// @desc    Resumo de pagamentos do usuário
// @route   GET /api/pagamentos/resumo
exports.resumoPagamentos = async (req, res) => {
  try {
    const user = req.user;
    let queryFatura = {};
    let queryAntecipacao = { ativo: true };
    
    // Filtrar por tipo de usuário
    if (user.role === 'fornecedor' && user.fornecedorId) {
      queryFatura = {
        tipo: 'Fornecedor',
        fornecedor: user.fornecedorId
      };
      queryAntecipacao.fornecedor = user.fornecedorId;
    } else if (user.role === 'cliente' && user.clienteId) {
      queryFatura = {
        tipo: 'Cliente',
        cliente: user.clienteId
      };
    } else if (!['super_admin', 'admin', 'gerente'].includes(user.role)) {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    
    // Buscar faturas
    const faturas = await Fatura.find(queryFatura);
    
    // Calcular totais
    let totalRecebido = 0;
    let totalPendente = 0;
    let osPagas = 0;
    let osPendentes = 0;
    
    for (const fatura of faturas) {
      for (const os of fatura.ordensServico) {
        if (os.statusPagamento === 'Paga') {
          totalRecebido += os.valorOS;
          osPagas++;
        } else {
          totalPendente += os.valorOS;
          osPendentes++;
        }
      }
    }
    
    // Buscar antecipações (apenas para fornecedor)
    let antecipacoes = { total: 0, pendentes: 0, aprovadas: 0, pagas: 0, valorTotal: 0 };
    
    if (user.role === 'fornecedor') {
      const antecipacoesData = await Antecipacao.find(queryAntecipacao);
      antecipacoes = {
        total: antecipacoesData.length,
        pendentes: antecipacoesData.filter(a => a.status === 'Pendente').length,
        aprovadas: antecipacoesData.filter(a => a.status === 'Aprovada').length,
        pagas: antecipacoesData.filter(a => a.status === 'Paga').length,
        valorTotal: antecipacoesData
          .filter(a => a.status === 'Paga')
          .reduce((sum, a) => sum + a.valorAReceber, 0)
      };
    }
    
    res.json({
      totalRecebido,
      totalPendente,
      osPagas,
      osPendentes,
      antecipacoes
    });
  } catch (error) {
    console.error('Erro ao obter resumo:', error);
    res.status(500).json({ message: 'Erro ao obter resumo', error: error.message });
  }
};
