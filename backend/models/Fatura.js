const mongoose = require('mongoose');

const faturaSchema = new mongoose.Schema({
  numeroFatura: {
    type: String,
    required: [true, 'Número da fatura é obrigatório'],
    unique: true,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['Fornecedor', 'Cliente'],
    required: [true, 'Tipo de fatura é obrigatório']
  },
  fornecedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fornecedor',
    required: function() { return this.tipo === 'Fornecedor'; }
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: function() { return this.tipo === 'Cliente'; }
  },
  ordensServico: [{
    ordemServico: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrdemServico',
      required: true
    },
    statusPagamento: {
      type: String,
      enum: ['Aguardando pagamento', 'Paga'],
      default: 'Aguardando pagamento'
    },
    valorOS: {
      type: Number,
      required: true
    },
    dataPagamento: {
      type: Date
    },
    comprovante: {
      type: String,
      default: null
    }
  }],
  // Abastecimentos vinculados à fatura
  abastecimentosVinculados: [{
    abastecimento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Abastecimento'
    },
    statusPagamento: {
      type: String,
      enum: ['Aguardando pagamento', 'Paga'],
      default: 'Aguardando pagamento'
    },
    valorAbastecimento: {
      type: Number,
      required: true
    },
    dataPagamento: {
      type: Date
    },
    comprovante: {
      type: String,
      default: null
    }
  }],
  // Origem da fatura: 'os' (Ordens de Serviço) ou 'abastecimento' (Combustível)
  origem: {
    type: String,
    enum: ['os', 'abastecimento'],
    default: 'os'
  },
  periodoInicio: {
    type: Date,
    required: [true, 'Data de início do período é obrigatória']
  },
  periodoFim: {
    type: Date,
    required: [true, 'Data de fim do período é obrigatória']
  },
  // Valores calculados
  valorTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  valorDesconto: {
    type: Number,
    default: 0,
    min: 0
  },
  valorComDesconto: {
    type: Number,
    default: 0,
    min: 0
  },
  valorImpostos: {
    type: Number,
    default: 0,
    min: 0
  },
  valorTaxasOperacao: {
    type: Number,
    default: 0,
    min: 0
  },
  valorDevido: {
    type: Number,
    default: 0,
    min: 0
  },
  valorPago: {
    type: Number,
    default: 0,
    min: 0
  },
  valorRestante: {
    type: Number,
    default: 0,
    min: 0
  },
  // Status da fatura
  statusFatura: {
    type: String,
    enum: ['Aguardando pagamento', 'Parcialmente paga', 'Paga'],
    default: 'Aguardando pagamento'
  },
  // Dados de impostos utilizados
  impostos: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ImpostosRetencoes'
  },
  // Observações
  observacoes: {
    type: String,
    trim: true
  },
  // Referência do mês/período (ex: "1ª Quinzena - Abril/2026")
  referenciaFatura: {
    type: String,
    trim: true
  },
  // Previsão de recebimento (para faturas de fornecedor)
  previsaoRecebimento: {
    type: Date
  },
  // Data de vencimento (para faturas de cliente)
  dataVencimento: {
    type: Date
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para melhor performance
// Removido índice duplicado de numeroFatura (unique já cria índice)
faturaSchema.index({ tipo: 1, statusFatura: 1 });
faturaSchema.index({ fornecedor: 1, createdAt: -1 });
faturaSchema.index({ cliente: 1, createdAt: -1 });

// Calcular valores antes de salvar
faturaSchema.pre('save', function(next) {
  // Não recalcular valorTotal - vem do controller já calculado corretamente
  // valorTotal deve ser a soma de peças + serviço SEM desconto
  
  // Calcular valor pago - proporcional ao valor líquido (valorDevido)
  // Cada OS representa uma proporção do valorComDesconto, aplicamos essa mesma proporção ao valorDevido
  const valorComDesconto = this.valorComDesconto || 0;
  const valorDevido = this.valorDevido || 0;
  
  if (valorComDesconto > 0) {
    // Calcular o fator de proporção (líquido / bruto)
    const fatorLiquido = valorDevido / valorComDesconto;
    
    // Valor pago é a soma dos valores líquidos das OS pagas + abastecimentos pagos
    let valorPagoOS = this.ordensServico
      .filter(os => os.statusPagamento === 'Paga')
      .reduce((acc, os) => {
        const valorLiquidoOS = (os.valorOS || 0) * fatorLiquido;
        return acc + valorLiquidoOS;
      }, 0);

    let valorPagoAb = (this.abastecimentosVinculados || [])
      .filter(ab => ab.statusPagamento === 'Paga')
      .reduce((acc, ab) => {
        const valorLiquidoAb = (ab.valorAbastecimento || 0) * fatorLiquido;
        return acc + valorLiquidoAb;
      }, 0);
    
    this.valorPago = valorPagoOS + valorPagoAb;
    
    // Arredondar para evitar problemas de precisão
    this.valorPago = Math.round(this.valorPago * 100) / 100;
  } else {
    this.valorPago = 0;
  }
  
  // Calcular valor restante
  this.valorRestante = Math.round((this.valorDevido - this.valorPago) * 100) / 100;
  
  // Atualizar status da fatura
  if (this.valorPago === 0) {
    this.statusFatura = 'Aguardando pagamento';
  } else if (this.valorPago < this.valorDevido) {
    this.statusFatura = 'Parcialmente paga';
  } else {
    this.statusFatura = 'Paga';
  }
  
  next();
});

const Fatura = mongoose.model('Fatura', faturaSchema);

module.exports = Fatura;
