/**
 * Middleware para verificar e filtrar dados de usuários fornecedores
 */

// Verificar se usuário é fornecedor
const isFornecedor = (req, res, next) => {
  if (req.user.role === 'fornecedor') {
    req.isFornecedor = true;
    req.fornecedorId = req.user.fornecedorId;
    next();
  } else {
    req.isFornecedor = false;
    next();
  }
};

// Bloquear modificações para fornecedores (apenas leitura)
const fornecedorReadOnly = (req, res, next) => {
  if (req.user.role === 'fornecedor') {
    return res.status(403).json({ 
      message: 'Fornecedores não têm permissão para modificar dados. Apenas visualização permitida.' 
    });
  }
  next();
};

// Filtrar dados apenas do fornecedor logado
const filterByFornecedor = (req, res, next) => {
  if (req.user.role === 'fornecedor') {
    // Adiciona filtro automático para o fornecedor do usuário logado
    req.fornecedorFilter = { fornecedor: req.user.fornecedorId };
  }
  next();
};

module.exports = {
  isFornecedor,
  fornecedorReadOnly,
  filterByFornecedor
};
