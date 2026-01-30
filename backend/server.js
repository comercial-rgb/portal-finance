const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Importar configurações de performance
const { 
  mongooseOptimizations, 
  setupMongooseOptimizations, 
  setupMonitoring,
  setupGracefulShutdown 
} = require('./config/performance');

// Importar middlewares de otimização
const { cacheMiddleware, invalidateCache } = require('./middleware/cache');
const { rateLimit, rateLimitPresets } = require('./middleware/rateLimit');

// Importar rotas
const authRoutes = require('./routes/authRoutes');
const fornecedorRoutes = require('./routes/fornecedorRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const tipoServicoRoutes = require('./routes/tipoServicoRoutes');
const ordemServicoRoutes = require('./routes/ordemServicoRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const impostosRetencoesRoutes = require('./routes/impostosRetencoesRoutes');
const faturaRoutes = require('./routes/faturaRoutes');
const notificacaoRoutes = require('./routes/notificacaoRoutes');
const antecipacaoRoutes = require('./routes/antecipacaoRoutes');
const pagamentoRoutes = require('./routes/pagamentoRoutes');
const notaFiscalClienteRoutes = require('./routes/notaFiscalClienteRoutes');
const webhookFrotaRoutes = require('./routes/webhookFrotaRoutes');

const app = express();

// Configurar otimizações do Mongoose
setupMongooseOptimizations(mongoose);

// Middlewares de segurança e otimização
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origin (ex: mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ];
    
    // Permitir todos os domínios do GitHub Codespaces
    if (origin.includes('github.dev') || origin.includes('githubpreview.dev')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(null, true); // Permitir todas as origens em desenvolvimento
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // Cache preflight por 24h
}));

// Adicionar headers manualmente para garantir
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting global mais permissivo para desenvolvimento
app.use('/api', rateLimit(1000, 60 * 1000)); // 1000 req/min geral

// Rotas com rate limiting específico e cache
// Auth com limite mais alto para evitar bloqueios durante testes
app.use('/api/auth', rateLimit(30, 5 * 60 * 1000), authRoutes); // 30 req / 5 min
app.use('/api', invalidateCache('fornecedores'), fornecedorRoutes);
// Clientes SEM cache para garantir dados sempre atualizados
app.use('/api/clientes', clienteRoutes);
// Tipo Servicos SEM cache para garantir dados sempre atualizados
app.use('/api/tipo-servicos', tipoServicoRoutes);
app.use('/api/ordens-servico', invalidateCache(['ordens', 'clientes', 'fornecedores']), ordemServicoRoutes);
app.use('/api/usuarios', rateLimitPresets.write, usuarioRoutes);
// Impostos SEM cache para garantir dados sempre atualizados
app.use('/api/impostos-retencoes', impostosRetencoesRoutes);
app.use('/api/faturas', invalidateCache(['faturas', 'ordens']), faturaRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
// Antecipações e Pagamentos SEM cache
app.use('/api/antecipacoes', antecipacaoRoutes);
app.use('/api/pagamentos', pagamentoRoutes);
// Notas Fiscais de Clientes SEM cache
app.use('/api/notas-fiscais-clientes', notaFiscalClienteRoutes);
// Webhook de integração com sistema de frotas (protegido por token)
app.use('/api/webhook/frota', webhookFrotaRoutes);

// Rota de teste e health check
app.get('/api/health', (req, res) => {
  const uptime = process.uptime();
  res.json({
    status: 'OK',
    uptime: `${Math.floor(uptime / 60)} minutos`,
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Portal Finance API - InstaSolutions',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      fornecedores: '/api/fornecedores',
      clientes: '/api/clientes',
      ordensServico: '/api/ordens-servico',
      faturas: '/api/faturas'
    }
  });
});

// Rota para resetar rate limiting (apenas desenvolvimento)
app.post('/api/dev/reset-rate-limit', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Não disponível em produção' });
  }
  
  const { rateLimiter } = require('./middleware/rateLimit');
  const { cacheManager } = require('./middleware/cache');
  
  // Resetar rate limiter e cache
  const statsRateLimit = rateLimiter.getStats();
  const statsCache = { size: cacheManager.size() };
  
  // Limpar tudo
  rateLimiter.reset = function() {
    this.requests.clear();
  };
  cacheManager.clearAll();
  
  res.json({ 
    message: 'Rate limiting e cache resetados',
    before: { rateLimit: statsRateLimit, cache: statsCache },
    after: { rateLimit: rateLimiter.getStats(), cache: { size: cacheManager.size() } }
  });
});

// Conexão com MongoDB com configurações otimizadas
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://172.17.0.2:27017/portal-finance';

console.log('🔍 MONGODB_URI:', MONGODB_URI);

mongoose.connect(MONGODB_URI, {
  ...mongooseOptimizations,
  family: 4 // Força IPv4
})
  .then(() => {
    console.log('✅ Conectado ao MongoDB com otimizações');
    console.log(`📊 Pool de conexões: ${mongooseOptimizations.maxPoolSize} máx, ${mongooseOptimizations.minPoolSize} mín`);
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log('⚡ Performance otimizada para alto volume');
      
      // Iniciar monitoramento
      setupMonitoring();
      
      // Configurar graceful shutdown
      setupGracefulShutdown(server, mongoose);
    });
  })
  .catch((error) => {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  });

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  process.exit(1);
});
