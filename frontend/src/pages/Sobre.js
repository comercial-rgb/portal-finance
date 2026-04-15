import React from 'react';
import Footer from '../components/Footer';
import './Institucional.css';

function Sobre() {
  return (
    <div className="institucional-page">
      <div className="institucional-header">
        <a href="/login" className="institucional-logo-link">
          <img src="/images/InstaSolutions-LockupAlternativo-Cores.png" alt="InstaSolutions" className="institucional-logo" />
        </a>
      </div>

      <div className="institucional-content">
        <span className="institucional-badge">Quem somos</span>
        <h1>Tecnologia corporativa para decisões rápidas e seguras</h1>

        <p>
          Em um cenário operacional cada vez mais dinâmico, competitivo e orientado por dados, empresas que trabalham com frotas enfrentam desafios diários: manter veículos disponíveis, controlar custos, garantir transparência, acompanhar o desempenho em tempo real e, acima de tudo, tomar decisões rápidas e precisas. É justamente nesse ponto que a InstaSolutions se destaca — unindo tecnologia, inteligência operacional e uma rede nacional de credenciados para transformar a forma como organizações gerenciam seus veículos.
        </p>

        <p>
          Nossa missão é clara: simplificar a gestão de frotas e torná-la mais inteligente, econômica e eficiente. Para isso, desenvolvemos uma plataforma completa que integra manutenção, abastecimento e rastreamento em um único ecossistema digital, conectando gestores, fornecedores e operações em tempo real. Com dashboards intuitivos, análises avançadas e processos automatizados, proporcionamos uma visão completa da operação, permitindo que cada decisão seja tomada com base em dados confiáveis e atualizados.
        </p>

        <p>
          A tecnologia da InstaSolutions foi construída para oferecer agilidade, segurança e governança, atendendo tanto instituições públicas quanto empresas privadas que exigem alto desempenho e compliance absoluto. Nosso sistema reduz custos, elimina retrabalhos, padroniza processos e identifica oportunidades de melhoria em toda a cadeia operacional — desde a abertura de uma ordem de serviço até a finalização do abastecimento ou acompanhamento de um alerta de telemetria.
        </p>

        <p>
          Outro grande diferencial é nossa rede de mais de 500 oficinas credenciadas e postos parceiros, cuidadosamente selecionados e auditados para garantir qualidade, prazo e condições comerciais competitivas. Ao utilizar nossa plataforma, o cliente tem acesso imediato a essa rede, garantindo transparência, agilidade e segurança em todas as etapas do atendimento. Cada serviço contratado gera dados que retornam para o gestor em forma de relatórios, insights e indicadores — fortalecendo ainda mais o ciclo de melhoria contínua da frota.
        </p>

        <p>
          Somos movidos por inovação, mas também pela proximidade com nossos clientes. Por isso, contamos com uma equipe especializada em implantação, suporte e expansão, pronta para acompanhar cada parceiro com atenção e excelência. Seja em uma prefeitura, uma empresa de transporte, uma locadora ou uma frota pequena que está iniciando sua jornada de digitalização, oferecemos uma experiência completa, confiável e escalável.
        </p>

        <p>
          A InstaSolutions nasceu para ser mais do que um software: <strong>somos uma solução corporativa que conecta pessoas, tecnologia e resultados.</strong> E continuamos evoluindo para que cada gestor execute suas decisões com máxima confiança, visão ampla da operação e total segurança — hoje e no futuro.
        </p>

        <hr className="institucional-divider" />

        <h2>Nossa História</h2>

        <p>
          A história da InstaSolutions começa com uma inquietação: por que a gestão de frotas, algo tão essencial para empresas e instituições públicas, ainda era marcada por processos lentos, falta de transparência e decisões tomadas "no escuro"? Foi observando essa realidade no dia a dia do setor automotivo que nasceu o desejo de fazer diferente.
        </p>

        <p>
          Em 16 de setembro de 2022, em Campo Grande (MS), a empresa deu seus primeiros passos como uma jovem iniciativa focada na venda de peças. Mas, desde o início, havia algo maior nos bastidores: a convicção de que a tecnologia poderia transformar completamente a forma como as frotas eram administradas no Brasil.
        </p>

        <p>
          Ao acompanhar os desafios de clientes e parceiros, percebemos que o problema não estava apenas no fornecimento de peças — estava na falta de integração, na ausência de dados confiáveis, na dificuldade de acompanhar serviços, na burocracia e no custo elevado que muitos enfrentavam sem sequer perceber. Foi então que surgiu a primeira grande virada de chave: desenvolver um sistema próprio de gestão de manutenção que conectasse empresas e instituições públicas a uma rede credenciada de oficinas de forma simples, rápida e transparente.
        </p>

        <p>
          A ideia cresceu, ganhou forma e ganhou força. Em dois anos, aquilo que começou como um pequeno projeto com grande propósito se tornou uma empresa sólida, inovadora e em expansão nacional. Transferimos nossa matriz para Barueri (SP), um dos ecossistemas corporativos mais estratégicos do país, e levamos nossa cultura jovem e colaborativa para outras regiões com as filiais de Campo Grande (MS) e Fortaleza (CE).
        </p>

        <p>
          Hoje, atendemos mais de 20 clientes em seis estados, conectando-os a uma rede com mais de 500 oficinas credenciadas e postos parceiros. Mas mais do que números, o que realmente importa é o impacto: cada ordem de serviço aberta, cada manutenção aprovada, cada abastecimento registrado e cada frota otimizada representa tempo economizado, dinheiro poupado e operações mais seguras e eficientes.
        </p>

        <p>
          A InstaSolutions nasceu da inquietação de poucos, mas cresceu com o esforço de muitos. Cresceu porque ouviu seus clientes, aprendeu com o mercado e acreditou na força da inovação. Cresceu porque entendeu que tecnologia só faz sentido quando traz simplicidade, clareza e resultados reais.
        </p>

        <p>
          E seguimos em movimento. Seguimos expandindo nossa presença, ampliando nossa rede, aperfeiçoando nossos produtos e construindo diariamente a confiança de quem coloca a frota em nossas mãos.
        </p>

        <p className="institucional-highlight">
          Somos a InstaSolutions — uma empresa jovem, inovadora e comprometida com a evolução contínua. E esta é apenas a primeira parte de uma história que ainda tem muito para crescer, junto com cada cliente que confia no nosso propósito.
        </p>
      </div>

      <Footer />
    </div>
  );
}

export default Sobre;
