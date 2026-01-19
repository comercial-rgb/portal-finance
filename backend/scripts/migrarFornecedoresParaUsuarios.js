const mongoose = require('mongoose');
const User = require('../models/User');
const Fornecedor = require('../models/Fornecedor');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Script para migrar fornecedores existentes sem usuário
 * Cria automaticamente usuários para todos os fornecedores que não possuem um
 * 
 * Uso: node backend/scripts/migrarFornecedoresParaUsuarios.js
 */

const migrarFornecedores = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-finance');
    console.log('✅ Conectado ao MongoDB');

    // Buscar todos os fornecedores
    const fornecedores = await Fornecedor.find({});
    console.log(`\n📋 Total de fornecedores encontrados: ${fornecedores.length}`);

    let migrados = 0;
    let jaExistentes = 0;
    let erros = 0;

    for (const fornecedor of fornecedores) {
      try {
        // Verificar se já existe um usuário para este fornecedor
        const usuarioExistente = await User.findOne({ 
          $or: [
            { fornecedorId: fornecedor._id },
            { email: fornecedor.email }
          ]
        });

        if (usuarioExistente) {
          // Se o usuário existe mas não está vinculado, vincular
          if (!usuarioExistente.fornecedorId || usuarioExistente.fornecedorId.toString() !== fornecedor._id.toString()) {
            usuarioExistente.fornecedorId = fornecedor._id;
            usuarioExistente.role = 'fornecedor';
            await usuarioExistente.save();
            console.log(`🔗 Usuário vinculado ao fornecedor: ${fornecedor.razaoSocial} (${fornecedor.email})`);
            migrados++;
          } else {
            console.log(`⏭️  Usuário já existe para: ${fornecedor.razaoSocial} (${fornecedor.email})`);
            jaExistentes++;
          }
          continue;
        }

        // Criar novo usuário para o fornecedor
        // Gerar uma senha temporária (o fornecedor deverá alterar no primeiro acesso)
        const senhaTemporaria = Math.random().toString(36).slice(-8) + 'Temp123!';
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senhaTemporaria, salt);

        const novoUsuario = await User.create({
          nome: fornecedor.nomeFantasia || fornecedor.razaoSocial,
          email: fornecedor.email,
          senha: senhaHash,
          telefone: fornecedor.telefone,
          role: 'fornecedor',
          fornecedorId: fornecedor._id,
          ativo: true,
          mustChangePassword: true,
          senhaTemporaria: senhaTemporaria
        });

        console.log(`✅ Novo usuário criado para: ${fornecedor.razaoSocial} (${fornecedor.email})`);
        console.log(`   Senha temporária: ${senhaTemporaria}`);
        migrados++;

      } catch (error) {
        console.error(`❌ Erro ao processar fornecedor ${fornecedor.razaoSocial}:`, error.message);
        erros++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA MIGRAÇÃO:');
    console.log('='.repeat(60));
    console.log(`Total de fornecedores processados: ${fornecedores.length}`);
    console.log(`✅ Usuários criados/vinculados: ${migrados}`);
    console.log(`⏭️  Usuários já existentes: ${jaExistentes}`);
    console.log(`❌ Erros: ${erros}`);
    console.log('='.repeat(60));

    if (migrados > 0) {
      console.log('\n⚠️  IMPORTANTE:');
      console.log('   - As senhas temporárias foram exibidas acima');
      console.log('   - Os fornecedores devem alterar suas senhas no primeiro acesso');
      console.log('   - Recomenda-se usar a funcionalidade "Esqueci minha senha"');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
};

// Confirmar antes de executar
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  Este script irá criar usuários para todos os fornecedores que não possuem um.');
console.log('   Senhas temporárias serão geradas e exibidas no console.\n');

readline.question('Deseja continuar? (s/n): ', (resposta) => {
  readline.close();
  if (resposta.toLowerCase() === 's' || resposta.toLowerCase() === 'sim') {
    migrarFornecedores();
  } else {
    console.log('Operação cancelada.');
    process.exit(0);
  }
});
