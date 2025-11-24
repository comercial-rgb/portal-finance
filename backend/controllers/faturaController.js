const Fatura = require('../models/Fatura');
const OrdemServico = require('../models/OrdemServico');
const ImpostosRetencoes = require('../models/ImpostosRetencoes');

// Listar todas as faturas
exports.listar = async (req, res) => {
  try {
    const { tipo, status } = req.query;
    
    const query = { ativo: true };
    if (tipo) query.tipo = tipo;
    if (status) query.statusFatura = status;
    
    // Se usuário é fornecedor, filtrar apenas suas faturas
    if (req.fornecedorFilter) {
      query.fornecedor = req.user.fornecedorId;
      console.log('🔒 Usuário fornecedor - filtrando apenas suas faturas:', req.user.fornecedorId);
    }
    
    // Se usuário é cliente, filtrar apenas suas faturas
    if (req.clienteFilter) {
      query.cliente = req.user.clienteId;
      console.log('🔒 Usuário cliente - filtrando apenas suas faturas:', req.user.clienteId);
    }
    
    const faturas = await Fatura.find(query)
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf')
      .populate('cliente', 'razaoSocial nomeFantasia cnpjCpf')
      .populate('ordensServico.ordemServico')
      .populate('impostos')
      .sort({ createdAt: -1 });
    
    res.json(faturas);
  } catch (error) {
    console.error('Erro ao listar faturas:', error);
    res.status(500).json({ message: 'Erro ao listar faturas', error: error.message });
  }
};

// Buscar fatura por ID
exports.buscarPorId = async (req, res) => {
  try {
    const query = { _id: req.params.id, ativo: true };
    
    // Se usuário é fornecedor, garantir que só acesse suas próprias faturas
    if (req.fornecedorFilter) {
      query.fornecedor = req.user.fornecedorId;
    }
    
    // Se usuário é cliente, garantir que só acesse suas próprias faturas
    if (req.clienteFilter) {
      query.cliente = req.user.clienteId;
    }
    
    const fatura = await Fatura.findOne(query)
      .populate('fornecedor')
      .populate('cliente')
      .populate({
        path: 'ordensServico.ordemServico',
        populate: [
          { path: 'cliente', select: 'razaoSocial nomeFantasia tipoImposto' },
          { path: 'fornecedor', select: 'razaoSocial nomeFantasia naoOptanteSimples' },
          { path: 'tipo', select: 'nome' },
          { path: 'tipoServicoSolicitado', select: 'nome' }
        ]
      })
      .populate('impostos');
    
    if (!fatura) {
      return res.status(404).json({ message: 'Fatura não encontrada ou você não tem permissão para acessá-la' });
    }
    
    res.json(fatura);
  } catch (error) {
    console.error('Erro ao buscar fatura:', error);
    res.status(500).json({ message: 'Erro ao buscar fatura', error: error.message });
  }
};

