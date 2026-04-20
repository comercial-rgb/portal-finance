import React from 'react';

/**
 * ErrorBoundary evita a "tela branca" quando um componente filho lança erro
 * em runtime (ex.: acesso a propriedade de valor undefined após falha de rede).
 * Mostra uma mensagem amigável com opção de recarregar.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log detalhado para o console - aparece no F12 do usuário
    // e ajuda no diagnóstico remoto.
    console.error('[ErrorBoundary] Erro capturado:', error, info?.componentStack);
  }

  handleReload = () => {
    try {
      // limpa storage de sessão para evitar loop se o erro vier de dados ruins
      window.location.reload();
    } catch {
      /* ignore */
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        padding: '32px',
        maxWidth: '640px',
        margin: '48px auto',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#1a2238'
      }}>
        <h2 style={{ marginTop: 0 }}>Ops, algo deu errado</h2>
        <p>A tela encontrou um erro inesperado ao carregar. Tente recarregar a página.</p>
        {this.state.error?.message && (
          <pre style={{
            background: '#f6f8fb',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '180px'
          }}>
            {String(this.state.error.message)}
          </pre>
        )}
        <button
          onClick={this.handleReload}
          style={{
            marginTop: '16px',
            padding: '10px 18px',
            background: '#2f56d9',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Recarregar página
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
