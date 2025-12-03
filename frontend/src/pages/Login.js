import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import './Login.css';

const LOGO_ALTERNATIVO = '/images/InstaSolutions-LockupAlternativo-Cores.png';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });
  const [loading, setLoading] = useState(false);

  const { email, senha } = formData;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !senha) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      console.log('Tentando fazer login com:', email);
      const response = await authService.login(email, senha);
      console.log('Resposta do login:', response);
      
      if (response.success) {
        toast.success('Login realizado com sucesso!');
        sessionStorage.setItem('justLoggedIn', 'true');
        
        // Redirecionar baseado no role do usuário
        const user = authService.getCurrentUser();
        let dashboardPath = '/dashboard';
        
        if (user?.role === 'fornecedor') {
          dashboardPath = '/dashboard-fornecedor';
        } else if (user?.role === 'cliente') {
          dashboardPath = '/dashboard-cliente';
        }
        
        setTimeout(() => {
          navigate(dashboardPath);
        }, 500);
      } else {
        toast.error(response.message || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      console.error('Detalhes do erro:', error.response);
      const errorMessage = error.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-branding">
          <div className="login-logo">
            <img src={LOGO_ALTERNATIVO} alt="InstaSolutions" loading="lazy" />
          </div>
          <h1>InstaSolutions</h1>
          <p>Sistema Financeiro Inteligente</p>
        </div>

        <div className="login-features">
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <div className="feature-text">
              <h3>Gestão Completa</h3>
              <p>Controle total de clientes e fornecedores</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">💰</div>
            <div className="feature-text">
              <h3>Financeiro</h3>
              <p>Faturas e ordens de serviço integradas</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔒</div>
            <div className="feature-text">
              <h3>Segurança</h3>
              <p>Controle de acesso e permissões</p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <h2>Bem-vindo!</h2>
          <p>Faça login para acessar o sistema</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={handleChange}
                placeholder="seu@email.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="senha">Senha</label>
              <input
                type="password"
                id="senha"
                name="senha"
                value={senha}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="forgot-password">
            <Link to="/esqueci-senha">Esqueceu sua senha?</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
