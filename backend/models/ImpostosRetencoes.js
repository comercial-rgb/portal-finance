const mongoose = require('mongoose');

const impostosRetencoesSchema = new mongoose.Schema({
  // Impostos Fora do Simples - Órgãos Municipais
  impostosMunicipais: {
    pecas: {
      ir: { type: Number, default: 1.20, min: 0, max: 100 }
    },
    servicos: {
      ir: { type: Number, default: 4.80, min: 0, max: 100 }
    }
  },
  
  // Impostos Fora do Simples - Órgãos Estaduais
  impostosEstaduais: {
    pecas: {
      ir: { type: Number, default: 1.20, min: 0, max: 100 },
      pis: { type: Number, default: 0.65, min: 0, max: 100 },
      cofins: { type: Number, default: 3.00, min: 0, max: 100 },
      csll: { type: Number, default: 1.00, min: 0, max: 100 }
    },
    servicos: {
      ir: { type: Number, default: 4.80, min: 0, max: 100 },
      pis: { type: Number, default: 0.65, min: 0, max: 100 },
      cofins: { type: Number, default: 3.00, min: 0, max: 100 },
      csll: { type: Number, default: 1.00, min: 0, max: 100 }
    }
  },
  
  // Impostos Fora do Simples - Órgãos Federais
  impostosFederais: {
    pecas: {
      ir: { type: Number, default: 1.20, min: 0, max: 100 },
      pis: { type: Number, default: 0.65, min: 0, max: 100 },
      cofins: { type: Number, default: 3.00, min: 0, max: 100 },
      csll: { type: Number, default: 1.00, min: 0, max: 100 }
    },
    servicos: {
      ir: { type: Number, default: 4.80, min: 0, max: 100 },
      pis: { type: Number, default: 0.65, min: 0, max: 100 },
      cofins: { type: Number, default: 3.00, min: 0, max: 100 },
      csll: { type: Number, default: 1.00, min: 0, max: 100 }
    }
  },
  
  // Retenções Órgão
  retencoesOrgao: {
    percentual: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  // Taxas de Operação
  taxasOperacao: {
    taxaFixa: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  // Taxas Antecipação & Variáveis
  taxasAntecipacao: {
    aVista: { type: Number, default: 0, min: 0, max: 100 },
    aposFechamento: { type: Number, default: 0, min: 0, max: 100 },
    dias30: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ImpostosRetencoes', impostosRetencoesSchema);
