const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Proteger rotas
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Não autorizado. Token não fornecido.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-senha');
    
    if (!req.user || !req.user.ativo) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário não encontrado ou inativo.' 
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token inválido ou expirado.' 
    });
  }
};

// Autorizar roles específicos
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Usuário com role '${req.user.role}' não tem permissão para acessar esta rota.`
      });
    }
    next();
  };
};
