import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import './RedefinirSenha.css';

const RedefinirSenha = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    novaSenha: '',
    confirmarSenha: ''
  });
  const [loading, setLoading] = useState(false);

  const { novaSenha, confirmarSenha } = formData;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!novaSenha || !confirmarSenha) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (novaSenha.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.redefinirSenha(token, novaSenha);
      
      if (response.success) {
        toast.success('Senha redefinida com sucesso!');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        toast.error(response.message || 'Erro ao redefinir senha');
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao redefinir senha. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="redefinir-senha-container">
      <div className="redefinir-senha-card">
        <div className="logo-container">
          <div className="logo">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="#667eea" />
              <text x="50" y="65" fontSize="48" fontWeight="bold" fill="white" textAnchor="middle">IS</text>
            </svg>
          </div>
        </div>

        <h1 className="title">Redefinir Senha</h1>
        <p className="description">Digite sua nova senha abaixo.</p>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="novaSenha">Nova Senha</label>
            <input
              type="password"
              id="novaSenha"
              name="novaSenha"
              value={novaSenha}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmarSenha">Confirmar Senha</label>
            <input
              type="password"
              id="confirmarSenha"
              name="confirmarSenha"
              value={confirmarSenha}
              onChange={handleChange}
              placeholder="Digite a senha novamente"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Redefinindo...' : 'Redefinir Senha'}
          </button>
        </form>

        <div className="back-to-login">
          <Link to="/login">← Voltar para o login</Link>
        </div>
      </div>
    </div>
  );
};

export default RedefinirSenha;
