const Cliente = require('../models/Cliente');
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

// Listar clientes com filtros e paginação
exports.getClientes = async (req, res) => {
  try {
    const { page = 1, limit = 15, razaoSocial, nomeFantasia, cnpj, cidade, estado, ativo } = req.query;
    
    const query = {};
    
    // Aplicar filtros
    if (razaoSocial) {
      query.razaoSocial = { $regex: razaoSocial, $options: 'i' };
    }
    if (nomeFantasia) {
      query.nomeFantasia = { $regex: nomeFantasia, $options: 'i' };
    }
    if (cnpj) {
      query.cnpj = { $regex: cnpj.replace(/\D/g, ''), $options: 'i' };
    }
    if (cidade) {
      query['endereco.cidade'] = { $regex: cidade, $options: 'i' };
    }
    if (estado) {
      query['endereco.estado'] = { $regex: estado, $options: 'i' };
    }
    if (ativo !== undefined) {
      query.ativo = ativo === 'true';
    }

    const total = await Cliente.countDocuments(query);
    const clientes = await Cliente.find(query)
      .sort({ razaoSocial: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-centrosCusto'); // Não incluir centros de custo na listagem

    res.json({
      clientes,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ message: 'Erro ao buscar clientes' });
  }
};

// Buscar um cliente por ID
exports.getClienteById = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ message: 'Erro ao buscar cliente' });
  }
};

// Criar novo cliente
exports.createCliente = async (req, res) => {
  try {
    const { cnpj } = req.body;
    
    // Verificar se o CNPJ já existe
    const clienteExiste = await Cliente.findOne({ cnpj: cnpj.replace(/\D/g, '') });
    if (clienteExiste) {
      return res.status(400).json({ message: 'CNPJ já cadastrado' });
    }

    const cliente = new Cliente(req.body);
    await cliente.save();

    res.status(201).json(cliente);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ message: 'Erro ao criar cliente' });
  }
};

