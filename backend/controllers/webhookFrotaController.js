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
      valorPecasSemDesconto,
      valorServicoSemDesconto,
      descontoPercentual,
      valorPecasComDesconto,
      valorServicoComDesconto,
      notaFiscalPeca,
      notaFiscalServico,
      placa,
      veiculo,
      contrato,
      numeroOrdemServico
    } = req.body;

    // Validações básicas
    if (!codigo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Código/ID da OS é obrigatório' 
      });
    }

    // Array para armazenar observações de divergências
    const observacoesWebhook = [];

    // 1. Buscar Cliente pelo nome fantasia (exato ou aproximado)
    let cliente = await Cliente.findOne({ 
      nomeFantasia: { $regex: new RegExp(`^${clienteNomeFantasia}$`, 'i') }
    });

    // Se não encontrou exato, tenta busca parcial
    if (!cliente) {
      console.log(`⚠️  Cliente "${clienteNomeFantasia}" não encontrado (busca exata). Tentando busca aproximada...`);
      cliente = await Cliente.findOne({ 
        nomeFantasia: { $regex: new RegExp(clienteNomeFantasia, 'i') }
      });
      
      if (cliente) {
        const obs = `⚠️ Divergência: Cliente no Frotas="${clienteNomeFantasia}" vs Portal Finance="${cliente.nomeFantasia}"`;
        observacoesWebhook.push(obs);
        console.log(obs);
      } else {
        console.log(`❌ Cliente "${clienteNomeFantasia}" não encontrado mesmo com busca aproximada.`);
        return res.status(404).json({ 
          success: false, 
          message: `Cliente "${clienteNomeFantasia}" não encontrado no Portal Finance. Verifique o cadastro ou nome fantasia.`,
          campo: 'clienteNomeFantasia'
        });
      }
    } else {
      console.log(`✅ Cliente encontrado (nome exato): ${cliente.nomeFantasia} (ID: ${cliente._id})`);
    }

    // 2. Buscar Fornecedor pelo nome fantasia (exato ou aproximado)
    let fornecedor = await Fornecedor.findOne({ 
      nomeFantasia: { $regex: new RegExp(`^${fornecedorNomeFantasia}$`, 'i') }
    });

    // Se não encontrou exato, tenta busca parcial
    if (!fornecedor) {
      console.log(`⚠️  Fornecedor "${fornecedorNomeFantasia}" não encontrado (busca exata). Tentando busca aproximada...`);
      fornecedor = await Fornecedor.findOne({ 
        nomeFantasia: { $regex: new RegExp(fornecedorNomeFantasia, 'i') }
      });
      
      if (fornecedor) {
        const obs = `⚠️ Divergência: Fornecedor no Frotas="${fornecedorNomeFantasia}" vs Portal Finance="${fornecedor.nomeFantasia}"`;
        observacoesWebhook.push(obs);
        console.log(obs);
      } else {
        console.log(`❌ Fornecedor "${fornecedorNomeFantasia}" não encontrado mesmo com busca aproximada.`);
        return res.status(404).json({ 
          success: false, 
          message: `Fornecedor "${fornecedorNomeFantasia}" não encontrado no Portal Finance. Verifique o cadastro ou nome fantasia.`,
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

    // 6. Calcular valores (com fallback caso não venham calculados)
    const valorPecasCalc = valorPecasComDesconto ?? (
      valorPecasSemDesconto ? valorPecasSemDesconto * (1 - (descontoPercentual || 0) / 100) : 0
    );
    
    const valorServicoCalc = valorServicoComDesconto ?? (
      valorServicoSemDesconto ? valorServicoSemDesconto * (1 - (descontoPercentual || 0) / 100) : 0
    );

    // 7. Preparar observações (incluir as do webhook + observações originais)
    let observacoesFinais = observacoes || '';
    if (observacoesWebhook.length > 0) {
      const divergencias = '\n[WEBHOOK] ' + observacoesWebhook.join('\n[WEBHOOK] ');
      observacoesFinais = observacoesFinais ? observacoesFinais + divergencias : divergencias.trim();
    }

    // 8. Criar Ordem de Serviço
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
      valorPecas: valorPecasSemDesconto || 0,
      valorServico: valorServicoSemDesconto || 0,
      descontoPecasPerc: descontoPercentual || 0,
      descontoServicoPerc: descontoPercentual || 0,
      valorPecasComDesconto: valorPecasCalc,
      valorServicoComDesconto: valorServicoCalc,
      valorFinal: valorPecasCalc + valorServicoCalc,
      notaFiscalPeca: notaFiscalPeca || '',
      notaFiscalServico: notaFiscalServico || '',
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
