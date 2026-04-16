const Abastecimento = require('../models/Abastecimento');
const Cliente = require('../models/Cliente');
const Fornecedor = require('../models/Fornecedor');

// Formatar CNPJ digits para formato brasileiro XX.XXX.XXX/XXXX-XX
const formatCnpjBr = (digits) => {
  const d = (digits || '').replace(/\D/g, '');
  if (d.length === 14) return `${d.substr(0,2)}.${d.substr(2,3)}.${d.substr(5,3)}/${d.substr(8,4)}-${d.substr(12,2)}`;
  if (d.length === 11) return `${d.substr(0,3)}.${d.substr(3,3)}.${d.substr(6,3)}-${d.substr(9,2)}`;
  return digits;
};

// Função para normalizar nomes de empresas para comparação
const normalizarNomeEmpresa = (nome) => {
  if (!nome) return '';
  return nome
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(ltda|s\/a|s\.a\.|me|epp|eireli)\b/gi, '')
    .replace(/[-.]|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Função para calcular similaridade entre dois nomes
const calcularSimilaridade = (nome1, nome2) => {
  const extrairPalavrasChave = (nome) => {
    if (!nome) return [];
    const normalizado = normalizarNomeEmpresa(nome);
    const palavrasIgnoradas = ['servicos', 'servico', 'comercio', 'comercial', 'e', 'de', 'da', 'do', 'dos', 'das', 'ltda', 'eireli', 'epp', 'posto', 'combustivel', 'combustiveis'];
    return normalizado.split(' ').filter(p => p.length >= 2 && !palavrasIgnoradas.includes(p));
  };
  const palavras1 = extrairPalavrasChave(nome1);
  const palavras2 = extrairPalavrasChave(nome2);
  if (palavras1.length === 0 || palavras2.length === 0) return 0;
  let matches = 0;
  for (const p1 of palavras1) {
    for (const p2 of palavras2) {
      if (p1 === p2 || p1.includes(p2) || p2.includes(p1)) {
        matches++;
        break;
      }
    }
  }
  return matches / Math.max(palavras1.length, palavras2.length);
};

// Escapar string para uso seguro em regex (previne ReDoS)
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Buscar por CNPJ: tenta formato brasileiro E digits-only para compatibilidade
 */
const buscarPorCnpj = async (Model, cnpjRaw) => {
  const digits = (cnpjRaw || '').replace(/\D/g, '');
  if (!digits || digits.length < 11) return null;
  const formatted = formatCnpjBr(digits);
  // Try formatted first (new standard), then digits-only (legacy)
  let doc = await Model.findOne({ cnpjCpf: formatted });
  if (doc) return doc;
  doc = await Model.findOne({ cnpjCpf: digits });
  if (doc) return doc;
  // Fallback regex (partial match)
  doc = await Model.findOne({ cnpjCpf: { $regex: new RegExp(escapeRegex(digits)) } });
  return doc;
};

/**
 * Buscar entidade (Cliente ou Fornecedor) por nome fantasia com fallback progressivo
 */
const buscarEntidadePorNome = async (Model, nomeBusca, tipo) => {
  const nomeTrimmed = nomeBusca ? nomeBusca.trim() : '';
  if (!nomeTrimmed) return { doc: null, divergencia: null };

  // 1. Busca exata
  let doc = await Model.findOne({
    nomeFantasia: { $regex: new RegExp(`^${escapeRegex(nomeTrimmed)}$`, 'i') }
  });
  if (doc) return { doc, divergencia: null };

  // 2. Busca parcial no nomeFantasia
  doc = await Model.findOne({
    nomeFantasia: { $regex: new RegExp(escapeRegex(nomeTrimmed), 'i') }
  });
  if (doc) {
    return { doc, divergencia: `⚠️ ${tipo} no Combustível="${nomeTrimmed}" vs Portal="${doc.nomeFantasia}"` };
  }

  // 3. Busca na razão social
  doc = await Model.findOne({
    razaoSocial: { $regex: new RegExp(escapeRegex(nomeTrimmed), 'i') }
  });
  if (doc) {
    return { doc, divergencia: `⚠️ ${tipo} no Combustível="${nomeTrimmed}" vs Portal razaoSocial="${doc.razaoSocial}"` };
  }

  // 4. Busca por CNPJ (se parecer um CNPJ)
  const cnpjLimpo = nomeTrimmed.replace(/\D/g, '');
  if (cnpjLimpo.length >= 11) {
    doc = await buscarPorCnpj(Model, cnpjLimpo);
    if (doc) {
      return { doc, divergencia: `⚠️ ${tipo} encontrado via CNPJ="${cnpjLimpo}"` };
    }
  }

  // 5. Busca normalizada
  const nomeNormalizado = normalizarNomeEmpresa(nomeTrimmed);
  const todos = await Model.find({});
  doc = todos.find(f => {
    const fantasiaNormalizada = normalizarNomeEmpresa(f.nomeFantasia);
    const razaoNormalizada = normalizarNomeEmpresa(f.razaoSocial);
    return fantasiaNormalizada.includes(nomeNormalizado) ||
           nomeNormalizado.includes(fantasiaNormalizada) ||
           razaoNormalizada.includes(nomeNormalizado) ||
           nomeNormalizado.includes(razaoNormalizada);
  });
  if (doc) {
    return { doc, divergencia: `⚠️ ${tipo} encontrado via normalização="${doc.nomeFantasia}"` };
  }

  // 6. Busca por similaridade
  let melhorMatch = null;
  let melhorScore = 0;
  for (const f of todos) {
    const score = Math.max(
      calcularSimilaridade(nomeTrimmed, f.razaoSocial),
      calcularSimilaridade(nomeTrimmed, f.nomeFantasia)
    );
    if (score > melhorScore && score >= 0.5) {
      melhorScore = score;
      melhorMatch = f;
    }
  }
  if (melhorMatch) {
    return { doc: melhorMatch, divergencia: `⚠️ ${tipo} encontrado por similaridade (${Math.round(melhorScore * 100)}%) = "${melhorMatch.nomeFantasia}"` };
  }

  return { doc: null, divergencia: null };
};

/**
 * Webhook para receber abastecimentos do sistema de combustível
 * POST /api/webhook/combustivel/receber-abastecimento
 */
exports.receberAbastecimento = async (req, res) => {
  try {
    console.log('⛽ Webhook Combustível - Dados recebidos:', JSON.stringify(req.body, null, 2));

    const {
      codigo,
      codigoComprovante,
      dataReferencia,
      clienteNomeFantasia,
      clienteCnpj,
      fornecedorNomeFantasia,
      fornecedorCnpj,
      placa,
      veiculo,
      motorista,
      tipoCombustivel,
      litrosAbastecidos,
      precoUnitario,
      valor,
      valorComDesconto,
      descontoPercentual,
      odometro,
      centroCusto,
      subunidade,
      contrato,
      empenho,
      notaFiscal,
      metodoIdentificacao,
      observacoes
    } = req.body;

    // Validações básicas
    if (!codigo) {
      return res.status(400).json({
        success: false,
        message: 'Código/ID do abastecimento é obrigatório'
      });
    }

    if (!tipoCombustivel || !litrosAbastecidos || !valor) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de combustível, litros e valor são obrigatórios'
      });
    }

    // Array para armazenar observações de divergências
    const observacoesWebhook = [];

    // 1. Buscar Cliente
    let cliente = null;
    if (clienteCnpj) {
      const cnpjLimpo = clienteCnpj.replace(/\D/g, '');
      cliente = await buscarPorCnpj(Cliente, cnpjLimpo);
    }
    if (!cliente && clienteNomeFantasia) {
      const resultado = await buscarEntidadePorNome(Cliente, clienteNomeFantasia, 'Cliente');
      cliente = resultado.doc;
      if (resultado.divergencia) observacoesWebhook.push(resultado.divergencia);
    }

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: `Cliente "${clienteNomeFantasia || clienteCnpj}" não encontrado no Portal Finance.`,
        campo: 'cliente'
      });
    }

    // 2. Buscar Fornecedor (Posto)
    let fornecedor = null;
    if (fornecedorCnpj) {
      const cnpjLimpo = fornecedorCnpj.replace(/\D/g, '');
      fornecedor = await buscarPorCnpj(Fornecedor, cnpjLimpo);
    }
    if (!fornecedor && fornecedorNomeFantasia) {
      const resultado = await buscarEntidadePorNome(Fornecedor, fornecedorNomeFantasia, 'Fornecedor');
      fornecedor = resultado.doc;
      if (resultado.divergencia) observacoesWebhook.push(resultado.divergencia);
    }

    // Auto-create fornecedor if not found (using webhook data)
    if (!fornecedor) {
      const cnpjLimpo = (fornecedorCnpj || '').replace(/\D/g, '');
      if (cnpjLimpo.length >= 11) {
        try {
          fornecedor = await Fornecedor.create({
            razaoSocial: fornecedorNomeFantasia || `Posto ${cnpjLimpo}`,
            nomeFantasia: fornecedorNomeFantasia || `Posto ${cnpjLimpo}`,
            cnpjCpf: formatCnpjBr(cnpjLimpo),
            endereco: 'Cadastrado automaticamente via webhook',
            bairro: 'N/A',
            cidade: 'N/A',
            estado: 'N/A',
            email: `auto_${cnpjLimpo}@webhook.instasolutions.com.br`,
            telefone: '0000000000',
            banco: 'A definir',
            tipoConta: 'corrente',
            agencia: '0000',
            conta: '00000',
            senha: require('crypto').randomBytes(16).toString('hex'),
            role: 'fornecedor',
          });
          observacoesWebhook.push(`✅ Fornecedor "${fornecedorNomeFantasia || cnpjLimpo}" cadastrado automaticamente via webhook`);
          console.log(`📝 Auto-criado fornecedor: ${fornecedor.nomeFantasia} (${cnpjLimpo})`);
        } catch (autoCreateErr) {
          // Possibly duplicate email — retry search
          if (autoCreateErr.code === 11000) {
            fornecedor = await buscarPorCnpj(Fornecedor, cnpjLimpo);
          }
          if (!fornecedor) {
            console.error('Auto-create fornecedor error:', autoCreateErr.message);
            return res.status(404).json({
              success: false,
              message: `Fornecedor/Posto "${fornecedorNomeFantasia || fornecedorCnpj}" não encontrado e não pôde ser cadastrado automaticamente: ${autoCreateErr.message}`,
              campo: 'fornecedor'
            });
          }
        }
      } else {
        return res.status(404).json({
          success: false,
          message: `Fornecedor/Posto "${fornecedorNomeFantasia || fornecedorCnpj}" não encontrado no Portal Finance e CNPJ inválido para auto-cadastro.`,
          campo: 'fornecedor'
        });
      }
    }

    // 3. Verificar se já existe abastecimento com este código externo
    const existente = await Abastecimento.findOne({ codigoExterno: String(codigo) });
    if (existente) {
      console.log(`⚠️ Abastecimento com código externo ${codigo} já existe (${existente.codigo}).`);
      return res.status(200).json({
        success: true,
        message: 'Abastecimento já cadastrado anteriormente',
        abastecimento: existente,
        duplicado: true
      });
    }

    // 4. Montar observações
    const obsCompleta = [
      observacoes,
      ...observacoesWebhook
    ].filter(Boolean).join('\n');

    // 5. Calcular valores
    const valorNumerico = parseFloat(valor) || 0;
    const descontoPerc = parseFloat(descontoPercentual) || 0;
    const valorDesconto = valorComDesconto ? parseFloat(valorComDesconto) : (valorNumerico - (valorNumerico * descontoPerc / 100));

    // 6. Criar abastecimento
    const abastecimento = new Abastecimento({
      codigoExterno: String(codigo),
      codigoComprovante: codigoComprovante || null,
      dataReferencia: dataReferencia ? new Date(dataReferencia) : new Date(),
      cliente: cliente._id,
      fornecedor: fornecedor._id,
      placa: placa || null,
      veiculo: veiculo || null,
      motorista: motorista || null,
      tipoCombustivel: tipoCombustivel,
      litrosAbastecidos: parseFloat(litrosAbastecidos),
      precoUnitario: parseFloat(precoUnitario) || (valorNumerico / parseFloat(litrosAbastecidos)),
      valor: valorNumerico,
      descontoPercentual: descontoPerc,
      valorComDesconto: valorDesconto,
      valorFinal: valorDesconto,
      odometro: odometro || null,
      centroCusto: centroCusto || null,
      subunidade: subunidade || null,
      contrato: contrato || null,
      empenho: empenho || null,
      notaFiscal: notaFiscal || null,
      metodoIdentificacao: metodoIdentificacao || 'manual',
      observacoes: obsCompleta || null,
      status: 'Autorizada'
    });

    await abastecimento.save();

    console.log(`✅ Abastecimento ${abastecimento.codigo} criado com sucesso (externo: ${codigo})`);
    console.log(`   Cliente: ${cliente.nomeFantasia}, Fornecedor: ${fornecedor.nomeFantasia}`);
    console.log(`   ${litrosAbastecidos}L de ${tipoCombustivel} = R$ ${valorNumerico.toFixed(2)}`);

    res.status(201).json({
      success: true,
      message: 'Abastecimento recebido e cadastrado com sucesso',
      abastecimento: {
        _id: abastecimento._id,
        codigo: abastecimento.codigo,
        codigoExterno: abastecimento.codigoExterno,
        cliente: cliente.nomeFantasia,
        fornecedor: fornecedor.nomeFantasia,
        tipoCombustivel: abastecimento.tipoCombustivel,
        litrosAbastecidos: abastecimento.litrosAbastecidos,
        valor: abastecimento.valor,
        valorFinal: abastecimento.valorFinal,
        placa: abastecimento.placa,
        status: abastecimento.status
      },
      divergencias: observacoesWebhook.length > 0 ? observacoesWebhook : undefined
    });

  } catch (error) {
    console.error('❌ Erro no webhook de abastecimento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao processar abastecimento',
      error: error.message
    });
  }
};