// Criar fatura a partir de ordens de serviço selecionadas
exports.criar = async (req, res) => {
  try {
    const { tipo, fornecedor, cliente, ordensServicoIds, periodoInicio, periodoFim, impostosId, tipoPagamento } = req.body;
    
    // Validar dados obrigatórios
    if (!tipo || !ordensServicoIds || ordensServicoIds.length === 0) {
      return res.status(400).json({ message: 'Tipo e ordens de serviço são obrigatórios' });
    }
    
    if (tipo === 'Fornecedor' && !fornecedor) {
      return res.status(400).json({ message: 'Fornecedor é obrigatório para faturas de fornecedor' });
    }
    
    if (tipo === 'Cliente' && !cliente) {
      return res.status(400).json({ message: 'Cliente é obrigatório para faturas de cliente' });
    }
    
    // Buscar ordens de serviço com populate
    // Permite ordens "Autorizadas" OU ordens que estão em faturas do outro tipo
    const query = {
      _id: { $in: ordensServicoIds },
      ativo: true,
      $or: [
        { status: 'Autorizada' },
        { tipoFatura: { $ne: tipo } } // Diferente do tipo atual (permite outro tipo ou null)
      ]
    };
    
    const ordensServico = await OrdemServico.find(query)
      .populate('cliente', 'razaoSocial nomeFantasia tipoImposto tipoTaxa taxaOperacao taxasAntecipacao')
      .populate('fornecedor', 'razaoSocial nomeFantasia naoOptanteSimples');
    
    if (ordensServico.length !== ordensServicoIds.length) {
      return res.status(400).json({ 
        message: 'Algumas ordens de serviço não estão disponíveis ou já foram faturadas' 
      });
    }
    
    // Buscar impostos - se não fornecido, busca a configuração ativa
    let impostos;
    if (impostosId) {
      impostos = await ImpostosRetencoes.findById(impostosId);
    } else {
      // Busca a primeira configuração ativa
      impostos = await ImpostosRetencoes.findOne({ ativo: true });
    }
    
    if (!impostos) {
      return res.status(400).json({ 
        message: 'Configuração de impostos não encontrada. Configure em Impostos & Retenções' 
      });
    }
    
    // Gerar número da fatura
    const ultimaFatura = await Fatura.findOne()
      .sort({ numeroFatura: -1 })
      .select('numeroFatura')
      .lean();
    
    let proximoNumero = 1;
    if (ultimaFatura && ultimaFatura.numeroFatura) {
      const numeroAtual = parseInt(ultimaFatura.numeroFatura.replace('FAT-', ''));
      proximoNumero = numeroAtual + 1;
    }
    
    const numeroFatura = `FAT-${String(proximoNumero).padStart(6, '0')}`;
    
    // Calcular valores
    let valorTotal = 0;
    let valorDesconto = 0;
    let valorComDesconto = 0;
    let valorImpostos = 0;
    let valorTaxasOperacao = 0;
    
    const ordensComValores = ordensServico.map(os => {
      const valorPecas = os.valorPecas || 0;
      const valorServico = os.valorServico || 0;
      const descontoPecas = (valorPecas * (os.descontoPecasPerc || 0)) / 100;
      const descontoServico = (valorServico * (os.descontoServicoPerc || 0)) / 100;
      const valorOS = (valorPecas + valorServico) - (descontoPecas + descontoServico);
      
      // Calcular impostos para esta OS
      const valorPecasComDesconto = valorPecas - descontoPecas;
      const valorServicoComDesconto = valorServico - descontoServico;
      let impostosOS = 0;
      
      // Buscar cliente e fornecedor populados
      const clienteOS = os.cliente;
      const fornecedorOS = os.fornecedor;
      
      // Calcular impostos se:
      // 1. Fornecedor for NÃO optante do Simples E
      // 2. Cliente tem tipos de imposto definidos
      // Aplica tanto para Fatura Cliente quanto Fatura Fornecedor
      if (fornecedorOS?.naoOptanteSimples && clienteOS?.tipoImposto && Array.isArray(clienteOS.tipoImposto)) {
        clienteOS.tipoImposto.forEach(tipoImposto => {
          if (tipoImposto === 'municipais' && impostos.impostosMunicipais) {
            // Municipal: apenas IR
            impostosOS += valorPecasComDesconto * (impostos.impostosMunicipais.pecas?.ir || 0) / 100;
            impostosOS += valorServicoComDesconto * (impostos.impostosMunicipais.servicos?.ir || 0) / 100;
          }
          if (tipoImposto === 'estaduais' && impostos.impostosEstaduais) {
            // Estadual: IR + PIS + COFINS + CSLL
            const pecas = impostos.impostosEstaduais.pecas || {};
            const servicos = impostos.impostosEstaduais.servicos || {};
            impostosOS += valorPecasComDesconto * ((pecas.ir || 0) + (pecas.pis || 0) + (pecas.cofins || 0) + (pecas.csll || 0)) / 100;
            impostosOS += valorServicoComDesconto * ((servicos.ir || 0) + (servicos.pis || 0) + (servicos.cofins || 0) + (servicos.csll || 0)) / 100;
          }
          if (tipoImposto === 'federais' && impostos.impostosFederais) {
            // Federal: IR + PIS + COFINS + CSLL
            const pecas = impostos.impostosFederais.pecas || {};
            const servicos = impostos.impostosFederais.servicos || {};
            impostosOS += valorPecasComDesconto * ((pecas.ir || 0) + (pecas.pis || 0) + (pecas.cofins || 0) + (pecas.csll || 0)) / 100;
            impostosOS += valorServicoComDesconto * ((servicos.ir || 0) + (servicos.pis || 0) + (servicos.cofins || 0) + (servicos.csll || 0)) / 100;
          }
          if (tipoImposto === 'retencoes' && impostos.retencoesOrgao) {
            // Retenções: aplicar sobre o total
            impostosOS += (valorPecasComDesconto + valorServicoComDesconto) * (impostos.retencoesOrgao.percentual || 0) / 100;
          }
        });
      }
      
      valorTotal += valorPecas + valorServico;
      valorDesconto += descontoPecas + descontoServico;
      valorComDesconto += valorOS;
      valorImpostos += impostosOS;
      
      return {
        ordemServico: os._id,
        statusPagamento: 'Aguardando pagamento',
        valorOS: valorOS
      };
    });
    
    // Calcular taxas para Fatura Fornecedor
    if (tipo === 'Fornecedor' && ordensServico.length > 0) {
      // Pega o cliente da primeira ordem (todas devem ser do mesmo cliente)
      const clienteOS = ordensServico[0].cliente;
      
      if (clienteOS?.tipoTaxa === 'operacao') {
        // Taxa de Operação fixa
        const taxaPerc = clienteOS.taxaOperacao || 15;
        valorTaxasOperacao = (valorComDesconto * taxaPerc) / 100;
      } else if (clienteOS?.tipoTaxa === 'antecipacao_variavel' && tipoPagamento) {
        // Taxa Antecipação Variável - requer tipoPagamento
        let taxaPerc = 0;
        switch (tipoPagamento) {
          case 'aVista':
            taxaPerc = clienteOS.taxasAntecipacao?.aVista || 15;
            break;
          case 'aposFechamento':
            taxaPerc = clienteOS.taxasAntecipacao?.aposFechamento || 13;
            break;
          case 'aprazado':
            taxaPerc = clienteOS.taxasAntecipacao?.aprazado || 0;
            break;
        }
        valorTaxasOperacao = (valorComDesconto * taxaPerc) / 100;
      }
    }
    
    // Valor devido final
    const valorDevido = valorComDesconto - valorImpostos - valorTaxasOperacao;
    
    // Criar fatura
    const novaFatura = new Fatura({
      numeroFatura,
      tipo,
      fornecedor: tipo === 'Fornecedor' ? fornecedor : undefined,
      cliente: tipo === 'Cliente' ? cliente : undefined,
      ordensServico: ordensComValores,
      periodoInicio,
      periodoFim,
      valorTotal,
      valorDesconto,
      valorComDesconto,
      valorImpostos,
      valorTaxasOperacao,
      valorDevido,
      valorPago: 0,
      valorRestante: valorDevido,
      impostos: impostosId,
      statusFatura: 'Aguardando pagamento'
    });
    
    await novaFatura.save();
    
    // Atualizar status das ordens de serviço
    // Marcar como faturada para o tipo correspondente
    for (const ordemId of ordensServicoIds) {
      const ordem = await OrdemServico.findById(ordemId).populate('cliente', 'tipoTaxa taxaOperacao taxasAntecipacao');
      if (ordem) {
        // Marcar como faturada dependendo do tipo
        if (tipo === 'Fornecedor') {
          ordem.faturadoFornecedor = true;
        } else if (tipo === 'Cliente') {
          ordem.faturadoCliente = true;
        }
        
        // Status: À vista = Paga, outros = Aguardando pagamento
        if (tipo === 'Fornecedor' && tipoPagamento === 'aVista') {
          ordem.status = 'Paga';
        } else {
          ordem.status = 'Aguardando pagamento';
        }
        
        // Só definir tipoFatura se ainda não tiver
        if (!ordem.tipoFatura) {
          ordem.tipoFatura = tipo;
        }
        
        // Salvar tipoPagamento e taxa aplicada para Fatura Fornecedor
        if (tipo === 'Fornecedor') {
          ordem.tipoPagamento = tipoPagamento;
          
          // Calcular taxa aplicada
          let taxaAplicada = 0;
          if (ordem.cliente?.tipoTaxa === 'operacao') {
            taxaAplicada = ordem.cliente.taxaOperacao || 15;
          } else if (ordem.cliente?.tipoTaxa === 'antecipacao_variavel' && tipoPagamento) {
            switch (tipoPagamento) {
              case 'aVista':
                taxaAplicada = ordem.cliente.taxasAntecipacao?.aVista || 15;
                break;
              case 'aposFechamento':
                taxaAplicada = ordem.cliente.taxasAntecipacao?.aposFechamento || 13;
                break;
              case 'aprazado':
                taxaAplicada = ordem.cliente.taxasAntecipacao?.aprazado || 0;
                break;
            }
          }
          ordem.taxaAplicada = taxaAplicada;
        }
        
        await ordem.save();
      }
    }
    
    // Retornar fatura com dados populados
    const faturaCompleta = await Fatura.findById(novaFatura._id)
      .populate('fornecedor')
      .populate('cliente')
      .populate('ordensServico.ordemServico')
      .populate('impostos');
    
    res.status(201).json(faturaCompleta);
  } catch (error) {
    console.error('Erro ao criar fatura:', error);
    res.status(500).json({ message: 'Erro ao criar fatura', error: error.message });
  }
};

