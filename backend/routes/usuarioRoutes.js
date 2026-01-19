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

// Gerar senha temporária para fornecedor/cliente (Admin pode visualizar)
router.post('/:id/gerar-senha-temporaria', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Apenas para fornecedores e clientes
    if (!['fornecedor', 'cliente'].includes(usuario.role)) {
      return res.status(400).json({ 
        message: 'Senha temporária só pode ser gerada para fornecedores e clientes' 
      });
    }
    
    // Gerar senha temporária
    const senhaTemporaria = generateRandomPassword();
    
    // Salvar senha sem criptografia para visualização e marcar para mudar senha
    usuario.senhaTemporaria = senhaTemporaria;
    usuario.mustChangePassword = true;
    
    // Atualizar a senha real (será criptografada pelo hook pre-save)
    usuario.senha = senhaTemporaria;
    await usuario.save();
    
    // Enviar email com os dados de acesso
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const tipoUsuario = usuario.role === 'fornecedor' ? 'Fornecedor' : 'Cliente';
    
    try {
      await sendEmail({
        to: usuario.email,
        subject: `Dados de Acesso - Sistema Financeiro InstaSolutions`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
            <div style="background: linear-gradient(135deg, #251C59 0%, #005BED 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Sistema Financeiro</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">InstaSolutions</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <h2 style="color: #251C59; margin-top: 0;">Olá, ${usuario.nome}!</h2>
              
              <p style="color: #64748b; line-height: 1.6;">
                Seus dados de acesso ao sistema foram gerados. Utilize as credenciais abaixo para fazer login:
              </p>
              
              <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #475569;"><strong>Tipo de Acesso:</strong> ${tipoUsuario}</p>
                <p style="margin: 0 0 10px 0; color: #475569;"><strong>Email:</strong> ${usuario.email}</p>
                <p style="margin: 0 0 10px 0; color: #475569;"><strong>Senha Temporária:</strong> 
                  <span style="background: #251C59; color: white; padding: 4px 12px; border-radius: 4px; font-family: monospace; font-size: 16px;">
                    ${senhaTemporaria}
                  </span>
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}/login" 
                   style="display: inline-block; background: linear-gradient(135deg, #251C59 0%, #005BED 100%); color: white; 
                          text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Acessar Sistema
                </a>
              </div>
              
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; color: #856404; font-weight: 600;">
                  ⚠️ Importante - Alteração Obrigatória de Senha
                </p>
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
                  Por motivos de segurança, você será solicitado a <strong>alterar sua senha no primeiro acesso</strong>. 
                  Esta senha temporária só funcionará uma vez e você deverá criar uma senha pessoal e segura.
                </p>
              </div>
              
              <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; color: #0c4a6e; font-weight: 600;">
                  💡 Dicas para uma senha segura:
                </p>
                <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #0c4a6e; font-size: 14px; line-height: 1.6;">
                  <li>Use no mínimo 8 caracteres</li>
                  <li>Combine letras maiúsculas e minúsculas</li>
                  <li>Inclua números e símbolos</li>
                  <li>Não use informações pessoais óbvias</li>
                </ul>
              </div>
              
              <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">
                  <strong>Link de Acesso:</strong><br>
                  <a href="${loginUrl}/login" style="color: #005BED; text-decoration: none;">${loginUrl}/login</a>
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                Este é um email automático. Por favor, não responda.<br>
                Em caso de dúvidas, entre em contato com o administrador do sistema.
              </p>
            </div>
          </div>
        `
      });
      
      console.log(`✅ Email com senha temporária enviado para: ${usuario.email}`);
      
      res.json({
        message: 'Senha temporária gerada e enviada por email com sucesso',
        senhaTemporaria: senhaTemporaria,
        emailEnviado: true,
        usuario: {
          id: usuario._id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role
        }
      });
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Senha foi gerada mas email não enviou, retornar senha para admin informar manualmente
      res.json({
        message: 'Senha temporária gerada, mas não foi possível enviar o email. Informe ao usuário manualmente.',
        senhaTemporaria: senhaTemporaria,
        emailEnviado: false,
        emailError: emailError.message,
        usuario: {
          id: usuario._id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role
        }
      });
    }
  } catch (error) {
    console.error('Erro ao gerar senha temporária:', error);
    res.status(500).json({ message: 'Erro ao gerar senha temporária' });
  }
});

// Visualizar senha temporária (apenas se existir)
router.get('/:id/senha-temporaria', protect, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id).select('+senhaTemporaria');
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (!usuario.senhaTemporaria) {
      return res.status(404).json({ 
        message: 'Este usuário não possui senha temporária',
        temSenhaTemporaria: false
      });
    }
    
    res.json({
      senhaTemporaria: usuario.senhaTemporaria,
      mustChangePassword: usuario.mustChangePassword,
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role
      }
    });
  } catch (error) {
    console.error('Erro ao buscar senha temporária:', error);
    res.status(500).json({ message: 'Erro ao buscar senha temporária' });
  }
});

module.exports = router;
