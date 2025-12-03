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
  
  // Taxas Antecipação & Variáveis (campos legados - manter para compatibilidade)
  taxasAntecipacao: {
    aVista: { type: Number, default: 0, min: 0, max: 100 },
    aposFechamento: { type: Number, default: 0, min: 0, max: 100 },
    dias30: { type: Number, default: 0, min: 0, max: 100 },
    dias40: { type: Number, default: 0, min: 0, max: 100 },
    dias50: { type: Number, default: 0, min: 0, max: 100 },
    dias60: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  // Taxas de Antecipação por Faixa de Dias (novas taxas)
  taxasAntecipacaoFaixas: {
    // 30 a 25 dias antes da previsão
    faixa30a25: { type: Number, default: 10, min: 0, max: 100 },
    // 24 a 19 dias antes da previsão
    faixa24a19: { type: Number, default: 8, min: 0, max: 100 },
    // 18 a 12 dias antes da previsão
    faixa18a12: { type: Number, default: 6, min: 0, max: 100 },
    // 11 a 6 dias antes da previsão
    faixa11a06: { type: Number, default: 4, min: 0, max: 100 },
    // 5 a 1 dias antes da previsão
    faixa05a01: { type: Number, default: 2.5, min: 0, max: 100 }
  },
  
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ImpostosRetencoes', impostosRetencoesSchema);