// Atualizar cliente
exports.updateCliente = async (req, res) => {
  try {
    const { cnpj } = req.body;
    
    // Buscar cliente existente
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    
    // Guardar dados antigos para comparação (antes de atualizar)
    const clienteAntigo = cliente.toObject();
    
    // Verificar se o CNPJ já existe em outro cliente
    if (cnpj) {
      const clienteExiste = await Cliente.findOne({ 
        cnpj: cnpj.replace(/\D/g, ''),
        _id: { $ne: req.params.id }
      });
      if (clienteExiste) {
        return res.status(400).json({ message: 'CNPJ já cadastrado' });
      }
    }

    const sanitizeNumber = (value, fallback) => {
      if (value === undefined || value === null || value === '') return fallback;
      const parsed = Number(String(value).replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const updatePayload = {};

    if (req.body.razaoSocial !== undefined) {
      updatePayload.razaoSocial = req.body.razaoSocial;
    }

    if (req.body.nomeFantasia !== undefined) {
      updatePayload.nomeFantasia = req.body.nomeFantasia;
    }

    if (req.body.cnpj !== undefined) {
      updatePayload.cnpj = req.body.cnpj ? req.body.cnpj.replace(/\D/g, '') : '';
    }

    if (req.body.inscricaoMunicipal !== undefined) {
      updatePayload.inscricaoMunicipal = req.body.inscricaoMunicipal;
    }

    if (req.body.inscricaoEstadual !== undefined) {
      updatePayload.inscricaoEstadual = req.body.inscricaoEstadual;
    }

    if (req.body.percentualDesconto !== undefined) {
      updatePayload.percentualDesconto = sanitizeNumber(req.body.percentualDesconto, cliente.percentualDesconto || 0);
    }

    if (req.body.tipoTaxa !== undefined) {
      updatePayload.tipoTaxa = req.body.tipoTaxa;
    }

    if (req.body.taxaOperacao !== undefined) {
      updatePayload.taxaOperacao = sanitizeNumber(req.body.taxaOperacao, cliente.taxaOperacao || 15);
    }

    if (req.body.ativo !== undefined) {
      updatePayload.ativo = req.body.ativo;
    }

    if (req.body.tipoImposto !== undefined) {
      const tipos = Array.isArray(req.body.tipoImposto)
        ? req.body.tipoImposto
        : [req.body.tipoImposto].filter(Boolean);
      updatePayload.tipoImposto = tipos;
    }

    if (req.body.taxasAntecipacao) {
      updatePayload.taxasAntecipacao = {
        aVista: sanitizeNumber(req.body.taxasAntecipacao.aVista, cliente.taxasAntecipacao?.aVista ?? 15),
        aposFechamento: sanitizeNumber(req.body.taxasAntecipacao.aposFechamento, cliente.taxasAntecipacao?.aposFechamento ?? 13),
        aprazado: sanitizeNumber(req.body.taxasAntecipacao.aprazado, cliente.taxasAntecipacao?.aprazado ?? 0)
      };
    }

    if (req.body.endereco) {
      updatePayload.endereco = {
        logradouro: req.body.endereco.logradouro ?? cliente.endereco?.logradouro ?? '',
        numero: req.body.endereco.numero ?? cliente.endereco?.numero ?? '',
        complemento: req.body.endereco.complemento ?? cliente.endereco?.complemento ?? '',
        bairro: req.body.endereco.bairro ?? cliente.endereco?.bairro ?? '',
        cidade: req.body.endereco.cidade ?? cliente.endereco?.cidade ?? '',
        estado: req.body.endereco.estado ?? cliente.endereco?.estado ?? '',
        cep: req.body.endereco.cep ?? cliente.endereco?.cep ?? ''
      };
    }

    if (req.body.contatos) {
      updatePayload.contatos = {
        telefone: req.body.contatos.telefone ?? cliente.contatos?.telefone ?? '',
        celular: req.body.contatos.celular ?? cliente.contatos?.celular ?? '',
        email: req.body.contatos.email ?? cliente.contatos?.email ?? ''
      };
    }

    updatePayload.updatedAt = Date.now();

    const clienteAtualizado = await Cliente.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!clienteAtualizado) {
      return res.status(404).json({ message: 'Cliente não encontrado após atualização' });
    }

    console.log('✅ Cliente atualizado no banco:', {
      id: clienteAtualizado._id,
      razaoSocial: clienteAtualizado.razaoSocial,
      tipoImposto: clienteAtualizado.tipoImposto,
      endereco: clienteAtualizado.endereco,
      contatos: clienteAtualizado.contatos
    });

    // Detectar alterações em campos importantes
    const camposMonitorar = [
      'razaoSocial', 'nomeFantasia', 'cnpj', 'inscricaoEstadual',
      'telefone', 'email', 'endereco', 'numero', 'complemento',
      'bairro', 'cidade', 'estado', 'cep'
    ];
    
    const alteracoes = compararAlteracoes(clienteAntigo, req.body, camposMonitorar);
    
    // Se houver alterações, notificar administradores
    if (alteracoes) {
      const admins = await User.find({ 
        role: { $in: ['super_admin', 'admin'] },
        ativo: true 
      });
      
      const nomeCliente = clienteAtualizado.razaoSocial || clienteAtualizado.nomeFantasia || 'Cliente';
      const camposAlterados = Object.keys(alteracoes).join(', ');
      
      const notificacoes = admins.map(admin => ({
        tipo: 'perfil_cliente_atualizado',
        titulo: 'Perfil de Cliente Atualizado',
        mensagem: `O cliente ${nomeCliente} atualizou seu perfil. Campos alterados: ${camposAlterados}`,
        usuario: admin._id,
        cliente: clienteAtualizado._id,
        alteracoes
      }));
      
      await Notificacao.insertMany(notificacoes);
      console.log(`📬 Notificações criadas para ${admins.length} administradores sobre atualização de perfil do cliente`);
    }

    res.json(clienteAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ message: 'Erro ao atualizar cliente' });
  }
};

// Deletar cliente
exports.deleteCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndDelete(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    res.json({ message: 'Cliente deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ message: 'Erro ao deletar cliente' });
  }
};

// Alternar status do cliente
exports.toggleClienteStatus = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    cliente.ativo = !cliente.ativo;
    cliente.updatedAt = Date.now();
    await cliente.save();

    res.json(cliente);
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    res.status(500).json({ message: 'Erro ao alterar status do cliente' });
  }
};

// CENTROS DE CUSTO

// Listar centros de custo de um cliente
exports.getCentrosCusto = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id).select('centrosCusto');

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    res.json(cliente.centrosCusto);
  } catch (error) {
    console.error('Erro ao buscar centros de custo:', error);
    res.status(500).json({ message: 'Erro ao buscar centros de custo' });
  }
};

