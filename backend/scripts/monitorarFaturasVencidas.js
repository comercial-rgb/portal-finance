const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const Fatura = require('../models/Fatura');
const Notificacao = require('../models/Notificacao');
const User = require('../models/User');

async function monitorarFaturasVencidas() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-finance');
    console.log('📊 Conectado ao MongoDB');

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Buscar faturas de cliente vencidas e não pagas
    const faturasVencidas = await Fatura.find({
      tipo: 'Cliente',
      dataVencimento: { $lt: hoje },
      statusFatura: { $ne: 'Paga' }
    }).populate('cliente', 'razaoSocial nomeFantasia');

    console.log(`🔍 Encontradas ${faturasVencidas.length} faturas vencidas`);

    if (faturasVencidas.length === 0) {
      console.log('✅ Nenhuma fatura vencida encontrada');
      await mongoose.connection.close();
      return;
    }

    // Buscar administradores ativos
    const admins = await User.find({ 
      role: { $in: ['super_admin', 'admin'] },
      ativo: true 
    });

    let notificacoesCriadas = 0;

    for (const fatura of faturasVencidas) {
      // Verificar se já existe notificação para esta fatura vencida hoje
      const notificacaoExistente = await Notificacao.findOne({
        tipo: 'fatura_vencida',
        fatura: fatura._id,
        createdAt: { $gte: hoje }
      });

      if (notificacaoExistente) {
        console.log(`⏭️  Notificação já existe para fatura ${fatura.numeroFatura}`);
        continue;
      }

      const nomeCliente = fatura.cliente?.razaoSocial || fatura.cliente?.nomeFantasia || 'Cliente';
      const diasVencidos = Math.floor((hoje - fatura.dataVencimento) / (1000 * 60 * 60 * 24));
      
      const notificacoes = admins.map(admin => ({
        tipo: 'fatura_vencida',
        titulo: '⚠️ Fatura Vencida',
        mensagem: `A fatura ${fatura.numeroFatura} do cliente ${nomeCliente} está vencida há ${diasVencidos} dia(s). Valor: R$ ${fatura.valorDevido.toFixed(2)}`,
        usuario: admin._id,
        cliente: fatura.cliente._id,
        fatura: fatura._id,
        alteracoes: {
          numeroFatura: fatura.numeroFatura,
          dataVencimento: fatura.dataVencimento,
          diasVencidos,
          valorDevido: fatura.valorDevido,
          valorRestante: fatura.valorRestante
        }
      }));

      await Notificacao.insertMany(notificacoes);
      notificacoesCriadas += notificacoes.length;
      console.log(`📬 Criadas ${notificacoes.length} notificações para fatura ${fatura.numeroFatura}`);
    }

    console.log(`✅ Total de ${notificacoesCriadas} notificações criadas para ${faturasVencidas.length} faturas vencidas`);
    
    await mongoose.connection.close();
    console.log('🔌 Desconectado do MongoDB');
  } catch (error) {
    console.error('❌ Erro ao monitorar faturas vencidas:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

monitorarFaturasVencidas();
