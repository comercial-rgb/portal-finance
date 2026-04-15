const OrdemServico = require('../models/OrdemServico');
const Cliente = require('../models/Cliente');

// Função auxiliar para deduzir valor do empenho (usado em ordens de serviço)
const deduzirValorEmpenho = async (clienteId, contratoId, empenhoId, valorDeduzir) => {
  try {
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) throw new Error('Cliente não encontrado');

    const contrato = cliente.contratos.id(contratoId);
    if (!contrato) throw new Error('Contrato não encontrado');

    const empenho = contrato.empenhos.id(empenhoId);
    if (!empenho) throw new Error('Empenho não encontrado');

    // Calcular saldo disponível: valor - valorAnulado (cancelamentos) - valorUtilizado (OS)
    const saldoDisponivel = empenho.valor - (empenho.valorAnulado || 0) - (empenho.valorUtilizado || 0);
    if (valorDeduzir > saldoDisponivel) {
      throw new Error(`Saldo insuficiente no empenho. Disponível: R$ ${saldoDisponivel.toFixed(2)}, Solicitado: R$ ${valorDeduzir.toFixed(2)}`);
    }

    // Deduzir do saldo (aumenta o valor utilizado)
    empenho.valorUtilizado = (empenho.valorUtilizado || 0) + valorDeduzir;

    await cliente.save();
    console.log(`✅ Valor R$ ${valorDeduzir.toFixed(2)} deduzido. Utilizado total: R$ ${empenho.valorUtilizado.toFixed(2)}`);
    return true;
  } catch (error) {
    console.error('Erro ao deduzir valor do empenho:', error);
    throw error;
  }
};

// Função auxiliar para estornar valor do empenho (quando editar ou deletar OS)
const estornarValorEmpenho = async (clienteId, contratoId, empenhoId, valorEstornar) => {
  try {
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) throw new Error('Cliente não encontrado');

    const contrato = cliente.contratos.id(contratoId);
    if (!contrato) throw new Error('Contrato não encontrado');

    const empenho = contrato.empenhos.id(empenhoId);
    if (!empenho) throw new Error('Empenho não encontrado');

    // Estornar (diminui o valor utilizado)
    empenho.valorUtilizado = Math.max(0, (empenho.valorUtilizado || 0) - valorEstornar);

    await cliente.save();
    console.log(`✅ Valor R$ ${valorEstornar.toFixed(2)} estornado. Utilizado total: R$ ${empenho.valorUtilizado.toFixed(2)}`);
    return true;
  } catch (error) {
    console.error('Erro ao estornar valor do empenho:', error);
    throw error;
  }
};

