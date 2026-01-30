import api from './api';

const notaFiscalClienteService = {
  // Criar nova nota fiscal
  criar: (data) => {
    return api.post('/notas-fiscais-clientes', data);
  },

  // Listar notas fiscais com filtros
  listar: (params) => {
    return api.get('/notas-fiscais-clientes', { params });
  },

  // Buscar nota fiscal por ID
  buscarPorId: (id) => {
    return api.get(`/notas-fiscais-clientes/${id}`);
  },

  // Atualizar nota fiscal
  atualizar: (id, data) => {
    return api.put(`/notas-fiscais-clientes/${id}`, data);
  },

  // Deletar nota fiscal
  deletar: (id) => {
    return api.delete(`/notas-fiscais-clientes/${id}`);
  },

  // Buscar estatísticas
  estatisticas: (params) => {
    return api.get('/notas-fiscais-clientes/estatisticas', { params });
  }
};

export default notaFiscalClienteService;