// Atualizar fatura (remover OS, adicionar observações, etc)
exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('📥 Atualizando fatura:', id);
    console.log('📦 Dados recebidos:', updates);
    
    const fatura = await Fatura.findById(id);
    if (!fatura || !fatura.ativo) {
      return res.status(404).json({ message: 'Fatura não encontrada' });
    }
    
    console.log('📄 Fatura antes:', { previsaoRecebimento: fatura.previsaoRecebimento });
    
    // Atualizar campos permitidos
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'numeroFatura') {
        fatura[key] = updates[key];
      }
    });
    
    console.log('📄 Fatura após atualização:', { previsaoRecebimento: fatura.previsaoRecebimento });
    
    await fatura.save();
    
    console.log('💾 Fatura salva:', { previsaoRecebimento: fatura.previsaoRecebimento });
    
    const faturaAtualizada = await Fatura.findById(id)
      .populate('fornecedor')
      .populate('cliente')
      .populate('ordensServico.ordemServico')
      .populate('impostos');
    
    console.log('✅ Retornando fatura atualizada:', { previsaoRecebimento: faturaAtualizada.previsaoRecebimento });
    
    res.json(faturaAtualizada);
  } catch (error) {
    console.error('❌ Erro ao atualizar fatura:', error);
    res.status(500).json({ message: 'Erro ao atualizar fatura', error: error.message });
  }
};

