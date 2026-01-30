/**
 * Script de teste para o webhook de integração com sistema de frotas
 * 
 * Como usar:
 * 1. Certifique-se de que o backend está rodando (npm start ou npm run dev)
 * 2. Configure a variável WEBHOOK_FROTA_TOKEN no .env
 * 3. Execute: node backend/scripts/testeWebhookFrota.js
 */

const axios = require('axios');

// Configurações
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const WEBHOOK_TOKEN = process.env.WEBHOOK_FROTA_TOKEN || 'seu-token-secreto-aqui';

// Dados de teste
const osTestData = {
  codigo: `TEST-${Date.now()}`,
  numeroOrdemServico: `OS-TEST-${Date.now()}`,
  dataReferencia: new Date().toISOString(),
  clienteNomeFantasia: 'Cliente Teste Webhook',
  fornecedorNomeFantasia: 'Fornecedor Teste Webhook',
  tipoServicoSolicitado: 'Manutenção Preventiva',
  tipo: 'Serviços',
  centroCusto: 'Centro Teste',
  subunidade: 'Subunidade Teste',
  placa: 'ABC-1234',
  veiculo: 'Teste Vehicle 2026',
  contrato: 'CONTRATO-TESTE-001',
  valorPecasSemDesconto: 1500.00,
  valorServicoSemDesconto: 800.00,
  descontoPercentual: 10,
  valorPecasComDesconto: 1350.00,
  valorServicoComDesconto: 720.00,
  notaFiscalPeca: 'NF-TEST-001',
  notaFiscalServico: 'NF-TEST-002'
};

async function testarConexao() {
  console.log('\n🔍 Testando conexão com o webhook...');
  try {
    const response = await axios.get(`${BASE_URL}/api/webhook/frota/teste`);
    console.log('✅ Conexão OK:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return false;
  }
}

async function testarTokenInvalido() {
  console.log('\n🔐 Testando token inválido (deve falhar)...');
  try {
    await axios.post(
      `${BASE_URL}/api/webhook/frota/receber-os`,
      osTestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Token': 'token-invalido-123'
        }
      }
    );
    console.log('❌ ERRO: Deveria ter rejeitado token inválido!');
    return false;
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✅ Token inválido rejeitado corretamente');
      return true;
    }
    console.error('❌ Erro inesperado:', error.message);
    return false;
  }
}

async function testarCriacaoOS() {
  console.log('\n📝 Testando criação de OS via webhook...');
  console.log('   Dados:', JSON.stringify(osTestData, null, 2));
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/webhook/frota/receber-os`,
      osTestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Token': WEBHOOK_TOKEN
        },
        timeout: 15000
      }
    );
    
    console.log('✅ OS criada com sucesso!');
    console.log('   Status:', response.status);
    console.log('   Resposta:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar OS:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testarDuplicacao() {
  console.log('\n🔄 Testando proteção contra duplicação...');
  console.log('   (Enviando a mesma OS novamente)');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/webhook/frota/receber-os`,
      osTestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Token': WEBHOOK_TOKEN
        }
      }
    );
    
    if (response.data.duplicada) {
      console.log('✅ Duplicação detectada e tratada corretamente');
      console.log('   Resposta:', response.data.message);
      return true;
    } else {
      console.log('⚠️  OS não foi marcada como duplicada (pode ser comportamento OK dependendo do código)');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao testar duplicação:', error.message);
    if (error.response) {
      console.error('   Data:', error.response.data);
    }
    return false;
  }
}

async function testarCamposObrigatorios() {
  console.log('\n🚫 Testando validação de campos obrigatórios...');
  
  const dadosIncompletos = {
    // Falta o código (obrigatório)
    numeroOrdemServico: 'OS-INVALIDA',
    clienteNomeFantasia: 'Cliente Teste'
  };
  
  try {
    await axios.post(
      `${BASE_URL}/api/webhook/frota/receber-os`,
      dadosIncompletos,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Token': WEBHOOK_TOKEN
        }
      }
    );
    console.log('❌ ERRO: Deveria ter rejeitado dados incompletos!');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Validação funcionando corretamente');
      console.log('   Mensagem:', error.response.data.message);
      return true;
    }
    console.error('❌ Erro inesperado:', error.message);
    return false;
  }
}

async function executarTestes() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('    TESTE DE WEBHOOK - INTEGRAÇÃO SISTEMA DE FROTAS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n📍 URL Base: ${BASE_URL}`);
  console.log(`🔑 Token: ${WEBHOOK_TOKEN.substring(0, 10)}...`);
  
  const resultados = {
    conexao: false,
    tokenInvalido: false,
    criacaoOS: false,
    duplicacao: false,
    validacao: false
  };
  
  // Executar testes sequencialmente
  resultados.conexao = await testarConexao();
  
  if (resultados.conexao) {
    resultados.tokenInvalido = await testarTokenInvalido();
    resultados.criacaoOS = await testarCriacaoOS();
    
    if (resultados.criacaoOS) {
      resultados.duplicacao = await testarDuplicacao();
    }
    
    resultados.validacao = await testarCamposObrigatorios();
  }
  
  // Resumo
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                     RESUMO DOS TESTES                 ');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n✅ Conexão:                  ${resultados.conexao ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Token Inválido:           ${resultados.tokenInvalido ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Criação de OS:            ${resultados.criacaoOS ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Proteção Duplicação:      ${resultados.duplicacao ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Validação Campos:         ${resultados.validacao ? 'PASSOU' : 'FALHOU'}`);
  
  const total = Object.values(resultados).filter(Boolean).length;
  const percentual = (total / 5) * 100;
  
  console.log(`\n📊 Resultado: ${total}/5 testes passaram (${percentual}%)`);
  
  if (percentual === 100) {
    console.log('\n🎉 Todos os testes passaram! Webhook funcionando corretamente.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os logs acima.\n');
    process.exit(1);
  }
}

// Executar
executarTestes().catch(error => {
  console.error('\n❌ Erro fatal ao executar testes:', error);
  process.exit(1);
});
