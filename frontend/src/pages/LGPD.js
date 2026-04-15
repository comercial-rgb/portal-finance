import React from 'react';
import Footer from '../components/Footer';
import './Institucional.css';

function LGPD() {
  return (
    <div className="institucional-page">
      <div className="institucional-header">
        <a href="/login" className="institucional-logo-link">
          <img src="/images/InstaSolutions-LockupAlternativo-Cores.png" alt="InstaSolutions" className="institucional-logo" />
        </a>
      </div>

      <div className="institucional-content">
        <h1>Conformidade LGPD</h1>
        <span className="institucional-badge">Lei Geral de Proteção de Dados</span>

        <p>
          A InstaSolutions Produtos e Gestão Empresarial (CNPJ 47.611.398/0001-66) está em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD – Lei nº 13.709/2018), garantindo transparência, segurança e respeito no tratamento de dados pessoais de todos os usuários de seus sistemas e plataformas.
        </p>

        <h2>O que é a LGPD?</h2>
        <p>
          A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) é a legislação brasileira que regula o tratamento de dados pessoais por pessoas físicas e jurídicas, de direito público ou privado. A lei tem como objetivo proteger os direitos fundamentais de liberdade e privacidade, promovendo a transparência no uso de informações pessoais.
        </p>

        <h2>Nossos Compromissos</h2>
        <div className="institucional-cards">
          <div className="institucional-card">
            <h3>🔒 Segurança dos Dados</h3>
            <p>Adotamos medidas técnicas e administrativas aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração ou comunicação.</p>
          </div>
          <div className="institucional-card">
            <h3>📋 Transparência</h3>
            <p>Garantimos informações claras, precisas e facilmente acessíveis sobre o tratamento de dados e os respectivos agentes de tratamento, observados os segredos comerciais e industriais.</p>
          </div>
          <div className="institucional-card">
            <h3>🎯 Finalidade</h3>
            <p>Realizamos o tratamento de dados pessoais para propósitos legítimos, específicos, explícitos e informados ao titular, sem possibilidade de tratamento posterior de forma incompatível com essas finalidades.</p>
          </div>
          <div className="institucional-card">
            <h3>📉 Minimização</h3>
            <p>Limitamos o tratamento ao mínimo necessário para a realização de suas finalidades, com abrangência dos dados pertinentes, proporcionais e não excessivos.</p>
          </div>
        </div>

        <h2>Seus Direitos como Titular de Dados</h2>
        <p>A LGPD garante ao titular dos dados os seguintes direitos:</p>
        <ul>
          <li><strong>Confirmação e acesso:</strong> saber se seus dados estão sendo tratados e acessar as informações.</li>
          <li><strong>Correção:</strong> solicitar a correção de dados incompletos, inexatos ou desatualizados.</li>
          <li><strong>Anonimização, bloqueio ou eliminação:</strong> de dados desnecessários, excessivos ou tratados em desconformidade.</li>
          <li><strong>Portabilidade:</strong> transferir seus dados a outro fornecedor de serviço.</li>
          <li><strong>Eliminação:</strong> dos dados tratados com base em consentimento.</li>
          <li><strong>Informação:</strong> sobre entidades públicas e privadas com as quais compartilhamos seus dados.</li>
          <li><strong>Revogação do consentimento:</strong> a qualquer momento, de forma gratuita e facilitada.</li>
        </ul>

        <h2>Como Exercer seus Direitos</h2>
        <p>Para exercer qualquer um dos direitos acima, entre em contato com nosso Encarregado de Proteção de Dados (DPO):</p>
        <div className="institucional-contact-box">
          <p><strong>E-mail:</strong> <a href="mailto:comercial@instasolutions.com.br">comercial@instasolutions.com.br</a></p>
          <p><strong>Telefone:</strong> (11) 3336-6941</p>
          <p><strong>Endereço:</strong> Alameda Rio Negro, 1030, Ed. Stadium Corporate Alphaville, Esc. 2304, Alphaville, Barueri-SP, CEP 06454-000</p>
        </div>
        <p>Sua solicitação será atendida no prazo de até 15 dias, conforme previsto na legislação.</p>

        <h2>Documentos Relacionados</h2>
        <ul>
          <li><a href="/politica-privacidade">Política de Privacidade</a></li>
          <li><a href="/termos-uso">Termos de Uso</a></li>
        </ul>
      </div>

      <Footer />
    </div>
  );
}

export default LGPD;