// Adicionar centro de custo
exports.addCentroCusto = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    cliente.centrosCusto.push(req.body);
    cliente.updatedAt = Date.now();
    await cliente.save();

    const novoCentro = cliente.centrosCusto[cliente.centrosCusto.length - 1];
    res.status(201).json(novoCentro);
  } catch (error) {
    console.error('Erro ao adicionar centro de custo:', error);
    res.status(500).json({ message: 'Erro ao adicionar centro de custo' });
  }
};

// Deletar centro de custo
exports.deleteCentroCusto = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    cliente.centrosCusto.id(req.params.ccId).remove();
    cliente.updatedAt = Date.now();
    await cliente.save();

    res.json({ message: 'Centro de custo deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar centro de custo:', error);
    res.status(500).json({ message: 'Erro ao deletar centro de custo' });
  }
};

// SUBUNIDADES

// Adicionar subunidade a um centro de custo
exports.addSubunidade = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const centroCusto = cliente.centrosCusto.id(req.params.ccId);
    if (!centroCusto) {
      return res.status(404).json({ message: 'Centro de custo não encontrado' });
    }

    centroCusto.subunidades.push(req.body);
    cliente.updatedAt = Date.now();
    await cliente.save();

    const novaSubunidade = centroCusto.subunidades[centroCusto.subunidades.length - 1];
    res.status(201).json(novaSubunidade);
  } catch (error) {
    console.error('Erro ao adicionar subunidade:', error);
    res.status(500).json({ message: 'Erro ao adicionar subunidade' });
  }
};

// Deletar subunidade
exports.deleteSubunidade = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const centroCusto = cliente.centrosCusto.id(req.params.ccId);
    if (!centroCusto) {
      return res.status(404).json({ message: 'Centro de custo não encontrado' });
    }

    centroCusto.subunidades.id(req.params.subId).remove();
    cliente.updatedAt = Date.now();
    await cliente.save();

    res.json({ message: 'Subunidade deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar subunidade:', error);
    res.status(500).json({ message: 'Erro ao deletar subunidade' });
  }
};

// CONTRATOS

// Listar contratos do cliente
exports.getContratos = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    
    console.log('📋 GET Contratos - Cliente:', req.params.id);
    console.log('📦 Total de contratos:', cliente.contratos?.length);
    cliente.contratos?.forEach((contrato, index) => {
      console.log(`  Contrato ${index + 1} (${contrato.numeroContrato}): ${contrato.empenhos?.length || 0} empenhos`);
      contrato.empenhos?.forEach((emp, empIndex) => {
        console.log(`    Empenho ${empIndex + 1}: ${emp.numeroEmpenho}`);
      });
    });
    
    res.json(cliente.contratos || []);
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    res.status(500).json({ message: 'Erro ao buscar contratos' });
  }
};

// Adicionar contrato
exports.addContrato = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    if (!cliente.contratos) {
      cliente.contratos = [];
    }

    cliente.contratos.push(req.body);
    cliente.updatedAt = Date.now();
    await cliente.save();

    const novoContrato = cliente.contratos[cliente.contratos.length - 1];
    res.status(201).json(novoContrato);
  } catch (error) {
    console.error('Erro ao adicionar contrato:', error);
    res.status(500).json({ message: 'Erro ao adicionar contrato' });
  }
};

// Atualizar contrato
exports.updateContrato = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const contrato = cliente.contratos.id(req.params.contratoId);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    Object.assign(contrato, req.body);
    cliente.updatedAt = Date.now();
    await cliente.save();

    res.json(contrato);
  } catch (error) {
    console.error('Erro ao atualizar contrato:', error);
    res.status(500).json({ message: 'Erro ao atualizar contrato' });
  }
};

// Deletar contrato
exports.deleteContrato = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const contrato = cliente.contratos.id(req.params.contratoId);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    cliente.contratos.pull(req.params.contratoId);
    cliente.updatedAt = Date.now();
    await cliente.save();

    res.json({ message: 'Contrato deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar contrato:', error);
    res.status(500).json({ message: 'Erro ao deletar contrato', error: error.message });
  }
};

// Ativar/Inativar contrato
exports.toggleContratoStatus = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const contrato = cliente.contratos.id(req.params.contratoId);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    contrato.ativo = !contrato.ativo;
    cliente.updatedAt = Date.now();
    await cliente.save();

    res.json(contrato);
  } catch (error) {
    console.error('Erro ao alterar status do contrato:', error);
    res.status(500).json({ message: 'Erro ao alterar status do contrato' });
  }
};

// ADITIVOS

