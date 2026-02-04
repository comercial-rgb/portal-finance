const mongoose = require('mongoose');

const SubunidadeSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const CentroCustoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  subunidades: [SubunidadeSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const EmpenhoSchema = new mongoose.Schema({
  numeroEmpenho: {
    type: String,
    required: true,
    trim: true
  },
  contrato: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contrato'
  },
  centroCusto: {
    type: String,
    trim: true
  },
  subunidade: {
    type: String,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['pecas', 'servicos', 'pecas_servicos'],
    required: true
  },
  valor: {
    type: Number,
    required: true,
    min: 0
  },
  valorAnulado: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Valor cancelado manualmente'
  },
  valorUtilizado: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Valor consumido por ordens de serviço'
  },
  ativo: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const AditivoSchema = new mongoose.Schema({
  valor: {
    type: Number,
    required: true,
    min: 0
  },
  dataInicial: {
    type: Date,
    required: true
  },
  dataFinal: {
    type: Date,
    required: true
  },
  ativo: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ContratoSchema = new mongoose.Schema({
  numeroContrato: {
    type: String,
    required: true,
    trim: true
  },
  valor: {
    type: Number,
    required: true,
    min: 0
  },
  dataInicial: {
    type: Date,
    required: true
  },
  dataFinal: {
    type: Date,
    required: true
  },
  ativo: {
    type: Boolean,
    default: true
  },
  aditivos: [AditivoSchema],
  empenhos: [EmpenhoSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ClienteSchema = new mongoose.Schema({
  razaoSocial: {
    type: String,
    required: true,
    trim: true
  },
  nomeFantasia: {
    type: String,
    required: true,
    trim: true
  },
  cnpj: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  inscricaoMunicipal: {
    type: String,
    trim: true
  },
  inscricaoEstadual: {
    type: String,
    trim: true
  },
  percentualDesconto: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  tipoImposto: {
    type: [String],
    enum: ['municipais', 'estaduais', 'federais', 'retencoes'],
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 3;
      },
      message: 'É permitido selecionar no máximo 3 tipos de impostos'
    }
  },
  // Taxas de Operações
  tipoTaxa: {
    type: String,
    enum: ['operacao', 'antecipacao_variavel', 'nenhum'],
    default: 'nenhum'
  },
  taxaOperacao: {
    type: Number,
    default: 15,
    min: 0,
    max: 100
  },
  taxasAntecipacao: {
    aVista: {
      type: Number,
      default: 15,
      min: 0,
      max: 100
    },
    aposFechamento: {
      type: Number,
      default: 13,
      min: 0,
      max: 100
    },
    aprazado: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    dias30: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    dias40: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    dias50: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    dias60: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  // Flag para calcular impostos sobre valor bruto (antes do desconto)
  impostosSobreValorBruto: {
    type: Boolean,
    default: false
  },
  // Flag para permitir que fornecedores solicitem antecipação de faturas vinculadas a este cliente
  permitirAntecipacaoFornecedor: {
    type: Boolean,
    default: false
  },
  endereco: {
    logradouro: String,
    numero: String,
    complemento: String,
    bairro: String,
    cidade: String,
    estado: String,
    cep: String
  },
  contatos: {
    telefone: String,
    celular: String,
    email: String
  },
  centrosCusto: [CentroCustoSchema],
  contratos: [ContratoSchema],
  ativo: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Converter tipoImposto de string para array (migração de dados antigos)
ClienteSchema.pre('save', function(next) {
  // Migrar string antiga para array
  if (this.tipoImposto && typeof this.tipoImposto === 'string') {
    this.tipoImposto = this.tipoImposto ? [this.tipoImposto] : [];
  }
  // Garantir que tipoImposto seja sempre um array
  if (!Array.isArray(this.tipoImposto)) {
    this.tipoImposto = [];
  }
  this.updatedAt = Date.now();
  next();
});

// Converter tipoImposto antes de validar update
ClienteSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.tipoImposto && typeof update.tipoImposto === 'string') {
    update.tipoImposto = update.tipoImposto ? [update.tipoImposto] : [];
  }
  if (update.tipoImposto && !Array.isArray(update.tipoImposto)) {
    update.tipoImposto = [];
  }
  next();
});

module.exports = mongoose.model('Cliente', ClienteSchema);
