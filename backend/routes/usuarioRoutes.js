const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

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
    const { nome, email, role, ativo } = req.body;
    
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

module.exports = router;
