// Middleware para verificar se o usuário é um cliente
exports.isCliente = (req, res, next) => {
  if (req.user.role === 'cliente') {
    return next();
  }
  next();
};

// Middleware para garantir que clientes só vejam seus próprios dados (READ-ONLY)
exports.clienteReadOnly = (req, res, next) => {
  if (req.user.role === 'cliente') {
    // Bloquear métodos de escrita (POST, PUT, PATCH, DELETE)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return res.status(403).json({ 
        message: 'Clientes têm acesso somente leitura. Não é permitido criar, editar ou excluir dados.' 
      });
    }
  }
  next();
};

// Middleware para filtrar dados por clienteId
exports.filterByCliente = (req, res, next) => {
  if (req.user.role === 'cliente' && req.user.clienteId) {
    // Adicionar filtro de cliente na query
    req.clienteFilter = true;
    req.query.cliente = req.user.clienteId;
  }
  next();
};
