const mongoose = require('mongoose');
const Cliente = require('../models/Cliente');
require('dotenv').config();

async function atualizarClienteIBGE() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado ao MongoDB');

    // Buscar cliente IBGE
    const cliente = await Cliente.findOne({ 
      razaoSocial: /Fundação Instituto Brasileiro de Geografia e Estatística/i 
    });

    if (!cliente) {
      console.log('❌ Cliente IBGE não encontrado');
      process.exit(1);
    }

    console.log(`\n====== ${cliente.razaoSocial} ======`);
    console.log(`ID: ${cliente._id}`);
    console.log(`\n📊 CONFIGURAÇÃO ATUAL:`);
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

    // Garantir que taxasAntecipacao existe
    if (!cliente.taxasAntecipacao) {
      cliente.taxasAntecipacao = {
        aVista: 15,
        aposFechamento: 13,
        aprazado: 0,
        dias30: 0,
        dias40: 0,
        dias50: 0,
        dias60: 0
      };
    } else {
      // Garantir que os novos campos existem
      if (cliente.taxasAntecipacao.dias30 === undefined) cliente.taxasAntecipacao.dias30 = 0;
      if (cliente.taxasAntecipacao.dias40 === undefined) cliente.taxasAntecipacao.dias40 = 0;
      if (cliente.taxasAntecipacao.dias50 === undefined) cliente.taxasAntecipacao.dias50 = 0;
      if (cliente.taxasAntecipacao.dias60 === undefined) cliente.taxasAntecipacao.dias60 = 0;
    }

    // Se tipoTaxa não está definido, definir como antecipacao_variavel
    if (!cliente.tipoTaxa) {
      cliente.tipoTaxa = 'antecipacao_variavel';
      console.log('\n✓ Definindo tipoTaxa como "antecipacao_variavel"');
    }

    await cliente.save();
    
    console.log('\n✅ Cliente IBGE atualizado com sucesso!');
    console.log('\n📊 NOVA CONFIGURAÇÃO:');
    console.log(`Tipo Taxa: ${cliente.tipoTaxa}`);
    console.log('Taxas Antecipação:');
    console.log(`  - À Vista: ${cliente.taxasAntecipacao.aVista}%`);
    console.log(`  - Após Fechamento: ${cliente.taxasAntecipacao.aposFechamento}%`);
    console.log(`  - Aprazado: ${cliente.taxasAntecipacao.aprazado}%`);
    console.log(`  - 30 Dias: ${cliente.taxasAntecipacao.dias30}%`);
    console.log(`  - 40 Dias: ${cliente.taxasAntecipacao.dias40}%`);
    console.log(`  - 50 Dias: ${cliente.taxasAntecipacao.dias50}%`);
    console.log(`  - 60 Dias: ${cliente.taxasAntecipacao.dias60}%`);
    
    console.log('\n⚠️  IMPORTANTE: Agora vá no cadastro do cliente e configure os percentuais corretos para cada tipo de pagamento!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

atualizarClienteIBGE();
