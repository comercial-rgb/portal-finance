import React from 'react';
import './Footer.css';

const LOGO_ALTERNATIVO = '/images/InstaSolutions-LockupAlternativo-Cores.png';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-logo">
            <img
              src={LOGO_ALTERNATIVO}
              alt="InstaSolutions"
              className="footer-logo-img"
              loading="lazy"
            />
            <div>
              <h3>InstaSolutions</h3>
              <p>Sistema Financeiro</p>
            </div>
          </div>
          <p className="footer-description">
            Solução completa para gestão financeira empresarial, 
            oferecendo controle total sobre suas finanças.
          </p>
        </div>

        <div className="footer-section">
          <h4>Links Rápidos</h4>
          <ul className="footer-links">
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/fornecedores">Fornecedores</a></li>
            <li><a href="/clientes">Clientes</a></li>
            <li><a href="/faturas-fornecedores">Faturas</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Suporte</h4>
          <ul className="footer-links">
            <li><a href="/suporte">Central de Ajuda</a></li>
            <li><a href="/suporte">Suporte Técnico</a></li>
            <li><a href="/contato">Contato</a></li>
            <li><a href="/sobre">Sobre Nós</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Informações</h4>
          <ul className="footer-links">
            <li><a href="/politica-privacidade">Política de Privacidade</a></li>
            <li><a href="/termos-uso">Termos de Uso</a></li>
            <li><a href="/lgpd">LGPD</a></li>
            <li><a href="/contato">Fale Conosco</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p className="copyright">
            © {new Date().getFullYear()} InstaSolutions. Todos os direitos reservados.
          </p>
          <div className="footer-badges">
            <span className="badge">🔒 Seguro</span>
            <span className="badge">✓ Certificado</span>
            <span className="badge">🛡️ LGPD</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
