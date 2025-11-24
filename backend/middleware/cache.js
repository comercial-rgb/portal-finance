/**
 * Middleware de cache em memória para otimização de performance
 * Cache simples para reduzir carga no banco de dados
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos padrão
  }

  /**
   * Gerar chave única para o cache
   */
  generateKey(req) {
    const { path, query, user } = req;
    const userId = user ? user._id : 'anonymous';
    return `${path}:${userId}:${JSON.stringify(query)}`;
  }

  /**
   * Obter dados do cache
   */
  get(key) {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Verificar se expirou
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Salvar dados no cache
   */
  set(key, data, timeout = this.cacheTimeout) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + timeout
    });
  }

  /**
   * Limpar cache por padrão de chave
   */
  clearByPattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpar todo o cache
   */
  clearAll() {
    this.cache.clear();
  }

  /**
   * Obter tamanho do cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Limpar cache expirado (executar periodicamente)
   */
  cleanExpired() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Instância global do cache
const cacheManager = new CacheManager();

// Limpar cache expirado a cada 10 minutos
setInterval(() => {
  cacheManager.cleanExpired();
  console.log(`🧹 Cache limpo. Tamanho atual: ${cacheManager.size()}`);
}, 10 * 60 * 1000);

/**
 * Middleware de cache para rotas GET
 */
const cacheMiddleware = (timeout = 5 * 60 * 1000) => {
  return (req, res, next) => {
    // Apenas cachear requisições GET
    if (req.method !== 'GET') {
      return next();
    }

    const key = cacheManager.generateKey(req);
    const cached = cacheManager.get(key);

    if (cached) {
      console.log(`✅ Cache HIT: ${req.path}`);
      return res.json(cached);
    }

    console.log(`❌ Cache MISS: ${req.path}`);

    // Interceptar res.json para cachear a resposta
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // Apenas cachear respostas de sucesso
      if (res.statusCode === 200) {
        cacheManager.set(key, data, timeout);
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Middleware para invalidar cache após operações de escrita
 */
const invalidateCache = (patterns) => {
  return (req, res, next) => {
    // Interceptar res.json para invalidar cache após operação bem-sucedida
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // Invalidar cache se operação foi bem-sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (Array.isArray(patterns)) {
          patterns.forEach(pattern => cacheManager.clearByPattern(pattern));
        } else {
          cacheManager.clearByPattern(patterns);
        }
        console.log(`🗑️  Cache invalidado: ${patterns}`);
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = {
  cacheManager,
  cacheMiddleware,
  invalidateCache
};
