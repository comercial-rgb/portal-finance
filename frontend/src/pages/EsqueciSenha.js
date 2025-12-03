import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import './EsqueciSenha.css';

const LOGO_ALTERNATIVO = '/images/InstaSolutions-LockupAlternativo-Cores.png';

const EsqueciSenha = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Por favor, informe seu e-mail');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.esqueciSenha(email);
      
      if (response.success) {
        setEnviado(true);
        toast.success('Instruções enviadas para o seu e-mail!');
      } else {
        toast.error(response.message || 'Erro ao enviar e-mail');
      }
    } catch (error) {
      console.error('Erro ao solicitar recuperação:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao enviar e-mail. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="esqueci-senha-container">
      <div className="esqueci-senha-card">
        <div className="logo-container">
          <div className="logo">
            <img src={LOGO_ALTERNATIVO} alt="InstaSolutions" loading="lazy" />
          </div>
        </div>

        <h1 className="title">Recuperar Senha</h1>

        {!enviado ? (
          <>
            <p className="description">
              Digite seu e-mail cadastrado e enviaremos instruções para redefinir sua senha.
            </p>

            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label htmlFor="email">E-mail</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Instruções'}
              </button>
            </form>
          </>
        ) : (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>E-mail Enviado!</h2>
            <p>Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p>
          </div>
        )}

        <div className="back-to-login">
          <Link to="/login">← Voltar para o login</Link>
        </div>
      </div>
    </div>
  );
};

export default EsqueciSenha;
