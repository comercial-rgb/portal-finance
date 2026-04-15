import React from 'react';
import Footer from '../components/Footer';
import './Institucional.css';

function Suporte() {
  return (
    <div className="institucional-page">
      <div className="institucional-header">
        <a href="/login" className="institucional-logo-link">
          <img src="/images/InstaSolutions-LockupAlternativo-Cores.png" alt="InstaSolutions" className="institucional-logo" />
        </a>
      </div>

      <div className="institucional-content">
        <h1>Suporte Técnico</h1>
        <p>Precisa de ajuda? Nossa equipe de suporte está disponível para resolver suas dúvidas e problemas técnicos.</p>

        <h2>Como Solicitar Suporte</h2>
        <div className="institucional-cards">
          <div className="institucional-card">
            <h3>📧 E-mail</h3>
            <p>Envie um e-mail detalhando sua solicitação para:</p>
            <p><a href="mailto:comercial@instasolutions.com.br">comercial@instasolutions.com.br</a></p>
          </div>
          <div className="institucional-card">
            <h3>📞 Telefone</h3>
            <p>Ligue para nossa central de atendimento:</p>
            <p><a href="tel:+551133366941">(11) 3336-6941</a></p>
          </div>
        </div>

        <h2>Tipos de Chamado</h2>
        <div className="institucional-cards">
          <div className="institucional-card">
            <h3>🐛 Bug / Erro</h3>
            <p>Reporte erros ou comportamentos inesperados no sistema.</p>
          </div>
          <div className="institucional-card">
            <h3>💡 Melhoria</h3>
            <p>Sugira novas funcionalidades ou melhorias no sistema.</p>
          </div>
          <div className="institucional-card">
            <h3>🔧 Suporte Técnico</h3>
            <p>Solicite ajuda para configurações, acessos e operações do sistema.</p>
          </div>
          <div className="institucional-card">
            <h3>❓ Dúvida</h3>
            <p>Tire dúvidas sobre funcionalidades, processos ou relatórios.</p>
          </div>
        </div>

        <h2>Informações para o Chamado</h2>
        <p>Para agilizar seu atendimento, ao entrar em contato inclua:</p>
        <ul>
          <li>Seu nome e e-mail de cadastro no sistema</li>
          <li>Descrição detalhada do problema ou solicitação</li>
          <li>Capturas de tela, se aplicável</li>
          <li>Navegador e sistema operacional utilizados</li>
          <li>Passos para reproduzir o problema (quando aplicável)</li>
        </ul>

        <h2>Horário de Atendimento</h2>
        <p>Segunda a sexta-feira, das 8h às 18h (horário de Brasília).</p>
      </div>

      <Footer />
    </div>
  );
}

export default Suporte;
