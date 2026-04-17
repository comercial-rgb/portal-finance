const axios = require('axios');

/**
 * Serviço de integração com o FinSystem (sistema de administração financeira)
 * Autentica via sessão (email/senha) e envia movimentações ao criar ordens de pagamento
 */
class FinsystemService {
  constructor() {
    this.baseUrl = process.env.FINSYSTEM_API_URL || 'http://localhost:4567';
    this.email = process.env.FINSYSTEM_EMAIL;
    this.senha = process.env.FINSYSTEM_SENHA;
    this.empresaId = process.env.FINSYSTEM_EMPRESA_ID || '1';
    this.contaBancariaId = process.env.FINSYSTEM_CONTA_BANCARIA_ID || '1';
    this.timeout = 15000;
    this.sessionCookie = null;
    this.sessionExpiry = null;
  }

  isConfigured() {
    const configured = this.baseUrl && this.baseUrl !== 'http://localhost:4567' && this.email && this.senha;
    if (!configured) {
      console.log(`ℹ️ FinSystem config: URL=${this.baseUrl ? 'SET' : 'MISSING'}, EMAIL=${this.email ? 'SET' : 'MISSING'}, SENHA=${this.senha ? 'SET(' + this.senha.length + ' chars)' : 'MISSING'}`);
    }
    return configured;
  }

