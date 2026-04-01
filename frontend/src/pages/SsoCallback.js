import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const SsoCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const processSSO = async () => {
      const ssoToken = searchParams.get('token');

      if (!ssoToken) {
        setError('Token SSO não encontrado');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        const response = await api.post('/auth/sso', { token: ssoToken });

        if (response.data.success && response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));

          const role = response.data.user.role;
          if (role === 'fornecedor') {
            navigate('/dashboard-fornecedor', { replace: true });
          } else if (role === 'cliente') {
            navigate('/dashboard-cliente', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          setError(response.data.message || 'Erro na autenticação SSO');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Erro ao processar login SSO';
        setError(msg);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    processSSO();
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '400px'
      }}>
        {error ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ color: '#d32f2f', marginBottom: '8px' }}>Erro no Login</h3>
            <p style={{ color: '#666' }}>{error}</p>
            <p style={{ color: '#999', fontSize: '14px' }}>Redirecionando para a página de login...</p>
          </>
        ) : (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e0e0e0',
              borderTop: '4px solid #1a237e',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <h3 style={{ color: '#1a237e', marginBottom: '8px' }}>Autenticando...</h3>
            <p style={{ color: '#666' }}>Conectando ao Portal Financeiro via Sistema de Frotas</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </>
        )}
      </div>
    </div>
  );
};

export default SsoCallback;
