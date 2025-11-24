/**
 * Script para criar usuário do tipo Cliente
 * Uso: node backend/scripts/createClienteUser.js <email> <senha> <clienteId>
 * Exemplo: node backend/scripts/createClienteUser.js joao@cliente.com senha123 <mongoClienteId>
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Cliente = require('../models/Cliente');

// URL de conexão com MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:senha123@localhost:27017/portalfinance?authSource=admin';

async function createClienteUser() {
  try {
    // Validar argumentos
    if (process.argv.length < 5) {
      console.log('\n❌ Uso: node backend/scripts/createClienteUser.js <email> <senha> <clienteId>');
      console.log('Exemplo: node backend/scripts/createClienteUser.js joao@cliente.com senha123 <mongoClienteId>\n');
      process.exit(1);
    }

    const email = process.argv[2];
    const senha = process.argv[3];
    const clienteId = process.argv[4];

    console.log('\n🔄 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');

    // Verificar se cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      console.log(`❌ Cliente não encontrado com ID: ${clienteId}`);
      console.log('\n💡 Dica: Para listar clientes, execute:');
      console.log('   mongo portalfinance --eval "db.clientes.find({}, {_id:1, razaoSocial:1, nomeFantasia:1})"\n');
      process.exit(1);
    }

    console.log(`📋 Cliente encontrado: ${cliente.razaoSocial || cliente.nomeFantasia}`);

    // Verificar se já existe usuário com este email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`❌ Já existe um usuário com o email: ${email}\n`);
      process.exit(1);
    }

    // Verificar se já existe usuário para este cliente
    const existingClienteUser = await User.findOne({ clienteId });
    if (existingClienteUser) {
      console.log(`⚠️  Já existe um usuário vinculado a este cliente:`);
      console.log(`   Email: ${existingClienteUser.email}`);
      console.log(`   Nome: ${existingClienteUser.nome || 'Não informado'}`);
      console.log(`\n❓ Deseja criar um novo usuário para este cliente? (S/N)`);
      
      // Aguardar confirmação do usuário
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const resposta = await new Promise(resolve => {
        readline.question('', answer => {
          readline.close();
          resolve(answer.trim().toUpperCase());
        });
      });

      if (resposta !== 'S' && resposta !== 'SIM') {
        console.log('\n❌ Operação cancelada pelo usuário\n');
        process.exit(0);
      }
    }

    // Criar novo usuário
    console.log('\n🔄 Criando usuário cliente...');
    
    const newUser = new User({
      nome: cliente.razaoSocial || cliente.nomeFantasia,
      email,
      senha,
      role: 'cliente',
      clienteId,
      telefone: cliente.telefone || '',
      cpf: cliente.cnpjCpf || ''
    });

    await newUser.save();

    console.log('\n✅ Usuário cliente criado com sucesso!');
    console.log('\n📋 Detalhes do usuário:');
    console.log('─────────────────────────────────────────');
    console.log(`   ID: ${newUser._id}`);
    console.log(`   Nome: ${newUser.nome}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Cliente: ${cliente.razaoSocial || cliente.nomeFantasia}`);
    console.log(`   Cliente ID: ${newUser.clienteId}`);
    console.log('─────────────────────────────────────────');
    console.log('\n💡 O usuário pode fazer login em:');
    console.log('   http://localhost:3000/login');
    console.log('\n✨ Permissões:');
    console.log('   ✓ Visualizar Ordens de Serviço do cliente (somente leitura)');
    console.log('   ✓ Visualizar Faturas do cliente (somente leitura)');
    console.log('   ✓ Editar próprio perfil');
    console.log('   ✗ Criar ou editar Ordens de Serviço');
    console.log('   ✗ Criar ou editar Faturas');
    console.log('   ✗ Acessar dados de outros clientes\n');

  } catch (error) {
    console.error('\n❌ Erro ao criar usuário cliente:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão com MongoDB encerrada\n');
  }
}

createClienteUser();