// Remover ordem de serviço da fatura
exports.removerOrdemServico = async (req, res) => {
  try {
    const { id, ordemServicoId } = req.params;
    
    const fatura = await Fatura.findById(id);
    if (!fatura || !fatura.ativo) {
      return res.status(404).json({ message: 'Fatura não encontrada' });
    }
    
    // Remover ordem de serviço
    const osIndex = fatura.ordensServico.findIndex(
      os => os.ordemServico.toString() === ordemServicoId
    );
    
    if (osIndex === -1) {
      return res.status(404).json({ message: 'Ordem de serviço não encontrada na fatura' });
    }
    
    fatura.ordensServico.splice(osIndex, 1);
    
    // Se não sobrou nenhuma OS, desativar a fatura
    if (fatura.ordensServico.length === 0) {
      fatura.ativo = false;
    }
    
    await fatura.save();
    
    // Retornar OS para status Autorizada e limpar tipoFatura
    await OrdemServico.findByIdAndUpdate(ordemServicoId, { 
      status: 'Autorizada',
      tipoFatura: null
    });
    
    const faturaAtualizada = await Fatura.findById(id)
      .populate('fornecedor')
      .populate('cliente')
      .populate('ordensServico.ordemServico')
      .populate('impostos');
    
    res.json(faturaAtualizada);
  } catch (error) {
    console.error('Erro ao remover ordem de serviço:', error);
    res.status(500).json({ message: 'Erro ao remover ordem de serviço', error: error.message });
  }
};

