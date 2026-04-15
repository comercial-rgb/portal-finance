import React from 'react';
import Footer from '../components/Footer';
import './Institucional.css';

function PoliticaPrivacidade() {
  return (
    <div className="institucional-page">
      <div className="institucional-header">
        <a href="/login" className="institucional-logo-link">
          <img src="/images/InstaSolutions-LockupAlternativo-Cores.png" alt="InstaSolutions" className="institucional-logo" />
        </a>
      </div>

      <div className="institucional-content">
        <h1>Política de Privacidade</h1>
        <p className="institucional-date">Última atualização: 06 de abril de 2026</p>

        <p>
          A InstaSolutions Produtos e Gestão Empresarial (CNPJ 47.611.398/0001-66), doravante denominada simplesmente "InstaSolutions", é a responsável pelo tratamento dos dados pessoais coletados por meio de seus aplicativos móveis: InstaSolutions Combustíveis, InstaSolutions Manutenção e InstaSolutions Rastreamento (coletivamente, "Aplicativos").
        </p>

        <p>
          Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018) e demais legislações aplicáveis.
        </p>

        <h2>1. Dados Pessoais Coletados</h2>
        <p>Ao utilizar nossos Aplicativos, podemos coletar as seguintes categorias de dados:</p>
        <ul>
          <li><strong>Dados de identificação:</strong> nome completo, CPF/RG, e-mail, telefone, empresa e cargo.</li>
          <li><strong>Dados de autenticação:</strong> credenciais de login (e-mail e senha criptografada).</li>
          <li><strong>Dados de localização:</strong> coordenadas GPS em tempo real, utilizadas para localizar postos de combustível, oficinas próximas, rastreamento veicular e assistência em estrada.</li>
          <li><strong>Dados de câmera e imagens:</strong> fotos capturadas para registro de ordens de serviço, perfil do usuário, leitura de QR codes e documentação veicular.</li>
          <li><strong>Dados de NFC:</strong> leitura de tags NFC para identificação de veículos e validação de abastecimentos (aplicativo Combustíveis).</li>
          <li><strong>Dados de uso do aplicativo:</strong> logs de acesso, interações, preferências e configurações.</li>
          <li><strong>Dados de veículos:</strong> placa, modelo, quilometragem, consumo e histórico de manutenção e abastecimento.</li>
          <li><strong>Notificações push:</strong> tokens de dispositivo para envio de alertas operacionais, cercas virtuais e atualizações de ordens de serviço.</li>
        </ul>

        <h2>2. Finalidades do Tratamento</h2>
        <p>Os dados coletados são utilizados para as seguintes finalidades:</p>
        <ul>
          <li>Fornecer, operar e manter os serviços dos Aplicativos.</li>
          <li>Gerenciar abastecimentos, manutenções e rastreamento de frotas.</li>
          <li>Exibir postos de combustível e oficinas credenciadas próximas à localização do usuário.</li>
          <li>Enviar notificações e alertas operacionais relevantes.</li>
          <li>Gerar relatórios, dashboards e indicadores de desempenho da frota.</li>
          <li>Garantir a segurança e prevenir fraudes no uso dos serviços.</li>
          <li>Cumprir obrigações legais e regulatórias.</li>
          <li>Melhorar continuamente a experiência do usuário e dos Aplicativos.</li>
        </ul>

        <h2>3. Base Legal para o Tratamento</h2>
        <p>O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais previstas na LGPD:</p>
        <ul>
          <li><strong>Execução de contrato:</strong> para prestação dos serviços contratados.</li>
          <li><strong>Consentimento:</strong> para coleta de localização e envio de notificações push.</li>
          <li><strong>Legítimo interesse:</strong> para melhoria dos serviços e prevenção de fraudes.</li>
          <li><strong>Obrigação legal:</strong> para cumprimento de exigências regulatórias.</li>
        </ul>

        <h2>4. Compartilhamento de Dados</h2>
        <p>Seus dados pessoais poderão ser compartilhados com:</p>
        <ul>
          <li><strong>Rede de credenciados:</strong> oficinas e postos de combustível parceiros, para a execução dos serviços de manutenção e abastecimento.</li>
          <li><strong>Prestadores de serviço:</strong> fornecedores de infraestrutura tecnológica (hospedagem, analytics), sob contrato de confidencialidade.</li>
          <li><strong>Autoridades públicas:</strong> quando exigido por lei, regulamento ou ordem judicial.</li>
        </ul>
        <p>Não comercializamos, alugamos ou vendemos dados pessoais a terceiros para fins de marketing.</p>

        <h2>5. Armazenamento e Segurança</h2>
        <p>Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acessos não autorizados, perda, alteração ou destruição, incluindo:</p>
        <ul>
          <li>Criptografia de dados em trânsito (TLS/SSL) e em repouso.</li>
          <li>Controles de acesso baseados em perfis e permissões.</li>
          <li>Armazenamento seguro de credenciais (hashing de senhas).</li>
          <li>Monitoramento contínuo de vulnerabilidades e incidentes.</li>
        </ul>
        <p>Os dados serão armazenados pelo período necessário ao cumprimento das finalidades descritas nesta Política ou conforme exigido por obrigações legais.</p>

        <h2>6. Direitos do Titular</h2>
        <p>Nos termos da LGPD, você possui os seguintes direitos em relação aos seus dados pessoais:</p>
        <ul>
          <li>Confirmação da existência de tratamento de dados.</li>
          <li>Acesso aos dados pessoais coletados.</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos.</li>
          <li>Portabilidade dos dados a outro fornecedor de serviço.</li>
          <li>Eliminação dos dados tratados com consentimento.</li>
          <li>Informação sobre o compartilhamento dos dados.</li>
          <li>Revogação do consentimento a qualquer momento.</li>
        </ul>
        <p>Para exercer seus direitos, entre em contato pelo e-mail <a href="mailto:comercial@instasolutions.com.br">comercial@instasolutions.com.br</a>.</p>

        <h2>7. Permissões dos Aplicativos</h2>
        <p>Nossos Aplicativos poderão solicitar as seguintes permissões no dispositivo:</p>
        <div className="institucional-table-wrapper">
          <table className="institucional-table">
            <thead>
              <tr>
                <th>Permissão</th>
                <th>Finalidade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Localização (GPS)</td>
                <td>Localizar postos/oficinas próximos; rastreamento veicular em tempo real.</td>
              </tr>
              <tr>
                <td>Câmera</td>
                <td>Leitura de QR codes, registro fotográfico de ordens de serviço e perfil.</td>
              </tr>
              <tr>
                <td>NFC</td>
                <td>Identificação de veículos e validação de abastecimentos.</td>
              </tr>
              <tr>
                <td>Notificações</td>
                <td>Alertas de cercas virtuais, atualizações de ordens de serviço e avisos operacionais.</td>
              </tr>
              <tr>
                <td>Galeria / Fotos</td>
                <td>Seleção de imagem para perfil ou documentos.</td>
              </tr>
              <tr>
                <td>Microfone</td>
                <td>Captura de áudio quando necessário para operações específicas.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Todas as permissões são solicitadas de forma explícita e podem ser revogadas a qualquer momento nas configurações do seu dispositivo.</p>

        <h2>8. Cookies e Tecnologias Similares</h2>
        <p>Nossos Aplicativos podem utilizar tecnologias de armazenamento local (como AsyncStorage e SecureStore) para manter sessões, preferências e tokens de autenticação. Esses dados são armazenados localmente no dispositivo e não são compartilhados com terceiros.</p>

        <h2>9. Alterações nesta Política</h2>
        <p>Esta Política de Privacidade poderá ser atualizada periodicamente. Recomendamos a consulta regular desta página. A data da última atualização será sempre indicada no topo do documento. Alterações significativas serão comunicadas por meio dos Aplicativos ou por e-mail.</p>

        <h2>10. Contato</h2>
        <p>Para dúvidas, solicitações ou reclamações relacionadas ao tratamento de seus dados pessoais, entre em contato:</p>
        <ul>
          <li><strong>Empresa:</strong> InstaSolutions Produtos e Gestão Empresarial</li>
          <li><strong>CNPJ:</strong> 47.611.398/0001-66</li>
          <li><strong>E-mail:</strong> <a href="mailto:comercial@instasolutions.com.br">comercial@instasolutions.com.br</a></li>
          <li><strong>Website:</strong> <a href="https://frotainstasolutions.com.br" target="_blank" rel="noopener noreferrer">https://frotainstasolutions.com.br</a></li>
        </ul>
      </div>

      <Footer />
    </div>
  );
}

export default PoliticaPrivacidade;
