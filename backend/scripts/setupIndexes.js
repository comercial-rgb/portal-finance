/**
 * Script para criar índices otimizados no MongoDB
 * Executar: node backend/scripts/setupIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Importar models
const Cliente = require('../models/Cliente');
const Fornecedor = require('../models/Fornecedor');
const OrdemServico = require('../models/OrdemServico');
const User = require('../models/User');
const ImpostosRetencoes = require('../models/ImpostosRetencoes');

async function setupIndexes() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://172.17.0.2:27017/portal-finance');

    console.log('✅ Conectado ao MongoDB');

    // ÍNDICES PARA CLIENTES
    console.log('\n📊 Criando índices para Clientes...');
    
    // Dropar índices antigos exceto os únicos do schema
    try {
      const indexes = await Cliente.collection.getIndexes();
      for (const indexName of Object.keys(indexes)) {
        if (indexName !== '_id_' && indexName !== 'cnpj_1') {
          await Cliente.collection.dropIndex(indexName);
        }
      }
      console.log('🗑️  Índices não-únicos de Clientes removidos');
    } catch (e) {
      console.log('ℹ️  Nenhum índice para remover');
    }
    
    await Cliente.collection.createIndex({ razaoSocial: 1 }, { name: 'idx_razao_social' });
    await Cliente.collection.createIndex({ nomeFantasia: 1 }, { name: 'idx_nome_fantasia' });
    await Cliente.collection.createIndex({ 'endereco.cidade': 1 }, { name: 'idx_cidade' });
    await Cliente.collection.createIndex({ 'endereco.estado': 1 }, { name: 'idx_estado' });
    await Cliente.collection.createIndex({ ativo: 1 }, { name: 'idx_ativo' });
    await Cliente.collection.createIndex({ createdAt: -1 }, { name: 'idx_created_at' });
    // Índice composto para busca por texto
    await Cliente.collection.createIndex(
      { razaoSocial: 'text', nomeFantasia: 'text' },
      { name: 'idx_text_search', weights: { razaoSocial: 2, nomeFantasia: 1 } }
    );
    console.log('✅ Índices de Clientes criados (mantido cnpj_1 único existente)');

    // ÍNDICES PARA FORNECEDORES
    console.log('\n📊 Criando índices para Fornecedores...');
    
    try {
      const indexes = await Fornecedor.collection.getIndexes();
      for (const indexName of Object.keys(indexes)) {
        if (indexName !== '_id_' && indexName !== 'cnpjCpf_1' && indexName !== 'email_1') {
          await Fornecedor.collection.dropIndex(indexName);
        }
      }
      console.log('🗑️  Índices não-únicos de Fornecedores removidos');
    } catch (e) {
      console.log('ℹ️  Nenhum índice para remover');
    }
    
    await Fornecedor.collection.createIndex({ razaoSocial: 1 }, { name: 'idx_fornecedor_razao' });
    await Fornecedor.collection.createIndex({ nomeFantasia: 1 }, { name: 'idx_fornecedor_fantasia' });
    await Fornecedor.collection.createIndex({ naoOptanteSimples: 1 }, { name: 'idx_nao_optante' });
    await Fornecedor.collection.createIndex({ role: 1 }, { name: 'idx_fornecedor_role' });
    await Fornecedor.collection.createIndex(
      { razaoSocial: 'text', nomeFantasia: 'text' },
      { name: 'idx_fornecedor_text' }
    );
    console.log('✅ Índices de Fornecedores criados');

    // ÍNDICES PARA ORDENS DE SERVIÇO
    console.log('\n📊 Criando índices para Ordens de Serviço...');
    
    try {
      const indexes = await OrdemServico.collection.getIndexes();
      for (const indexName of Object.keys(indexes)) {
        if (indexName !== '_id_' && indexName !== 'codigo_1') {
          await OrdemServico.collection.dropIndex(indexName);
        }
      }
      console.log('🗑️  Índices não-únicos de Ordens de Serviço removidos');
    } catch (e) {
      console.log('ℹ️  Nenhum índice para remover');
    }
    
    await OrdemServico.collection.createIndex({ numeroOrdemServico: 1 }, { name: 'idx_os_numero' });
    await OrdemServico.collection.createIndex({ cliente: 1 }, { name: 'idx_os_cliente' });
    await OrdemServico.collection.createIndex({ fornecedor: 1 }, { name: 'idx_os_fornecedor' });
    await OrdemServico.collection.createIndex({ status: 1 }, { name: 'idx_os_status' });
    await OrdemServico.collection.createIndex({ createdAt: -1 }, { name: 'idx_os_created' });
    await OrdemServico.collection.createIndex({ dataEmissao: -1 }, { name: 'idx_os_data_emissao' });
    await OrdemServico.collection.createIndex({ placa: 1 }, { name: 'idx_os_placa' });
    await OrdemServico.collection.createIndex({ centroCusto: 1 }, { name: 'idx_os_centro_custo' });
    // Índices compostos para queries frequentes
    await OrdemServico.collection.createIndex(
      { fornecedor: 1, status: 1, createdAt: -1 },
      { name: 'idx_os_fornecedor_status' }
    );
    await OrdemServico.collection.createIndex(
      { cliente: 1, dataEmissao: -1 },
      { name: 'idx_os_cliente_data' }
    );
    await OrdemServico.collection.createIndex(
      { fornecedor: 1, dataEmissao: -1 },
      { name: 'idx_os_fornecedor_data' }
    );
    console.log('✅ Índices de Ordens de Serviço criados');

    // ÍNDICES PARA USUÁRIOS
    console.log('\n📊 Criando índices para Usuários...');
    
    try {
      const indexes = await User.collection.getIndexes();
      for (const indexName of Object.keys(indexes)) {
        if (indexName !== '_id_' && indexName !== 'email_1' && indexName !== 'cpf_1') {
          await User.collection.dropIndex(indexName);
        }
      }
      console.log('🗑️  Índices não-únicos de Usuários removidos');
    } catch (e) {
      console.log('ℹ️  Nenhum índice para remover');
    }
    
    await User.collection.createIndex({ role: 1 }, { name: 'idx_user_role' });
    await User.collection.createIndex({ ativo: 1 }, { name: 'idx_user_ativo' });
    await User.collection.createIndex({ resetPasswordToken: 1 }, { name: 'idx_reset_token', sparse: true });
    await User.collection.createIndex({ resetPasswordExpire: 1 }, { name: 'idx_reset_expire', sparse: true });
    console.log('✅ Índices de Usuários criados');

    // ÍNDICES PARA IMPOSTOS E RETENÇÕES
    console.log('\n📊 Criando índices para Impostos e Retenções...');
    
    try {
      const indexes = await ImpostosRetencoes.collection.getIndexes();
      for (const indexName of Object.keys(indexes)) {
        if (indexName !== '_id_') {
          await ImpostosRetencoes.collection.dropIndex(indexName);
        }
      }
      console.log('🗑️  Índices antigos de Impostos removidos');
    } catch (e) {
      console.log('ℹ️  Nenhum índice para remover');
    }
    
    await ImpostosRetencoes.collection.createIndex({ nome: 1 }, { name: 'idx_imposto_nome' });
    await ImpostosRetencoes.collection.createIndex({ tipo: 1 }, { name: 'idx_imposto_tipo' });
    await ImpostosRetencoes.collection.createIndex({ ativo: 1 }, { name: 'idx_imposto_ativo' });
    console.log('✅ Índices de Impostos criados');

    console.log('\n🎉 Todos os índices foram criados com sucesso!');
    
    // Mostrar estatísticas
    console.log('\n📈 Estatísticas dos índices:');
    const clienteIndexes = await Cliente.collection.getIndexes();
    const fornecedorIndexes = await Fornecedor.collection.getIndexes();
    const ordemIndexes = await OrdemServico.collection.getIndexes();
    const userIndexes = await User.collection.getIndexes();
    
    console.log(`Clientes: ${Object.keys(clienteIndexes).length} índices`);
    console.log(`Fornecedores: ${Object.keys(fornecedorIndexes).length} índices`);
    console.log(`Ordens de Serviço: ${Object.keys(ordemIndexes).length} índices`);
    console.log(`Usuários: ${Object.keys(userIndexes).length} índices`);

  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Conexão com MongoDB encerrada');
    process.exit(0);
  }
}

// Executar
setupIndexes();
