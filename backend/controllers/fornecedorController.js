const bcrypt = require('bcryptjs');
const Fornecedor = require('../models/Fornecedor');
const Configuracoes = require('../models/Configuracoes');
const Notificacao = require('../models/Notificacao');
const User = require('../models/User');

// Helper para comparar e rastrear alterações
const compararAlteracoes = (dadosAntigos, dadosNovos, camposMonitorar) => {
  const alteracoes = {};
  
  camposMonitorar.forEach(campo => {
    const valorAntigo = dadosAntigos[campo];
    const valorNovo = dadosNovos[campo];
    
    // Comparar valores (convertendo undefined para null para melhor comparação)
    const antigoStr = String(valorAntigo || '');
    const novoStr = String(valorNovo || '');
    
    if (antigoStr !== novoStr && valorNovo !== undefined) {
      alteracoes[campo] = {
        anterior: valorAntigo || '',
        novo: valorNovo
      };
    }
  });
  
  return Object.keys(alteracoes).length > 0 ? alteracoes : null;
};

// Listar fornecedores com paginação e filtros
exports.listarFornecedores = async (req, res) => {
  try {
    const { page = 1, limit = 50, razaoSocial, nomeFantasia, cnpjCpf, cidade, estado, naoOptanteSimples } = req.query;
    
    const query = {};
    
    // Aplicar filtros
    if (razaoSocial) {
      query.razaoSocial = { $regex: razaoSocial, $options: 'i' };
    }
    if (nomeFantasia) {
      query.nomeFantasia = { $regex: nomeFantasia, $options: 'i' };
    }
    if (cnpjCpf) {
      // Remover caracteres especiais da busca e criar regex flexível
      const cnpjLimpo = cnpjCpf.replace(/\D/g, '');
      // Criar regex que encontra os números independente da formatação
      // Ex: "12345" vai encontrar "12.345" ou "12345"
      const regexPattern = cnpjLimpo.split('').join('[^0-9]*');
      query.cnpjCpf = { $regex: regexPattern, $options: 'i' };
    }
    if (cidade) {
      query.cidade = { $regex: cidade, $options: 'i' };
    }
    if (estado) {
      query.estado = { $regex: estado, $options: 'i' };
    }
    if (naoOptanteSimples !== undefined) {
      query.naoOptanteSimples = naoOptanteSimples === 'true';
    }

    const total = await Fornecedor.countDocuments(query);
    const fornecedores = await Fornecedor.find(query)
      .select('-senha')
      .sort({ razaoSocial: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); // Usar lean() para melhor performance

    res.json({
      fornecedores,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao listar fornecedores', erro: error.message });
  }
};

// Buscar fornecedor por ID
exports.buscarFornecedor = async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findById(req.params.id).select('-senha');
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    res.json(fornecedor);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar fornecedor', erro: error.message });
  }
};

// Criar fornecedor
exports.criarFornecedor = async (req, res) => {
  try {
    const { senha, ...dadosFornecedor } = req.body;
    
    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    
    const fornecedor = new Fornecedor({
      ...dadosFornecedor,
      senha: senhaHash
    });
    
    await fornecedor.save();
    
    const fornecedorSemSenha = fornecedor.toObject();
    delete fornecedorSemSenha.senha;
    
    res.status(201).json(fornecedorSemSenha);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ mensagem: 'CNPJ/CPF ou e-mail já cadastrado' });
    }
    res.status(500).json({ mensagem: 'Erro ao criar fornecedor', erro: error.message });
  }
};

