const OrdemServico = require('../models/OrdemServico');
const Cliente = require('../models/Cliente');
const Fornecedor = require('../models/Fornecedor');
const { Tipo, TipoServicoSolicitado } = require('../models/TipoServico');

/**
 * Importação em lote de Ordens de Serviço
 * Para importar OS anteriores à integração com o sistema de frotas
 */
exports.importarOrdensServico = async (req, res) => {
  try {
    console.log('📦 Iniciando importação em lote de OS...');
    const { ordensServico } = req.body;

    if (!ordensServico || !Array.isArray(ordensServico) || ordensServico.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'É necessário enviar um array de ordens de serviço'
      });
    }

    const resultados = {
      sucesso: [],
      erros: [],
      total: ordensServico.length
    };

    // Processar cada OS
    for (let i = 0; i < ordensServico.length; i++) {
      const os = ordensServico[i];
      const linha = i + 2; // +2 porque linha 1 é o cabeçalho e array começa em 0

      try {
        console.log(`\n📋 Processando OS ${linha}/${ordensServico.length + 1}: ${os.numeroOrdemServico}`);

        // Validações básicas
        if (!os.numeroOrdemServico) {
          throw new Error('Número da Ordem de Serviço é obrigatório');
        }
        if (!os.dataReferencia) {
          throw new Error('Data de Referência é obrigatória');
        }
        if (!os.clienteNome) {
          throw new Error('Cliente é obrigatório');
        }
        if (!os.fornecedorNome) {
          throw new Error('Fornecedor é obrigatório');
        }
        if (!os.tipoServicoSolicitado) {
          throw new Error('Tipo de Serviço Solicitado é obrigatório');
        }
        if (!os.tipo) {
          throw new Error('Tipo é obrigatório');
        }
        if (!os.centroCusto) {
          throw new Error('Centro de Custo é obrigatório');
        }

        // Verificar se OS já existe
        const osExistente = await OrdemServico.findOne({ 
          numeroOrdemServico: os.numeroOrdemServico 
        });
        
        if (osExistente) {
          throw new Error(`OS já cadastrada: ${os.numeroOrdemServico}`);
        }

        // 1. Buscar Cliente (validação rigorosa)
        console.log(`🔍 Buscando cliente: "${os.clienteNome}"`);
        
        let cliente = await Cliente.findOne({ 
          $or: [
            { razaoSocial: { $regex: new RegExp(`^${os.clienteNome.trim()}$`, 'i') } },
            { nomeFantasia: { $regex: new RegExp(`^${os.clienteNome.trim()}$`, 'i') } }
          ]
        });

        if (!cliente) {
          // Tentar busca parcial como fallback
          cliente = await Cliente.findOne({ 
            $or: [
              { razaoSocial: { $regex: new RegExp(os.clienteNome.trim(), 'i') } },
              { nomeFantasia: { $regex: new RegExp(os.clienteNome.trim(), 'i') } }
            ]
          });
          
          if (!cliente) {
            throw new Error(`Cliente "${os.clienteNome}" não encontrado no sistema. Cadastre o cliente antes de importar.`);
          }
          
          console.log(`⚠️  Cliente encontrado com nome aproximado: "${cliente.nomeFantasia}"`);
        } else {
          console.log(`✅ Cliente encontrado: "${cliente.nomeFantasia}" (ID: ${cliente._id})`);
        }

        // 2. Buscar Fornecedor (validação rigorosa)
        console.log(`🔍 Buscando fornecedor: "${os.fornecedorNome}"`);
        
        let fornecedor = await Fornecedor.findOne({ 
          $or: [
            { razaoSocial: { $regex: new RegExp(`^${os.fornecedorNome.trim()}$`, 'i') } },
            { nomeFantasia: { $regex: new RegExp(`^${os.fornecedorNome.trim()}$`, 'i') } }
          ]
        });

        if (!fornecedor) {
          // Tentar busca parcial como fallback
          fornecedor = await Fornecedor.findOne({ 
            $or: [
              { razaoSocial: { $regex: new RegExp(os.fornecedorNome.trim(), 'i') } },
              { nomeFantasia: { $regex: new RegExp(os.fornecedorNome.trim(), 'i') } }
            ]
          });
          
          if (!fornecedor) {
            throw new Error(`Fornecedor "${os.fornecedorNome}" não encontrado no sistema. Cadastre o fornecedor antes de importar.`);
          }
          
          console.log(`⚠️  Fornecedor encontrado com nome aproximado: "${fornecedor.nomeFantasia}"`);
        } else {
          console.log(`✅ Fornecedor encontrado: "${fornecedor.nomeFantasia}" (ID: ${fornecedor._id})`);
        }

        // 3. Buscar ou criar Tipo de Serviço Solicitado
        let tipoServicoSolicitadoObj = await TipoServicoSolicitado.findOne({
          nome: { $regex: new RegExp(`^${os.tipoServicoSolicitado}$`, 'i') }
        });

        if (!tipoServicoSolicitadoObj) {
          tipoServicoSolicitadoObj = new TipoServicoSolicitado({ 
            nome: os.tipoServicoSolicitado 
          });
          await tipoServicoSolicitadoObj.save();
          console.log(`✅ Tipo de Serviço Solicitado criado: ${os.tipoServicoSolicitado}`);
        }

        // 4. Buscar ou criar Tipo
        let tipoObj = await Tipo.findOne({
          nome: { $regex: new RegExp(`^${os.tipo}$`, 'i') }
        });

        if (!tipoObj) {
          tipoObj = new Tipo({ nome: os.tipo });
          await tipoObj.save();
          console.log(`✅ Tipo criado: ${os.tipo}`);
        }

        // 5. Verificar/criar Centro de Custo no cliente
        console.log(`🔍 Verificando centro de custo: "${os.centroCusto}" no cliente ${cliente.nomeFantasia}`);
        
        let centroCusto = cliente.centrosCusto.find(cc => 
          cc.nome.toLowerCase().trim() === os.centroCusto.toLowerCase().trim()
        );

        if (!centroCusto) {
          console.log(`⚠️  Centro de Custo "${os.centroCusto}" não existe, criando...`);
          cliente.centrosCusto.push({ nome: os.centroCusto.trim(), subunidades: [] });
          await cliente.save();
          console.log(`✅ Centro de Custo criado: ${os.centroCusto}`);
          
          // Recarregar cliente
          cliente = await Cliente.findById(cliente._id);
          centroCusto = cliente.centrosCusto.find(cc => 
            cc.nome.toLowerCase().trim() === os.centroCusto.toLowerCase().trim()
          );
        } else {
          console.log(`✅ Centro de Custo já existe: ${centroCusto.nome}`);
        }

        // 6. Verificar/criar Subunidade se informada
        if (os.subunidade && os.subunidade.trim()) {
          console.log(`🔍 Verificando subunidade: "${os.subunidade}"`);
          
          if (!centroCusto.subunidades) {
            centroCusto.subunidades = [];
          }
          
          const subunidadeExiste = centroCusto.subunidades.some(sub => 
            sub.toLowerCase().trim() === os.subunidade.toLowerCase().trim()
          );

          if (!subunidadeExiste) {
            console.log(`⚠️  Subunidade "${os.subunidade}" não existe, criando...`);
            centroCusto.subunidades.push(os.subunidade.trim());
            await cliente.save();
            console.log(`✅ Subunidade criada: ${os.subunidade}`);
          } else {
            console.log(`✅ Subunidade já existe`);
          }
        }

        // 7. Calcular valores com desconto
        const valorPecas = parseFloat(os.valorPecas || 0);
        const valorServico = parseFloat(os.valorServico || 0);
        
        // Pegar desconto do cliente (ou usar 0 se não tiver)
        const descontoPecasPerc = cliente.descontoPecas || 0;
        const descontoServicoPerc = cliente.descontoServicos || 0;

        const valorPecasComDesconto = valorPecas - (valorPecas * descontoPecasPerc / 100);
        const valorServicoComDesconto = valorServico - (valorServico * descontoServicoPerc / 100);
        const valorFinal = valorPecasComDesconto + valorServicoComDesconto;

        // 8. Criar OS
        const novaOS = new OrdemServico({
          numeroOrdemServico: os.numeroOrdemServico,
          dataReferencia: os.dataReferencia,
          cliente: cliente._id,
          fornecedor: fornecedor._id,
          tipoServicoSolicitado: tipoServicoSolicitadoObj._id,
          tipo: tipoObj._id,
          centroCusto: os.centroCusto,
          subunidade: os.subunidade || '',
          placa: os.placa || '',
          veiculo: os.veiculo || '',
          valorPecas: valorPecas,
          valorServico: valorServico,
          descontoPecasPerc: descontoPecasPerc,
          descontoServicoPerc: descontoServicoPerc,
          valorPecasComDesconto: valorPecasComDesconto,
          valorServicoComDesconto: valorServicoComDesconto,
          valorFinal: valorFinal,
          notaFiscalPeca: os.notaFiscalPeca || '',
          notaFiscalServico: os.notaFiscalServico || '',
          status: 'Autorizada',
          observacoes: '[IMPORTAÇÃO] OS importada em lote'
        });

        await novaOS.save();
        
        console.log(`✅ OS criada com sucesso: ${novaOS.codigo}`);
        
        resultados.sucesso.push({
          linha,
          numeroOrdemServico: os.numeroOrdemServico,
          codigo: novaOS.codigo,
          cliente: cliente.nomeFantasia,
          fornecedor: fornecedor.nomeFantasia,
          valorFinal: valorFinal.toFixed(2)
        });

      } catch (error) {
        console.error(`❌ Erro na linha ${linha}:`, error.message);
        resultados.erros.push({
          linha,
          numeroOrdemServico: os.numeroOrdemServico || 'N/A',
          erro: error.message
        });
      }
    }

    // Resposta final
    console.log(`\n📊 Resumo da importação:`);
    console.log(`   ✅ Sucessos: ${resultados.sucesso.length}`);
    console.log(`   ❌ Erros: ${resultados.erros.length}`);
    console.log(`   📦 Total: ${resultados.total}`);
    
    const mensagem = resultados.erros.length === 0
      ? `✅ Todas as ${resultados.sucesso.length} OS foram importadas com sucesso!`
      : `⚠️ Importação concluída: ${resultados.sucesso.length} sucesso, ${resultados.erros.length} erro(s)`;

    res.status(resultados.erros.length === 0 ? 201 : 207).json({
      success: true,
      message: mensagem,
      resultados
    });

  } catch (error) {
    console.error('❌ Erro na importação em lote:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar importação',
      error: error.message
    });
  }
};