exports.getOrdensServico = async (req, res) => {
  try {
    console.log('📋 GET /api/ordens-servico - Query params:', req.query);
    const { page = 1, limit = 15, cliente, fornecedor, status, codigo, dataInicio, dataFim, faturadoFornecedor, faturadoCliente, statusIn } = req.query;
    
    const query = {};
    
    // Se usuário é fornecedor, filtrar apenas suas OS
    if (req.fornecedorFilter) {
      query.fornecedor = req.user.fornecedorId;
      console.log('🔒 Usuário fornecedor - filtrando apenas suas OS:', req.user.fornecedorId);
    } else {
      // Para usuários não-fornecedores, aplicar filtros normais
      if (cliente) {
        console.log('Filtrando por cliente:', cliente);
        query.cliente = cliente;
      }
      if (fornecedor) {
        console.log('Filtrando por fornecedor:', fornecedor);
        query.fornecedor = fornecedor;
      }
    }
    
    if (status) query.status = status;
    
    // Filtro por múltiplos statuses (para tela de faturas)
    if (statusIn) {
      query.status = { $in: statusIn.split(',') };
    }
    
    // Filtro por faturado fornecedor/cliente (para tela de faturas)
    // Usa $ne: true em vez de === false para capturar docs antigos sem o campo
    if (faturadoFornecedor !== undefined) {
      query.faturadoFornecedor = faturadoFornecedor === 'true' ? true : { $ne: true };
    }
    if (faturadoCliente !== undefined) {
      query.faturadoCliente = faturadoCliente === 'true' ? true : { $ne: true };
    }
    
    if (codigo) {
      query.$or = [
        { codigo: new RegExp(codigo, 'i') },
        { numeroOrdemServico: new RegExp(codigo, 'i') }
      ];
    }
    
    // Filtro por período de data
    if (dataInicio || dataFim) {
      query.dataReferencia = {};
      if (dataInicio) query.dataReferencia.$gte = new Date(dataInicio);
      if (dataFim) {
        const dataFimCompleta = new Date(dataFim);
        dataFimCompleta.setHours(23, 59, 59, 999);
        query.dataReferencia.$lte = dataFimCompleta;
      }
    }

    console.log('Query MongoDB:', JSON.stringify(query));

    const ordensServico = await OrdemServico.find(query)
      .populate('cliente', 'razaoSocial nomeFantasia tipoImposto')
      .populate('fornecedor', 'razaoSocial nomeFantasia naoOptanteSimples')
      .populate('tipoServicoSolicitado', 'nome')
      .populate('tipo', 'nome')
      .sort({ dataReferencia: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log(`✅ Encontradas ${ordensServico.length} ordens de serviço`);

    const count = await OrdemServico.countDocuments(query);

    res.json({
      ordensServico,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('❌ Erro ao buscar ordens de serviço:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ message: 'Erro ao buscar ordens de serviço', error: error.message });
  }
};

exports.getOrdemServicoById = async (req, res) => {
  try {
    const ordemServico = await OrdemServico.findById(req.params.id)
      .populate('cliente')
      .populate('fornecedor')
      .populate('tipoServicoSolicitado')
      .populate('tipo');
    
    if (!ordemServico) {
      return res.status(404).json({ message: 'Ordem de serviço não encontrada' });
    }
    
    res.json(ordemServico);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar ordem de serviço', error: error.message });
  }
};

exports.createOrdemServico = async (req, res) => {
  try {
    console.log('📋 Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    // Deduzir valores dos empenhos antes de criar a ordem
    if (req.body.empenhoPecas && req.body.valorPecasComDesconto > 0) {
      console.log(`💰 Deduzindo R$ ${req.body.valorPecasComDesconto} do empenho de peças`);
      await deduzirValorEmpenho(
        req.body.cliente,
        req.body.contratoEmpenhoPecas,
        req.body.empenhoPecas,
        req.body.valorPecasComDesconto
      );
    }

    if (req.body.empenhoServicos && req.body.valorServicoComDesconto > 0) {
      console.log(`💰 Deduzindo R$ ${req.body.valorServicoComDesconto} do empenho de serviços`);
      await deduzirValorEmpenho(
        req.body.cliente,
        req.body.contratoEmpenhoServicos,
        req.body.empenhoServicos,
        req.body.valorServicoComDesconto
      );
    }
    
    let tentativas = 0;
    const maxTentativas = 3;
    let ordemServico = null;
    
    while (tentativas < maxTentativas) {
      try {
        ordemServico = new OrdemServico(req.body);
        console.log(`✅ Ordem criada com código ${ordemServico.codigo}, salvando... (tentativa ${tentativas + 1})`);
        await ordemServico.save();
        console.log('✅ Ordem salva com sucesso! ID:', ordemServico._id);
        break;
      } catch (error) {
        if (error.code === 11000 && tentativas < maxTentativas - 1) {
          console.log(`⚠️  Código duplicado detectado, tentando novamente...`);
          tentativas++;
          // Forçar regeneração do código
          ordemServico = null;
          req.body.codigo = undefined;
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          // Se falhar, estornar os valores deduzidos
          if (req.body.empenhoPecas && req.body.valorPecasComDesconto > 0) {
            await estornarValorEmpenho(
              req.body.cliente,
              req.body.contratoEmpenhoPecas,
              req.body.empenhoPecas,
              req.body.valorPecasComDesconto
            );
          }
          if (req.body.empenhoServicos && req.body.valorServicoComDesconto > 0) {
            await estornarValorEmpenho(
              req.body.cliente,
              req.body.contratoEmpenhoServicos,
              req.body.empenhoServicos,
              req.body.valorServicoComDesconto
            );
          }
          throw error;
        }
      }
    }
    
    if (!ordemServico) {
      throw new Error('Não foi possível gerar código único após 3 tentativas');
    }
    
    const ordemPopulada = await OrdemServico.findById(ordemServico._id)
      .populate('cliente', 'razaoSocial nomeFantasia')
      .populate('fornecedor', 'razaoSocial nomeFantasia')
      .populate('tipoServicoSolicitado', 'nome')
      .populate('tipo', 'nome');
    
    res.status(201).json(ordemPopulada);
  } catch (error) {
    console.error('❌ Erro ao criar ordem de serviço:', error);
    console.error('❌ Detalhes do erro:', error.message);
    console.error('❌ Stack:', error.stack);
    res.status(400).json({ message: 'Erro ao criar ordem de serviço', error: error.message, details: error.errors });
  }
};

exports.updateOrdemServico = async (req, res) => {
  try {
    // Buscar ordem antiga para estornar valores
    const ordemAntiga = await OrdemServico.findById(req.params.id);
    if (!ordemAntiga) {
      return res.status(404).json({ message: 'Ordem de serviço não encontrada' });
    }

    // Estornar valores dos empenhos antigos
    if (ordemAntiga.empenhoPecas && ordemAntiga.valorPecasComDesconto > 0) {
      console.log(`💰 Estornando R$ ${ordemAntiga.valorPecasComDesconto} do empenho de peças antigo`);
      await estornarValorEmpenho(
        ordemAntiga.cliente,
        ordemAntiga.contratoEmpenhoPecas,
        ordemAntiga.empenhoPecas,
        ordemAntiga.valorPecasComDesconto
      );
    }

    if (ordemAntiga.empenhoServicos && ordemAntiga.valorServicoComDesconto > 0) {
      console.log(`💰 Estornando R$ ${ordemAntiga.valorServicoComDesconto} do empenho de serviços antigo`);
      await estornarValorEmpenho(
        ordemAntiga.cliente,
        ordemAntiga.contratoEmpenhoServicos,
        ordemAntiga.empenhoServicos,
        ordemAntiga.valorServicoComDesconto
      );
    }

    // Deduzir valores dos novos empenhos
    if (req.body.empenhoPecas && req.body.valorPecasComDesconto > 0) {
      console.log(`💰 Deduzindo R$ ${req.body.valorPecasComDesconto} do novo empenho de peças`);
      await deduzirValorEmpenho(
        req.body.cliente,
        req.body.contratoEmpenhoPecas,
        req.body.empenhoPecas,
        req.body.valorPecasComDesconto
      );
    }

    if (req.body.empenhoServicos && req.body.valorServicoComDesconto > 0) {
      console.log(`💰 Deduzindo R$ ${req.body.valorServicoComDesconto} do novo empenho de serviços`);
      await deduzirValorEmpenho(
        req.body.cliente,
        req.body.contratoEmpenhoServicos,
        req.body.empenhoServicos,
        req.body.valorServicoComDesconto
      );
    }

    const ordemServico = await OrdemServico.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('cliente', 'razaoSocial nomeFantasia')
      .populate('fornecedor', 'razaoSocial nomeFantasia')
      .populate('tipoServicoSolicitado', 'nome')
      .populate('tipo', 'nome');
    
    if (!ordemServico) {
      return res.status(404).json({ message: 'Ordem de serviço não encontrada' });
    }
    
    res.json(ordemServico);
  } catch (error) {
    res.status(400).json({ message: 'Erro ao atualizar ordem de serviço', error: error.message });
  }
};

exports.deleteOrdemServico = async (req, res) => {
  try {
    const ordemServico = await OrdemServico.findById(req.params.id);
    
    if (!ordemServico) {
      return res.status(404).json({ message: 'Ordem de serviço não encontrada' });
    }

    // Estornar valores dos empenhos antes de deletar
    if (ordemServico.empenhoPecas && ordemServico.valorPecasComDesconto > 0) {
      console.log(`💰 Estornando R$ ${ordemServico.valorPecasComDesconto} do empenho de peças ao deletar`);
      await estornarValorEmpenho(
        ordemServico.cliente,
        ordemServico.contratoEmpenhoPecas,
        ordemServico.empenhoPecas,
        ordemServico.valorPecasComDesconto
      );
    }

    if (ordemServico.empenhoServicos && ordemServico.valorServicoComDesconto > 0) {
      console.log(`💰 Estornando R$ ${ordemServico.valorServicoComDesconto} do empenho de serviços ao deletar`);
      await estornarValorEmpenho(
        ordemServico.cliente,
        ordemServico.contratoEmpenhoServicos,
        ordemServico.empenhoServicos,
        ordemServico.valorServicoComDesconto
      );
    }

    await OrdemServico.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Ordem de serviço excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir ordem de serviço', error: error.message });
  }
};

exports.deleteMultiple = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs não fornecidos' });
    }

    // Estornar valores dos empenhos antes de deletar
    for (const id of ids) {
      const ordemServico = await OrdemServico.findById(id);
      if (ordemServico) {
        if (ordemServico.empenhoPecas && ordemServico.valorPecasComDesconto > 0) {
          await estornarValorEmpenho(
            ordemServico.cliente,
            ordemServico.contratoEmpenhoPecas,
            ordemServico.empenhoPecas,
            ordemServico.valorPecasComDesconto
          ).catch(err => console.error('Erro ao estornar peças:', err.message));
        }
        if (ordemServico.empenhoServicos && ordemServico.valorServicoComDesconto > 0) {
          await estornarValorEmpenho(
            ordemServico.cliente,
            ordemServico.contratoEmpenhoServicos,
            ordemServico.empenhoServicos,
            ordemServico.valorServicoComDesconto
          ).catch(err => console.error('Erro ao estornar serviços:', err.message));
        }
      }
    }

    const result = await OrdemServico.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${result.deletedCount} ordens de serviço excluídas com sucesso` });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir ordens de serviço', error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ordemServico = await OrdemServico.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!ordemServico) {
      return res.status(404).json({ message: 'Ordem de serviço não encontrada' });
    }
    
    res.json(ordemServico);
  } catch (error) {
    res.status(400).json({ message: 'Erro ao atualizar status', error: error.message });
  }
};
