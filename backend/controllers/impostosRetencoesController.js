const ImpostosRetencoes = require('../models/ImpostosRetencoes');

// Obter configuração de impostos
exports.getImpostos = async (req, res) => {
  try {
    let impostos = await ImpostosRetencoes.findOne({ ativo: true });
    
    // Se não existir, criar com valores padrão
    if (!impostos) {
      impostos = await ImpostosRetencoes.create({});
    }
    
    res.json(impostos);
  } catch (error) {
    console.error('Erro ao buscar impostos:', error);
    res.status(500).json({ message: 'Erro ao buscar impostos e retenções' });
  }
};

// Atualizar configuração de impostos
exports.updateImpostos = async (req, res) => {
  try {
    let impostos = await ImpostosRetencoes.findOne({ ativo: true });
    
    if (!impostos) {
      impostos = await ImpostosRetencoes.create(req.body);
    } else {
      Object.assign(impostos, req.body);
      await impostos.save();
    }
    
    res.json({
      message: 'Impostos e retenções atualizados com sucesso',
      impostos
    });
  } catch (error) {
    console.error('Erro ao atualizar impostos:', error);
    res.status(500).json({ message: 'Erro ao atualizar impostos e retenções' });
  }
};
