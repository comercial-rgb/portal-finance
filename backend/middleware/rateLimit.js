/**
 * Middleware de Rate Limiting para proteção contra sobrecarga
 * Limita o número de requisições por IP/usuário em um período de tempo
 */

class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = 60 * 1000; // Limpar a cada 1 minuto
    
    // Limpar registros antigos periodicamente
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Gerar chave única (IP ou userId)
   */
  generateKey(req) {
    // Usar userId se autenticado, senão usar IP
    if (req.user && req.user._id) {
      return `user:${req.user._id}`;
    }
    return `ip:${req.ip || req.connection.remoteAddress}`;
  }

  /**
   * Verificar se requisição excede limite
   */
  isRateLimited(key, maxRequests, windowMs) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];

    // Filtrar requisições dentro da janela de tempo
    const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

    // Verificar se excedeu o limite
    if (recentRequests.length >= maxRequests) {
      return {
        limited: true,
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      };
    }

    // Adicionar nova requisição
    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return {
      limited: false,
      remaining: maxRequests - recentRequests.length
    };
  }

  /**
   * Limpar registros antigos
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 15 * 60 * 1000; // 15 minutos

    for (const [key, timestamps] of this.requests.entries()) {
      // Filtrar timestamps recentes
      const recent = timestamps.filter(t => now - t < maxAge);
      
      if (recent.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recent);
      }
    }
  }

  /**
   * Resetar limite para uma chave específica
   */
  reset(key) {
    this.requests.delete(key);
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    return {
      activeKeys: this.requests.size,
      totalRequests: Array.from(this.requests.values()).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
}

// Instância global do rate limiter
const rateLimiter = new RateLimiter();

/**
 * Middleware de rate limiting
 * @param {number} maxRequests - Número máximo de requisições
 * @param {number} windowMs - Janela de tempo em milissegundos
 * @param {string} message - Mensagem customizada
 */
const rateLimit = (maxRequests = 100, windowMs = 60 * 1000, message = 'Muitas requisições. Tente novamente mais tarde.') => {
  return (req, res, next) => {
    const key = rateLimiter.generateKey(req);
    const result = rateLimiter.isRateLimited(key, maxRequests, windowMs);

    if (result.limited) {
      res.set('Retry-After', result.retryAfter);
      return res.status(429).json({
        message,
        retryAfter: result.retryAfter
      });
    }

    // Adicionar headers informativos
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', result.remaining);

    next();
  };
};

/**
 * Presets de rate limiting para diferentes tipos de rotas
 */
const rateLimitPresets = {
  // Autenticação - mais restritivo
  auth: rateLimit(10, 15 * 60 * 1000, 'Muitas tentativas de login. Aguarde 15 minutos.'),
  
  // Operações de escrita - médio
  write: rateLimit(100, 60 * 1000, 'Muitas operações de escrita. Aguarde 1 minuto.'),
  
  // Leitura - mais permissivo
  read: rateLimit(500, 60 * 1000, 'Muitas requisições de leitura. Aguarde 1 minuto.'),
  
  // Rotas autenticadas de perfil - muito permissivo
  profile: rateLimit(1000, 60 * 1000, 'Muitas requisições. Aguarde 1 minuto.'),
  
  // API pública - bem restritivo
  public: rateLimit(30, 60 * 1000, 'Limite de requisições excedido.'),
  
  // Upload de arquivos - muito restritivo
  upload: rateLimit(10, 60 * 1000, 'Muitos uploads. Aguarde 1 minuto.')
};

module.exports = {
  rateLimiter,
  rateLimit,
  rateLimitPresets
};
