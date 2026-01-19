import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import authService from '../services/authService';
import './AlterarSenhaObrigatoria.css';

const LOGO_ALTERNATIVO = '/images/InstaSolutions-LockupAlternativo-Cores.png';

const AlterarSenhaObrigatoria = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({
    senhaAtual: false,
    novaSenha: false,
    confirmarSenha: false
  });

  const { senhaAtual, novaSenha, confirmarSenha } = formData;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleShowPassword = (field) => {
    setShowPassword({
      ...showPassword,
      [field]: !showPassword[field]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (novaSenha.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      await api.put('/auth/alterar-senha', {
        senhaAtual,
        novaSenha
      });

      toast.success('Senha alterada com sucesso!');
      
      // Aguardar um pouco e redirecionar
      setTimeout(() => {
        const user = authService.getCurrentUser();
        if (user?.role === 'fornecedor') {
          navigate('/dashboard-fornecedor');
        } else if (user?.role === 'cliente') {
          navigate('/dashboard-cliente');
        } else {
          navigate('/dashboard');
        }
      }, 1000);
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error(error.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="alterar-senha-container">
      <div className="alterar-senha-card">
        <div className="logo-container">
          <img src={LOGO_ALTERNATIVO} alt="InstaSolutions" className="logo" />
        </div>
        
        <div className="alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div>
            <h3>Alteração de Senha Obrigatória</h3>
            <p>Por medida de segurança, você precisa alterar sua senha antes de continuar.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="alterar-senha-form">
          <div className="form-group">
            <label htmlFor="senhaAtual">Senha Atual</label>
            <div className="input-with-icon">
              <input
                type={showPassword.senhaAtual ? 'text' : 'password'}
                id="senhaAtual"
                name="senhaAtual"
                value={senhaAtual}
                onChange={handleChange}
                placeholder="Digite sua senha atual"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => toggleShowPassword('senhaAtual')}
              >
                {showPassword.senhaAtual ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="novaSenha">Nova Senha</label>
            <div className="input-with-icon">
              <input
                type={showPassword.novaSenha ? 'text' : 'password'}
                id="novaSenha"
                name="novaSenha"
                value={novaSenha}
                onChange={handleChange}
                placeholder="Digite sua nova senha (mínimo 6 caracteres)"
                required
                minLength="6"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => toggleShowPassword('novaSenha')}
              >
                {showPassword.novaSenha ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            <small>A senha deve conter no mínimo 6 caracteres</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmarSenha">Confirmar Nova Senha</label>
            <div className="input-with-icon">
              <input
                type={showPassword.confirmarSenha ? 'text' : 'password'}
                id="confirmarSenha"
                name="confirmarSenha"
                value={confirmarSenha}
                onChange={handleChange}
                placeholder="Confirme sua nova senha"
                required
                minLength="6"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => toggleShowPassword('confirmarSenha')}
              >
                {showPassword.confirmarSenha ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </button>
            <button type="button" className="btn-secondary" onClick={handleLogout}>
              Cancelar e Sair
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AlterarSenhaObrigatoria;
