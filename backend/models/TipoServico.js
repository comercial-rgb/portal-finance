const mongoose = require('mongoose');

const tipoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome do tipo é obrigatório'],
    trim: true
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const tipoServicoSolicitadoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome do tipo de serviço solicitado é obrigatório'],
    trim: true
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Tipo = mongoose.model('Tipo', tipoSchema);
const TipoServicoSolicitado = mongoose.model('TipoServicoSolicitado', tipoServicoSolicitadoSchema);

module.exports = { Tipo, TipoServicoSolicitado };
