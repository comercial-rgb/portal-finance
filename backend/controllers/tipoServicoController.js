const { Tipo, TipoServicoSolicitado } = require('../models/TipoServico');

// ============ TIPO ============
exports.getTipos = async (req, res) => {
  try {
    const tipos = await Tipo.find().sort({ nome: 1 });
    res.json(tipos);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar tipos', error: error.message });
  }
};

exports.createTipo = async (req, res) => {
  try {
    const tipo = new Tipo(req.body);
    await tipo.save();
    res.status(201).json(tipo);
  } catch (error) {
    res.status(400).json({ message: 'Erro ao criar tipo', error: error.message });
  }
};

exports.updateTipo = async (req, res) => {
  try {
    const tipo = await Tipo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!tipo) {
      return res.status(404).json({ message: 'Tipo não encontrado' });
    }
    res.json(tipo);
  } catch (error) {
    res.status(400).json({ message: 'Erro ao atualizar tipo', error: error.message });
  }
};

exports.deleteTipo = async (req, res) => {
  try {
    const tipo = await Tipo.findByIdAndDelete(req.params.id);
    if (!tipo) {
      return res.status(404).json({ message: 'Tipo não encontrado' });
    }
    res.json({ message: 'Tipo excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir tipo', error: error.message });
  }
};

// ============ TIPO SERVIÇO SOLICITADO ============
exports.getTiposServicoSolicitado = async (req, res) => {
  try {
    const tipos = await TipoServicoSolicitado.find().sort({ nome: 1 });
    res.json(tipos);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar tipos de serviço solicitado', error: error.message });
  }
};

exports.createTipoServicoSolicitado = async (req, res) => {
  try {
    const tipo = new TipoServicoSolicitado(req.body);
    await tipo.save();
    res.status(201).json(tipo);
  } catch (error) {
    res.status(400).json({ message: 'Erro ao criar tipo de serviço solicitado', error: error.message });
  }
};

exports.updateTipoServicoSolicitado = async (req, res) => {
  try {
    const tipo = await TipoServicoSolicitado.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!tipo) {
      return res.status(404).json({ message: 'Tipo de serviço solicitado não encontrado' });
    }
    res.json(tipo);
  } catch (error) {
    res.status(400).json({ message: 'Erro ao atualizar tipo de serviço solicitado', error: error.message });
  }
};

exports.deleteTipoServicoSolicitado = async (req, res) => {
  try {
    const tipo = await TipoServicoSolicitado.findByIdAndDelete(req.params.id);
    if (!tipo) {
      return res.status(404).json({ message: 'Tipo de serviço solicitado não encontrado' });
    }
    res.json({ message: 'Tipo de serviço solicitado excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir tipo de serviço solicitado', error: error.message });
  }
};
