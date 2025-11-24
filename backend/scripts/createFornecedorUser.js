const mongoose = require('mongoose');
const User = require('../models/User');
const Fornecedor = require('../models/Fornecedor');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Script para criar usuário fornecedor
 * Uso: node backend/scripts/createFornecedorUser.js
 */

const criarUsuarioFornecedor = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-finance');
    console.log('✅ Conectado ao MongoDB');

    // Listar fornecedores disponíveis
    const fornecedores = await Fornecedor.find({ ativo: true });
    
    if (fornecedores.length === 0) {
      console.log('❌ Nenhum fornecedor ativo encontrado no sistema.');
      console.log('   Primeiro cadastre um fornecedor antes de criar um usuário fornecedor.');
      process.exit(1);
    }

    console.log('\n📋 Fornecedores disponíveis:');
    fornecedores.forEach((f, index) => {
      console.log(`   ${index + 1}. ${f.razaoSocial} (${f.nomeFantasia}) - CNPJ: ${f.cnpjCpf}`);
    });

    // Solicitar dados do usuário
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const pergunta = (query) => new Promise(resolve => readline.question(query, resolve));

    console.log('\n📝 Criar novo usuário fornecedor:\n');
    
    const indice = await pergunta('Digite o número do fornecedor: ');
    const fornecedorEscolhido = fornecedores[parseInt(indice) - 1];
    
    if (!fornecedorEscolhido) {
      console.log('❌ Fornecedor inválido');
      process.exit(1);
    }

    const nome = await pergunta('Nome completo do usuário: ');
    const email = await pergunta('E-mail: ');
    const cpf = await pergunta('CPF (opcional): ');
    const telefone = await pergunta('Telefone (opcional): ');
    const senha = await pergunta('Senha (mínimo 6 caracteres): ');

    readline.close();

    if (!nome || !email || !senha) {
      console.log('❌ Nome, email e senha são obrigatórios');
      process.exit(1);
    }

    if (senha.length < 6) {
      console.log('❌ Senha deve ter no mínimo 6 caracteres');
      process.exit(1);
    }

    // Verificar se email já existe
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      console.log('❌ Já existe um usuário com este email');
      process.exit(1);
    }

    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    // Criar usuário
    const novoUsuario = await User.create({
      nome,
      email,
      senha: senhaHash,
      cpf: cpf || undefined,
      telefone: telefone || undefined,
      role: 'fornecedor',
      fornecedorId: fornecedorEscolhido._id,
      ativo: true
    });

    console.log('\n✅ Usuário fornecedor criado com sucesso!');
    console.log('\n📌 Detalhes do usuário:');
    console.log(`   Nome: ${novoUsuario.nome}`);
    console.log(`   Email: ${novoUsuario.email}`);
    console.log(`   Role: ${novoUsuario.role}`);
    console.log(`   Fornecedor: ${fornecedorEscolhido.razaoSocial}`);
    console.log(`   Status: ${novoUsuario.ativo ? 'Ativo' : 'Inativo'}`);
    console.log('\n🔑 O usuário pode fazer login com:');
    console.log(`   Email: ${novoUsuario.email}`);
    console.log(`   Senha: (a senha informada)\n`);
    console.log('🔒 Permissões do usuário fornecedor:');
    console.log('   ✓ Visualizar suas Ordens de Serviço (somente leitura)');
    console.log('   ✓ Visualizar suas Faturas (somente leitura)');
    console.log('   ✓ Visualizar seus Faturados (somente leitura)');
    console.log('   ✓ Editar seu perfil (notifica administradores)');
    console.log('   ✗ Não pode criar/editar/excluir dados\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuário fornecedor:', error.message);
    process.exit(1);
  }
};

criarUsuarioFornecedor();
