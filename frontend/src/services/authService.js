import api from './api';

const authService = {
  // Login
  login: async (email, senha) => {
    console.log('Tentando login com:', email);
    console.log('API URL:', api.defaults.baseURL);
    const response = await api.post('/auth/login', { email, senha });
    console.log('Resposta do login:', response.data);
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Verificar se está autenticado
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Obter usuário atual
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Esqueci senha
  esqueciSenha: async (email) => {
    const response = await api.post('/auth/esqueci-senha', { email });
    return response.data;
  },

  // Redefinir senha
  redefinirSenha: async (token, novaSenha) => {
    const response = await api.put(`/auth/redefinir-senha/${token}`, { novaSenha });
    return response.data;
  },

  // Obter dados do usuário logado
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Atualizar perfil
  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    if (response.data.success && response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  }
};

export default authService;
