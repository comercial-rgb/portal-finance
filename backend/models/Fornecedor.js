const mongoose = require('mongoose');

const fornecedorSchema = new mongoose.Schema({
  razaoSocial: {
    type: String,
    required: true
  },
  nomeFantasia: {
    type: String,
    required: true
  },
  cnpjCpf: {
    type: String,
    required: true,
    unique: true
  },
  inscricaoEstadual: {
    type: String
  },
  endereco: {
    type: String,
    required: true
  },
  bairro: {
    type: String,
    required: true
  },
  cidade: {
    type: String,
    required: true
  },
  estado: {
    type: String,
    required: true
  },
  cep: {
    type: String
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  telefone: {
    type: String,
    required: true
  },
  banco: {
    type: String,
    required: true
  },
  tipoConta: {
    type: String,
    required: true,
    enum: ['corrente', 'poupanca', 'pagamento']
  },
  agencia: {
    type: String,
    required: true
  },
  conta: {
    type: String,
    required: true
  },
  chavePix: {
    type: String
  },
  tipoChavePix: {
    type: String,
    enum: ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria', '']
  },
  senha: {
    type: String,
    required: true
  },
  naoOptanteSimples: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    default: 'fornecedor'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Fornecedor', fornecedorSchema);
