const mongoose = require('mongoose');

const ordemPagamentoSchema = new mongoose.Schema({
  // Código sequencial auto-gerado (OP-0001)
  codigo: {
    type: String,
    unique: true
  },

  // Relacionamentos
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'Cliente é obrigatório']
  },
  fornecedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fornecedor',
    required: [true, 'Fornecedor é obrigatório']
  },
  fatura: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fatura',
    default: null
  },
  faturaNumeroManual: {
    type: String,
    default: null
  },

  // Valores
  valor: {
    type: Number,
    required: [true, 'Valor é obrigatório'],
    min: [0.01, 'Valor deve ser maior que zero']
  },

  // Datas
  dataGeracao: {
    type: Date,
    required: [true, 'Data de geração é obrigatória'],
    default: Date.now
  },
  dataPagamento: {
    type: Date,
    default: null
  },

  // Status: Pendente -> Paga -> Cancelada
  status: {
    type: String,
    enum: ['Pendente', 'Paga', 'Cancelada'],
    default: 'Pendente'
  },

  // Comprovante de pagamento (base64 ou URL)
  comprovante: {
    type: String,
    default: null
  },

  // Nota de comissão PDF (base64 ou URL)
  notaComissao: {
    type: String,
    default: null
  },

  observacoes: {
    type: String,
    default: ''
  },

  // Integração com FinSystem
  finsystemId: {
    type: Number,
    default: null
  },
  finsystemSincronizado: {
    type: Boolean,
    default: false
  },
  finsystemErro: {
    type: String,
    default: null
  },
  finsystemIgnorado: {
    type: Boolean,
    default: false
  },

  // Quem criou
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Auto-gerar código sequencial OP-XXXX via counter atômico
ordemPagamentoSchema.pre('save', async function (next) {
  if (this.codigo) return next();
  
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Counter atômico — $inc garante unicidade mesmo com requisições concorrentes
      const counters = mongoose.connection.db.collection('counters');
      const result = await counters.findOneAndUpdate(
        { _id: 'ordemPagamento' },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
      
      const seq = result?.seq || result?.value?.seq;
      if (!seq) throw new Error('Counter retornou sem seq');
      
      this.codigo = `OP-${String(seq).padStart(4, '0')}`;
      
      // Verificar se código já existe (safety check)
      const existe = await this.constructor.findOne({ codigo: this.codigo }).lean();
      if (!existe) {
        return next(); // Código único, prosseguir
      }
      
      // Se existe, o counter estava desatualizado — corrigir e tentar de novo
      console.warn(`⚠️ OP código ${this.codigo} já existe, sincronizando counter...`);
      const todas = await this.constructor
        .find({ codigo: { $regex: /^OP-\d+$/ } })
        .select('codigo')
        .lean();
      let maiorNum = 0;
      for (const doc of todas) {
        const num = parseInt(doc.codigo.replace('OP-', ''));
        if (!isNaN(num) && num > maiorNum) maiorNum = num;
      }
      // Atualizar counter para o valor correto (só se for maior)
      await counters.updateOne(
        { _id: 'ordemPagamento', seq: { $lt: maiorNum + 1 } },
        { $set: { seq: maiorNum + 1 } }
      );
      this.codigo = undefined; // Reset para próxima tentativa
      
    } catch (error) {
      console.error(`❌ Erro ao gerar código OP (tentativa ${attempt + 1}):`, error.message);
      if (attempt === maxRetries - 1) {
        return next(new Error('Não foi possível gerar código único para ordem de pagamento'));
      }
    }
  }
  next();
});

// Índices
ordemPagamentoSchema.index({ fornecedor: 1, status: 1 });
ordemPagamentoSchema.index({ cliente: 1, createdAt: -1 });
ordemPagamentoSchema.index({ status: 1, createdAt: -1 });
ordemPagamentoSchema.index({ finsystemSincronizado: 1 });

module.exports = mongoose.model('OrdemPagamento', ordemPagamentoSchema);