// Marcar ordem de serviço como paga
exports.marcarOSComoPaga = async (req, res) => {
  try {
    const { id, ordemServicoId } = req.params;
    const { dataPagamento } = req.body;
    
    const fatura = await Fatura.findById(id);
    if (!fatura || !fatura.ativo) {
      return res.status(404).json({ message: 'Fatura não encontrada' });
    }
    
    // Encontrar a ordem de serviço na fatura
    const os = fatura.ordensServico.find(
      os => os.ordemServico.toString() === ordemServicoId
    );
    
    if (!os) {
      return res.status(404).json({ message: 'Ordem de serviço não encontrada na fatura' });
    }
    
    // Marcar como paga
    os.statusPagamento = 'Paga';
    os.dataPagamento = dataPagamento || new Date();
    
    await fatura.save();
    
    // Atualizar status da OS no modelo OrdemServico
    await OrdemServico.findByIdAndUpdate(ordemServicoId, { status: 'Paga' });
    
    const faturaAtualizada = await Fatura.findById(id)
      .populate('fornecedor')
      .populate('cliente')
      .populate('ordensServico.ordemServico')
      .populate('impostos');
    
    res.json(faturaAtualizada);
  } catch (error) {
    console.error('Erro ao marcar OS como paga:', error);
    res.status(500).json({ message: 'Erro ao marcar OS como paga', error: error.message });
  }
};

// Desativar fatura
exports.desativar = async (req, res) => {
  try {
    const { id } = req.params;
    
    const fatura = await Fatura.findById(id);
    
    if (!fatura) {
      return res.status(404).json({ message: 'Fatura não encontrada' });
    }
    
    // Determinar qual flag remover baseado no tipo da fatura
    const tipoFatura = fatura.tipo;
    
    // Retornar todas as OS para status Autorizada e limpar flags apropriados
    const osIds = fatura.ordensServico
      .filter(os => os.statusPagamento === 'Aguardando pagamento')
      .map(os => os.ordemServico);
    
    // Preparar o update baseado no tipo de fatura
    const updateFields = { 
      status: 'Autorizada',
      tipoFatura: null
    };
    
    if (tipoFatura === 'Fornecedor') {
      updateFields.faturadoFornecedor = false;
    } else if (tipoFatura === 'Cliente') {
      updateFields.faturadoCliente = false;
    }
    
    await OrdemServico.updateMany(
      { _id: { $in: osIds } },
      { $set: updateFields }
    );
    
    // Desativar a fatura
    await Fatura.findByIdAndUpdate(
      id,
      { ativo: false },
      { new: true }
    );
    
    res.json({ message: 'Fatura desativada com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar fatura:', error);
    res.status(500).json({ message: 'Erro ao desativar fatura', error: error.message });
  }
};
