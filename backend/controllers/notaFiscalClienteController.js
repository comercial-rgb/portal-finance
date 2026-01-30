const NotaFiscalCliente = require('../models/NotaFiscalCliente');
const Fatura = require('../models/Fatura');
const Cliente = require('../models/Cliente');

const CLIENTE_POPULATE_FIELDS = 'nomeFantasia razaoSocial cnpj';

// Criar nova nota fiscal
exports.criarNotaFiscal = async (req, res) => {
  try {
    const {
      numeroNotaFiscal,
      tipo,
      dataEmissao,
      dataVencimento,
      clienteId,
      centroCusto,
      subunidade,
      faturaId,
      valorDevido,
      observacoes
    } = req.body;

    // Validar se o cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    // Se faturaId foi fornecido, buscar o valor da fatura
    let valorFinal = valorDevido;
    if (faturaId) {
      const fatura = await Fatura.findById(faturaId);
      if (!fatura) {
        return res.status(404).json({ message: 'Fatura não encontrada' });
      }
      valorFinal = fatura.valorTotal || valorDevido;
    }

    // Calcular vencimento automático se não fornecido
    let vencimento = dataVencimento;
    if (!vencimento && dataEmissao) {
      const dataEmissaoObj = new Date(dataEmissao);
      vencimento = new Date(dataEmissaoObj);
      vencimento.setDate(vencimento.getDate() + 30);
    }

    const notaFiscal = new NotaFiscalCliente({
      numeroNotaFiscal,
      tipo,
      dataEmissao,
      dataVencimento: vencimento,
      clienteId,
      centroCusto,
      subunidade,
      faturaId: faturaId || null,
      valorDevido: valorFinal,
      observacoes,
      criadoPor: req.user.id
    });

    await notaFiscal.save();

    // Popular os dados para retornar
    await notaFiscal.populate('clienteId', CLIENTE_POPULATE_FIELDS);
    if (faturaId) {
      await notaFiscal.populate('faturaId', 'numeroFatura valorTotal');
    }
    await notaFiscal.populate('criadoPor', 'nome email');

    res.status(201).json(notaFiscal);
  } catch (error) {
    console.error('Erro ao criar nota fiscal:', error);
    res.status(500).json({ message: 'Erro ao criar nota fiscal', error: error.message });
  }
};

