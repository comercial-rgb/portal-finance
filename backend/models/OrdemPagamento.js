const mongoose = require('mongoose');

const ordemPagamentoSchema = new mongoose.Schema({
  // Código sequencial auto-gerado (OP-0001)
  // sparse=true evita colisão com documentos legados que por ventura
  // tenham sido gravados sem código (null) e bloqueiem novos inserts.
  codigo: {
    type: String,
    unique: true,
    sparse: true
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
  if (this.codigo) return next();
  try {
    const [ultima] = await this.constructor.aggregate([
      { $match: { codigo: { $regex: '^OP-[0-9]+$' } } },
      {
        $project: {
          codigo: 1,
          numeroCodigo: { $toInt: { $arrayElemAt: [{ $split: ['$codigo', '-'] }, 1] } }
        }
      },
      { $sort: { numeroCodigo: -1 } },
      { $limit: 1 }
    ]);

    let proximo = 1;
    if (ultima && ultima.codigo) {
      const num = parseInt(ultima.codigo.replace('OP-', ''), 10);
      if (!isNaN(num)) proximo = num + 1;
    } else {
      // Fallback: se aggregate não retornou nada mas já existem documentos,
      // usa contagem como base para não reiniciar o sequencial.
      const total = await this.constructor.countDocuments({});
      if (total > 0) proximo = total + 1;
    }

    this.codigo = `OP-${String(proximo).padStart(4, '0')}`;
    next();
  } catch (err) {
    // Último fallback: timestamp para não deixar o save com código null
    // (que seria bloqueado pelo unique index).
    this.codigo = `OP-${Date.now().toString().slice(-8)}`;
    console.error('⚠️ Falha ao gerar código sequencial de OP, usando fallback:', err.message);
    next();
  }
});

// Índices
ordemPagamentoSchema.index({ fornecedor: 1, status: 1 });
ordemPagamentoSchema.index({ cliente: 1, createdAt: -1 });
ordemPagamentoSchema.index({ status: 1, createdAt: -1 });
ordemPagamentoSchema.index({ finsystemSincronizado: 1 });

module.exports = mongoose.model('OrdemPagamento', ordemPagamentoSchema);
