const mongoose = require('mongoose');

const notaFiscalClienteSchema = new mongoose.Schema({
  numeroNotaFiscal: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['Peças', 'Serviços', 'Geral'],
    default: 'Geral'
  },
  dataEmissao: {
    type: Date,
    required: true
  },
  dataVencimento: {
    type: Date,
    required: true
  },
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  centroCusto: {
    type: String,
    trim: true
  },
  subunidade: {
    type: String,
    trim: true
  },
  faturaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fatura',
    default: null
  },
  valorDevido: {
    type: Number,
    required: true,
    min: 0
  },
  observacoes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pendente', 'pago', 'vencido', 'cancelado'],
    default: 'pendente'
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices para otimizar consultas
notaFiscalClienteSchema.index({ clienteId: 1 });
notaFiscalClienteSchema.index({ faturaId: 1 });
notaFiscalClienteSchema.index({ numeroNotaFiscal: 1 });
notaFiscalClienteSchema.index({ dataVencimento: 1 });
notaFiscalClienteSchema.index({ status: 1 });

module.exports = mongoose.model('NotaFiscalCliente', notaFiscalClienteSchema);