// Listar todas as notas fiscais
exports.listarNotasFiscais = async (req, res) => {
  try {
    const { clienteId, status, dataInicio, dataFim, page = 1, limit = 50 } = req.query;

    const filtros = {};

    if (clienteId) {
      filtros.clienteId = clienteId;
    }

    if (status) {
      filtros.status = status;
    }

    if (dataInicio || dataFim) {
      filtros.dataEmissao = {};
      if (dataInicio) filtros.dataEmissao.$gte = new Date(dataInicio);
      if (dataFim) filtros.dataEmissao.$lte = new Date(dataFim);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notasFiscais = await NotaFiscalCliente.find(filtros)
      .populate('clienteId', CLIENTE_POPULATE_FIELDS)
      .populate('faturaId', 'numeroFatura valorTotal')
      .populate('criadoPor', 'nome email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await NotaFiscalCliente.countDocuments(filtros);

    res.json({
      notasFiscais,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Erro ao listar notas fiscais:', error);
    res.status(500).json({ message: 'Erro ao listar notas fiscais', error: error.message });
  }
};

// Buscar nota fiscal por ID
exports.buscarNotaFiscalPorId = async (req, res) => {
  try {
    const notaFiscal = await NotaFiscalCliente.findById(req.params.id)
      .populate('clienteId', CLIENTE_POPULATE_FIELDS)
      .populate('faturaId', 'numeroFatura valorTotal dataEmissao dataVencimento')
      .populate('criadoPor', 'nome email');

    if (!notaFiscal) {
      return res.status(404).json({ message: 'Nota fiscal não encontrada' });
    }

    res.json(notaFiscal);
  } catch (error) {
    console.error('Erro ao buscar nota fiscal:', error);
    res.status(500).json({ message: 'Erro ao buscar nota fiscal', error: error.message });
  }
};

// Atualizar nota fiscal
exports.atualizarNotaFiscal = async (req, res) => {
  try {
    const {
      numeroNotaFiscal,
      tipo,
      dataEmissao,
      dataVencimento,
      clienteId,
      centroCusto,
      subunidade,
      faturaId,
      valorDevido,
      observacoes,
      status
    } = req.body;

    const notaFiscal = await NotaFiscalCliente.findById(req.params.id);

    if (!notaFiscal) {
      return res.status(404).json({ message: 'Nota fiscal não encontrada' });
    }

    // Se mudou a fatura, atualizar o valor
    let valorFinal = valorDevido || notaFiscal.valorDevido;
    if (faturaId && faturaId !== notaFiscal.faturaId?.toString()) {
      const fatura = await Fatura.findById(faturaId);
      if (fatura) {
        valorFinal = fatura.valorTotal;
      }
    }

    // Atualizar campos
    if (numeroNotaFiscal !== undefined) notaFiscal.numeroNotaFiscal = numeroNotaFiscal;
    if (tipo !== undefined) notaFiscal.tipo = tipo;
    if (dataEmissao !== undefined) notaFiscal.dataEmissao = dataEmissao;
    if (dataVencimento !== undefined) notaFiscal.dataVencimento = dataVencimento;
    if (clienteId !== undefined) notaFiscal.clienteId = clienteId;
    if (centroCusto !== undefined) notaFiscal.centroCusto = centroCusto;
    if (subunidade !== undefined) notaFiscal.subunidade = subunidade;
    if (faturaId !== undefined) notaFiscal.faturaId = faturaId || null;
    notaFiscal.valorDevido = valorFinal;
    if (observacoes !== undefined) notaFiscal.observacoes = observacoes;
    if (status !== undefined) notaFiscal.status = status;

    await notaFiscal.save();

    await notaFiscal.populate('clienteId', CLIENTE_POPULATE_FIELDS);
    if (notaFiscal.faturaId) {
      await notaFiscal.populate('faturaId', 'numeroFatura valorTotal');
    }
    await notaFiscal.populate('criadoPor', 'nome email');

    res.json(notaFiscal);
  } catch (error) {
    console.error('Erro ao atualizar nota fiscal:', error);
    res.status(500).json({ message: 'Erro ao atualizar nota fiscal', error: error.message });
  }
};

// Deletar nota fiscal
exports.deletarNotaFiscal = async (req, res) => {
  try {
    const notaFiscal = await NotaFiscalCliente.findById(req.params.id);

    if (!notaFiscal) {
      return res.status(404).json({ message: 'Nota fiscal não encontrada' });
    }

    await notaFiscal.deleteOne();

    res.json({ message: 'Nota fiscal deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar nota fiscal:', error);
    res.status(500).json({ message: 'Erro ao deletar nota fiscal', error: error.message });
  }
};

// Buscar estatísticas de notas fiscais
exports.estatisticasNotasFiscais = async (req, res) => {
  try {
    const { clienteId, dataInicio, dataFim } = req.query;

    const filtros = {};
    if (clienteId) filtros.clienteId = clienteId;
    if (dataInicio || dataFim) {
      filtros.dataEmissao = {};
      if (dataInicio) filtros.dataEmissao.$gte = new Date(dataInicio);
      if (dataFim) filtros.dataEmissao.$lte = new Date(dataFim);
    }

    const estatisticas = await NotaFiscalCliente.aggregate([
      { $match: filtros },
      {
        $group: {
          _id: '$status',
          total: { $sum: 1 },
          valorTotal: { $sum: '$valorDevido' }
        }
      }
    ]);

    const totalGeral = await NotaFiscalCliente.countDocuments(filtros);
    const valorTotalGeral = await NotaFiscalCliente.aggregate([
      { $match: filtros },
      { $group: { _id: null, total: { $sum: '$valorDevido' } } }
    ]);

    res.json({
      porStatus: estatisticas,
      totalNotas: totalGeral,
      valorTotalGeral: valorTotalGeral[0]?.total || 0
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas', error: error.message });
  }
};
