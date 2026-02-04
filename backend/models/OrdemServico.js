const mongoose = require('mongoose');

const ordemServicoSchema = new mongoose.Schema({
  codigo: {
    type: String,
    unique: true
  },
  numeroOrdemServico: {
    type: String,
    required: [true, 'Número da ordem de serviço é obrigatório'],
    trim: true
  },
  dataReferencia: {
    type: Date,
    default: Date.now,
    description: 'Data de referência da OS (para qual mês a OS pertence)'
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'Cliente é obrigatório']
  },
  fornecedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fornecedor',
    required: [true, 'Fornecedor é obrigatório']
  },
  tipoServicoSolicitado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TipoServicoSolicitado',
    required: [true, 'Tipo de serviço solicitado é obrigatório']
  },
  tipo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tipo',
    required: [true, 'Tipo é obrigatório']
  },
  centroCusto: {
    type: String,
    required: [true, 'Centro de custo é obrigatório']
  },
  subunidade: {
    type: String,
    trim: true
  },
  contrato: {
    type: String,
    trim: true
  },
  // Empenho para Peças
  empenhoPecas: {
    type: String,
    trim: true
  },
  contratoEmpenhoPecas: {
    type: String,
    trim: true
  },
  // Empenho para Serviços
  empenhoServicos: {
    type: String,
    trim: true
  },
  contratoEmpenhoServicos: {
    type: String,
    trim: true
  },
  placa: {
    type: String,
    trim: true
  },
  veiculo: {
    type: String,
    trim: true
  },
  valorPecas: {
    type: Number,
    default: 0,
    min: 0
  },
  valorServico: {
    type: Number,
    default: 0,
    min: 0
  },
  descontoPecasPerc: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  descontoServicoPerc: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  valorPecasComDesconto: {
    type: Number,
    default: 0
  },
  valorServicoComDesconto: {
    type: Number,
    default: 0
  },
  // Campos simplificados de valores totais
  valorTotalSemDesconto: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Valor total sem desconto (peças + serviços)'
  },
  descontoPercentual: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    description: 'Desconto percentual geral aplicado'
  },
  valorFinal: {
    type: Number,
    default: 0,
    description: 'Valor total com desconto'
  },
  notaFiscalPeca: {
    type: String,
    trim: true
  },
  notaFiscalServico: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Autorizada', 'Aguardando pagamento', 'Paga'],
    default: 'Autorizada'
  },
  tipoFatura: {
    type: String,
    enum: ['Fornecedor', 'Cliente', null],
    default: null,
    description: 'Indica se a OS está em uma fatura de Fornecedor ou Cliente'
  },
  faturadoCliente: {
    type: Boolean,
    default: false,
    description: 'Indica se a OS já foi faturada para o cliente'
  },
  faturadoFornecedor: {
    type: Boolean,
    default: false,
    description: 'Indica se a OS já foi faturada para o fornecedor'
  },
  tipoPagamento: {
    type: String,
    enum: ['aVista', 'aposFechamento', 'aprazado', null],
    default: null,
    description: 'Tipo de pagamento escolhido pelo fornecedor (para clientes com taxa antecipação variável)'
  },
  taxaAplicada: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    description: 'Taxa percentual aplicada na fatura fornecedor'
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Gerar código automático antes da validação
ordemServicoSchema.pre('validate', async function(next) {
  if (!this.codigo) {
    try {
      // Se não tem código mas tem numeroOrdemServico, usa o numeroOrdemServico como código
      if (this.numeroOrdemServico) {
        this.codigo = this.numeroOrdemServico;
        console.log(`📝 Usando numeroOrdemServico como código: ${this.codigo}`);
      } else {
        // Caso contrário, gera código automático sequencial
        // Buscar a última OS com código no formato sequencial OS-XXXXXX (6 dígitos)
        const todasOS = await mongoose.model('OrdemServico')
          .find({
            codigo: /^OS-\d{6}$/  // Regex: OS- seguido de exatamente 6 dígitos
          })
          .select('codigo')
          .lean();
        
        let proximoNumero = 1;
        if (todasOS && todasOS.length > 0) {
          // Extrair números e encontrar o maior
          const numeros = todasOS.map(os => parseInt(os.codigo.replace('OS-', '')));
          const maiorNumero = Math.max(...numeros);
          proximoNumero = maiorNumero + 1;
        }
        
        this.codigo = `OS-${String(proximoNumero).padStart(6, '0')}`;
        console.log(`📝 Código gerado automaticamente: ${this.codigo}`);
      }
    } catch (error) {
      console.error('❌ Erro ao gerar código:', error);
      return next(error);
    }
  }
  next();
});

// Calcular valores com desconto antes de salvar
ordemServicoSchema.pre('save', function(next) {
  this.valorPecasComDesconto = this.valorPecas - (this.valorPecas * this.descontoPecasPerc / 100);
  this.valorServicoComDesconto = this.valorServico - (this.valorServico * this.descontoServicoPerc / 100);
  this.valorFinal = this.valorPecasComDesconto + this.valorServicoComDesconto;
  next();
});

const OrdemServico = mongoose.model('OrdemServico', ordemServicoSchema);

module.exports = OrdemServico;