  /**
   * Autenticar no FinSystem via login (email/senha) e obter cookie de sessão
   */
  async autenticar() {
    // Reutilizar sessão se ainda válida (expira em 20 minutos por segurança)
    if (this.sessionCookie && this.sessionExpiry && Date.now() < this.sessionExpiry) {
      return true;
    }

    try {
      console.log(`🔑 FinSystem: Autenticando com ${this.email}...`);
      
      const response = await axios.post(
        `${this.baseUrl}/auth/login`,
        `email=${encodeURIComponent(this.email)}&senha=${encodeURIComponent(this.senha)}`,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: this.timeout,
          maxRedirects: 0,
          validateStatus: () => true // Aceitar qualquer status
        }
      );

      console.log(`🔑 FinSystem: Login respondeu HTTP ${response.status}`);

      // Extrair cookie de qualquer resposta (200, 302, 303)
      const setCookie = response.headers['set-cookie'];
      if (setCookie && setCookie.length > 0) {
        this.sessionCookie = setCookie
          .map(c => c.split(';')[0])
          .join('; ');
        this.sessionExpiry = Date.now() + 20 * 60 * 1000; // 20 min
        console.log(`✅ FinSystem: Sessão autenticada com sucesso (HTTP ${response.status})`);
        return true;
      }

      // Se retornou 200 sem cookie, verificar se é página de login com erro
      const dataStr = typeof response.data === 'string' ? response.data : '';
      if (dataStr.includes('inválidos') || dataStr.includes('incorret')) {
        console.error('❌ FinSystem: Email ou senha inválidos');
        return false;
      }

      console.error(`❌ FinSystem: Login HTTP ${response.status} sem cookie de sessão. Headers:`, JSON.stringify(response.headers));
      return false;
    } catch (error) {
      // Axios pode lançar erro em redirects — extrair cookie da resposta de erro
      if (error.response) {
        console.log(`🔑 FinSystem: Login erro/redirect HTTP ${error.response.status}`);
        const setCookie = error.response.headers['set-cookie'];
        if (setCookie && setCookie.length > 0) {
          this.sessionCookie = setCookie
            .map(c => c.split(';')[0])
            .join('; ');
          this.sessionExpiry = Date.now() + 20 * 60 * 1000;
          console.log(`✅ FinSystem: Sessão autenticada com sucesso (via catch, HTTP ${error.response.status})`);
          return true;
        }
      }
      console.error(`❌ FinSystem: Erro ao autenticar:`, error.message);
      return false;
    }
  }

  /**
   * Fazer requisição autenticada ao FinSystem
   */
  async request(method, path, data = null) {
    const autenticado = await this.autenticar();
    if (!autenticado) {
      throw new Error('Falha na autenticação com FinSystem. Verifique FINSYSTEM_EMAIL e FINSYSTEM_SENHA.');
    }

    const config = {
      method,
      url: `${this.baseUrl}${path}`,
      headers: {
        'Cookie': this.sessionCookie,
        'Content-Type': 'application/json'
      },
      timeout: this.timeout,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    };

    if (data) config.data = data;

    try {
      return await axios(config);
    } catch (error) {
      // Se recebeu 302/303 para login, sessão expirou — reautenticar
      if ((error.response?.status === 302 || error.response?.status === 303) && 
          error.response?.headers?.location?.includes('/')) {
        console.log('🔄 FinSystem: Sessão expirada, reautenticando...');
        this.sessionCookie = null;
        this.sessionExpiry = null;
        const reauth = await this.autenticar();
        if (!reauth) throw new Error('Falha ao reautenticar com FinSystem');
        config.headers.Cookie = this.sessionCookie;
        return await axios(config);
      }
      throw error;
    }
  }

  async criarRepasseFornecedor(ordem, fornecedor, cliente) {
    try {
      if (!this.isConfigured()) {
        console.log(`ℹ️ FinSystem não configurado. Ordem ${ordem.codigo} criada apenas localmente.`);
        return {
          success: false,
          finsystemId: null,
          error: 'FinSystem não configurado. Configure FINSYSTEM_API_URL, FINSYSTEM_EMAIL e FINSYSTEM_SENHA.'
        };
      }

      const fornecedorNome = fornecedor?.razaoSocial || fornecedor?.nomeFantasia || 'Fornecedor';
      const clienteNome = cliente?.razaoSocial || cliente?.nomeFantasia || 'Cliente';
      const faturaRef = ordem.faturaNumeroManual || ordem.fatura?.numeroFatura || 'Sem fatura';

      const payload = {
        empresa_id: parseInt(this.empresaId),
        conta_bancaria_id: parseInt(this.contaBancariaId),
        tipo: 'despesa',
        data_movimentacao: new Date(ordem.dataGeracao).toISOString().split('T')[0],
        descricao: `Repasse ${fornecedorNome} - ${clienteNome} (${ordem.codigo || 'OP'}) - Fatura: ${faturaRef}`,
        valor_bruto: Number(ordem.valor).toFixed(2).replace('.', ','),
        tipo_operacao: 'repasse',
        forma_pagamento: 'ted',
        status: 'pendente',
        numero_documento: ordem.codigo || null,
        observacoes: [
          `Origem: Portal Finance - Ordem de Pagamento ${ordem.codigo}`,
          `Fornecedor: ${fornecedorNome}`,
          `Cliente: ${clienteNome}`,
          `Fatura: ${faturaRef}`,
          ordem.observacoes ? `Obs: ${ordem.observacoes}` : null
        ].filter(Boolean).join('\n'),
        referencia_externa: `portal-finance:${ordem._id}`
      };

      console.log(`📤 FinSystem: Enviando movimentação para ordem ${ordem.codigo}...`);
      const response = await this.request('POST', '/api/movimentacoes', payload);

      // Detectar resposta HTML
      const contentType = response.headers?.['content-type'] || '';
      const dataStr = typeof response.data === 'string' ? response.data : '';
      if (contentType.includes('text/html') || dataStr.includes('<!DOCTYPE') || dataStr.includes('<html')) {
        console.error(`❌ FinSystem retornou HTML. Sessão pode ter expirado.`);
        // Invalidar sessão e tentar novamente
        this.sessionCookie = null;
        this.sessionExpiry = null;
        return {
          success: false,
          finsystemId: null,
          error: 'FinSystem retornou HTML ao invés de JSON. Sessão pode ter expirado. Tente novamente.'
        };
      }

      console.log(`📡 FinSystem resposta (${response.status}) para ordem ${ordem.codigo}:`, JSON.stringify(response.data));

      const data = response.data;
      const finsystemId = data?.data?.id || data?.id || data?.movimentacao?.id || data?.movimentacao_id || null;

      const isSuccess = data?.success === true || 
                        finsystemId != null || 
                        response.status === 201 ||
                        data?.status === 'ok' ||
                        data?.status === 'created' ||
                        data?.message?.toLowerCase()?.includes('sucesso') ||
                        data?.message?.toLowerCase()?.includes('criado');

      if (isSuccess) {
        console.log(`✅ FinSystem: Movimentação criada${finsystemId ? ` com ID ${finsystemId}` : ''} para ordem ${ordem.codigo}`);
        return {
          success: true,
          finsystemId: finsystemId || `sync-${Date.now()}`,
          error: null
        };
      }

      const errorMsg = data?.error || data?.message || data?.erro || `Resposta inesperada do FinSystem (HTTP ${response.status}): ${JSON.stringify(data).substring(0, 200)}`;
      return { success: false, finsystemId: null, error: errorMsg };
    } catch (error) {
      let mensagem;
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        mensagem = `FinSystem indisponível (${error.code}). Verifique se o serviço está online em ${this.baseUrl}`;
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        mensagem = 'Sem permissão no FinSystem. Verifique as credenciais (FINSYSTEM_EMAIL/FINSYSTEM_SENHA).';
        this.sessionCookie = null;
        this.sessionExpiry = null;
      } else if (error.response?.status >= 500) {
        mensagem = `Erro interno do FinSystem (HTTP ${error.response.status}): ${error.response?.data?.error || error.response?.data?.message || 'Erro desconhecido'}`;
      } else {
        mensagem = error.message || 'Erro de conexão com FinSystem';
      }
      console.error(`❌ FinSystem: Erro ao criar movimentação para ordem ${ordem.codigo}:`, mensagem);
      return { success: false, finsystemId: null, error: mensagem };
    }
  }

  async healthCheck() {
    try {
      if (!this.isConfigured()) {
        return { online: false, version: null, error: 'Não configurado' };
      }
      const response = await this.request('GET', '/api/health');
      return { online: true, version: response.data?.version };
    } catch {
      return { online: false, version: null };
    }
  }
}

module.exports = new FinsystemService();
