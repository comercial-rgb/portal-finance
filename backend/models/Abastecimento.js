const mongoose = require('mongoose');

const abastecimentoSchema = new mongoose.Schema({
  codigo: {
    type: String,
    unique: true
  },
  // Código original do sistema de combustível
  codigoExterno: {
    type: String,
    unique: true,
    sparse: true
  },
  codigoComprovante: {
    type: String,
    trim: true
  },
  dataReferencia: {
    type: Date,
    default: Date.now,
    description: 'Data de referência do abastecimento'
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'Cliente é obrigatório']
  },
  fornecedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fornecedor',
    required: [true, 'Fornecedor (Posto) é obrigatório']
  },
  // Dados do veículo
  placa: {
    type: String,
    trim: true
  },
  veiculo: {
    type: String,
    trim: true
  },
  // Dados do motorista
  motorista: {
    type: String,
    trim: true
  },
  // Dados do abastecimento
  tipoCombustivel: {
    type: String,
    enum: ['alcool', 'gasolina_comum', 'gasolina_aditivada', 'gnv', 'diesel', 'diesel_500', 'diesel_s10', 'arla', 'querosene', 'glp'],
    required: [true, 'Tipo de combustível é obrigatório']
  },
  litrosAbastecidos: {
    type: Number,
    required: [true, 'Quantidade de litros é obrigatória'],
    min: 0
  },
  precoUnitario: {
    type: Number,
    required: [true, 'Preço unitário é obrigatório'],
    min: 0
  },
  valor: {
    type: Number,
    required: [true, 'Valor é obrigatório'],
    min: 0
  },
  descontoPercentual: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  valorComDesconto: {
    type: Number,
    default: 0,
    min: 0
  },
  valorFinal: {
    type: Number,
    default: 0,
    min: 0
  },
  odometro: {
    type: String,
    trim: true
  },
  // Centro de custo / Secretaria
  centroCusto: {
    type: String,
    trim: true
  },
  subunidade: {
    type: String,
    trim: true
  },
  // Contrato e empenho
  contrato: {
    type: String,
    trim: true
  },
  empenho: {
    type: String,
    trim: true
  },
  // Nota fiscal
  notaFiscal: {
    type: String,
    trim: true
  },
  // Status do abastecimento no portal
  status: {
    type: String,
    enum: ['Autorizada', 'Aguardando pagamento', 'Paga'],
    default: 'Autorizada'
  },
  // Faturamento
  tipoFatura: {
    type: String,
    enum: ['Fornecedor', 'Cliente', null],
    default: null
  },
  faturadoCliente: {
    type: Boolean,
    default: false
  },
  faturadoFornecedor: {
    type: Boolean,
    default: false
  },
  tipoPagamento: {
    type: String,
    enum: ['aVista', 'aposFechamento', 'aprazado', 'dias30', 'dias40', 'dias50', 'dias60', null],
    default: null
  },
  taxaAplicada: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Metodo de identificação do abastecimento
  metodoIdentificacao: {
    type: String,
    enum: ['nfc', 'qrcode', 'manual'],
    default: 'manual'
  },
  // Observações (inclui divergências do webhook)
  observacoes: {
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

// Gerar código automático antes da validação
abastecimentoSchema.pre('validate', async function(next) {
  if (!this.codigo) {
    try {
      const ultimo = await mongoose.model('Abastecimento')
        .findOne({ codigo: { $regex: /^AB-\d+$/ } })
        .sort({ codigo: -1 })
        .select('codigo')
        .lean();
      
      let proximoNumero = 1;
      if (ultimo && ultimo.codigo) {
        const numeroAtual = parseInt(ultimo.codigo.replace('AB-', ''));
        if (!isNaN(numeroAtual)) {
          proximoNumero = numeroAtual + 1;
        }
      }
      
      this.codigo = `AB-${String(proximoNumero).padStart(4, '0')}`;
    } catch (error) {
      console.error('❌ Erro ao gerar código de abastecimento:', error);
      return next(error);
    }
  }
  next();
});

// Calcular valores antes de salvar
abastecimentoSchema.pre('save', function(next) {
  if (this.descontoPercentual > 0) {
    this.valorComDesconto = this.valor - (this.valor * this.descontoPercentual / 100);
  } else {
    this.valorComDesconto = this.valor;
  }
  this.valorFinal = this.valorComDesconto;
  next();
});

// Índices
abastecimentoSchema.index({ cliente: 1, createdAt: -1 });
abastecimentoSchema.index({ fornecedor: 1, createdAt: -1 });
abastecimentoSchema.index({ status: 1 });
abastecimentoSchema.index({ codigoExterno: 1 });
abastecimentoSchema.index({ faturadoFornecedor: 1, faturadoCliente: 1 });

const Abastecimento = mongoose.model('Abastecimento', abastecimentoSchema);

module.exports = Abastecimento;
