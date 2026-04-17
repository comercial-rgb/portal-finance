const axios = require('axios');

/**
 * Serviço de integração com o FinSystem (sistema de administração financeira)
 * Envia movimentações automaticamente ao criar ordens de pagamento
 */
class FinsystemService {
  constructor() {
    this.baseUrl = process.env.FINSYSTEM_API_URL || 'http://localhost:4567';
    this.apiKey = process.env.FINSYSTEM_API_KEY || 'finsystem_dev_api_key_2026';
    this.empresaId = process.env.FINSYSTEM_EMPRESA_ID || '1';
    this.contaBancariaId = process.env.FINSYSTEM_CONTA_BANCARIA_ID || '1';
    this.timeout = 10000; // 10 segundos
  }

  /**
   * Criar movimentação de repasse a fornecedor no FinSystem
   * @param {Object} ordem - Ordem de pagamento do portal-finance
   * @param {Object} fornecedor - Dados do fornecedor (populado)
   * @param {Object} cliente - Dados do cliente (populado)
   * @returns {Object} { success, finsystemId, error }
   */
  isConfigured() {
    return this.baseUrl && this.baseUrl !== 'http://localhost:4567' && this.apiKey && this.apiKey !== 'finsystem_dev_api_key_2026';
  }

  async criarRepasseFornecedor(ordem, fornecedor, cliente) {
    try {
      // Se FinSystem não está configurado, retornar sem erro
      if (!this.isConfigured()) {
        console.log(`ℹ️ FinSystem não configurado. Ordem ${ordem.codigo} criada apenas localmente.`);
        return {
          success: false,
          finsystemId: null,
          error: 'FinSystem não configurado (variáveis de ambiente FINSYSTEM_API_URL e FINSYSTEM_API_KEY não definidas)'
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

      const response = await axios.post(
        `${this.baseUrl}/api/movimentacoes`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': this.apiKey
          },
          timeout: this.timeout
        }
      );

      if (response.data?.success) {
        console.log(`✅ FinSystem: Movimentação criada com ID ${response.data.data.id} para ordem ${ordem.codigo}`);
        return {
          success: true,
          finsystemId: response.data.data.id,
          error: null
        };
      }

      return {
        success: false,
        finsystemId: null,
        error: response.data?.error || 'Resposta inesperada do FinSystem'
      };
    } catch (error) {
      let mensagem;
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        mensagem = `FinSystem indisponível (${error.code}). Verifique se o serviço está online em ${this.baseUrl}`;
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        mensagem = 'Chave de API do FinSystem inválida ou sem permissão';
      } else if (error.response?.status >= 500) {
        mensagem = `Erro interno do FinSystem (HTTP ${error.response.status}): ${error.response?.data?.error || error.response?.data?.message || 'Erro desconhecido'}`;
      } else {
        mensagem = error.response?.data?.error || error.message || 'Erro de conexão com FinSystem';
      }
      console.error(`❌ FinSystem: Erro ao criar movimentação para ordem ${ordem.codigo}:`, mensagem);
      return {
        success: false,
        finsystemId: null,
        error: mensagem
      };
    }
  }

  /**
   * Verificar se o FinSystem está acessível
   * @returns {Object} { online, version }
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`, {
        headers: { 'X-API-KEY': this.apiKey },
        timeout: 5000
      });
      return { online: true, version: response.data?.version };
    } catch {
      return { online: false, version: null };
    }
  }
}

module.exports = new FinsystemService();
