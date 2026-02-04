const mongoose = require('mongoose');
const Cliente = require('../models/Cliente');
require('dotenv').config();

async function verificarClienteTaxas() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado ao MongoDB');

    // Buscar todos os clientes
    const clientes = await Cliente.find();
    console.log(`\n📋 Total de clientes: ${clientes.length}\n`);

    for (const cliente of clientes) {
      console.log(`\n====== ${cliente.razaoSocial} ======`);
      console.log(`ID: ${cliente._id}`);
      console.log(`Tipo Taxa: ${cliente.tipoTaxa || 'NÃO DEFINIDO'}`);
      console.log(`Taxa Operação: ${cliente.taxaOperacao}%`);
      
      if (cliente.taxasAntecipacao) {
        console.log('Taxas Antecipação:');
        console.log(`  - À Vista: ${cliente.taxasAntecipacao.aVista}%`);
        console.log(`  - Após Fechamento: ${cliente.taxasAntecipacao.aposFechamento}%`);
        console.log(`  - Aprazado: ${cliente.taxasAntecipacao.aprazado}%`);
        console.log(`  - 30 Dias: ${cliente.taxasAntecipacao.dias30 !== undefined ? cliente.taxasAntecipacao.dias30 + '%' : 'NÃO DEFINIDO'}`);
        console.log(`  - 40 Dias: ${cliente.taxasAntecipacao.dias40 !== undefined ? cliente.taxasAntecipacao.dias40 + '%' : 'NÃO DEFINIDO'}`);
        console.log(`  - 50 Dias: ${cliente.taxasAntecipacao.dias50 !== undefined ? cliente.taxasAntecipacao.dias50 + '%' : 'NÃO DEFINIDO'}`);
        console.log(`  - 60 Dias: ${cliente.taxasAntecipacao.dias60 !== undefined ? cliente.taxasAntecipacao.dias60 + '%' : 'NÃO DEFINIDO'}`);
      } else {
        console.log('❌ NÃO TEM taxasAntecipacao definido');
      }

      // Verificar se precisa atualizar
      if (!cliente.taxasAntecipacao || 
          cliente.taxasAntecipacao.dias30 === undefined ||
          cliente.taxasAntecipacao.dias40 === undefined ||
          cliente.taxasAntecipacao.dias50 === undefined ||
          cliente.taxasAntecipacao.dias60 === undefined) {
        
        console.log('\n⚠️  PRECISA ATUALIZAR - Faltam campos de taxas\n');
        
        // Atualizar com valores padrão se não existirem
        if (!cliente.taxasAntecipacao) {
          cliente.taxasAntecipacao = {};
        }
        
        if (cliente.taxasAntecipacao.dias30 === undefined) cliente.taxasAntecipacao.dias30 = 0;
        if (cliente.taxasAntecipacao.dias40 === undefined) cliente.taxasAntecipacao.dias40 = 0;
        if (cliente.taxasAntecipacao.dias50 === undefined) cliente.taxasAntecipacao.dias50 = 0;
        if (cliente.taxasAntecipacao.dias60 === undefined) cliente.taxasAntecipacao.dias60 = 0;
        
        await cliente.save();
        console.log('✓ Cliente atualizado com sucesso!\n');
      } else {
        console.log('\n✓ Cliente OK - Todos os campos estão definidos\n');
      }
    }

    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

verificarClienteTaxas();
