const mongoose = require('mongoose');

const ordemPagamentoSchema = new mongoose.Schema({
  numero: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
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
    trim: true,
    default: null
  },
  valor: {
    type: Number,
    required: [true, 'Valor é obrigatório'],
    min: [0.01, 'Valor deve ser maior que zero']
  },
  dataGeracao: {
    type: Date,
    required: [true, 'Data de geração é obrigatória'],
    default: Date.now
  },
  dataPagamento: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Pendente', 'Paga'],
    default: 'Pendente'
  },
  comprovante: {
    type: String,
    default: null
  },
  faturaVinculada: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fatura',
    default: null
  },
  observacoes: {
    type: String,
    trim: true,
    default: ''
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes para performance e segurança de consultas
ordemPagamentoSchema.index({ fornecedor: 1, createdAt: -1 });
ordemPagamentoSchema.index({ cliente: 1, createdAt: -1 });
ordemPagamentoSchema.index({ status: 1 });
ordemPagamentoSchema.index({ numero: 1 });
ordemPagamentoSchema.index({ fatura: 1 });
ordemPagamentoSchema.index({ faturaVinculada: 1 });

// Gerar número sequencial antes de salvar
ordemPagamentoSchema.pre('validate', async function(next) {
  if (this.isNew && !this.numero) {
    const ultimo = await mongoose.model('OrdemPagamento')
      .findOne({}, { numero: 1 })
      .sort({ createdAt: -1 })
      .lean();

    let proximo = 1;
    if (ultimo && ultimo.numero) {
      const match = ultimo.numero.match(/OP-(\d+)/);
      if (match) {
        proximo = parseInt(match[1], 10) + 1;
      }
    }
    this.numero = `OP-${String(proximo).padStart(3, '0')}`;
  }
  next();
});

const OrdemPagamento = mongoose.model('OrdemPagamento', ordemPagamentoSchema);
module.exports = OrdemPagamento;
