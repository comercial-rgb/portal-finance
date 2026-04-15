import React from 'react';
import Footer from '../components/Footer';
import './Institucional.css';

function TermosUso() {
  return (
    <div className="institucional-page">
      <div className="institucional-header">
        <a href="/login" className="institucional-logo-link">
          <img src="/images/InstaSolutions-LockupAlternativo-Cores.png" alt="InstaSolutions" className="institucional-logo" />
        </a>
      </div>

      <div className="institucional-content">
        <h1>Termos de Uso</h1>
        <p className="institucional-date">Última atualização: 06 de abril de 2026</p>

        <p>
          Bem-vindo ao Portal Financeiro da InstaSolutions Produtos e Gestão Empresarial (CNPJ 47.611.398/0001-66). Ao acessar e utilizar este sistema, você concorda com os termos e condições descritos abaixo. Caso não concorde, por favor, não utilize o sistema.
        </p>

        <h2>1. Objeto</h2>
        <p>
          Este portal é uma plataforma de gestão financeira desenvolvida pela InstaSolutions, destinada ao controle de faturas, ordens de pagamento, impostos, retenções e demais operações financeiras relacionadas à gestão de frotas e serviços credenciados.
        </p>

        <h2>2. Acesso e Cadastro</h2>
        <ul>
          <li>O acesso ao sistema é restrito a usuários devidamente cadastrados e autorizados.</li>
          <li>Cada usuário é responsável pela confidencialidade de suas credenciais de acesso (e-mail e senha).</li>
          <li>É proibido compartilhar credenciais de acesso com terceiros.</li>
          <li>A InstaSolutions reserva-se o direito de revogar acessos a qualquer momento, mediante notificação prévia.</li>
        </ul>

        <h2>3. Uso Adequado</h2>
        <p>O usuário compromete-se a utilizar o sistema exclusivamente para as finalidades a que se destina, sendo vedado:</p>
        <ul>
          <li>Tentar acessar dados ou funcionalidades não autorizados para seu perfil de usuário.</li>
          <li>Utilizar o sistema para fins ilegais, fraudulentos ou que violem direitos de terceiros.</li>
          <li>Realizar engenharia reversa, descompilação ou qualquer tentativa de acesso ao código-fonte.</li>
          <li>Sobrecarregar intencionalmente o sistema com requisições excessivas.</li>
          <li>Inserir dados falsos, incompletos ou enganosos no sistema.</li>
        </ul>

        <h2>4. Propriedade Intelectual</h2>
        <p>
          Todo o conteúdo do sistema, incluindo mas não se limitando a software, interface, textos, logotipos, ícones e funcionalidades, é de propriedade exclusiva da InstaSolutions e protegido por leis de propriedade intelectual. Nenhuma parte pode ser reproduzida, distribuída ou utilizada sem autorização expressa.
        </p>

        <h2>5. Responsabilidades</h2>
        <ul>
          <li>A InstaSolutions empenha-se em manter o sistema disponível e operacional, porém não garante disponibilidade ininterrupta.</li>
          <li>Manutenções programadas poderão ocorrer, sendo comunicadas com antecedência quando possível.</li>
          <li>O usuário é responsável pela veracidade das informações inseridas no sistema.</li>
          <li>A InstaSolutions não se responsabiliza por prejuízos decorrentes do uso indevido do sistema pelo usuário.</li>
        </ul>

        <h2>6. Proteção de Dados</h2>
        <p>
          O tratamento de dados pessoais obedece à nossa <a href="/politica-privacidade">Política de Privacidade</a> e à Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018). Para mais detalhes, consulte a página de <a href="/lgpd">Conformidade LGPD</a>.
        </p>

        <h2>7. Limitação de Responsabilidade</h2>
        <p>
          A InstaSolutions não será responsável por danos indiretos, incidentais, especiais ou consequenciais, incluindo perda de dados, lucros cessantes ou interrupção de negócios, decorrentes do uso ou impossibilidade de uso do sistema, exceto nos casos previstos em lei.
        </p>

        <h2>8. Alterações nos Termos</h2>
        <p>
          Estes Termos de Uso poderão ser atualizados a qualquer momento. As alterações serão comunicadas por meio do sistema e entrarão em vigor na data de sua publicação. O uso continuado do sistema após a publicação das alterações constitui aceitação dos novos termos.
        </p>

        <h2>9. Foro e Legislação Aplicável</h2>
        <p>
          Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Para dirimir quaisquer controvérsias, fica eleito o foro da Comarca de Barueri, Estado de São Paulo, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
        </p>

        <h2>10. Contato</h2>
        <p>Para dúvidas sobre estes Termos de Uso, entre em contato:</p>
        <ul>
          <li><strong>Empresa:</strong> InstaSolutions Produtos e Gestão Empresarial</li>
          <li><strong>CNPJ:</strong> 47.611.398/0001-66</li>
          <li><strong>E-mail:</strong> <a href="mailto:comercial@instasolutions.com.br">comercial@instasolutions.com.br</a></li>
          <li><strong>Telefone:</strong> (11) 3336-6941</li>
        </ul>
      </div>

      <Footer />
    </div>
  );
}

export default TermosUso;