/**
 * Receber lote de abastecimentos
 * POST /api/webhook/combustivel/receber-lote
 */
exports.receberLote = async (req, res) => {
  try {
    const { abastecimentos } = req.body;

    if (!Array.isArray(abastecimentos) || abastecimentos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array de abastecimentos é obrigatório e não pode estar vazio'
      });
    }

    console.log(`⛽ Webhook Combustível - Recebendo lote de ${abastecimentos.length} abastecimentos`);

    const resultados = {
      total: abastecimentos.length,
      sucesso: 0,
      falha: 0,
      duplicados: 0,
      detalhes: []
    };

    for (const item of abastecimentos) {
      try {
        // Reusar a lógica individual via mock req/res
        const mockReq = { body: item };
        let resultado = null;

        // Verificar duplicado
        if (item.codigo) {
          const existente = await Abastecimento.findOne({ codigoExterno: String(item.codigo) });
          if (existente) {
            resultados.duplicados++;
            resultados.detalhes.push({ codigo: item.codigo, status: 'duplicado', abastecimentoCodigo: existente.codigo });
            continue;
          }
        }

        // Buscar cliente
        let cliente = null;
        if (item.clienteCnpj) {
          const cnpjLimpo = item.clienteCnpj.replace(/\D/g, '');
          cliente = await buscarPorCnpj(Cliente, cnpjLimpo);
        }
        if (!cliente && item.clienteNomeFantasia) {
          const res = await buscarEntidadePorNome(Cliente, item.clienteNomeFantasia, 'Cliente');
          cliente = res.doc;
        }

        // Buscar fornecedor
        let fornecedor = null;
        if (item.fornecedorCnpj) {
          const cnpjLimpo = item.fornecedorCnpj.replace(/\D/g, '');
          fornecedor = await buscarPorCnpj(Fornecedor, cnpjLimpo);
        }
        if (!fornecedor && item.fornecedorNomeFantasia) {
          const res = await buscarEntidadePorNome(Fornecedor, item.fornecedorNomeFantasia, 'Fornecedor');
          fornecedor = res.doc;
        }

        // Auto-create fornecedor if not found
        if (!fornecedor && item.fornecedorCnpj) {
          const cnpjLimpo = item.fornecedorCnpj.replace(/\D/g, '');
          if (cnpjLimpo.length >= 11) {
            try {
              fornecedor = await Fornecedor.create({
                razaoSocial: item.fornecedorNomeFantasia || `Posto ${cnpjLimpo}`,
                nomeFantasia: item.fornecedorNomeFantasia || `Posto ${cnpjLimpo}`,
                cnpjCpf: formatCnpjBr(cnpjLimpo),
                endereco: 'Cadastrado automaticamente via webhook lote',
                bairro: 'N/A', cidade: 'N/A', estado: 'N/A',
                email: `auto_${cnpjLimpo}@webhook.instasolutions.com.br`,
                telefone: '0000000000',
                banco: 'A definir', tipoConta: 'corrente', agencia: '0000', conta: '00000',
                senha: require('crypto').randomBytes(16).toString('hex'),
                role: 'fornecedor',
              });
            } catch (autoErr) {
              if (autoErr.code === 11000) {
                fornecedor = await buscarPorCnpj(Fornecedor, cnpjLimpo);
              }
            }
          }
        }

        if (!cliente || !fornecedor) {
          resultados.falha++;
          resultados.detalhes.push({
            codigo: item.codigo,
            status: 'falha',
            erro: !cliente ? `Cliente não encontrado` : `Fornecedor não encontrado`
          });
          continue;
        }

        const valorNumerico = parseFloat(item.valor) || 0;
        const descontoPerc = parseFloat(item.descontoPercentual) || 0;
        const valorDesconto = item.valorComDesconto ? parseFloat(item.valorComDesconto) : (valorNumerico - (valorNumerico * descontoPerc / 100));

        const abastecimento = new Abastecimento({
          codigoExterno: String(item.codigo),
          codigoComprovante: item.codigoComprovante || null,
          dataReferencia: item.dataReferencia ? new Date(item.dataReferencia) : new Date(),
          cliente: cliente._id,
          fornecedor: fornecedor._id,
          placa: item.placa || null,
          veiculo: item.veiculo || null,
          motorista: item.motorista || null,
          tipoCombustivel: item.tipoCombustivel,
          litrosAbastecidos: parseFloat(item.litrosAbastecidos),
          precoUnitario: parseFloat(item.precoUnitario) || (valorNumerico / parseFloat(item.litrosAbastecidos)),
          valor: valorNumerico,
          descontoPercentual: descontoPerc,
          valorComDesconto: valorDesconto,
          valorFinal: valorDesconto,
          odometro: item.odometro || null,
          centroCusto: item.centroCusto || null,
          subunidade: item.subunidade || null,
          contrato: item.contrato || null,
          empenho: item.empenho || null,
          notaFiscal: item.notaFiscal || null,
          metodoIdentificacao: item.metodoIdentificacao || 'manual',
          observacoes: item.observacoes || null,
          status: 'Autorizada'
        });

        await abastecimento.save();
        resultados.sucesso++;
        resultados.detalhes.push({ codigo: item.codigo, status: 'sucesso', abastecimentoCodigo: abastecimento.codigo });

      } catch (err) {
        resultados.falha++;
        resultados.detalhes.push({ codigo: item.codigo, status: 'falha', erro: err.message });
      }
    }

    console.log(`⛽ Lote processado: ${resultados.sucesso} sucesso, ${resultados.falha} falha, ${resultados.duplicados} duplicados`);

    res.json({
      success: true,
      message: `Lote processado: ${resultados.sucesso}/${resultados.total} com sucesso`,
      resultados
    });

  } catch (error) {
    console.error('❌ Erro no webhook de lote:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar lote de abastecimentos',
      error: error.message
    });
  }
};

