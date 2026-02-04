const OrdemServico = require('../models/OrdemServico');
const Cliente = require('../models/Cliente');
const Fornecedor = require('../models/Fornecedor');
const { Tipo, TipoServicoSolicitado } = require('../models/TipoServico');

// Função para normalizar nomes de empresas para comparação
const normalizarNomeEmpresa = (nome) => {
  if (!nome) return '';
  
  return nome
    .toLowerCase()
    .trim()
    .replace(/\b(ltda|s\/a|s\.a\.|me|epp|eireli)\b/gi, '') // Remove tipos societários
    .replace(/[-.]/g, ' ') // Remove hífens e pontos
    .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
    .trim();
};

// Função para converter data brasileira (DD/MM/YYYY) para formato ISO
const converterDataBrasileira = (data) => {
  if (!data) return null;
  
  // Se já é uma data válida, retorna
  if (data instanceof Date) return data;
  
  const dataStr = String(data).trim();
  
  // Tenta formato brasileiro DD/MM/YYYY
  const matchBR = dataStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchBR) {
    const [, dia, mes, ano] = matchBR;
    return new Date(`${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`);
  }
  
  // Tenta formato ISO YYYY-MM-DD
  const matchISO = dataStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (matchISO) {
    return new Date(dataStr);
  }
  
  // Tenta parsing direto
  const dataConvertida = new Date(dataStr);
  if (!isNaN(dataConvertida.getTime())) {
    return dataConvertida;
  }
  
  return null;
};