// Adicionar aditivo a um contrato
exports.addAditivo = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const contrato = cliente.contratos.id(req.params.contratoId);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    if (!contrato.aditivos) {
      contrato.aditivos = [];
    }

    contrato.aditivos.push(req.body);
    cliente.updatedAt = Date.now();
    await cliente.save();

    const novoAditivo = contrato.aditivos[contrato.aditivos.length - 1];
    res.status(201).json(novoAditivo);
  } catch (error) {
    console.error('Erro ao adicionar aditivo:', error);
    res.status(500).json({ message: 'Erro ao adicionar aditivo' });
  }
};

// Atualizar aditivo
exports.updateAditivo = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const contrato = cliente.contratos.id(req.params.contratoId);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const aditivo = contrato.aditivos.id(req.params.aditivoId);
    if (!aditivo) {
      return res.status(404).json({ message: 'Aditivo não encontrado' });
    }

    Object.assign(aditivo, req.body);
    cliente.updatedAt = Date.now();
    await cliente.save();

    res.json(aditivo);
  } catch (error) {
    console.error('Erro ao atualizar aditivo:', error);
    res.status(500).json({ message: 'Erro ao atualizar aditivo' });
  }
};

// Deletar aditivo
exports.deleteAditivo = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const contrato = cliente.contratos.id(req.params.contratoId);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const aditivo = contrato.aditivos.id(req.params.aditivoId);
    if (!aditivo) {
      return res.status(404).json({ message: 'Aditivo não encontrado' });
    }

    contrato.aditivos.pull(req.params.aditivoId);
    cliente.updatedAt = Date.now();
    await cliente.save();

    res.json({ message: 'Aditivo deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar aditivo:', error);
    res.status(500).json({ message: 'Erro ao deletar aditivo', error: error.message });
  }
};

// Ativar/Inativar aditivo
exports.toggleAditivoStatus = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const contrato = cliente.contratos.id(req.params.contratoId);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const aditivo = contrato.aditivos.id(req.params.aditivoId);
    if (!aditivo) {
      return res.status(404).json({ message: 'Aditivo não encontrado' });
    }

    aditivo.ativo = !aditivo.ativo;
    cliente.updatedAt = Date.now();
    await cliente.save();

    res.json(aditivo);
  } catch (error) {
    console.error('Erro ao alterar status do aditivo:', error);
    res.status(500).json({ message: 'Erro ao alterar status do aditivo' });
  }
};

// EMPENHOS

// Listar empenhos de um contrato
exports.getEmpenhos = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const contrato = cliente.contratos.id(req.params.contratoId);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    res.json(contrato.empenhos || []);
  } catch (error) {
    console.error('Erro ao buscar empenhos:', error);
    res.status(500).json({ message: 'Erro ao buscar empenhos' });
  }
};

