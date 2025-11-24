const mongoose = require('mongoose');

const configuracoesSchema = new mongoose.Schema({
  nomeSite: {
    type: String,
    default: 'Portal Finance - InstaSolutions'
  },
  logo: {
    type: String
  },
  emailContato: {
    type: String
  },
  telefoneContato: {
    type: String
  },
  endereco: {
    type: String
  },
  textoRodape: {
    type: String,
    default: '© 2024 InstaSolutions. Todos os direitos reservados.'
  },
  linkPrivacidade: {
    type: String,
    default: '/privacidade'
  },
  linkTermos: {
    type: String,
    default: '/termos'
  },
  corPrimaria: {
    type: String,
    default: '#005BED'
  },
  corSecundaria: {
    type: String,
    default: '#251C59'
  },
  senhaMestre: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Configuracoes', configuracoesSchema);
