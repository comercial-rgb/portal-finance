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

// Auto-gerar código sequencial OP-XXXX
ordemPagamentoSchema.pre('save', async function (next) {
  if (!this.codigo) {
    const ultima = await this.constructor.findOne({}, {}, { sort: { createdAt: -1 } });
    let proximo = 1;
    if (ultima && ultima.codigo) {
      const num = parseInt(ultima.codigo.replace('OP-', ''));
      if (!isNaN(num)) proximo = num + 1;
    }
    this.codigo = `OP-${String(proximo).padStart(4, '0')}`;
  }
  next();
});

// Índices
ordemPagamentoSchema.index({ fornecedor: 1, status: 1 });
ordemPagamentoSchema.index({ cliente: 1, createdAt: -1 });
ordemPagamentoSchema.index({ status: 1, createdAt: -1 });
ordemPagamentoSchema.index({ finsystemSincronizado: 1 });

module.exports = mongoose.model('OrdemPagamento', ordemPagamentoSchema);
