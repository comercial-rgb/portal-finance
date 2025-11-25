/**
 * Script para atualizar o clienteId de um usuário cliente
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function atualizarClienteUser() {
  try {
    console.log('\n🔄 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');

    const email = 'teste@cliente.com.br';
    const novoClienteId = '6924bdb3305610c7787412c5';

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ Usuário não encontrado com email: ${email}`);
      process.exit(1);
    }

    console.log('📋 Usuário encontrado:');
    console.log('   ID:', user._id.toString());
    console.log('   Nome:', user.nome);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   ClienteId atual:', user.clienteId || 'null');

    // Atualizar o clienteId
    user.clienteId = novoClienteId;
    await user.save();

    console.log('\n✅ Usuário atualizado com sucesso!');
    console.log('   Novo ClienteId:', user.clienteId.toString());

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

atualizarClienteUser();
