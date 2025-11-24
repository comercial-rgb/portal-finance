import axios from 'axios';

// Detectar se está rodando em Codespace e usar a URL correta
const getApiUrl = () => {
  const hostname = window.location.hostname;
  const origin = window.location.origin;
  
  console.log('Hostname:', hostname);
  console.log('Origin:', origin);
  
  // Se estiver em Codespace (detecta .app.github.dev ou .github.dev)
  if (hostname.includes('app.github.dev') || hostname.includes('github.dev') || hostname.includes('githubpreview.dev')) {
    // Substituir a porta 3000 pela 5000 na URL atual
    const apiUrl = origin.replace('-3000.', '-5000.').replace('.app.github.dev', '.app.github.dev') + '/api';
    console.log('Detectado Codespace, usando URL:', apiUrl);
    return apiUrl;
  }
  
  // Caso contrário, usar a URL padrão
  const defaultUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  console.log('Usando URL padrão:', defaultUrl);
  return defaultUrl;
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

console.log('🔗 API URL configurada:', api.defaults.baseURL);

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Evitar loop de redirecionamento
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