/**
 * Teste de conexão do webhook
 * GET /api/webhook/combustivel/teste
 */
exports.testeConexao = async (req, res) => {
  res.json({
    success: true,
    message: 'Webhook de combustível está ativo',
    timestamp: new Date().toISOString(),
    endpoints: {
      receberAbastecimento: 'POST /api/webhook/combustivel/receber-abastecimento',
      receberLote: 'POST /api/webhook/combustivel/receber-lote',
      buscarFornecedor: 'GET /api/webhook/combustivel/fornecedor/:cnpj',
      registrarFornecedor: 'POST /api/webhook/combustivel/registrar-fornecedor',
      teste: 'GET /api/webhook/combustivel/teste'
    }
  });
};

/**
 * Buscar fornecedor por CNPJ (token-authenticated)
 * GET /api/webhook/combustivel/fornecedor/:cnpj
 */
exports.buscarFornecedorPorCnpj = async (req, res) => {
  try {
    const cnpjLimpo = (req.params.cnpj || '').replace(/\D/g, '');
    if (!cnpjLimpo || cnpjLimpo.length < 11) {
      return res.status(400).json({ success: false, message: 'CNPJ inválido' });
    }

    const fornecedor = await buscarPorCnpj(Fornecedor, cnpjLimpo);

    if (!fornecedor) {
      return res.status(404).json({ success: false, found: false, message: 'Fornecedor não encontrado' });
    }

    res.json({ success: true, found: true, fornecedor });
  } catch (error) {
    console.error('Buscar fornecedor error:', error);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

/**
 * Registrar fornecedor via webhook token (auto-cadastro)
 * POST /api/webhook/combustivel/registrar-fornecedor
 */
exports.registrarFornecedor = async (req, res) => {
  try {
    const { cnpjCpf, razaoSocial, nomeFantasia, endereco, bairro, cidade, estado, cep, email, telefone, banco, tipoConta, agencia, conta, chavePix, tipoChavePix, naoOptanteSimples, inscricaoEstadual } = req.body;

    const cnpjLimpo = (cnpjCpf || '').replace(/\D/g, '');
    if (!cnpjLimpo || cnpjLimpo.length < 11) {
      return res.status(400).json({ success: false, message: 'CNPJ inválido' });
    }

    // Check if already exists
    const existing = await buscarPorCnpj(Fornecedor, cnpjLimpo);

    if (existing) {
      return res.json({
        success: true,
        already_existed: true,
        fornecedor: { _id: existing._id, nomeFantasia: existing.nomeFantasia, cnpjCpf: existing.cnpjCpf },
        message: 'Fornecedor já cadastrado'
      });
    }

    const fornecedor = await Fornecedor.create({
      razaoSocial: razaoSocial || nomeFantasia || `Posto ${cnpjLimpo}`,
      nomeFantasia: nomeFantasia || razaoSocial || `Posto ${cnpjLimpo}`,
      cnpjCpf: formatCnpjBr(cnpjLimpo),
      inscricaoEstadual: inscricaoEstadual || '',
      endereco: endereco || 'Não informado',
      bairro: bairro || 'N/A',
      cidade: cidade || 'N/A',
      estado: estado || 'N/A',
      cep: (cep || '').replace(/\D/g, '') || '',
      email: email || `auto_${cnpjLimpo}@webhook.instasolutions.com.br`,
      telefone: telefone || '0000000000',
      banco: banco || 'A definir',
      tipoConta: tipoConta || 'corrente',
      agencia: agencia || '0000',
      conta: conta || '00000',
      chavePix: chavePix || '',
      tipoChavePix: tipoChavePix || '',
      senha: require('crypto').randomBytes(16).toString('hex'),
      naoOptanteSimples: naoOptanteSimples || false,
      role: 'fornecedor',
    });

    console.log(`📝 Fornecedor registrado via webhook: ${fornecedor.nomeFantasia} (${cnpjLimpo})`);

    res.status(201).json({
      success: true,
      already_existed: false,
      fornecedor: { _id: fornecedor._id, nomeFantasia: fornecedor.nomeFantasia, cnpjCpf: fornecedor.cnpjCpf },
      message: 'Fornecedor cadastrado com sucesso'
    });
  } catch (error) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      const existing = await buscarPorCnpj(Fornecedor, (req.body.cnpjCpf || '').replace(/\D/g, ''));
      if (existing) {
        return res.json({
          success: true,
          already_existed: true,
          fornecedor: { _id: existing._id, nomeFantasia: existing.nomeFantasia, cnpjCpf: existing.cnpjCpf },
          message: 'Fornecedor já cadastrado (chave duplicada)'
        });
      }
    }
    console.error('Registrar fornecedor error:', error);
    res.status(500).json({ success: false, message: error.message || 'Erro interno' });
  }
};
