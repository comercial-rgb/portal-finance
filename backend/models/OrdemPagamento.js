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
  if (!this.codigo) {
    try {
      // Counter atômico — findOneAndUpdate com $inc garante unicidade sem race condition
      const CounterModel = mongoose.connection.collection('counters');
      const result = await CounterModel.findOneAndUpdate(
        { _id: 'ordemPagamento' },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
      this.codigo = `OP-${String(result.seq).padStart(4, '0')}`;
    } catch (error) {
      // Fallback: ler o maior código existente se counter falhar na primeira vez
      const todas = await this.constructor
        .find({ codigo: { $regex: /^OP-\d+$/ } })
        .select('codigo')
        .lean();
      let maiorNum = 0;
      for (const doc of todas) {
        const num = parseInt(doc.codigo.replace('OP-', ''));
        if (!isNaN(num) && num > maiorNum) maiorNum = num;
      }
      const nextNum = maiorNum + 1;
      // Inicializar counter para próximas vezes
      await mongoose.connection.collection('counters').updateOne(
        { _id: 'ordemPagamento' },
        { $set: { seq: nextNum } },
        { upsert: true }
      );
      this.codigo = `OP-${String(nextNum).padStart(4, '0')}`;
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
