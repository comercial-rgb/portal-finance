import React from 'react';
import Footer from '../components/Footer';
import './Institucional.css';

function Contato() {
  return (
    <div className="institucional-page">
      <div className="institucional-header">
        <a href="/login" className="institucional-logo-link">
          <img src="/images/InstaSolutions-LockupAlternativo-Cores.png" alt="InstaSolutions" className="institucional-logo" />
        </a>
      </div>

      <div className="institucional-content">
        <h1>Contato</h1>
        <p>Entre em contato conosco. Nossa equipe está pronta para atendê-lo.</p>

        <div className="institucional-cards">
          <div className="institucional-card">
            <h3>📍 Matriz – Barueri (SP)</h3>
            <p>Alameda Rio Negro, 1030</p>
            <p>Ed. Stadium Corporate Alphaville, Esc. 2304</p>
            <p>Alphaville, Barueri-SP</p>
            <p>CEP 06454-000</p>
          </div>
          <div className="institucional-card">
            <h3>📍 Filial – Campo Grande (MS)</h3>
            <p>Campo Grande, Mato Grosso do Sul</p>
          </div>
          <div className="institucional-card">
            <h3>📍 Filial – Fortaleza (CE)</h3>
            <p>Fortaleza, Ceará</p>
          </div>
        </div>

        <h2>Canais de Atendimento</h2>
        <div className="institucional-cards">
          <div className="institucional-card">
            <h3>📞 Telefone</h3>
            <p><a href="tel:+551133366941">(11) 3336-6941</a></p>
          </div>
          <div className="institucional-card">
            <h3>📧 E-mail Comercial</h3>
            <p><a href="mailto:comercial@instasolutions.com.br">comercial@instasolutions.com.br</a></p>
          </div>
          <div className="institucional-card">
            <h3>💰 E-mail Financeiro</h3>
            <p><a href="mailto:financeiro@instasolutions.com.br">financeiro@instasolutions.com.br</a></p>
          </div>
        </div>

        <h2>Informações da Empresa</h2>
        <ul>
          <li><strong>Razão Social:</strong> InstaSolutions Produtos e Gestão Empresarial</li>
          <li><strong>CNPJ:</strong> 47.611.398/0001-66</li>
          <li><strong>Website:</strong> <a href="https://frotainstasolutions.com.br" target="_blank" rel="noopener noreferrer">frotainstasolutions.com.br</a></li>
        </ul>
      </div>

      <Footer />
    </div>
  );
}

export default Contato;