// Atualizar fornecedor
exports.atualizarFornecedor = async (req, res) => {
  try {
    const { senha, ...dadosFornecedor } = req.body;
    
    // Buscar dados antigos para comparação
    const fornecedorAntigo = await Fornecedor.findById(req.params.id).lean();
    if (!fornecedorAntigo) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    if (senha) {
      const salt = await bcrypt.genSalt(10);
      dadosFornecedor.senha = await bcrypt.hash(senha, salt);
    }
    
    const fornecedor = await Fornecedor.findByIdAndUpdate(
      req.params.id,
      dadosFornecedor,
      { new: true, runValidators: true }
    ).select('-senha');
    
    // Detectar alterações em campos importantes
    const camposMonitorar = [
      'razaoSocial', 'nomeFantasia', 'cnpjCpf', 'inscricaoEstadual',
      'telefone', 'email', 'endereco', 'numero', 'complemento',
      'bairro', 'cidade', 'estado', 'cep',
      'banco', 'agencia', 'conta', 'tipoConta', 'chavePix', 'tipoChavePix'
    ];
    
    const alteracoes = compararAlteracoes(fornecedorAntigo, dadosFornecedor, camposMonitorar);
    
    // Se houver alterações, notificar administradores
    if (alteracoes) {
      const admins = await User.find({ 
        role: { $in: ['super_admin', 'admin'] },
        ativo: true 
      });
      
      const nomeFornecedor = fornecedor.razaoSocial || fornecedor.nomeFantasia || 'Fornecedor';
      const camposAlterados = Object.keys(alteracoes).join(', ');
      
      const notificacoes = admins.map(admin => ({
        tipo: 'perfil_fornecedor_atualizado',
        titulo: 'Perfil de Fornecedor Atualizado',
        mensagem: `O fornecedor ${nomeFornecedor} atualizou seu perfil. Campos alterados: ${camposAlterados}`,
        usuario: admin._id,
        fornecedor: fornecedor._id,
        alteracoes
      }));
      
      await Notificacao.insertMany(notificacoes);
      console.log(`📬 Notificações criadas para ${admins.length} administradores sobre atualização de perfil do fornecedor`);
    }
    
    res.json(fornecedor);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao atualizar fornecedor', erro: error.message });
  }
};

// Excluir fornecedor
exports.excluirFornecedor = async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findByIdAndDelete(req.params.id);
    
    if (!fornecedor) {
      return res.status(404).json({ mensagem: 'Fornecedor não encontrado' });
    }
    
    res.json({ mensagem: 'Fornecedor excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao excluir fornecedor', erro: error.message });
  }
};

// Configurações
exports.buscarConfiguracoes = async (req, res) => {
  try {
    let config = await Configuracoes.findOne();
    
    if (!config) {
      config = new Configuracoes();
      await config.save();
    }
    
    const configSemSenha = config.toObject();
    delete configSemSenha.senhaMestre;
    
    res.json(configSemSenha);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar configurações', erro: error.message });
  }
};

exports.salvarConfiguracoes = async (req, res) => {
  try {
    const { senhaMestre, ...dadosConfig } = req.body;
    
    let config = await Configuracoes.findOne();
    
    if (!config) {
      config = new Configuracoes(dadosConfig);
    } else {
      Object.assign(config, dadosConfig);
    }
    
    if (senhaMestre) {
      const salt = await bcrypt.genSalt(10);
      config.senhaMestre = await bcrypt.hash(senhaMestre, salt);
    }
    
    await config.save();
    
    const configSemSenha = config.toObject();
    delete configSemSenha.senhaMestre;
    
    res.json(configSemSenha);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao salvar configurações', erro: error.message });
  }
};

// Administradores
exports.listarAdministradores = async (req, res) => {
  try {
    const admins = await User.find({ 
      role: { $in: ['super_admin', 'admin'] } 
    }).select('-senha');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao listar administradores', erro: error.message });
  }
};

exports.criarAdministrador = async (req, res) => {
  try {
    const { senha, ...dadosAdmin } = req.body;
    
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    
    const admin = new User({
      ...dadosAdmin,
      senha: senhaHash,
      role: 'admin'
    });
    
    await admin.save();
    
    const adminSemSenha = admin.toObject();
    delete adminSemSenha.senha;
    
    res.status(201).json(adminSemSenha);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ mensagem: 'E-mail ou CPF já cadastrado' });
    }
    res.status(500).json({ mensagem: 'Erro ao criar administrador', erro: error.message });
  }
};

exports.atualizarAdministrador = async (req, res) => {
  try {
    const { senha, ...dadosAdmin } = req.body;
    
    if (senha) {
      const salt = await bcrypt.genSalt(10);
      dadosAdmin.senha = await bcrypt.hash(senha, salt);
    }
    
    const admin = await User.findByIdAndUpdate(
      req.params.id,
      dadosAdmin,
      { new: true, runValidators: true }
    ).select('-senha');
    
    if (!admin) {
      return res.status(404).json({ mensagem: 'Administrador não encontrado' });
    }
    
    res.json(admin);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao atualizar administrador', erro: error.message });
  }
};

exports.excluirAdministrador = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ mensagem: 'Administrador não encontrado' });
    }
    
    if (admin.role === 'super_admin') {
      return res.status(403).json({ mensagem: 'Não é possível excluir o super administrador' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ mensagem: 'Administrador excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao excluir administrador', erro: error.message });
  }
};
