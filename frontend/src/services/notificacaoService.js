import api from './api';

const notificacaoService = {
  // Listar notificações do usuário
  listar: async (lida = null) => {
    try {
      const params = lida !== null ? { lida } : {};
      const response = await api.get('/notificacoes', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar notificações:', error);
      throw error;
    }
  },

  // Contar notificações não lidas
  contarNaoLidas: async () => {
    try {
      const response = await api.get('/notificacoes/nao-lidas/count');
      return response.data.count;
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
      throw error;
    }
  },

  // Marcar notificação como lida
  marcarComoLida: async (id) => {
    try {
      const response = await api.patch(`/notificacoes/${id}/ler`);
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  },

  // Marcar todas como lidas
  marcarTodasComoLidas: async () => {
    try {
      const response = await api.patch('/notificacoes/marcar-todas-lidas');
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
      throw error;
    }
  }
};

export default notificacaoService;
