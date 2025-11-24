const express = require('express');
const router = express.Router();
const Notificacao = require('../models/Notificacao');
const { protect } = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(protect);

// Listar notificações do usuário
router.get('/', async (req, res) => {
  try {
    const { lida } = req.query;
    const query = { usuario: req.user.id };
    
    if (lida !== undefined) {
      query.lida = lida === 'true';
    }
    
    const notificacoes = await Notificacao.find(query)
      .populate('fornecedor', 'razaoSocial nomeFantasia')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(notificacoes);
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    res.status(500).json({ message: 'Erro ao listar notificações' });
  }
});

// Marcar notificação como lida
router.patch('/:id/ler', async (req, res) => {
  try {
    const notificacao = await Notificacao.findOneAndUpdate(
      { _id: req.params.id, usuario: req.user.id },
      { lida: true, dataLeitura: new Date() },
      { new: true }
    );
    
    if (!notificacao) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }
    
    res.json(notificacao);
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ message: 'Erro ao atualizar notificação' });
  }
});

// Marcar todas como lidas
router.patch('/marcar-todas-lidas', async (req, res) => {
  try {
    await Notificacao.updateMany(
      { usuario: req.user.id, lida: false },
      { lida: true, dataLeitura: new Date() }
    );
    
    res.json({ message: 'Todas as notificações foram marcadas como lidas' });
  } catch (error) {
    console.error('Erro ao marcar todas notificações como lidas:', error);
    res.status(500).json({ message: 'Erro ao atualizar notificações' });
  }
});

// Contar notificações não lidas
router.get('/nao-lidas/count', async (req, res) => {
  try {
    const count = await Notificacao.countDocuments({
      usuario: req.user.id,
      lida: false
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Erro ao contar notificações não lidas:', error);
    res.status(500).json({ message: 'Erro ao contar notificações' });
  }
});

module.exports = router;
