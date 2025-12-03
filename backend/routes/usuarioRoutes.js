const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');

// Função para gerar senha aleatória
const generateRandomPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Listar todos os usuários
router.get('/', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const usuarios = await User.find({ ativo: true })
      .select('-senha')
      .sort({ createdAt: -1 });
    
    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
});

// Buscar usuário por ID
router.get('/:id', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id).select('-senha');
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar usuário' });
  }
});

// Atualizar usuário
router.put('/:id', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { nome, email, role, ativo, senha, fornecedorId, clienteId } = req.body;
    
    const usuario = await User.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o email já existe (se estiver sendo alterado)
    if (email !== usuario.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email já está em uso' });
      }
    }
    
    usuario.nome = nome || usuario.nome;
    usuario.email = email || usuario.email;
    usuario.role = role || usuario.role;
    usuario.ativo = ativo !== undefined ? ativo : usuario.ativo;
    
    // Atualizar fornecedorId/clienteId se necessário
    if (role === 'fornecedor' && fornecedorId) {
      usuario.fornecedorId = fornecedorId;
    }
    if (role === 'cliente' && clienteId) {
      usuario.clienteId = clienteId;
    }
    
    // Atualizar senha se fornecida (o hook pre-save do model irá encriptar)
    if (senha && senha.length >= 6) {
      usuario.senha = senha;
    }
    
    await usuario.save();
    
    const usuarioAtualizado = await User.findById(usuario._id).select('-senha');
    
    res.json({
      message: 'Usuário atualizado com sucesso',
      usuario: usuarioAtualizado
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

// Reset de senha do usuário (envia nova senha por email)
router.post('/:id/reset-password', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Gerar nova senha aleatória
    const novaSenha = generateRandomPassword();
    
    // Atualizar senha do usuário
    usuario.senha = novaSenha;
    await usuario.save();
    
    // Enviar email com a nova senha
    try {
      await sendEmail({
        to: usuario.email,
        subject: 'Nova Senha de Acesso - Sistema Financeiro InstaSolutions',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
            <div style="background: linear-gradient(135deg, #251C59 0%, #005BED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Sistema Financeiro</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">InstaSolutions</p>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <h2 style="color: #251C59; margin-top: 0;">Olá, ${usuario.nome}!</h2>
              <p style="color: #64748b; line-height: 1.6;">
                Sua senha foi redefinida pelo administrador do sistema. 
                Abaixo estão suas novas credenciais de acesso:
              </p>
              <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #475569;"><strong>Email:</strong> ${usuario.email}</p>
                <p style="margin: 0; color: #475569;"><strong>Nova Senha:</strong> <span style="background: #251C59; color: white; padding: 4px 12px; border-radius: 4px; font-family: monospace;">${novaSenha}</span></p>
              </div>
              <p style="color: #ef4444; font-size: 14px; margin-top: 20px;">
                ⚠️ <strong>Importante:</strong> Recomendamos que você altere sua senha após o primeiro acesso.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                Este é um email automático. Por favor, não responda.
              </p>
            </div>
          </div>
        `
      });
      
      res.json({
        message: 'Senha redefinida com sucesso e enviada por email',
        emailEnviado: true
      });
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Senha foi alterada, mas email não foi enviado
      res.json({
        message: 'Senha redefinida com sucesso, mas não foi possível enviar o email. Nova senha: ' + novaSenha,
        emailEnviado: false,
        novaSenha: novaSenha
      });
    }
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ message: 'Erro ao resetar senha do usuário' });
  }
});

module.exports = router;