// Função para converter valores em formato brasileiro (R$ 1.234,56) para número
const limparValorMonetario = (valor) => {
  if (!valor || valor === '') return 0;
  
  // Remove R$, espaços, e pontos (milhares)
  let valorLimpo = String(valor)
    .replace(/R\$\s*/g, '')
    .replace(/\./g, '')
    .trim();
  
  // Substitui vírgula decimal por ponto
  valorLimpo = valorLimpo.replace(',', '.');
  
  const numero = parseFloat(valorLimpo);
  return isNaN(numero) ? 0 : numero;
};

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

    for (let i = 0; i < ordensServico.length; i++) {
      const os = ordensServico[i];
      const linha = i + 2;

      try {
        console.log(`\n📋 Processando OS ${linha}/${ordensServico.length + 1}: ${os.numeroOrdemServico}`);

        if (!os.numeroOrdemServico) {
          throw new Error('Número da Ordem de Serviço é obrigatório');
        }
        if (!os.dataReferencia) {
          throw new Error('Data de Referência é obrigatória');
        }
        
        // Converte data para formato aceito pelo MongoDB
        const dataReferencia = converterDataBrasileira(os.dataReferencia);
        if (!dataReferencia || isNaN(dataReferencia.getTime())) {
          throw new Error(`Data de Referência inválida: "${os.dataReferencia}". Use formato DD/MM/YYYY ou YYYY-MM-DD`);
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

        const osExistente = await OrdemServico.findOne({ 
          numeroOrdemServico: os.numeroOrdemServico 
        });
        
        if (osExistente) {
          throw new Error(`OS já cadastrada: ${os.numeroOrdemServico}`);
        }

        console.log(`🔍 Buscando cliente: "${os.clienteNome}"`);
        
        // Busca exata primeiro
        let cliente = await Cliente.findOne({ 
          $or: [
            { razaoSocial: { $regex: new RegExp(`^${os.clienteNome.trim()}$`, 'i') } },
            { nomeFantasia: { $regex: new RegExp(`^${os.clienteNome.trim()}$`, 'i') } }
          ]
        });

        // Se não encontrar, busca com nome normalizado
        if (!cliente) {
          const nomeNormalizado = normalizarNomeEmpresa(os.clienteNome);
          const todosClientes = await Cliente.find({}, 'razaoSocial nomeFantasia');
          
          cliente = todosClientes.find(c => {
            const razaoNormalizada = normalizarNomeEmpresa(c.razaoSocial);
            const fantasiaNormalizada = normalizarNomeEmpresa(c.nomeFantasia);
            return razaoNormalizada.includes(nomeNormalizado) || 
                   nomeNormalizado.includes(razaoNormalizada) ||
                   fantasiaNormalizada.includes(nomeNormalizado) || 
                   nomeNormalizado.includes(fantasiaNormalizada);
          });
          
          if (!cliente) {
            throw new Error(`Cliente "${os.clienteNome}" não encontrado no sistema. Cadastre o cliente antes de importar.`);
          }
          
          console.log(`⚠️  Cliente encontrado com nome aproximado: "${cliente.nomeFantasia}" (buscado: "${os.clienteNome}")`);
        } else {
          console.log(`✅ Cliente encontrado: "${cliente.nomeFantasia}" (ID: ${cliente._id})`);
        }

        console.log(`🔍 Buscando fornecedor: "${os.fornecedorNome}"`);
        
        // Busca exata primeiro
        let fornecedor = await Fornecedor.findOne({ 
          $or: [
            { razaoSocial: { $regex: new RegExp(`^${os.fornecedorNome.trim()}$`, 'i') } },
            { nomeFantasia: { $regex: new RegExp(`^${os.fornecedorNome.trim()}$`, 'i') } }
          ]
        });

        // Se não encontrar, busca com nome normalizado
        if (!fornecedor) {
          const nomeNormalizado = normalizarNomeEmpresa(os.fornecedorNome);
          const todosFornecedores = await Fornecedor.find({}, 'razaoSocial nomeFantasia');
          
          fornecedor = todosFornecedores.find(f => {
            const razaoNormalizada = normalizarNomeEmpresa(f.razaoSocial);
            const fantasiaNormalizada = normalizarNomeEmpresa(f.nomeFantasia);
            return razaoNormalizada.includes(nomeNormalizado) || 
                   nomeNormalizado.includes(razaoNormalizada) ||
                   fantasiaNormalizada.includes(nomeNormalizado) || 
                   nomeNormalizado.includes(fantasiaNormalizada);
          });
          
          if (!fornecedor) {
            // Lista fornecedores disponíveis para ajudar o usuário
            const fornecedoresDisponiveis = await Fornecedor.find({}, 'nomeFantasia razaoSocial').limit(10);
            const lista = fornecedoresDisponiveis.map(f => f.nomeFantasia || f.razaoSocial).join(', ');
            throw new Error(`Fornecedor "${os.fornecedorNome}" não encontrado. Exemplos cadastrados: ${lista}`);
          }
          
          console.log(`⚠️  Fornecedor encontrado com nome aproximado: "${fornecedor.nomeFantasia}" (buscado: "${os.fornecedorNome}")`);
        } else {
          console.log(`✅ Fornecedor encontrado: "${fornecedor.nomeFantasia}" (ID: ${fornecedor._id})`);
        }

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

        let tipoObj = await Tipo.findOne({
          nome: { $regex: new RegExp(`^${os.tipo}$`, 'i') }
        });

        if (!tipoObj) {
          tipoObj = new Tipo({ nome: os.tipo });
          await tipoObj.save();
          console.log(`✅ Tipo criado: ${os.tipo}`);
        }

        console.log(`🔍 Verificando centro de custo: "${os.centroCusto}" no cliente ${cliente.nomeFantasia}`);
        
        let centroCusto = cliente.centrosCusto.find(cc => 
          cc.nome.toLowerCase().trim() === os.centroCusto.toLowerCase().trim()
        );

        if (!centroCusto) {
          console.log(`⚠️  Centro de Custo "${os.centroCusto}" não existe, criando...`);
          cliente.centrosCusto.push({ nome: os.centroCusto.trim(), subunidades: [] });
          await cliente.save();
          console.log(`✅ Centro de Custo criado: ${os.centroCusto}`);
          
          cliente = await Cliente.findById(cliente._id);
          centroCusto = cliente.centrosCusto.find(cc => 
            cc.nome.toLowerCase().trim() === os.centroCusto.toLowerCase().trim()
          );
        } else {
          console.log(`✅ Centro de Custo já existe: ${centroCusto.nome}`);
        }

        if (os.subunidade && os.subunidade.trim()) {
          console.log(`🔍 Verificando subunidade: "${os.subunidade}"`);
          
          if (!centroCusto.subunidades) {
            centroCusto.subunidades = [];
          }
          
          const subunidadeExiste = centroCusto.subunidades.some(sub => 
            sub.nome && sub.nome.toLowerCase().trim() === os.subunidade.toLowerCase().trim()
          );

          if (!subunidadeExiste) {
            console.log(`⚠️  Subunidade "${os.subunidade}" não existe, criando...`);
            centroCusto.subunidades.push({ nome: os.subunidade.trim() });
            await cliente.save();
            console.log(`✅ Subunidade criada: ${os.subunidade}`);
          } else {
            console.log(`✅ Subunidade já existe`);
          }
        }

        const valorPecas = limparValorMonetario(os.valorPecas);
        const valorServico = limparValorMonetario(os.valorServico);
        
        console.log(`💰 Valores originais: Peças R$ ${valorPecas.toFixed(2)} | Serviço R$ ${valorServico.toFixed(2)}`);
        
        const descontoPecasPerc = cliente.descontoPecas || 0;
        const descontoServicoPerc = cliente.descontoServicos || 0;

        console.log(`🎯 Descontos do cliente: Peças ${descontoPecasPerc}% | Serviço ${descontoServicoPerc}%`);

        const valorPecasComDesconto = valorPecas - (valorPecas * descontoPecasPerc / 100);
        const valorServicoComDesconto = valorServico - (valorServico * descontoServicoPerc / 100);
        const valorFinal = valorPecasComDesconto + valorServicoComDesconto;

        console.log(`💵 Valores com desconto: Peças R$ ${valorPecasComDesconto.toFixed(2)} | Serviço R$ ${valorServicoComDesconto.toFixed(2)}`);
        console.log(`💰 Valor Final: R$ ${valorFinal.toFixed(2)}`);

        const novaOS = new OrdemServico({
          numeroOrdemServico: os.numeroOrdemServico,
          dataReferencia: dataReferencia,
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
        
        // Recarrega para verificar se salvou corretamente
        const osVerificacao = await OrdemServico.findById(novaOS._id);
        console.log(`🔍 Verificação após save: valorFinal=${osVerificacao.valorFinal.toFixed(2)}, valorPecasComDesconto=${osVerificacao.valorPecasComDesconto.toFixed(2)}, valorServicoComDesconto=${osVerificacao.valorServicoComDesconto.toFixed(2)}`);
        
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
