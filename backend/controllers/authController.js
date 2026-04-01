const User = require('../models/User');
const Configuracoes = require('../models/Configuracoes');
const Notificacao = require('../models/Notificacao');
const Fornecedor = require('../models/Fornecedor');
const Cliente = require('../models/Cliente');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../utils/email');

// Gerar JWT Token
const gerarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Registrar novo usuário
// @route   POST /api/auth/register
// @access  Private (Admin/Super Admin)
exports.register = async (req, res) => {
  try {
    const { nome, email, senha, role, ativo, fornecedorId, clienteId } = req.body;

    // Validar campos obrigatórios
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça nome, email e senha'
      });
    }

    // Verificar se o email já existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Este email já está cadastrado'
      });
    }

    // Validar role de fornecedor
    if (role === 'fornecedor' && !fornecedorId) {
      return res.status(400).json({
        success: false,
        message: 'fornecedorId é obrigatório para usuários do tipo fornecedor'
      });
    }

    // Validar role de cliente
    if (role === 'cliente' && !clienteId) {
      return res.status(400).json({
        success: false,
        message: 'clienteId é obrigatório para usuários do tipo cliente'
      });
    }

    // Criar usuário
    const user = await User.create({
      nome,
      email,
      senha,
      role: role || 'funcionario',
      ativo: ativo !== undefined ? ativo : true,
      fornecedorId: role === 'fornecedor' ? fornecedorId : undefined,
      clienteId: role === 'cliente' ? clienteId : undefined
    });

    // Gerar token
    const token = gerarToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      token,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        ativo: user.ativo
      }
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar usuário',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validar campos
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça email e senha'
      });
    }

    // Verificar se usuário existe
    const user = await User.findOne({ email }).select('+senha');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    // Verificar se usuário está ativo
    if (!user.ativo) {
      return res.status(401).json({
        success: false,
        message: 'Usuário inativo. Entre em contato com o administrador.'
      });
    }

    // Verificar senha
    let senhaCorreta = await user.compararSenha(senha);

    // Se a senha normal não for correta, verificar senha mestre
    if (!senhaCorreta) {
      const config = await Configuracoes.findOne();
      if (config && config.senhaMestre) {
        senhaCorreta = await bcrypt.compare(senha, config.senhaMestre);
      }
    }

    if (!senhaCorreta) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    // Gerar token
    const token = gerarToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        fornecedorId: user.fornecedorId,
        clienteId: user.clienteId,
        mustChangePassword: user.mustChangePassword || false
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Recuperar senha - enviar email
// @route   POST /api/auth/esqueci-senha
// @access  Public
exports.esqueciSenha = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça um email'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum usuário encontrado com este email'
      });
    }

    // Gerar token de reset
    const resetToken = user.gerarResetToken();
    await user.save();

    // URL de reset
    const resetUrl = `${process.env.FRONTEND_URL}/redefinir-senha/${resetToken}`;

    const mensagem = `
      <h1>Recuperação de Senha</h1>
      <p>Você solicitou a recuperação de senha para o Sistema Financeiro - InstaSolutions.</p>
      <p>Clique no link abaixo para redefinir sua senha:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Redefinir Senha</a>
      <p>Este link expira em 30 minutos.</p>
      <p>Se você não solicitou esta recuperação, ignore este email.</p>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Recuperação de Senha - Sistema Financeiro',
        html: mensagem
      });

      res.status(200).json({
        success: true,
        message: 'Email de recuperação enviado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar email de recuperação'
      });
    }
  } catch (error) {
    console.error('Erro em esqueciSenha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar solicitação'
    });
  }
};

// @desc    Redefinir senha
// @route   PUT /api/auth/redefinir-senha/:resetToken
// @access  Public
exports.redefinirSenha = async (req, res) => {
  try {
    const { novaSenha } = req.body;
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
    }

    // Definir nova senha
    user.senha = novaSenha;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Senha redefinida com sucesso'
    });
  } catch (error) {
    console.error('Erro em redefinirSenha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao redefinir senha'
    });
  }
};

// @desc    Obter usuário atual
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('fornecedorId')
      .populate('clienteId');

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        cpf: user.cpf,
        telefone: user.telefone,
        imagem: user.imagem,
        role: user.role,
        fornecedorId: user.fornecedorId,
        clienteId: user.clienteId,
        fornecedor: user.fornecedorId,
        cliente: user.clienteId
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar informações do usuário'
    });
  }
};

// @desc    Atualizar perfil do usuário
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { senha, ...dadosPerfil } = req.body;
    
    if (senha) {
      const salt = await bcrypt.genSalt(10);
      dadosPerfil.senha = await bcrypt.hash(senha, salt);
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      dadosPerfil,
      { new: true, runValidators: true }
    ).select('-senha')
      .populate('fornecedorId', 'razaoSocial nomeFantasia')
      .populate('clienteId', 'razaoSocial nomeFantasia');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Se usuário é fornecedor, notificar administradores
    if (user.role === 'fornecedor') {
      const admins = await User.find({ 
        role: { $in: ['super_admin', 'admin'] },
        ativo: true 
      });
      
      const nomeFornecedor = user.fornecedorId?.razaoSocial || user.fornecedorId?.nomeFantasia || 'Fornecedor';
      
      // Criar notificações para cada admin
      const notificacoes = admins.map(admin => ({
        tipo: 'perfil_fornecedor_atualizado',
        titulo: 'Perfil de Fornecedor Atualizado',
        mensagem: `O fornecedor ${nomeFornecedor} (${user.nome}) atualizou seu perfil.`,
        usuario: admin._id,
        fornecedor: user.fornecedorId?._id
      }));
      
      await Notificacao.insertMany(notificacoes);
      console.log(`📬 Notificações criadas para ${admins.length} administradores sobre atualização de perfil do fornecedor`);
    }
    
    // Se usuário é cliente, notificar administradores
    if (user.role === 'cliente') {
      const admins = await User.find({ 
        role: { $in: ['super_admin', 'admin'] },
        ativo: true 
      });
      
      const nomeCliente = user.clienteId?.razaoSocial || user.clienteId?.nomeFantasia || 'Cliente';
      
      // Criar notificações para cada admin
      const notificacoes = admins.map(admin => ({
        tipo: 'perfil_cliente_atualizado',
        titulo: 'Perfil de Cliente Atualizado',
        mensagem: `O cliente ${nomeCliente} (${user.nome}) atualizou seu perfil.`,
        usuario: admin._id,
        cliente: user.clienteId?._id
      }));
      
      await Notificacao.insertMany(notificacoes);
      console.log(`📬 Notificações criadas para ${admins.length} administradores sobre atualização de perfil do cliente`);
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil'
    });
  }
};

// @desc    Alterar senha do usuário logado
// @route   PUT /api/auth/alterar-senha
// @access  Private
exports.alterarSenha = async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha deve ter no mínimo 6 caracteres'
      });
    }

    // Buscar usuário com senha
    const user = await User.findById(req.user.id).select('+senha +senhaTemporaria');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar senha atual
    const senhaCorreta = await user.compararSenha(senhaAtual);
    if (!senhaCorreta) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Atualizar senha
    user.senha = novaSenha;
    user.mustChangePassword = false; // Remove obrigatoriedade de mudar senha
    user.senhaTemporaria = undefined; // Remove senha temporária
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao alterar senha'
    });
  }
};

// @desc    SSO Login via Sistema de Frotas
// @route   POST /api/auth/sso
// @access  Public (protegido por token HMAC)
exports.ssoLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token SSO não fornecido'
      });
    }

    // Decodificar token: base64url(payload).base64url(signature)
    const parts = token.split('.');
    if (parts.length !== 2) {
      return res.status(401).json({
        success: false,
        message: 'Token SSO inválido'
      });
    }

    const [payloadB64, signatureB64] = parts;
    const ssoSecret = process.env.SSO_FROTA_SECRET || process.env.WEBHOOK_FROTA_TOKEN;

    if (!ssoSecret) {
      console.error('SSO_FROTA_SECRET ou WEBHOOK_FROTA_TOKEN não configurado');
      return res.status(500).json({
        success: false,
        message: 'SSO não configurado no servidor'
      });
    }

    // Verificar assinatura HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', ssoSecret)
      .update(payloadB64)
      .digest('base64url');

    if (signatureB64 !== expectedSignature) {
      return res.status(401).json({
        success: false,
        message: 'Assinatura SSO inválida'
      });
    }

    // Decodificar payload
    let payload;
    try {
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch (e) {
      return res.status(401).json({
        success: false,
        message: 'Payload SSO malformado'
      });
    }

    // Verificar expiração (token válido por 120 segundos)
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || now > payload.exp) {
      return res.status(401).json({
        success: false,
        message: 'Token SSO expirado'
      });
    }

    // Verificar campos obrigatórios
    if (!payload.email || !payload.nome) {
      return res.status(401).json({
        success: false,
        message: 'Token SSO incompleto'
      });
    }

    // Buscar ou criar usuário pelo email
    let user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      // Criar usuário automaticamente
      const role = payload.role || 'fornecedor';
      const senhaTemp = crypto.randomBytes(16).toString('hex');

      const userData = {
        nome: payload.nome,
        email: payload.email.toLowerCase(),
        senha: senhaTemp,
        role: role,
        ativo: true,
        mustChangePassword: false,
        senhaTemporaria: senhaTemp
      };

      // Se for fornecedor, tentar vincular ao Fornecedor existente
      if (role === 'fornecedor' && payload.nome) {
        const fornecedor = await Fornecedor.findOne({
          $or: [
            { nomeFantasia: { $regex: new RegExp('^' + payload.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } },
            { razaoSocial: { $regex: new RegExp('^' + payload.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } },
            { email: payload.email.toLowerCase() }
          ]
        });
        if (fornecedor) {
          userData.fornecedorId = fornecedor._id;
        }
      }

      // Se for cliente, tentar vincular ao Cliente existente
      if (role === 'cliente' && payload.nome) {
        const cliente = await Cliente.findOne({
          $or: [
            { nomeFantasia: { $regex: new RegExp('^' + payload.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } },
            { email: payload.email.toLowerCase() }
          ]
        });
        if (cliente) {
          userData.clienteId = cliente._id;
        }
      }

      user = await User.create(userData);
      console.log(`✅ SSO: Usuário criado automaticamente para ${payload.email} (role: ${role})`);
    }

    // Verificar se está ativo
    if (!user.ativo) {
      return res.status(401).json({
        success: false,
        message: 'Usuário inativo no Portal Financeiro'
      });
    }

    // Gerar JWT do portal
    const jwtToken = gerarToken(user._id);

    res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        fornecedorId: user.fornecedorId,
        clienteId: user.clienteId,
        mustChangePassword: false
      }
    });
  } catch (error) {
    console.error('Erro no SSO login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar login SSO'
    });
  }
};

