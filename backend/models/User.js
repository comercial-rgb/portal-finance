const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  senha: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: 6,
    select: false
  },
  cpf: {
    type: String,
    unique: true,
    sparse: true
  },
  telefone: {
    type: String
  },
  imagem: {
    type: String
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'gerente', 'funcionario', 'fornecedor', 'cliente'],
    default: 'funcionario'
  },
  fornecedorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fornecedor',
    required: function() {
      return this.role === 'fornecedor';
    }
  },
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: function() {
      return this.role === 'cliente';
    }
  },
  ativo: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Encriptar senha antes de salvar
userSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.senha = await bcrypt.hash(this.senha, salt);
});

// Método para comparar senhas
userSchema.methods.compararSenha = async function(senhaInformada) {
  return await bcrypt.compare(senhaInformada, this.senha);
};

// Método para gerar token de reset de senha
userSchema.methods.gerarResetToken = function() {
  const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutos
  
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
