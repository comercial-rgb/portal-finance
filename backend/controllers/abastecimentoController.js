const Abastecimento = require('../models/Abastecimento');
const Cliente = require('../models/Cliente');

// @desc    Listar abastecimentos
// @route   GET /api/abastecimentos
exports.getAbastecimentos = async (req, res) => {
  try {
    const { page = 1, limit = 15, cliente, fornecedor, status, codigo, dataInicio, dataFim, tipoCombustivel } = req.query;
    
    const query = { ativo: true };
    
    // Se usuário é fornecedor, filtrar apenas seus abastecimentos
    if (req.fornecedorFilter) {
      query.fornecedor = req.user.fornecedorId;
    } else if (req.clienteFilter) {
      query.cliente = req.user.clienteId;
    } else {
      if (cliente) query.cliente = cliente;
      if (fornecedor) query.fornecedor = fornecedor;
    }
    
    if (status) query.status = status;
    if (tipoCombustivel) query.tipoCombustivel = tipoCombustivel;
    if (codigo) {
      query.$or = [
        { codigo: new RegExp(codigo, 'i') },
        { codigoExterno: new RegExp(codigo, 'i') },
        { placa: new RegExp(codigo, 'i') }
      ];
    }
    
    if (dataInicio || dataFim) {
      query.dataReferencia = {};
      if (dataInicio) query.dataReferencia.$gte = new Date(dataInicio);
      if (dataFim) {
        const dataFimCompleta = new Date(dataFim);
        dataFimCompleta.setHours(23, 59, 59, 999);
        query.dataReferencia.$lte = dataFimCompleta;
      }
    }

    const abastecimentos = await Abastecimento.find(query)
      .populate('cliente', 'razaoSocial nomeFantasia tipoImposto')
      .populate('fornecedor', 'razaoSocial nomeFantasia naoOptanteSimples')
      .sort({ dataReferencia: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Abastecimento.countDocuments(query);

    res.json({
      abastecimentos,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    console.error('Erro ao listar abastecimentos:', error);
    res.status(500).json({ message: 'Erro ao listar abastecimentos', error: error.message });
  }
};

// @desc    Buscar abastecimento por ID
// @route   GET /api/abastecimentos/:id
exports.getAbastecimentoById = async (req, res) => {
  try {
    const abastecimento = await Abastecimento.findById(req.params.id)
      .populate('cliente', 'razaoSocial nomeFantasia cnpjCpf')
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf');

    if (!abastecimento) {
      return res.status(404).json({ message: 'Abastecimento não encontrado' });
    }

    res.json(abastecimento);
  } catch (error) {
    console.error('Erro ao buscar abastecimento:', error);
    res.status(500).json({ message: 'Erro ao buscar abastecimento', error: error.message });
  }
};

// @desc    Criar abastecimento manualmente
// @route   POST /api/abastecimentos
exports.criarAbastecimento = async (req, res) => {
  try {
    const abastecimento = new Abastecimento(req.body);
    await abastecimento.save();

    const abastecimentoPopulado = await Abastecimento.findById(abastecimento._id)
      .populate('cliente', 'razaoSocial nomeFantasia')
      .populate('fornecedor', 'razaoSocial nomeFantasia');

    res.status(201).json(abastecimentoPopulado);
  } catch (error) {
    console.error('Erro ao criar abastecimento:', error);
    res.status(500).json({ message: 'Erro ao criar abastecimento', error: error.message });
  }
};

// @desc    Atualizar abastecimento
// @route   PUT /api/abastecimentos/:id
exports.atualizarAbastecimento = async (req, res) => {
  try {
    const abastecimento = await Abastecimento.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('cliente', 'razaoSocial nomeFantasia')
      .populate('fornecedor', 'razaoSocial nomeFantasia');

    if (!abastecimento) {
      return res.status(404).json({ message: 'Abastecimento não encontrado' });
    }

    res.json(abastecimento);
  } catch (error) {
    console.error('Erro ao atualizar abastecimento:', error);
    res.status(500).json({ message: 'Erro ao atualizar abastecimento', error: error.message });
  }
};

// @desc    Excluir abastecimento (soft delete)
// @route   DELETE /api/abastecimentos/:id
exports.excluirAbastecimento = async (req, res) => {
  try {
    const abastecimento = await Abastecimento.findByIdAndUpdate(
      req.params.id,
      { ativo: false },
      { new: true }
    );

    if (!abastecimento) {
      return res.status(404).json({ message: 'Abastecimento não encontrado' });
    }

    res.json({ message: 'Abastecimento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir abastecimento:', error);
    res.status(500).json({ message: 'Erro ao excluir abastecimento', error: error.message });
  }
};

// @desc    Buscar abastecimentos não faturados para geração de fatura
// @route   GET /api/abastecimentos/nao-faturados
exports.getNaoFaturados = async (req, res) => {
  try {
    const { tipo, fornecedor, cliente } = req.query;
    const query = { ativo: true };

    if (tipo === 'Fornecedor') {
      query.faturadoFornecedor = false;
      if (fornecedor) query.fornecedor = fornecedor;
    } else if (tipo === 'Cliente') {
      query.faturadoCliente = false;
      if (cliente) query.cliente = cliente;
    }

    // Se usuário é fornecedor, filtrar
    if (req.fornecedorFilter) {
      query.fornecedor = req.user.fornecedorId;
    } else if (req.clienteFilter) {
      query.cliente = req.user.clienteId;
    }

    const abastecimentos = await Abastecimento.find(query)
      .populate('cliente', 'razaoSocial nomeFantasia cnpj tipoImposto tiposServico tipoTaxa taxaOperacao taxasAntecipacao')
      .populate('fornecedor', 'razaoSocial nomeFantasia naoOptanteSimples')
      .sort({ dataReferencia: -1 });

    res.json(abastecimentos);
  } catch (error) {
    console.error('Erro ao buscar abastecimentos não faturados:', error);
    res.status(500).json({ message: 'Erro ao buscar abastecimentos não faturados', error: error.message });
  }
};
