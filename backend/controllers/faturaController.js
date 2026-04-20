const Fatura = require('../models/Fatura');
const OrdemServico = require('../models/OrdemServico');
const Abastecimento = require('../models/Abastecimento');
const ImpostosRetencoes = require('../models/ImpostosRetencoes');
const Cliente = require('../models/Cliente');

// Listar todas as faturas
exports.listar = async (req, res) => {
  try {
    const { tipo, status, clienteId, fornecedorId } = req.query;
    
    const query = { ativo: true };
    if (tipo) query.tipo = tipo;
    if (status) query.statusFatura = status;
    if (clienteId) {
      query.cliente = clienteId;
      query.tipo = 'Cliente';
    }
    if (fornecedorId) {
      query.fornecedor = fornecedorId;
      query.tipo = 'Fornecedor';
    }
    
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
      .populate({
        path: 'abastecimentosVinculados.abastecimento',
        populate: [
          { path: 'cliente', select: 'razaoSocial nomeFantasia cnpj tipoImposto' },
          { path: 'fornecedor', select: 'razaoSocial nomeFantasia cnpjCpf naoOptanteSimples' }
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
    
    // Gerar número da fatura com formato C1234 (Cliente) ou F5678 (Fornecedor)
    const prefixo = tipo === 'Cliente' ? 'C' : 'F';
    let numeroFatura;
    let tentativas = 0;
    const maxTentativas = 100;
    
    // Gera número único de 4 dígitos
    do {
      const numeroAleatorio = Math.floor(1000 + Math.random() * 9000); // Gera entre 1000 e 9999
      numeroFatura = `${prefixo}${numeroAleatorio}`;
      
      // Verifica se já existe
      const faturaExistente = await Fatura.findOne({ numeroFatura }).lean();
      if (!faturaExistente) break;
      
      tentativas++;
      if (tentativas >= maxTentativas) {
        return res.status(500).json({ 
          message: 'Não foi possível gerar número único para a fatura. Tente novamente.' 
        });
      }
    } while (true);
    
    // Calcular valores
    let valorTotal = 0;
    let valorDesconto = 0;
    let valorComDesconto = 0;
    let valorImpostos = 0;
    let valorTaxasOperacao = 0;
    
    const ordensComValores = ordensServico.map(os => {
      const valorPecas = os.valorPecas || 0;
      const valorServico = os.valorServico || 0;
      const descontoPecas = Math.round((valorPecas * (os.descontoPecasPerc || 0)) / 100 * 100) / 100;
      const descontoServico = Math.round((valorServico * (os.descontoServicoPerc || 0)) / 100 * 100) / 100;
      const valorOS = Math.round(((valorPecas + valorServico) - (descontoPecas + descontoServico)) * 100) / 100;
      
      // Calcular impostos para esta OS
      const valorPecasComDesconto = Math.round((valorPecas - descontoPecas) * 100) / 100;
      const valorServicoComDesconto = Math.round((valorServico - descontoServico) * 100) / 100;
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
            impostosOS += Math.round(valorPecasComDesconto * (impostos.impostosMunicipais.pecas?.ir || 0) / 100 * 100) / 100;
            impostosOS += Math.round(valorServicoComDesconto * (impostos.impostosMunicipais.servicos?.ir || 0) / 100 * 100) / 100;
          }
          if (tipoImposto === 'estaduais' && impostos.impostosEstaduais) {
            // Estadual: IR + PIS + COFINS + CSLL
            const pecas = impostos.impostosEstaduais.pecas || {};
            const servicos = impostos.impostosEstaduais.servicos || {};
            impostosOS += Math.round(valorPecasComDesconto * ((pecas.ir || 0) + (pecas.pis || 0) + (pecas.cofins || 0) + (pecas.csll || 0)) / 100 * 100) / 100;
            impostosOS += Math.round(valorServicoComDesconto * ((servicos.ir || 0) + (servicos.pis || 0) + (servicos.cofins || 0) + (servicos.csll || 0)) / 100 * 100) / 100;
          }
          if (tipoImposto === 'federais' && impostos.impostosFederais) {
            // Federal: IR + PIS + COFINS + CSLL
            const pecas = impostos.impostosFederais.pecas || {};
            const servicos = impostos.impostosFederais.servicos || {};
            impostosOS += Math.round(valorPecasComDesconto * ((pecas.ir || 0) + (pecas.pis || 0) + (pecas.cofins || 0) + (pecas.csll || 0)) / 100 * 100) / 100;
            impostosOS += Math.round(valorServicoComDesconto * ((servicos.ir || 0) + (servicos.pis || 0) + (servicos.cofins || 0) + (servicos.csll || 0)) / 100 * 100) / 100;
          }
          if (tipoImposto === 'retencoes' && impostos.retencoesOrgao) {
            // Retenções: aplicar sobre o total
            impostosOS += Math.round((valorPecasComDesconto + valorServicoComDesconto) * (impostos.retencoesOrgao.percentual || 0) / 100 * 100) / 100;
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
    // IMPORTANTE: A taxa é calculada sobre o valor APÓS impostos
    if (tipo === 'Fornecedor' && ordensServico.length > 0) {
      // Pega o cliente da primeira ordem (todas devem ser do mesmo cliente)
      const clienteOS = ordensServico[0].cliente;
      
      // Base de cálculo da taxa = valor com desconto MENOS impostos
      const baseCalculoTaxa = valorComDesconto - valorImpostos;
      
      console.log('🔍 DEBUG TAXA - Cliente:', clienteOS?.nomeFantasia);
      console.log('🔍 DEBUG TAXA - tipoTaxa:', clienteOS?.tipoTaxa);
      console.log('🔍 DEBUG TAXA - tipoPagamento:', tipoPagamento);
      console.log('🔍 DEBUG TAXA - taxasAntecipacao:', JSON.stringify(clienteOS?.taxasAntecipacao));
      console.log('🔍 DEBUG TAXA - valorComDesconto:', valorComDesconto);
      console.log('🔍 DEBUG TAXA - valorImpostos:', valorImpostos);
      console.log('🔍 DEBUG TAXA - baseCalculoTaxa (após impostos):', baseCalculoTaxa);
      
      if (clienteOS?.tipoTaxa === 'operacao') {
        // Taxa de Operação fixa
        const taxaPerc = clienteOS.taxaOperacao || 15;
        valorTaxasOperacao = Math.round((baseCalculoTaxa * taxaPerc) / 100 * 100) / 100;
        console.log('💰 Taxa Operação:', taxaPerc + '%', 'sobre', baseCalculoTaxa, '=', valorTaxasOperacao);
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
          case 'dias30':
            taxaPerc = clienteOS.taxasAntecipacao?.dias30 || 10;
            break;
          case 'dias40':
            taxaPerc = clienteOS.taxasAntecipacao?.dias40 || 8;
            break;
          case 'dias50':
            taxaPerc = clienteOS.taxasAntecipacao?.dias50 || 6;
            break;
          case 'dias60':
            taxaPerc = clienteOS.taxasAntecipacao?.dias60 || 0;
            break;
        }
        valorTaxasOperacao = Math.round((baseCalculoTaxa * taxaPerc) / 100 * 100) / 100;
        console.log('💰 Taxa Antecipação Variável:', tipoPagamento, '=', taxaPerc + '%', 'sobre', baseCalculoTaxa, '=', valorTaxasOperacao);
      }
    }
    
    // Valor devido final
    const valorDevido = Math.round((valorComDesconto - valorImpostos - valorTaxasOperacao) * 100) / 100;
    
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
              case 'dias30':
                taxaAplicada = ordem.cliente.taxasAntecipacao?.dias30 || 10;
                break;
              case 'dias40':
                taxaAplicada = ordem.cliente.taxasAntecipacao?.dias40 || 8;
                break;
              case 'dias50':
                taxaAplicada = ordem.cliente.taxasAntecipacao?.dias50 || 6;
                break;
              case 'dias60':
                taxaAplicada = ordem.cliente.taxasAntecipacao?.dias60 || 0;
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

// Pagar fatura inteira (todas as OS pendentes de uma vez)
exports.pagarFaturaInteira = async (req, res) => {
  try {
    const { id } = req.params;
    const { dataPagamento } = req.body;

    const fatura = await Fatura.findById(id);
    if (!fatura || !fatura.ativo) {
      return res.status(404).json({ message: 'Fatura não encontrada' });
    }

    const dataEfetiva = dataPagamento || new Date();
    const osIds = [];

    // Marcar TODAS as OS pendentes como pagas em uma única operação
    fatura.ordensServico.forEach(os => {
      if (os.statusPagamento !== 'Paga') {
        os.statusPagamento = 'Paga';
        os.dataPagamento = dataEfetiva;
        osIds.push(os.ordemServico);
      }
    });

    if (osIds.length === 0) {
      return res.status(400).json({ message: 'Todas as ordens de serviço já estão pagas' });
    }

    await fatura.save();

    // Atualizar status de todas as OS no modelo OrdemServico
    await OrdemServico.updateMany(
      { _id: { $in: osIds } },
      { $set: { status: 'Paga' } }
    );

    const faturaAtualizada = await Fatura.findById(id)
      .populate('fornecedor')
      .populate('cliente')
      .populate('ordensServico.ordemServico')
      .populate('impostos');

    res.json(faturaAtualizada);
  } catch (error) {
    console.error('Erro ao pagar fatura inteira:', error);
    res.status(500).json({ message: 'Erro ao pagar fatura inteira', error: error.message });
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

// Criar fatura a partir de abastecimentos selecionados
exports.criarFaturaAbastecimento = async (req, res) => {
  const diagId = `fatura-abast-${Date.now()}`;
  try {
    console.log(`[${diagId}] ▶️ Início criarFaturaAbastecimento. Usuário: ${req.user?._id} (${req.user?.role})`);
    const {
      tipo,
      fornecedor,
      cliente,
      abastecimentoIds,
      periodoInicio,
      periodoFim,
      impostosId,
      tipoPagamento,
      aplicarRetencao = true
    } = req.body;
    console.log(`[${diagId}] Payload: tipo=${tipo} fornecedor=${fornecedor} cliente=${cliente} abastecimentos=${abastecimentoIds?.length || 0}`);

    if (!tipo || !abastecimentoIds || abastecimentoIds.length === 0) {
      return res.status(400).json({ message: 'Tipo e abastecimentos são obrigatórios' });
    }

    if (tipo === 'Fornecedor' && !fornecedor) {
      return res.status(400).json({ message: 'Fornecedor é obrigatório para faturas de fornecedor' });
    }

    if (tipo === 'Cliente' && !cliente) {
      return res.status(400).json({ message: 'Cliente é obrigatório para faturas de cliente' });
    }

    // Buscar abastecimentos
    const query = {
      _id: { $in: abastecimentoIds },
      ativo: true
    };

    // Filtrar por status de faturamento
    if (tipo === 'Fornecedor') {
      query.faturadoFornecedor = false;
    } else {
      query.faturadoCliente = false;
    }

    const abastecimentos = await Abastecimento.find(query)
      .populate('cliente', 'razaoSocial nomeFantasia cnpj tipoImposto tipoImpostoCombustivel tiposServico tipoTaxa taxaOperacao taxasAntecipacao taxaPlataformaPorLitro')
      .populate('fornecedor', 'razaoSocial nomeFantasia cnpjCpf naoOptanteSimples');

    if (abastecimentos.length !== abastecimentoIds.length) {
      return res.status(400).json({
        message: 'Alguns abastecimentos não estão disponíveis ou já foram faturados'
      });
    }

    const fornecedoresSelecionados = new Set(
      abastecimentos.map((ab) => String(ab.fornecedor?._id || ab.fornecedor || ''))
    );
    const clientesSelecionados = new Set(
      abastecimentos.map((ab) => String(ab.cliente?._id || ab.cliente || ''))
    );

    if (fornecedoresSelecionados.size !== 1 || clientesSelecionados.size !== 1) {
      return res.status(400).json({
        message: 'Selecione abastecimentos de um único cliente e fornecedor para gerar a fatura.'
      });
    }

    // Buscar impostos
    let impostos;
    if (impostosId) {
      impostos = await ImpostosRetencoes.findById(impostosId);
    } else {
      impostos = await ImpostosRetencoes.findOne({ ativo: true });
    }

    if (!impostos) {
      return res.status(400).json({
        message: 'Configuração de impostos não encontrada. Configure em Impostos & Retenções'
      });
    }

    // Gerar número da fatura (uma única consulta + contador local, muito mais rápido que 100 findOne)
    const prefixo = tipo === 'Cliente' ? 'C' : 'F';
    let numeroFatura;
    const existentesPrefixo = await Fatura.find(
      { numeroFatura: { $regex: `^${prefixo}\\d+$` } },
      { numeroFatura: 1 }
    ).lean();
    const usados = new Set(existentesPrefixo.map(f => f.numeroFatura));
    let tentativas = 0;
    do {
      const numeroAleatorio = Math.floor(1000 + Math.random() * 9000);
      numeroFatura = `${prefixo}${numeroAleatorio}`;
      if (!usados.has(numeroFatura)) break;
      tentativas++;
      if (tentativas >= 500) {
        console.error(`[${diagId}] ❌ Não foi possível gerar número único após 500 tentativas`);
        return res.status(500).json({ message: 'Não foi possível gerar número único para a fatura.' });
      }
    } while (true);
    console.log(`[${diagId}] Número gerado: ${numeroFatura} (tentativas: ${tentativas})`);

    // Calcular valores usando motor fiscal de combustível
    let valorTotal = 0;
    let valorDesconto = 0;
    let valorComDesconto = 0;
    let valorImpostos = 0;
    let valorTaxasOperacao = 0;
    let totalLitros = 0;

    const abastecimentosComValores = abastecimentos.map(ab => {
      const valorBruto = ab.valor || 0;
      const descontoPerc = ab.descontoPercentual || 0;
      const desconto = Math.round((valorBruto * descontoPerc / 100) * 100) / 100;
      const valorLiquido = Math.round((valorBruto - desconto) * 100) / 100;

      // Motor fiscal de combustível - usa tabelas específicas (IN RFB 1.234/2012)
      const clienteAb = ab.cliente;
      const fornecedorAb = ab.fornecedor;
      let impostosAb = 0;

      // Combustível usa tipoImpostoCombustivel (separado de manutenção)
      // Fallback para tipoImposto caso tipoImpostoCombustivel não esteja configurado
      const impostosCombustivel = clienteAb?.tipoImpostoCombustivel?.length > 0
        ? clienteAb.tipoImpostoCombustivel
        : clienteAb?.tipoImposto;

      if (aplicarRetencao && fornecedorAb?.naoOptanteSimples && impostosCombustivel && Array.isArray(impostosCombustivel)) {
        impostosCombustivel.forEach(tipoImposto => {
          if (tipoImposto === 'municipais' && impostos.combustivelMunicipais) {
            const t = impostos.combustivelMunicipais;
            impostosAb += Math.round(valorLiquido * ((t.irrf || 0) + (t.csll || 0) + (t.pis || 0) + (t.cofins || 0)) / 100 * 100) / 100;
          }
          if (tipoImposto === 'estaduais' && impostos.combustivelEstaduais) {
            const t = impostos.combustivelEstaduais;
            impostosAb += Math.round(valorLiquido * ((t.irrf || 0) + (t.csll || 0) + (t.pis || 0) + (t.cofins || 0)) / 100 * 100) / 100;
          }
          if (tipoImposto === 'federais' && impostos.combustivelFederais) {
            const t = impostos.combustivelFederais;
            impostosAb += Math.round(valorLiquido * ((t.irrf || 0) + (t.csll || 0) + (t.pis || 0) + (t.cofins || 0)) / 100 * 100) / 100;
          }
          if (tipoImposto === 'retencoes' && impostos.retencoesOrgao) {
            impostosAb += Math.round(valorLiquido * (impostos.retencoesOrgao.percentual || 0) / 100 * 100) / 100;
          }
        });
      }

      valorTotal += valorBruto;
      valorDesconto += desconto;
      valorComDesconto += valorLiquido;
      valorImpostos += impostosAb;
      totalLitros += ab.litrosAbastecidos || 0;

      return {
        abastecimento: ab._id,
        statusPagamento: 'Aguardando pagamento',
        valorAbastecimento: valorLiquido
      };
    });

    // Taxa da plataforma (gerenciadora) = taxa por litro × total de litros
    // Lê do cadastro do cliente (varia de R$ 0,08 a R$ 0,15 por contrato)
    const clienteDoc = await Cliente.findById(cliente);
    const taxaPlataformaPorLitro = clienteDoc?.taxaPlataformaPorLitro ?? impostos.taxaPlataformaPorLitro ?? 0.08;
    const valorTaxaPlataforma = Math.round(totalLitros * taxaPlataformaPorLitro * 100) / 100;
    valorTaxasOperacao = valorTaxaPlataforma;

    const valorDevido = Math.round((valorComDesconto - valorImpostos - valorTaxasOperacao) * 100) / 100;

    // Criar fatura
    const novaFatura = new Fatura({
      numeroFatura,
      tipo,
      fornecedor: tipo === 'Fornecedor' ? fornecedor : undefined,
      cliente: cliente || undefined,
      ordensServico: [], // Vazio pois é fatura de abastecimento
      abastecimentosVinculados: abastecimentosComValores,
      origem: 'abastecimento',
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
      impostos: impostos?._id,
      statusFatura: 'Aguardando pagamento'
    });

    await novaFatura.save();
    console.log(`[${diagId}] ✅ Fatura ${numeroFatura} salva (id: ${novaFatura._id})`);

    // Atualizar status dos abastecimentos
    await Promise.all(abastecimentos.map(async (ab) => {
      const atualizacao = {
        status: tipo === 'Fornecedor' && tipoPagamento === 'aVista' ? 'Paga' : 'Aguardando pagamento'
      };

      if (!ab.tipoFatura) {
        atualizacao.tipoFatura = tipo;
      }

      if (tipo === 'Fornecedor') {
        atualizacao.faturadoFornecedor = true;
        atualizacao.tipoPagamento = tipoPagamento;

        let taxaAplicada = 0;
        if (ab.cliente?.tipoTaxa === 'operacao') {
          taxaAplicada = ab.cliente.taxaOperacao || 15;
        } else if (ab.cliente?.tipoTaxa === 'antecipacao_variavel' && tipoPagamento) {
          switch (tipoPagamento) {
            case 'aVista': taxaAplicada = ab.cliente.taxasAntecipacao?.aVista || 15; break;
            case 'aposFechamento': taxaAplicada = ab.cliente.taxasAntecipacao?.aposFechamento || 13; break;
            case 'dias30': taxaAplicada = ab.cliente.taxasAntecipacao?.dias30 || 10; break;
            case 'dias40': taxaAplicada = ab.cliente.taxasAntecipacao?.dias40 || 8; break;
            case 'dias50': taxaAplicada = ab.cliente.taxasAntecipacao?.dias50 || 6; break;
            case 'dias60': taxaAplicada = ab.cliente.taxasAntecipacao?.dias60 || 0; break;
          }
        }
        atualizacao.taxaAplicada = taxaAplicada;
      } else if (tipo === 'Cliente') {
        atualizacao.faturadoCliente = true;
      }

      await Abastecimento.updateOne({ _id: ab._id }, { $set: atualizacao });
    }));
    console.log(`[${diagId}] ✅ ${abastecimentos.length} abastecimentos atualizados`);

    // Resposta enxuta (sem populate do array de abastecimentos, que pode ser enorme)
    const faturaResposta = {
      _id: novaFatura._id,
      numeroFatura: novaFatura.numeroFatura,
      tipo: novaFatura.tipo,
      fornecedor: novaFatura.fornecedor,
      cliente: novaFatura.cliente,
      origem: novaFatura.origem,
      periodoInicio: novaFatura.periodoInicio,
      periodoFim: novaFatura.periodoFim,
      valorTotal: novaFatura.valorTotal,
      valorDesconto: novaFatura.valorDesconto,
      valorComDesconto: novaFatura.valorComDesconto,
      valorImpostos: novaFatura.valorImpostos,
      valorTaxasOperacao: novaFatura.valorTaxasOperacao,
      valorDevido: novaFatura.valorDevido,
      valorPago: novaFatura.valorPago,
      valorRestante: novaFatura.valorRestante,
      statusFatura: novaFatura.statusFatura,
      totalAbastecimentos: abastecimentos.length
    };

    console.log(`[${diagId}] 🏁 Concluído com sucesso em ${Date.now() - parseInt(diagId.split('-').pop())}ms`);
    res.status(201).json(faturaResposta);
  } catch (error) {
    console.error(`[${diagId}] ❌ ERRO ao criar fatura de abastecimento:`, error);
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ message: 'Dados inválidos para criar fatura', error: error.message });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Conflito ao gerar número da fatura. Tente novamente.', error: error.message });
    }
    res.status(500).json({ message: 'Erro ao criar fatura de abastecimento', error: error.message });
  }
};
