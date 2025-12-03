const mongoose = require('mongoose');

const antecipacaoSchema = new mongoose.Schema({
  // Referência ao fornecedor
  fornecedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fornecedor',
    required: [true, 'Fornecedor é obrigatório']
  },
  // Usuário que solicitou
  solicitadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário solicitante é obrigatório']
  },
  // Faturas relacionadas
  faturas: [{
    fatura: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fatura',
      required: true
    },
    valorUtilizado: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  // Valores
  valorSolicitado: {
    type: Number,
    required: [true, 'Valor solicitado é obrigatório'],
    min: [0.01, 'Valor deve ser maior que zero']
  },
  taxaAplicada: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  valorDesconto: {
    type: Number,
    required: true,
    min: 0
  },
  valorAReceber: {
    type: Number,
    required: true,
    min: 0
  },
  // Datas
  dataSolicitacao: {
    type: Date,
    default: Date.now
  },
  dataDesejadaRecebimento: {
    type: Date,
    required: [true, 'Data desejada de recebimento é obrigatória']
  },
  previsaoRecebimentoOriginal: {
    type: Date,
    required: true
  },
  diasAntecipados: {
    type: Number,
    required: true,
    min: 1,
    max: 30
  },
  // Status
  status: {
    type: String,
    enum: ['Pendente', 'Aprovada', 'Rejeitada', 'Paga', 'Cancelada'],
    default: 'Pendente'
  },
  // Admin que processou
  processadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dataProcessamento: {
    type: Date
  },
  dataPagamento: {
    type: Date
  },
  // Comprovante
  comprovantePagamento: {
    type: String // URL ou base64 do arquivo
  },
  // Observações
  observacoes: {
    type: String,
    trim: true
  },
  observacoesAdmin: {
    type: String,
    trim: true
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para melhor performance
antecipacaoSchema.index({ fornecedor: 1, status: 1 });
antecipacaoSchema.index({ solicitadoPor: 1, createdAt: -1 });
antecipacaoSchema.index({ status: 1, createdAt: -1 });

const Antecipacao = mongoose.model('Antecipacao', antecipacaoSchema);

module.exports = Antecipacao;