// Adicionar empenho
exports.addEmpenho = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const contrato = cliente.contratos.id(req.params.contratoId);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    if (!contrato.empenhos) {
      contrato.empenhos = [];
    }

    // Validação de saldo disponível
    const valorContrato = contrato.valor || 0;
    const valorAditivos = (contrato.aditivos || []).reduce((sum, aditivo) => sum + (aditivo.valor || 0), 0);
    const valorTotalContrato = valorContrato + valorAditivos;
    
    // Calcula empenhos considerando apenas os ATIVOS
    // Apenas valorAnulado libera saldo para o contrato
    // valorUtilizado NÃO afeta o saldo do contrato, apenas do empenho individual
    // Empenhos INATIVOS não consomem saldo do contrato
    const valorEmpenhosExistentes = contrato.empenhos
      .filter(emp => emp.ativo !== false)
      .reduce((sum, emp) => {
        const valorLiquido = (emp.valor || 0) - (emp.valorAnulado || 0);
        return sum + valorLiquido;
      }, 0);
    
    const saldoDisponivel = valorTotalContrato - valorEmpenhosExistentes;
    const valorNovoEmpenho = req.body.valor || 0;

    console.log('🔒 Validação Backend Empenho:', {
      valorTotalContrato,
      valorEmpenhosExistentes,
      saldoDisponivel,
      valorNovoEmpenho,
      permitido: valorNovoEmpenho <= saldoDisponivel
    });

    if (valorNovoEmpenho > saldoDisponivel) {
      return res.status(400).json({ 
        message: `Saldo insuficiente! Saldo disponível: R$ ${saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        saldoDisponivel
      });
    }

    contrato.empenhos.push(req.body);
    cliente.updatedAt = Date.now();
    await cliente.save();

    const novoEmpenho = contrato.empenhos[contrato.empenhos.length - 1];
    res.status(201).json(novoEmpenho);
  } catch (error) {
    console.error('Erro ao adicionar empenho:', error);
    res.status(500).json({ message: 'Erro ao adicionar empenho' });
  }
};

// Atualizar empenho
exports.updateEmpenho = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const contrato = cliente.contratos.id(req.params.contratoId);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const empenho = contrato.empenhos.id(req.params.empenhoId);
    if (!empenho) {
      return res.status(404).json({ message: 'Empenho não encontrado' });
    }

    // Validação de saldo ao editar
    const valorContrato = contrato.valor || 0;
    const valorAditivos = (contrato.aditivos || []).reduce((sum, aditivo) => sum + (aditivo.valor || 0), 0);
    const valorTotalContrato = valorContrato + valorAditivos;
    
    // Calcular empenhos excluindo o que está sendo editado
    // Apenas valorAnulado libera saldo para o contrato
    // Apenas empenhos ATIVOS consomem saldo do contrato
    const valorEmpenhosOutros = contrato.empenhos
      .filter(emp => emp._id.toString() !== req.params.empenhoId && emp.ativo !== false)
      .reduce((sum, emp) => {
        const valorLiquido = (emp.valor || 0) - (emp.valorAnulado || 0);
        return sum + valorLiquido;
      }, 0);
    
    const saldoDisponivel = valorTotalContrato - valorEmpenhosOutros;
    const valorNovoEmpenho = req.body.valor || 0;
    const valorAnuladoNovo = req.body.valorAnulado || 0;
    const valorUtilizadoAtual = empenho.valorUtilizado || 0; // Mantém o valor utilizado atual
    const valorLiquidoNovo = valorNovoEmpenho - valorAnuladoNovo;

    console.log('🔒 Validação Backend Atualização Empenho:', {
      valorTotalContrato,
      valorEmpenhosOutros,
      saldoDisponivel,
      valorNovoEmpenho,
      valorLiquidoNovo,
      permitido: valorLiquidoNovo <= saldoDisponivel
    });

    if (valorLiquidoNovo > saldoDisponivel) {
      return res.status(400).json({ 
        message: `Saldo insuficiente! Saldo disponível: R$ ${saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        saldoDisponivel
      });
    }

    // Preserva o valorUtilizado ao atualizar
    req.body.valorUtilizado = valorUtilizadoAtual;
    
    // Se anulou 100% do valor, inativar automaticamente o empenho
    const valorEmpenho = req.body.valor || empenho.valor || 0;
    const valorAnulado = req.body.valorAnulado || 0;
    
    if (valorAnulado >= valorEmpenho && valorEmpenho > 0) {
      req.body.ativo = false;
      console.log('⚠️ Empenho inativado automaticamente - valor 100% anulado');
    }
    
    Object.assign(empenho, req.body);
    cliente.updatedAt = Date.now();
    await cliente.save();

    res.json(empenho);
  } catch (error) {
    console.error('Erro ao atualizar empenho:', error);
    res.status(500).json({ message: 'Erro ao atualizar empenho' });
  }
};

// Deletar empenho
exports.deleteEmpenho = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const contrato = cliente.contratos.id(req.params.contratoId);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const empenho = contrato.empenhos.id(req.params.empenhoId);
    if (!empenho) {
      return res.status(404).json({ message: 'Empenho não encontrado' });
    }

    contrato.empenhos.pull(req.params.empenhoId);
    cliente.updatedAt = Date.now();
    await cliente.save();

    res.json({ message: 'Empenho deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar empenho:', error);
    res.status(500).json({ message: 'Erro ao deletar empenho', error: error.message });
  }
};

// Ativar/Inativar empenho
exports.toggleEmpenhoStatus = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    const contrato = cliente.contratos.id(req.params.contratoId);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const empenho = contrato.empenhos.id(req.params.empenhoId);
    if (!empenho) {
      return res.status(404).json({ message: 'Empenho não encontrado' });
    }

    empenho.ativo = !empenho.ativo;
    cliente.updatedAt = Date.now();
    await cliente.save();

    res.json(empenho);
  } catch (error) {
    console.error('Erro ao alterar status do empenho:', error);
    res.status(500).json({ message: 'Erro ao alterar status do empenho' });
  }
};

