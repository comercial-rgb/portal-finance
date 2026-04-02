const OrdemServico = require('../models/OrdemServico');
const Cliente = require('../models/Cliente');
const Fornecedor = require('../models/Fornecedor');
const { Tipo, TipoServicoSolicitado } = require('../models/TipoServico');

/**
 * Webhook para receber OS do sistema de frotas
 * Quando uma OS é autorizada no sistema de frotas, ela é enviada para cá
 */
exports.receberOSFrota = async (req, res) => {
  try {
    console.log('🚗 Webhook Frota - Dados recebidos:', JSON.stringify(req.body, null, 2));

    const {
      codigo,
      dataReferencia,
      clienteNomeFantasia,
      fornecedorNomeFantasia,
      tipoServicoSolicitado,
      tipo,
      centroCusto,
      subunidade,
      // Valores detalhados (mantidos para compatibilidade)
      valorPecasSemDesconto,
      valorServicoSemDesconto,
      descontoPecasPerc,
      descontoServicoPerc,
      valorPecasComDesconto,
      valorServicoComDesconto,
      // Valores simplificados (preferidos)
      valorTotalSemDesconto,
      descontoPercentual,
      valorFinal,
      notaFiscalPeca,
      notaFiscalServico,
      notasFiscais, // Array de notas fiscais
      placa,
      veiculo,
      contrato,
      contratoEmpenhoPecas,
      empenhoPecas,
      contratoEmpenhoServicos,
      empenhoServicos,
      numeroOrdemServico,
      observacoes
    } = req.body;

    // Validações básicas
    if (!codigo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código/ID da OS é obrigatório' 
      });
    }

    // Trim nos campos de texto para evitar problemas com espaços extras
    const clienteNomeFantasiaTrimmed = clienteNomeFantasia ? clienteNomeFantasia.trim() : clienteNomeFantasia;
    const fornecedorNomeFantasiaTrimmed = fornecedorNomeFantasia ? fornecedorNomeFantasia.trim() : fornecedorNomeFantasia;

    // Array para armazenar observações de divergências
    const observacoesWebhook = [];

    // Escapar string para uso seguro em regex (previne ReDoS)
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. Buscar Cliente pelo nome fantasia (exato ou aproximado) ou nomes alternativos
    let cliente = await Cliente.findOne({ 
      nomeFantasia: { $regex: new RegExp(`^${escapeRegex(clienteNomeFantasiaTrimmed)}$`, 'i') }
    });

    // Se não encontrou exato, tenta busca parcial no nomeFantasia
    if (!cliente) {
      console.log(`⚠️  Cliente "${clienteNomeFantasiaTrimmed}" não encontrado (busca exata). Tentando busca aproximada...`);
      cliente = await Cliente.findOne({ 
        nomeFantasia: { $regex: new RegExp(escapeRegex(clienteNomeFantasiaTrimmed), 'i') }
      });
      
      if (cliente) {
        const obs = `⚠️ Divergência: Cliente no Frotas="${clienteNomeFantasiaTrimmed}" vs Portal Finance="${cliente.nomeFantasia}"`;
        observacoesWebhook.push(obs);
        console.log(obs);
      }
    } else {
      console.log(`✅ Cliente encontrado (nome exato): ${cliente.nomeFantasia} (ID: ${cliente._id})`);
    }

    // Se ainda não encontrou, tenta buscar nos nomes alternativos
    if (!cliente) {
      console.log(`⚠️  Tentando busca em nomesAlternativos...`);
      cliente = await Cliente.findOne({
        nomesAlternativos: { $regex: new RegExp(`^${escapeRegex(clienteNomeFantasiaTrimmed)}$`, 'i') }
      });
      if (!cliente) {
        cliente = await Cliente.findOne({
          nomesAlternativos: { $regex: new RegExp(escapeRegex(clienteNomeFantasiaTrimmed), 'i') }
        });
      }
      if (cliente) {
        const obs = `⚠️ Divergência: Cliente no Frotas="${clienteNomeFantasiaTrimmed}" vs Portal Finance="${cliente.nomeFantasia}" (encontrado via nome alternativo)`;
        observacoesWebhook.push(obs);
        console.log(obs);
      }
    }

    // Se ainda não encontrou, tenta buscar pela razão social
    if (!cliente) {
      console.log(`⚠️  Tentando busca pela razão social...`);
      cliente = await Cliente.findOne({
        razaoSocial: { $regex: new RegExp(escapeRegex(clienteNomeFantasiaTrimmed), 'i') }
      });
      if (cliente) {
        const obs = `⚠️ Divergência: Cliente no Frotas="${clienteNomeFantasiaTrimmed}" vs Portal Finance razaoSocial="${cliente.razaoSocial}"`;
        observacoesWebhook.push(obs);
        console.log(obs);
      }
    }

    if (!cliente) {
        console.log(`❌ Cliente "${clienteNomeFantasiaTrimmed}" não encontrado mesmo com busca aproximada.`);
        return res.status(404).json({ 
          success: false, 
          message: `Cliente "${clienteNomeFantasiaTrimmed}" não encontrado no Portal Finance. Verifique o cadastro ou nome fantasia.`,
          campo: 'clienteNomeFantasia'
        });
    }

    // 2. Buscar Fornecedor pelo nome fantasia (exato ou aproximado)
    let fornecedor = await Fornecedor.findOne({ 
      nomeFantasia: { $regex: new RegExp(`^${escapeRegex(fornecedorNomeFantasiaTrimmed)}$`, 'i') }
    });

    // Se não encontrou exato, tenta busca parcial
    if (!fornecedor) {
      console.log(`⚠️  Fornecedor "${fornecedorNomeFantasiaTrimmed}" não encontrado (busca exata). Tentando busca aproximada...`);
      fornecedor = await Fornecedor.findOne({ 
        nomeFantasia: { $regex: new RegExp(escapeRegex(fornecedorNomeFantasiaTrimmed), 'i') }
      });
      
      if (fornecedor) {
        const obs = `⚠️ Divergência: Fornecedor no Frotas="${fornecedorNomeFantasiaTrimmed}" vs Portal Finance="${fornecedor.nomeFantasia}"`;
        observacoesWebhook.push(obs);
        console.log(obs);
      } else {
        console.log(`❌ Fornecedor "${fornecedorNomeFantasiaTrimmed}" não encontrado mesmo com busca aproximada.`);
        return res.status(404).json({ 
          success: false, 
          message: `Fornecedor "${fornecedorNomeFantasiaTrimmed}" não encontrado no Portal Finance. Verifique o cadastro ou nome fantasia.`,
          campo: 'fornecedorNomeFantasia'
        });
      }
    } else {
      console.log(`✅ Fornecedor encontrado (nome exato): ${fornecedor.nomeFantasia} (ID: ${fornecedor._id})`);
    }


    // 3. Buscar ou criar Tipo de Serviço Solicitado
    let tipoServicoSolicitadoDoc = await TipoServicoSolicitado.findOne({ 
      nome: { $regex: new RegExp(`^${tipoServicoSolicitado}$`, 'i') }
    });

    if (!tipoServicoSolicitadoDoc) {
      console.log(`⚠️  Tipo de Serviço Solicitado "${tipoServicoSolicitado}" não encontrado. Criando...`);
      tipoServicoSolicitadoDoc = new TipoServicoSolicitado({
        nome: tipoServicoSolicitado,
        ativo: true
      });
      await tipoServicoSolicitadoDoc.save();
      console.log(`✅ Tipo Serviço Solicitado criado com ID: ${tipoServicoSolicitadoDoc._id}`);
    }

    // 4. Buscar ou criar Tipo
    let tipoDoc = await Tipo.findOne({ 
      nome: { $regex: new RegExp(`^${tipo}$`, 'i') }
    });

    if (!tipoDoc) {
      console.log(`⚠️  Tipo "${tipo}" não encontrado. Criando...`);
      tipoDoc = new Tipo({
        nome: tipo,
        ativo: true
      });
      await tipoDoc.save();
      console.log(`✅ Tipo criado com ID: ${tipoDoc._id}`);
    }

    // 5. Verificar se já existe OS com este código
    const osExistente = await OrdemServico.findOne({ codigo });
    if (osExistente) {
      console.log(`⚠️  OS com código ${codigo} já existe. Retornando existente.`);
      return res.status(200).json({ 
        success: true, 
        message: 'OS já cadastrada anteriormente',
        ordemServico: osExistente,
        duplicada: true
      });
    }

    // 6. Auto-criar Centro de Custo e Subunidade se não existirem
    if (centroCusto) {
      const clienteCompleto = await Cliente.findById(cliente._id);
      let centroCustoObj = clienteCompleto.centrosCusto?.find(cc => cc.nome === centroCusto);
      
      if (!centroCustoObj) {
        console.log(`📍 Centro de Custo "${centroCusto}" não existe. Criando automaticamente...`);
        clienteCompleto.centrosCusto.push({ nome: centroCusto, subunidades: [] });
        await clienteCompleto.save();
        centroCustoObj = clienteCompleto.centrosCusto[clienteCompleto.centrosCusto.length - 1];
        observacoesWebhook.push(`[AUTO-CRIADO] Centro de Custo: ${centroCusto}`);
        console.log(`✅ Centro de Custo "${centroCusto}" criado automaticamente`);
      }
      
      // Auto-criar Subunidade se vier e não existir
      if (subunidade && centroCustoObj) {
        const subunidadeExiste = centroCustoObj.subunidades?.some(sub => sub.nome === subunidade);
        if (!subunidadeExiste) {
          console.log(`📍 Subunidade "${subunidade}" não existe. Criando automaticamente...`);
          centroCustoObj.subunidades.push({ nome: subunidade });
          await clienteCompleto.save();
          observacoesWebhook.push(`[AUTO-CRIADO] Subunidade: ${subunidade}`);
          console.log(`✅ Subunidade "${subunidade}" criada automaticamente`);
        }
      }
    }

    // 7. Validar e consumir saldo dos empenhos
    const valorPecasFinal = valorPecasComDesconto ?? (valorPecasSemDesconto || 0);
    const valorServicosFinal = valorServicoComDesconto ?? (valorServicoSemDesconto || 0);
    
    if (empenhoPecas && valorPecasFinal > 0) {
      const clienteCompleto = await Cliente.findById(cliente._id);
      let empenhoEncontrado = null;
      let contratoEncontrado = null;
      
      // Buscar empenho em todos os contratos
      for (const contrato of clienteCompleto.contratos || []) {
        const empenho = contrato.empenhos?.find(e => e.numeroEmpenho === empenhoPecas && e.ativo);
        if (empenho) {
          empenhoEncontrado = empenho;
          contratoEncontrado = contrato;
          break;
        }
      }
      
      if (empenhoEncontrado) {
        const valorDisponivel = empenhoEncontrado.valor - empenhoEncontrado.valorAnulado - empenhoEncontrado.valorUtilizado;
        
        if (valorPecasFinal > valorDisponivel) {
          console.log(`⚠️  Saldo insuficiente no empenho ${empenhoPecas}. Disponível: R$ ${valorDisponivel.toFixed(2)}, Necessário: R$ ${valorPecasFinal.toFixed(2)}`);
          observacoesWebhook.push(`[AVISO] Empenho de peças ${empenhoPecas}: Saldo insuficiente (Disponível: R$ ${valorDisponivel.toFixed(2)}, Usado: R$ ${valorPecasFinal.toFixed(2)})`);
        } else {
          // Consumir saldo do empenho
          empenhoEncontrado.valorUtilizado += valorPecasFinal;
          await clienteCompleto.save();
          console.log(`💰 Empenho ${empenhoPecas}: Consumido R$ ${valorPecasFinal.toFixed(2)}, Saldo restante: R$ ${(valorDisponivel - valorPecasFinal).toFixed(2)}`);
          observacoesWebhook.push(`[EMPENHO] Peças: ${empenhoPecas} - Consumido: R$ ${valorPecasFinal.toFixed(2)}`);
        }      } else {
        console.log(`⚠️  Empenho de peças "${empenhoPecas}" não encontrado ou inativo. OS será criada sem validação de saldo.`);
        observacoesWebhook.push(`[AVISO] Empenho de peças ${empenhoPecas} não encontrado no sistema`);
      }
    }
    
    if (empenhoServicos && valorServicosFinal > 0) {
      const clienteCompleto = await Cliente.findById(cliente._id);
      let empenhoEncontrado = null;
      let contratoEncontrado = null;
      
      // Buscar empenho em todos os contratos
      for (const contrato of clienteCompleto.contratos || []) {
        const empenho = contrato.empenhos?.find(e => e.numeroEmpenho === empenhoServicos && e.ativo);
        if (empenho) {
          empenhoEncontrado = empenho;
          contratoEncontrado = contrato;
          break;
        }
      }
      
      if (empenhoEncontrado) {
        const valorDisponivel = empenhoEncontrado.valor - empenhoEncontrado.valorAnulado - empenhoEncontrado.valorUtilizado;
        
        if (valorServicosFinal > valorDisponivel) {
          console.log(`⚠️  Saldo insuficiente no empenho ${empenhoServicos}. Disponível: R$ ${valorDisponivel.toFixed(2)}, Necessário: R$ ${valorServicosFinal.toFixed(2)}`);
          observacoesWebhook.push(`[AVISO] Empenho de serviços ${empenhoServicos}: Saldo insuficiente (Disponível: R$ ${valorDisponivel.toFixed(2)}, Usado: R$ ${valorServicosFinal.toFixed(2)})`);
        } else {
          // Consumir saldo do empenho
          empenhoEncontrado.valorUtilizado += valorServicosFinal;
          await clienteCompleto.save();
          console.log(`💰 Empenho ${empenhoServicos}: Consumido R$ ${valorServicosFinal.toFixed(2)}, Saldo restante: R$ ${(valorDisponivel - valorServicosFinal).toFixed(2)}`);
          observacoesWebhook.push(`[EMPENHO] Serviços: ${empenhoServicos} - Consumido: R$ ${valorServicosFinal.toFixed(2)}`);
        }      } else {
        console.log(`⚠️  Empenho de serviços "${empenhoServicos}" não encontrado ou inativo. OS será criada sem validação de saldo.`);
        observacoesWebhook.push(`[AVISO] Empenho de serviços ${empenhoServicos} não encontrado no sistema`);
      }
    }

    // 8. Calcular valores (com fallback caso não venham calculados)
    // Arredondamento correto para evitar diferenças de centavos
    const valorPecasCalc = valorPecasComDesconto ?? (
      valorPecasSemDesconto ? Math.round(valorPecasSemDesconto * (1 - (descontoPercentual || 0) / 100) * 100) / 100 : 0
    );
    
    const valorServicoCalc = valorServicoComDesconto ?? (
      valorServicoSemDesconto ? Math.round(valorServicoSemDesconto * (1 - (descontoPercentual || 0) / 100) * 100) / 100 : 0
    );

    // 9. Processar notas fiscais do array (se vier)
    let nfPecas = notaFiscalPeca || '';
    let nfServicos = notaFiscalServico || '';
    
    if (notasFiscais && Array.isArray(notasFiscais) && notasFiscais.length > 0) {
      // Separar notas por tipo
      const nfPecasArray = notasFiscais.filter(nf => 
        nf.tipo && (nf.tipo.toLowerCase().includes('peça') || nf.tipo.toLowerCase().includes('peca'))
      );
      const nfServicosArray = notasFiscais.filter(nf => 
        nf.tipo && nf.tipo.toLowerCase().includes('servi')
      );
      
      // Extrair números das notas
      if (nfPecasArray.length > 0) {
        nfPecas = nfPecasArray.map(nf => nf.numero).join(', ');
        console.log(`📄 Notas Fiscais de Peças: ${nfPecas}`);
      }
      
      if (nfServicosArray.length > 0) {
        nfServicos = nfServicosArray.map(nf => nf.numero).join(', ');
        console.log(`📄 Notas Fiscais de Serviços: ${nfServicos}`);
      }
    }

    // 10. Preparar observações (incluir as do webhook + observações originais)
    let observacoesFinais = observacoes || '';
    if (observacoesWebhook.length > 0) {
      const divergencias = '\n[WEBHOOK] ' + observacoesWebhook.join('\n[WEBHOOK] ');
      observacoesFinais = observacoesFinais ? observacoesFinais + divergencias : divergencias.trim();
    }

    // 11. Criar Ordem de Serviço
    const ordemServico = new OrdemServico({
      codigo: codigo,
      numeroOrdemServico: numeroOrdemServico || codigo,
      dataReferencia: dataReferencia ? new Date(dataReferencia) : new Date(),
      cliente: cliente._id,
      fornecedor: fornecedor._id,
      tipoServicoSolicitado: tipoServicoSolicitadoDoc._id,
      tipo: tipoDoc._id,
      centroCusto: centroCusto || 'N/A',
      subunidade: subunidade || '',
      placa: placa || '',
      veiculo: veiculo || '',
      contrato: contrato || '',
      contratoEmpenhoPecas: contratoEmpenhoPecas || '',
      empenhoPecas: empenhoPecas || '',
      contratoEmpenhoServicos: contratoEmpenhoServicos || '',
      empenhoServicos: empenhoServicos || '',
      // Valores detalhados (mantidos para compatibilidade)
      valorPecas: valorPecasSemDesconto || 0,
      valorServico: valorServicoSemDesconto || 0,
      descontoPecasPerc: descontoPecasPerc !== undefined ? descontoPecasPerc : 0,
      descontoServicoPerc: descontoServicoPerc !== undefined ? descontoServicoPerc : 0,
      valorPecasComDesconto: valorPecasComDesconto || 0,
      valorServicoComDesconto: valorServicoComDesconto || 0,
      // Valores simplificados (preferidos)
      valorTotalSemDesconto: valorTotalSemDesconto || (valorPecasSemDesconto || 0) + (valorServicoSemDesconto || 0),
      descontoPercentual: descontoPercentual || 0,
      valorFinal: valorFinal !== undefined ? valorFinal : Math.round((valorPecasCalc + valorServicoCalc) * 100) / 100,
      notaFiscalPeca: nfPecas,
      notaFiscalServico: nfServicos,
      observacoes: observacoesFinais,
      status: 'Autorizada' // Sempre autorizada quando vem do webhook
    });

    await ordemServico.save();
    console.log(`✅ OS criada com sucesso! Código: ${ordemServico.codigo}, ID: ${ordemServico._id}`);

    // Retornar com populate para logs
    const osPopulada = await OrdemServico.findById(ordemServico._id)
      .populate('cliente', 'razaoSocial nomeFantasia')
      .populate('fornecedor', 'razaoSocial nomeFantasia')
      .populate('tipoServicoSolicitado', 'nome')
      .populate('tipo', 'nome');

    res.status(201).json({ 
      success: true, 
      message: 'OS cadastrada com sucesso via webhook',
      ordemServico: osPopulada,
      divergencias: observacoesWebhook.length > 0 ? observacoesWebhook : undefined
    });

  } catch (error) {
    console.error('❌ Erro no webhook de frota:', error);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      message: 'Erro ao processar OS do sistema de frotas',
      error: error.message,
      details: error.errors
    });
  }
};

/**
 * Endpoint de teste para validar conexão
 */
exports.testeConexao = async (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Webhook de integração com sistema de frotas está ativo',
    timestamp: new Date().toISOString()
  });
};
