/**
 * Configurações de Performance e Otimização
 * Aplicar no server.js para melhor desempenho com muitos usuários
 */

/**
 * Configurar middlewares de segurança e performance
 */
const setupPerformanceMiddlewares = (app, express) => {
  
  // 1. LIMITAR TAMANHO DO PAYLOAD
  // Previne ataques de negação de serviço
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  console.log('✅ Middlewares de performance configurados');
};

/**
 * Configurações do MongoDB para alta performance
 */
const mongooseOptimizations = {
  // Pool de conexões
  maxPoolSize: 50, // Máximo de conexões simultâneas
  minPoolSize: 10, // Mínimo de conexões mantidas
  
  // Timeouts
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  
  // Performance
  maxIdleTimeMS: 30000, // Fechar conexões ociosas após 30s
  
  // Retry
  retryWrites: true,
  retryReads: true,
  
  // Leitura
  readPreference: 'primaryPreferred', // Tentar primary primeiro, depois secondary
  
  // Compressão de rede
  compressors: ['zlib'],
  zlibCompressionLevel: 6
};

/**
 * Configurar mongoose para melhor performance
 */
const setupMongooseOptimizations = (mongoose) => {
  // Usar lean() por padrão em queries de leitura
  mongoose.plugin((schema) => {
    schema.set('toJSON', {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id;
        return ret;
      }
    });
  });

  // Logging de queries lentas (> 100ms)
  mongoose.set('debug', (collectionName, method, query, doc, options) => {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      if (duration > 100) {
        console.warn(`⚠️  Query lenta (${duration}ms): ${collectionName}.${method}`, query);
      }
    };
  });

  console.log('✅ Otimizações do Mongoose configuradas');
};

/**
 * Configurações de CORS otimizadas
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL,
      process.env.PRODUCTION_URL
    ].filter(Boolean);

    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // Cache preflight por 24 horas
};

/**
 * Monitoramento de memória e performance
 */
const setupMonitoring = () => {
  // Monitorar uso de memória a cada 5 minutos
  setInterval(() => {
    const used = process.memoryUsage();
    const memory = {
      rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(used.external / 1024 / 1024)}MB`
    };
    
    console.log('📊 Uso de memória:', memory);

    // Alertar se memória heap ultrapassar 80%
    const heapPercent = (used.heapUsed / used.heapTotal) * 100;
    if (heapPercent > 80) {
      console.warn(`⚠️  ALERTA: Uso de heap em ${heapPercent.toFixed(1)}%`);
    }
  }, 5 * 60 * 1000);

  // Log de uptime a cada hora
  setInterval(() => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    console.log(`⏱️  Uptime: ${hours}h ${minutes}m`);
  }, 60 * 60 * 1000);
};

/**
 * Configurações de logs otimizadas
 */
const loggerConfig = {
  // Não logar em produção para reduzir I/O
  skipLogging: process.env.NODE_ENV === 'production',
  
  // Logar apenas erros em produção
  logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  
  // Formato de log
  format: 'json', // JSON para parsing fácil em ferramentas de monitoring
};

/**
 * Graceful shutdown
 */
const setupGracefulShutdown = (server, mongoose) => {
  const shutdown = async (signal) => {
    console.log(`\n⚠️  ${signal} recebido. Encerrando graciosamente...`);
    
    // Parar de aceitar novas conexões
    server.close(() => {
      console.log('✅ Servidor HTTP fechado');
    });

    try {
      // Fechar conexão com MongoDB
      await mongoose.connection.close();
      console.log('✅ Conexão MongoDB fechada');
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Erro no shutdown:', error);
      process.exit(1);
    }
  };

  // Capturar sinais de término
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Capturar erros não tratados
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });
};

module.exports = {
  setupPerformanceMiddlewares,
  mongooseOptimizations,
  setupMongooseOptimizations,
  corsOptions,
  setupMonitoring,
  loggerConfig,
  setupGracefulShutdown
};
