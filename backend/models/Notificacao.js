const mongoose = require('mongoose');

const notificacaoSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['perfil_fornecedor_atualizado', 'perfil_cliente_atualizado', 'fatura_criada', 'fatura_vencida', 'ordem_servico_criada', 'outros'],
    required: true
  },
  titulo: {
    type: String,
    required: true
  },
  mensagem: {
    type: String,
    required: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fornecedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fornecedor'
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente'
  },
  fatura: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fatura'
  },
  alteracoes: {
    type: Object,
    default: {}
  },
  lida: {
    type: Boolean,
    default: false
  },
  dataLeitura: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notificacao', notificacaoSchema);