/**
 * Importação em lote de Ordens de Serviço
 * Para importar OS anteriores à integração com o sistema de frotas
 */
exports.importarOrdensServico = async (req, res) => {
  try {
    console.log('📦 Iniciando importação em lote de OS...');
    const { ordensServico } = req.body;

    if (!ordensServico || !Array.isArray(ordensServico) || ordensServico.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'É necessário enviar um array de ordens de serviço'
      });
    }

    const resultados = {
      sucesso: [],
      erros: [],
      total: ordensServico.length
    };

    // Processar cada OS
    for (let i = 0; i < ordensServico.length; i++) {
      const os = ordensServico[i];
      const linha = i + 2; // +2 porque linha 1 é o cabeçalho e array começa em 0

      try {
        console.log(`\n📋 Processando OS ${linha}/${ordensServico.length + 1}: ${os.numeroOrdemServico}`);

        // Validações básicas
        if (!os.numeroOrdemServico) {
          throw new Error('Número da Ordem de Serviço é obrigatório');
        }
        if (!os.dataReferencia) {
          throw new Error('Data de Referência é obrigatória');
        }
        if (!os.clienteNome) {
          throw new Error('Cliente é obrigatório');
        }
        if (!os.fornecedorNome) {
          throw new Error('Fornecedor é obrigatório');
        }
        if (!os.tipoServicoSolicitado) {
          throw new Error('Tipo de Serviço Solicitado é obrigatório');
        }
        if (!os.tipo) {
          throw new Error('Tipo é obrigatório');
        }
        if (!os.centroCusto) {
          throw new Error('Centro de Custo é obrigatório');
        }

        // Verificar se OS já existe
        const osExistente = await OrdemServico.findOne({ 
          numeroOrdemServico: os.numeroOrdemServico 
        });
        
        if (osExistente) {
          throw new Error(`OS já cadastrada: ${os.numeroOrdemServico}`);
        }

        // 1. Buscar Cliente (validação rigorosa)
        console.log(`🔍 Buscando cliente: "${os.clienteNome}"`);
        
        let cliente = await Cliente.findOne({ 
          $or: [
            { razaoSocial: { $regex: new RegExp(`^${os.clienteNome.trim()}$`, 'i') } },
            { nomeFantasia: { $regex: new RegExp(`^${os.clienteNome.trim()}$`, 'i') } }
          ]
        });

        if (!cliente) {
          // Tentar busca parcial como fallback
          cliente = await Cliente.findOne({ 
            $or: [
              { razaoSocial: { $regex: new RegExp(os.clienteNome.trim(), 'i') } },
              { nomeFantasia: { $regex: new RegExp(os.clienteNome.trim(), 'i') } }
            ]
          });
          
          if (!cliente) {
            throw new Error(`Cliente "${os.clienteNome}" não encontrado no sistema. Cadastre o cliente antes de importar.`);
          }
          
          console.log(`⚠️  Cliente encontrado com nome aproximado: "${cliente.nomeFantasia}"`);
        } else {
          console.log(`✅ Cliente encontrado: "${cliente.nomeFantasia}" (ID: ${cliente._id})`);
        }

        // 2. Buscar Fornecedor (validação rigorosa)
        console.log(`🔍 Buscando fornecedor: "${os.fornecedorNome}"`);
        
        let fornecedor = await Fornecedor.findOne({ 
          $or: [
            { razaoSocial: { $regex: new RegExp(`^${os.fornecedorNome.trim()}$`, 'i') } },
            { nomeFantasia: { $regex: new RegExp(`^${os.fornecedorNome.trim()}$`, 'i') } }
          ]
        });

        if (!fornecedor) {
          // Tentar busca parcial como fallback
          fornecedor = await Fornecedor.findOne({ 
            $or: [
              { razaoSocial: { $regex: new RegExp(os.fornecedorNome.trim(), 'i') } },
              { nomeFantasia: { $regex: new RegExp(os.fornecedorNome.trim(), 'i') } }
            ]
          });
          
          if (!fornecedor) {
            throw new E/criar Centro de Custo no cliente
        console.log(`🔍 Verificando centro de custo: "${os.centroCusto}" no cliente ${cliente.nomeFantasia}`);
        
        let centroCusto = cliente.centrosCusto.find(cc => 
          cc.nome.toLowerCase().trim() === os.centroCusto.toLowerCase().trim()
        );

        if (!centroCusto) {
          console.log(`⚠️  Centro de Custo "${os.centroCusto}" não existe, criando...`);
          cliente.centrosCusto.push({ nome: os.centroCusto.trim(), subunidades: [] });
          await cliente.save();
          console.log(`✅ Centro de Custo criado: ${os.centroCusto}`);
          
          // Recarregar cliente
          cliente = await Cliente.findById(cliente._id);
          centroCusto = cliente.centrosCusto.find(cc => 
            cc.nome.toLowerCase().trim() === os.centroCusto.toLowerCase().trim()
          );
        } else {
          console.log(`✅ Centro de Custo já existe: ${centroCusto.nome}`  nome: os.tipoServicoSolicitado 
          });
          await tipoServicoSolicitadoObj.save();
          console.log(`✅ Tipo de Serviço Solicitado criado: ${os.tipoServicoSolicitado}`);
        }

        // 4. Buscar ou criar Tipo
        let tipoObj = await Tipo.findOne({
          nome: { $regex: new RegExp(`^${os.tipo}$`, 'i') }
        });

        if (!tipoObj) {
          tipoObj = new Tipo({ nome: os.tipo });
          await tipoObj.save();
          console.log(`✅ Tipo criado: ${os.tipo}`);
        }

        // 5. Verificar se Centro de Custo existe no cliente
        let centroCusto = cliente.centrosCusto.find(cc => 
          cc.nome.toLowerCase() === os.centroCusto.toLowerCase()
        );

        if (!centroCusto) {
          // Criar centro de custo
          cliente.centrosCusto.push({ nome: os.centroCusto });
          await cliente.save();
          console.log(`✅ Centro de Custo criado: ${os.centroCusto}`);
          
          // Recarregar cliente
          cliente = await Cliente.findById(cliente._id);
          centroCusto = cliente.centrosCusto.find(cc => 
            cc.nome.toLowerCase() === os.centroCusto.toLowerCase()
          );
        }ole.log(`🔍 Verificando subunidade: "${os.subunidade}"`);
          
          if (!centroCusto.subunidades) {
            centroCusto.subunidades = [];
          }
          
          const subunidadeExiste = centroCusto.subunidades.some(sub => 
            sub.toLowerCase().trim() === os.subunidade.toLowerCase().trim()
          );

          if (!subunidadeExiste) {
            console.log(`⚠️  Subunidade "${os.subunidade}" não existe, criando...`);
            centroCusto.subunidades.push(os.subunidade.trim());
            await cliente.save();
            console.log(`✅ Subunidade criada: ${os.subunidade}`);
          } else {
            console.log(`✅ Subunidade já existe
          if (!subunidadeExiste) {
            centroCusto.subunidades.push(os.subunidade);
            await cliente.save();
            console.log(`✅ Subunidade criada: ${os.subunidade}`);
          }
        }

        // 7. Calcular valores com desconto
        const valorPecas = parseFloat(os.valorPecas || 0);
        const valorServico = parseFloat(os.valorServico || 0);
        
        // Pegar desconto do cliente (ou usar 0 se não tiver)
        const descontoPecasPerc = cliente.descontoPecas || 0;
        const descontoServicoPerc = cliente.descontoServicos || 0;

        const valorPecasComDesconto = valorPecas - (valorPecas * descontoPecasPerc / 100);
        const valorServicoComDesconto = valorServico - (valorServico * descontoServicoPerc / 100);
        const valorFinal = valorPecasComDesconto + valorServicoComDesconto;

        // 8. Criar OS
        const novaOS = new OrdemServico({
          numeroOrdemServico: os.numeroOrdemServico,
          dataReferencia: os.dataReferencia,
          cliente: cliente._id,
          fornecedor: fornecedor._id,
          tipoServicoSolicitado: tipoServicoSolicitadoObj._id,
          tipo: tipoObj._id,
          centroCusto: os.centroCusto,
          subunidade: os.subunidade || '',
          placa: os.placa || '',
          veiculo: os.veiculo || '',
          valorPecas: valorPecas,
          valorServico: valorServico,
          descontoPecasPerc: descontoPecasPerc,
          descontoServicoPerc: descontoServicoPerc,
          valorPecasComDesconto: valorPecasComDesconto,
          valorServicoComDesconto: valorServicoComDesconto,
          valorFinal: valorFinal,
          notaFiscalPeca: os.notaFiscalPeca || '',
          notaFiscalServico: os.notaFiscalServico || '',
          status: 'Autorizada',
          observacoes: '[IMPORTAÇÃO] OS importada em lote'
        });

        await novaOS.save();
        
        console.log(`✅ OS criada com sucesso: ${novaOS.codigo}`);
        
        resultados.sucesso.push({
          linha,
          numeroOrdemServico: os.numeroOrdemServico,
          codigo: novaOS.codigo,
          cliente: cliente.nomeFantasia,
          fornecedor: fornecedor.nomeFantasia,
          valorFinal: valorFinal.toFixed(2)
        ole.log(`\n📊 Resumo da importação:`);
    console.log(`   ✅ Sucessos: ${resultados.sucesso.length}`);
    console.log(`   ❌ Erros: ${resultados.erros.length}`);
    console.log(`   📦 Total: ${resultados.total}`);
    
    cons});

      } catch (error) {
        console.error(`❌ Erro na linha ${linha}:`, error.message);
        resultados.erros.push({
          linha,
          numeroOrdemServico: os.numeroOrdemServico || 'N/A',
          erro: error.message
        });
      }
    }

    // Resposta final
    const mensagem = resultados.erros.length === 0
      ? `✅ Todas as ${resultados.sucesso.length} OS foram importadas com sucesso!`
      : `⚠️ Importação concluída: ${resultados.sucesso.length} sucesso, ${resultados.erros.length} erro(s)`;

    res.status(resultados.erros.length === 0 ? 201 : 207).json({
      success: true,
      message: mensagem,
      resultados
    });

  } catch (error) {
    console.error('❌ Erro na importação em lote:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar importação',
      error: error.message
    });
  }
};
