import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './FaturasFornecedores.css';

function FaturasFornecedores() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ordensServico, setOrdensServico] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrdens, setSelectedOrdens] = useState([]);
  const [showFaturaModal, setShowFaturaModal] = useState(false);
  const [impostos, setImpostos] = useState(null);
  const [tipoPagamento, setTipoPagamento] = useState('');
  const [clienteTaxaInfo, setClienteTaxaInfo] = useState(null);
  
  const [filtros, setFiltros] = useState({
    codigo: '',
    cliente: '',
    fornecedor: '',
    tipoServico: '',
    dataInicio: '',
    dataFim: ''
  });

  const [clientes, setClientes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  // Verificar se é fornecedor (somente leitura)
  const isFornecedor = user?.role === 'fornecedor';

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordensRes, clientesRes, fornecedoresRes, impostosRes] = await Promise.all([
        api.get('/ordens-servico?limit=1000'),
        api.get('/clientes?limit=1000'),
        api.get('/fornecedores?limit=1000'),
        api.get('/impostos-retencoes')
      ]);
      
      console.log('=== CARREGANDO DADOS FATURA FORNECEDORES ===');
      
      // Garantir que ordensServico seja sempre um array e filtrar
      const ordensData = ordensRes.data.ordensServico || ordensRes.data;
      let ordensArray = Array.isArray(ordensData) ? ordensData : [];
      
      // Filtrar ordens para Faturas Fornecedores:
      // - Não pode ter faturadoFornecedor = true
      // - Status "Autorizada" OU Status "Aguardando pagamento" ou "Paga" (permite ordens já faturadas para cliente)
      ordensArray = ordensArray.filter(o => 
        !o.faturadoFornecedor && (o.status === 'Autorizada' || o.status === 'Aguardando pagamento' || o.status === 'Paga')
      );
      
      setOrdensServico(ordensArray);
      console.log('Ordens carregadas para Fornecedores:', ordensArray.length);
      
      // Garantir que clientes seja sempre um array
      const clientesData = clientesRes.data.clientes || clientesRes.data;
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      console.log('Clientes carregados:', clientesData.length);
      
      // Garantir que fornecedores seja sempre um array
      const fornecedoresData = fornecedoresRes.data.fornecedores || fornecedoresRes.data;
      const fornecedoresArray = Array.isArray(fornecedoresData) ? fornecedoresData : [];
      setFornecedores(fornecedoresArray);
      console.log('Fornecedores carregados:', fornecedoresArray.length);
      console.log('Fornecedores com naoOptanteSimples:', fornecedoresArray.filter(f => f.naoOptanteSimples).map(f => f.razaoSocial || f.nomeFantasia));
      
      const impostosData = impostosRes.data;
      if (Array.isArray(impostosData) && impostosData.length > 0) {
        setImpostos(impostosData[0]);
      } else if (impostosData && typeof impostosData === 'object' && !Array.isArray(impostosData)) {
        setImpostos(impostosData);
      } else {
        console.warn('Configurações de impostos não encontradas');
        toast.warning('Configure os impostos e retenções em "Impostos & Retenções"');
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const handleFiltrar = () => {
    loadFiltrados();
  };

  const loadFiltrados = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtros.codigo) params.codigo = filtros.codigo;
      if (filtros.cliente) params.cliente = filtros.cliente;
      if (filtros.fornecedor) params.fornecedor = filtros.fornecedor;
      
      const response = await api.get('/ordens-servico', { params });
      let ordensData = response.data.ordensServico || response.data;
      
      if (filtros.dataInicio) {
        ordensData = ordensData.filter(o => 
          new Date(o.createdAt) >= new Date(filtros.dataInicio)
        );
      }
      if (filtros.dataFim) {
        ordensData = ordensData.filter(o => 
          new Date(o.createdAt) <= new Date(filtros.dataFim + 'T23:59:59')
        );
      }
      
      setOrdensServico(ordensData);
    } catch (error) {
      toast.error('Erro ao filtrar ordens de serviço');
    } finally {
      setLoading(false);
    }
  };

  const handleLimpar = () => {
    setFiltros({
      codigo: '',
      cliente: '',
      fornecedor: '',
      tipoServico: '',
      dataInicio: '',
      dataFim: ''
    });
    loadData();
  };

  const toggleOrdemSelection = (ordemId) => {
    const newSelectedOrdens = selectedOrdens.includes(ordemId)
      ? selectedOrdens.filter(id => id !== ordemId)
      : [...selectedOrdens, ordemId];
    
    setSelectedOrdens(newSelectedOrdens);
    
    // Atualizar informações de taxa do cliente
    if (newSelectedOrdens.length > 0) {
      const ordensParaFatura = ordensServico.filter(o => newSelectedOrdens.includes(o._id));
      const clienteId = ordensParaFatura[0]?.cliente?._id || ordensParaFatura[0]?.cliente;
      const clienteInfo = clientes.find(c => c._id === clienteId);
      setClienteTaxaInfo(clienteInfo);
      
      // Reset tipo pagamento se cliente mudou ou não tem taxa variável
      if (clienteInfo?.tipoTaxa !== 'antecipacao_variavel') {
        setTipoPagamento('');
      }
    } else {
      setClienteTaxaInfo(null);
      setTipoPagamento('');
    }
  };

  const exportarExcel = () => {
    if (selectedOrdens.length === 0) {
      toast.warning('Selecione pelo menos uma ordem de serviço');
      return;
    }

    const ordensParaExportar = ordensServico.filter(o => selectedOrdens.includes(o._id));
    
    const dados = ordensParaExportar.map(ordem => ({
      'Código': ordem.codigo,
      'N° OS': ordem.numeroOrdemServico,
      'Cliente': ordem.cliente?.razaoSocial || ordem.cliente?.nomeFantasia,
      'Fornecedor': ordem.fornecedor?.razaoSocial || ordem.fornecedor?.nomeFantasia,
      'Tipo Serviço': ordem.tipoServicoSolicitado?.nome,
      'Centro Custo': ordem.centroCusto,
      'Subunidade': ordem.subunidade || '-',
      'Placa': ordem.placa || '-',
      'Veículo': ordem.veiculo || '-',
      'Valor Peças': ordem.valorPecas,
      'Desconto Peças %': ordem.descontoPecasPerc,
      'Valor Peças c/ Desc': ordem.valorPecasComDesconto,
      'Valor Serviço': ordem.valorServico,
      'Desconto Serviço %': ordem.descontoServicoPerc,
      'Valor Serviço c/ Desc': ordem.valorServicoComDesconto,
      'Valor Final': ordem.valorFinal,
      'NF Peças': ordem.notaFiscalPeca || '-',
      'NF Serviço': ordem.notaFiscalServico || '-',
      'Status': ordem.status,
      'Data': new Date(ordem.createdAt).toLocaleDateString('pt-BR')
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ordens de Serviço');
    
    XLSX.writeFile(wb, `faturas_fornecedores_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel exportado com sucesso!');
  };

  const gerarFatura = async () => {
    if (selectedOrdens.length === 0) {
      toast.warning('Selecione pelo menos uma ordem de serviço');
      return;
    }

    const ordensParaFatura = ordensServico.filter(o => selectedOrdens.includes(o._id));
    const fornecedorId = ordensParaFatura[0].fornecedor?._id || ordensParaFatura[0].fornecedor;
    const clienteId = ordensParaFatura[0].cliente?._id || ordensParaFatura[0].cliente;
    
    // Buscar informações de taxa do cliente
    const clienteInfo = clientes.find(c => c._id === clienteId);
    
    // Validar tipo de pagamento se cliente tem taxa antecipação variável
    if (clienteInfo?.tipoTaxa === 'antecipacao_variavel' && !tipoPagamento) {
      toast.warning('Selecione o tipo de pagamento para este cliente');
      return;
    }
    
    // Calcular período com base nas datas das ordens
    const datas = ordensParaFatura
      .map(o => o.dataAutorizacao || o.createdAt)
      .filter(d => d)
      .map(d => new Date(d));
    
    const periodoInicio = datas.length > 0 
      ? new Date(Math.min(...datas)).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    const periodoFim = datas.length > 0 
      ? new Date(Math.max(...datas)).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    
    const payload = {
      tipo: 'Fornecedor',
      fornecedor: fornecedorId,
      ordensServicoIds: selectedOrdens,
      periodoInicio,
      periodoFim,
      tipoPagamento: tipoPagamento || undefined
    };

    try {
      console.log('=== GERANDO FATURA ===');
      console.log('Payload:', payload);
      console.log('Ordens selecionadas:', selectedOrdens.length);

      const response = await api.post('/faturas', payload);
      
      console.log('Fatura criada:', response.data);
      toast.success(`Fatura ${response.data.numeroFatura} gerada com sucesso!`);
      
      // Recarregar ordens para atualizar status
      await loadData();
      
      setShowFaturaModal(false);
      setSelectedOrdens([]);
      setTipoPagamento('');
      setClienteTaxaInfo(null);
      
      // Redirecionar para a página de detalhes da fatura
      navigate(`/faturados/editar/${response.data._id}`);
    } catch (error) {
      console.error('=== ERRO AO GERAR FATURA ===');
      console.error('Error completo:', error);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Status:', error.response?.status);
      console.error('Payload enviado:', payload);
      toast.error(error.response?.data?.message || 'Erro ao gerar fatura. Verifique o console.');
    }
  };

  const visualizarFatura = () => {
    if (selectedOrdens.length === 0) {
      toast.warning('Selecione pelo menos uma ordem de serviço');
      return;
    }
    setShowFaturaModal(true);
  };

    const calcularImpostosRetencoes = (ordem, cliente, fornecedor) => {
    // Verificação de segurança mais robusta
    if (!impostos || typeof impostos !== 'object') {
      console.warn('⚠️ Impostos não carregados ou configurados');
      return { total: 0, detalhamento: [] };
    }
    
    if (!cliente?.tipoImposto || !Array.isArray(cliente.tipoImposto) || cliente.tipoImposto.length === 0) {
      console.warn(`⚠️ Cliente ${cliente?.razaoSocial || 'sem nome'} sem tipos de imposto configurados`);
      return { total: 0, detalhamento: [] };
    }
    
    // VERIFICAÇÃO CRÍTICA: Só calcular se fornecedor é NÃO OPTANTE
    if (!fornecedor?.naoOptanteSimples) {
      console.log(`✗ Fornecedor ${fornecedor?.razaoSocial || fornecedor?.nomeFantasia || 'sem nome'} é OPTANTE pelo Simples Nacional - não aplicar impostos/retenções`);
      return { total: 0, detalhamento: [] };
    }

    console.log(`✓ APLICANDO IMPOSTOS E RETENÇÕES - Fornecedor NÃO OPTANTE: ${fornecedor.razaoSocial || fornecedor.nomeFantasia}`);
    console.log('Cliente tipos de imposto configurados:', cliente.tipoImposto);

    const valorPecas = ordem.valorPecasComDesconto || 0;
    const valorServico = ordem.valorServicoComDesconto || 0;
    let total = 0;
    const detalhamento = [];

    // Itera sobre cada tipo de imposto selecionado
    cliente.tipoImposto.forEach(tipo => {
      try {
        switch (tipo) {
          case 'municipais':
            if (impostos.impostosMunicipais) {
              const percIRPecas = impostos.impostosMunicipais.pecas?.ir || 0;
              const percIRServicos = impostos.impostosMunicipais.servicos?.ir || 0;
              const irMunPecas = valorPecas * percIRPecas / 100;
              const irMunServicos = valorServico * percIRServicos / 100;
              total += irMunPecas + irMunServicos;
              
              detalhamento.push(`IR Municipal (${percIRPecas}% Peças + ${percIRServicos}% Serviços): R$ ${(irMunPecas + irMunServicos).toFixed(2)}`);
              if (irMunPecas > 0) detalhamento.push(`  • Peças: R$ ${valorPecas.toFixed(2)} × ${percIRPecas}% = R$ ${irMunPecas.toFixed(2)}`);
              if (irMunServicos > 0) detalhamento.push(`  • Serviços: R$ ${valorServico.toFixed(2)} × ${percIRServicos}% = R$ ${irMunServicos.toFixed(2)}`);
            }
            break;
          case 'estaduais':
            if (impostos.impostosEstaduais) {
              const estaduaisPecas = impostos.impostosEstaduais.pecas || {};
              const estaduaisServicos = impostos.impostosEstaduais.servicos || {};
              const percTotalPecas = (estaduaisPecas.ir || 0) + (estaduaisPecas.pis || 0) + (estaduaisPecas.cofins || 0) + (estaduaisPecas.csll || 0);
              const percTotalServicos = (estaduaisServicos.ir || 0) + (estaduaisServicos.pis || 0) + (estaduaisServicos.cofins || 0) + (estaduaisServicos.csll || 0);
              const totalEstPecas = valorPecas * percTotalPecas / 100;
              const totalEstServicos = valorServico * percTotalServicos / 100;
              total += totalEstPecas + totalEstServicos;
              
              detalhamento.push(`Impostos Estaduais (${percTotalPecas.toFixed(2)}% Peças + ${percTotalServicos.toFixed(2)}% Serviços): R$ ${(totalEstPecas + totalEstServicos).toFixed(2)}`);
              if (totalEstPecas > 0) detalhamento.push(`  • Peças: R$ ${valorPecas.toFixed(2)} × ${percTotalPecas.toFixed(2)}% = R$ ${totalEstPecas.toFixed(2)}`);
              if (totalEstServicos > 0) detalhamento.push(`  • Serviços: R$ ${valorServico.toFixed(2)} × ${percTotalServicos.toFixed(2)}% = R$ ${totalEstServicos.toFixed(2)}`);
            }
            break;
          case 'federais':
            if (impostos.impostosFederais) {
              const federaisPecas = impostos.impostosFederais.pecas || {};
              const federaisServicos = impostos.impostosFederais.servicos || {};
              const percTotalPecas = (federaisPecas.ir || 0) + (federaisPecas.pis || 0) + (federaisPecas.cofins || 0) + (federaisPecas.csll || 0);
              const percTotalServicos = (federaisServicos.ir || 0) + (federaisServicos.pis || 0) + (federaisServicos.cofins || 0) + (federaisServicos.csll || 0);
              const totalFedPecas = valorPecas * percTotalPecas / 100;
              const totalFedServicos = valorServico * percTotalServicos / 100;
              total += totalFedPecas + totalFedServicos;
              
              detalhamento.push(`Impostos Federais (${percTotalPecas.toFixed(2)}% Peças + ${percTotalServicos.toFixed(2)}% Serviços): R$ ${(totalFedPecas + totalFedServicos).toFixed(2)}`);
              if (totalFedPecas > 0) detalhamento.push(`  • Peças: R$ ${valorPecas.toFixed(2)} × ${percTotalPecas.toFixed(2)}% = R$ ${totalFedPecas.toFixed(2)}`);
              if (totalFedServicos > 0) detalhamento.push(`  • Serviços: R$ ${valorServico.toFixed(2)} × ${percTotalServicos.toFixed(2)}% = R$ ${totalFedServicos.toFixed(2)}`);
            }
            break;
          case 'retencoes':
            if (impostos.retencoesOrgao) {
              const percRetencoes = impostos.retencoesOrgao.percentual || 0;
              const retencoes = (valorPecas + valorServico) * percRetencoes / 100;
              total += retencoes;
              
              detalhamento.push(`Retenções Órgão (${percRetencoes}%): R$ ${retencoes.toFixed(2)}`);
              detalhamento.push(`  • Total (Peças + Serviços): R$ ${(valorPecas + valorServico).toFixed(2)} × ${percRetencoes}% = R$ ${retencoes.toFixed(2)}`);
            }
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(`Erro ao calcular imposto ${tipo}:`, error);
      }
    });

    return { total, detalhamento };
  };

  const calcularTaxaOperacao = (valorFinal) => {
    if (!clienteTaxaInfo) return 0;
    
    // Taxa de Operação fixa
    if (clienteTaxaInfo.tipoTaxa === 'operacao') {
      const taxa = clienteTaxaInfo.taxaOperacao || 15;
      return valorFinal * taxa / 100;
    }
    
    // Taxa Antecipação Variável - depende do tipoPagamento selecionado
    if (clienteTaxaInfo.tipoTaxa === 'antecipacao_variavel' && tipoPagamento) {
      let taxa = 0;
      switch (tipoPagamento) {
        case 'aVista':
          taxa = clienteTaxaInfo.taxasAntecipacao?.aVista || 15;
          break;
        case 'aposFechamento':
          taxa = clienteTaxaInfo.taxasAntecipacao?.aposFechamento || 13;
          break;
        case 'aprazado':
          taxa = clienteTaxaInfo.taxasAntecipacao?.aprazado || 0;
          break;
        default:
          taxa = 0;
      }
      return valorFinal * taxa / 100;
    }
    
    return 0;
  };

  const exportarPDF = () => {
    const ordensParaFatura = ordensServico.filter(o => selectedOrdens.includes(o._id));
    if (ordensParaFatura.length === 0) return;

    const fornecedorOrdem = ordensParaFatura[0].fornecedor;
    
    console.log('=== BUSCANDO FORNECEDOR PARA PDF ===');
    console.log('Fornecedor da ordem:', fornecedorOrdem);
    console.log('ID do fornecedor:', fornecedorOrdem?._id || fornecedorOrdem);
    console.log('Lista de fornecedores disponíveis:', fornecedores.length);
    
    // IMPORTANTE: Buscar fornecedor completo da lista para garantir campo naoOptanteSimples
    let fornecedor = null;
    
    if (fornecedorOrdem?._id) {
      // Tentar buscar por _id se é objeto populado
      fornecedor = fornecedores.find(f => f._id === fornecedorOrdem._id);
      console.log('Busca por fornecedorOrdem._id:', fornecedor ? 'Encontrado' : 'Não encontrado');
    } 
    
    if (!fornecedor && typeof fornecedorOrdem === 'string') {
      // Tentar buscar se fornecedorOrdem é uma string (ID)
      fornecedor = fornecedores.find(f => f._id === fornecedorOrdem);
      console.log('Busca por fornecedorOrdem como string:', fornecedor ? 'Encontrado' : 'Não encontrado');
    }
    
    if (!fornecedor) {
      // Fallback: usar o que veio da ordem
      fornecedor = fornecedorOrdem;
      console.log('Usando fornecedor da ordem como fallback');
    }
    
    console.log('Fornecedor final selecionado:', fornecedor);
    console.log('Tem naoOptanteSimples?', fornecedor?.naoOptanteSimples);
    
    const numeroFatura = `FAT-${Date.now().toString().slice(-8)}`;

    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Cabeçalho da Empresa
    doc.setFontSize(16);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('InstaSolutions Produtos e Gestão Empresarial LTDA', 105, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    doc.text('CNPJ: 47.611.398/0001-66', 105, 21, { align: 'center' });
    doc.text('Telefone: (11) 5118-3784 | WhatsApp: (67) 98218-2448', 105, 26, { align: 'center' });
    doc.text('Alameda Rio Negro, N° 1030, Escritório 2304 - Alphaville Industrial, Barueri - SP', 105, 31, { align: 'center' });
    
    // Linha separadora
    doc.setDrawColor(37, 28, 89);
    doc.setLineWidth(0.5);
    doc.line(20, 34, 190, 34);
    
    // Título da Fatura
    doc.setFontSize(14);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('FATURA DE SERVIÇOS - FORNECEDOR', 105, 42, { align: 'center' });
    doc.setFont(undefined, 'normal');
    
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(`Fatura Nº: ${numeroFatura}`, 20, 49);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 190, 49, { align: 'right' });

    // Dados do Fornecedor
    doc.setFontSize(11);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('Dados do Fornecedor', 20, 57);
    doc.setFont(undefined, 'normal');
    
    doc.setFontSize(9);
    doc.setTextColor(0);
    let yPos = 63;
    doc.text(`Razão Social: ${fornecedor?.razaoSocial || '-'}`, 20, yPos);
    yPos += 4;
    doc.text(`CNPJ: ${fornecedor?.cnpjCpf || '-'}`, 20, yPos);
    yPos += 4;
    doc.text(`E-mail: ${fornecedor?.email || '-'}`, 20, yPos);
    yPos += 4;
    doc.text(`Telefone: ${fornecedor?.telefone || '-'}`, 20, yPos);
    yPos += 6;
    
    // Dados Bancários
    doc.setFontSize(11);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('Dados Bancários', 110, 57);
    doc.setFont(undefined, 'normal');
    
    doc.setFontSize(9);
    doc.setTextColor(0);
    let yBanco = 63;
    doc.text(`Banco: ${fornecedor?.banco || '-'}`, 110, yBanco);
    yBanco += 4;
    doc.text(`Agência: ${fornecedor?.agencia || '-'}`, 110, yBanco);
    yBanco += 4;
    doc.text(`Conta: ${fornecedor?.conta || '-'}`, 110, yBanco);
    yBanco += 4;
    doc.text(`Tipo: ${fornecedor?.tipoConta || '-'}`, 110, yBanco);
    if (fornecedor?.chavePix) {
      yBanco += 4;
      doc.text(`Chave Pix: ${fornecedor.chavePix}`, 110, yBanco);
    }

    // Tabela de Ordens de Serviço
    const tableData = ordensParaFatura.map(ordem => {
      const centroCusto = ordem.centroCusto || '-';
      const subunidade = ordem.subunidade ? ` / ${ordem.subunidade}` : '';
      return [
        ordem.numeroOrdemServico || '-',
        ordem.cliente?.razaoSocial || ordem.cliente?.nomeFantasia || '-',
        ordem.placa || '-',
        centroCusto + subunidade,
        `R$ ${(ordem.valorPecasComDesconto || 0).toFixed(2)}`,
        `R$ ${(ordem.valorServicoComDesconto || 0).toFixed(2)}`,
        `R$ ${(ordem.valorFinal || 0).toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: Math.max(yPos, yBanco) + 8,
      head: [['N° OS', 'Cliente', 'Placa', 'Centro Custo', 'Vlr Peças', 'Vlr Serv.', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 28, 89], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 50 },
        2: { cellWidth: 20 },
        3: { cellWidth: 35 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 }
      }
    });

    // Observação logo após a tabela
    const afterTableY = doc.lastAutoTable.finalY + 5;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Observação: Valores já com desconto conforme contrato com cliente.', 20, afterTableY);

    // Cálculos finais
    const valorTotalAposDesconto = ordensParaFatura.reduce((sum, o) => sum + (o.valorFinal || 0), 0);
    
    let totalImpostos = 0;
    const detalhesImpostos = [];
    
    console.log('=== DEBUG FATURA FORNECEDOR PDF ===');
    console.log('Fornecedor:', fornecedor);
    console.log('naoOptanteSimples:', fornecedor?.naoOptanteSimples);
    
    if (fornecedor?.naoOptanteSimples) {
      console.log('✓ Fornecedor é NÃO OPTANTE - calculando impostos');
      ordensParaFatura.forEach(o => {
        const cliente = clientes.find(c => c._id === o.cliente?._id);
        console.log('Processando ordem:', o.numeroOrdemServico, 'Cliente:', cliente?.razaoSocial);
        const resultado = calcularImpostosRetencoes(o, cliente, fornecedor);
        console.log('Resultado impostos:', resultado);
        totalImpostos += resultado.total;
        resultado.detalhamento.forEach(det => {
          if (!detalhesImpostos.includes(det)) {
            detalhesImpostos.push(det);
          }
        });
      });
    } else {
      console.log('✗ Fornecedor é OPTANTE - não aplicar impostos');
    }
    
    console.log('Total Impostos:', totalImpostos);
    console.log('Detalhes Impostos:', detalhesImpostos);
    
    const taxaOperacao = calcularTaxaOperacao(valorTotalAposDesconto);
    const valorAposImpostos = valorTotalAposDesconto - totalImpostos;
    const valorDevido = valorAposImpostos - taxaOperacao;

    // Resumo Financeiro em formato de tabela
    doc.setFontSize(11);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    let finalY = afterTableY + 10;
    doc.text('RESUMO FINANCEIRO', 20, finalY);
    finalY += 5;
    
    // Background cinza claro
    const boxHeight = fornecedor?.naoOptanteSimples && totalImpostos > 0 ? 60 : 30;
    doc.setFillColor(248, 249, 250);
    doc.rect(20, finalY, 170, boxHeight, 'F');
    
    // Borda da caixa
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.rect(20, finalY, 170, boxHeight);
    
    finalY += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0);
    
    // Valor Total após Desconto
    doc.text('Valor Total após Desconto:', 25, finalY);
    doc.text(`R$ ${valorTotalAposDesconto.toFixed(2)}`, 185, finalY, { align: 'right' });
    doc.setDrawColor(224, 224, 224);
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 7;
    
    if (fornecedor?.naoOptanteSimples && totalImpostos > 0) {
      // Impostos & Retenções
      doc.setTextColor(200, 0, 0);
      doc.text('(-) Impostos & Retenções:', 25, finalY);
      doc.text(`R$ ${totalImpostos.toFixed(2)}`, 185, finalY, { align: 'right' });
      doc.setDrawColor(224, 224, 224);
      doc.line(20, finalY + 2, 190, finalY + 2);
      finalY += 7;
      
      // Detalhamento dos impostos
      doc.setFontSize(8);
      doc.setTextColor(100);
      detalhesImpostos.forEach(det => {
        doc.text(`    ${det}`, 28, finalY);
        finalY += 4;
      });
      finalY += 2;
      
      // Valor após Impostos
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.setFont(undefined, 'bold');
      doc.text('Valor após Impostos & Retenções:', 25, finalY);
      doc.text(`R$ ${valorAposImpostos.toFixed(2)}`, 185, finalY, { align: 'right' });
      doc.setDrawColor(224, 224, 224);
      doc.line(20, finalY + 2, 190, finalY + 2);
      finalY += 7;
      doc.setFont(undefined, 'normal');
    }
    
    // Taxa de Operação - calcular porcentagem correta
    let taxaPercent = 0;
    if (clienteTaxaInfo?.tipoTaxa === 'operacao') {
      taxaPercent = clienteTaxaInfo.taxaOperacao || 15;
    } else if (clienteTaxaInfo?.tipoTaxa === 'antecipacao_variavel' && tipoPagamento) {
      if (tipoPagamento === 'aVista') taxaPercent = clienteTaxaInfo.taxasAntecipacao?.aVista || 15;
      else if (tipoPagamento === 'aposFechamento') taxaPercent = clienteTaxaInfo.taxasAntecipacao?.aposFechamento || 13;
      else if (tipoPagamento === 'aprazado') taxaPercent = clienteTaxaInfo.taxasAntecipacao?.aprazado || 0;
    }
    
    doc.setTextColor(200, 0, 0);
    doc.text(`(-) Taxa de Operação (${taxaPercent.toFixed(2)}%):`, 25, finalY);
    doc.text(`R$ ${taxaOperacao.toFixed(2)}`, 185, finalY, { align: 'right' });
    doc.setDrawColor(0, 91, 237);
    doc.setLineWidth(1);
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 10;
    
    // Valor Devido - Final destacado
    doc.setFillColor(0, 91, 237);
    doc.rect(20, finalY - 4, 170, 10, 'F');
    doc.setDrawColor(0, 91, 237);
    doc.setLineWidth(1);
    doc.rect(20, finalY - 4, 170, 10);
    
    finalY += 3;
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('VALOR DEVIDO:', 25, finalY);
    doc.text(`R$ ${valorDevido.toFixed(2)}`, 185, finalY, { align: 'right' });

    doc.save(`fatura_${numeroFatura}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const ordensParaFatura = ordensServico.filter(o => selectedOrdens.includes(o._id));
  
  // Buscar fornecedor completo com campo naoOptanteSimples
  let fornecedorFatura = null;
  if (ordensParaFatura.length > 0) {
    const fornecedorOrdem = ordensParaFatura[0]?.fornecedor;
    
    if (fornecedorOrdem?._id) {
      fornecedorFatura = fornecedores.find(f => f._id === fornecedorOrdem._id);
    } else if (typeof fornecedorOrdem === 'string') {
      fornecedorFatura = fornecedores.find(f => f._id === fornecedorOrdem);
    }
    
    if (!fornecedorFatura) {
      fornecedorFatura = fornecedorOrdem;
    }
    
    console.log('=== FORNECEDOR FATURA (MODAL) ===');
    console.log('Fornecedor:', fornecedorFatura);
    console.log('naoOptanteSimples:', fornecedorFatura?.naoOptanteSimples);
  }
  
  const numeroFatura = `FAT-${Date.now().toString().slice(-8)}`;

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="faturas-fornecedores-container">
            {isFornecedor && (
              <div className="readonly-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Visualização Somente Leitura - Você pode visualizar mas não criar faturas
              </div>
            )}
            <div className="page-header">
              <div>
                <h1>Faturas Fornecedores</h1>
                <p>Gerencie as faturas dos fornecedores</p>
              </div>
            </div>

            <div className="filtros-section">
              <h3>Filtros</h3>
              <div className="filtros-grid">
                <div className="form-group">
                  <label>Código</label>
                  <input
                    type="text"
                    name="codigo"
                    value={filtros.codigo}
                    onChange={handleFiltroChange}
                    placeholder="OS-000001"
                  />
                </div>
                <div className="form-group">
                  <label>Cliente</label>
                  <select name="cliente" value={filtros.cliente} onChange={handleFiltroChange}>
                    <option value="">Todos</option>
                    {Array.isArray(clientes) && clientes.map(c => (
                      <option key={c._id} value={c._id}>{c.razaoSocial || c.nomeFantasia}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fornecedor</label>
                  <select name="fornecedor" value={filtros.fornecedor} onChange={handleFiltroChange}>
                    <option value="">Todos</option>
                    {Array.isArray(fornecedores) && fornecedores.map(f => (
                      <option key={f._id} value={f._id}>{f.razaoSocial || f.nomeFantasia}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Data Início</label>
                  <input
                    type="date"
                    name="dataInicio"
                    value={filtros.dataInicio}
                    onChange={handleFiltroChange}
                  />
                </div>
                <div className="form-group">
                  <label>Data Fim</label>
                  <input
                    type="date"
                    name="dataFim"
                    value={filtros.dataFim}
                    onChange={handleFiltroChange}
                  />
                </div>
              </div>
              <div className="filtros-actions">
                <button className="btn-secondary" onClick={handleLimpar}>Limpar</button>
                <button className="btn-primary" onClick={handleFiltrar}>Filtrar</button>
              </div>
            </div>

            <div className="ordens-list">
              <div className="ordens-header">
                <h3>{ordensServico.length} Ordem(ns) de Serviço</h3>
                <div className="header-actions">
                  <button 
                    className="btn-export btn-excel" 
                    onClick={exportarExcel}
                    disabled={selectedOrdens.length === 0}
                  >
                    <span>📊</span> Exportar Excel
                  </button>
                  <button 
                    className="btn-export btn-gerar-fatura" 
                    onClick={visualizarFatura}
                    disabled={selectedOrdens.length === 0}
                  >
                    <span>📄</span> Visualizar Fatura
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="loading">Carregando...</div>
              ) : ordensServico.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhuma ordem de serviço encontrada</p>
                </div>
              ) : (
                ordensServico.map(ordem => (
                  <div 
                    key={ordem._id} 
                    className={`ordem-card ${selectedOrdens.includes(ordem._id) ? 'selected' : ''}`}
                    onClick={() => toggleOrdemSelection(ordem._id)}
                  >
                    <div className="ordem-card-header">
                      <span className="ordem-codigo">{ordem.codigo}</span>
                      <input
                        type="checkbox"
                        className="ordem-checkbox"
                        checked={selectedOrdens.includes(ordem._id)}
                        onChange={() => toggleOrdemSelection(ordem._id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="ordem-info">
                      <div className="info-item">
                        <span className="info-label">N° OS</span>
                        <span className="info-value">{ordem.numeroOrdemServico || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Cliente</span>
                        <span className="info-value">{ordem.cliente?.razaoSocial || ordem.cliente?.nomeFantasia}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Fornecedor</span>
                        <span className="info-value">{ordem.fornecedor?.razaoSocial || ordem.fornecedor?.nomeFantasia}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Centro Custo</span>
                        <span className="info-value">{ordem.centroCusto} {ordem.subunidade ? `/ ${ordem.subunidade}` : ''}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Placa / Veículo</span>
                        <span className="info-value">{ordem.placa || '-'} {ordem.veiculo ? `/ ${ordem.veiculo}` : ''}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Valor Final</span>
                        <span className="info-value valor-destaque">{formatCurrency(ordem.valorFinal)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
      <Footer />

      {showFaturaModal && (
        <div className="fatura-modal" onClick={() => setShowFaturaModal(false)}>
          <div className="fatura-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="fatura-document" id="fatura-print">
              
              {/* Cabeçalho da Empresa */}
              <div className="fatura-empresa-info">
                <h2>InstaSolutions Produtos e Gestão Empresarial LTDA</h2>
                <p><strong>CNPJ:</strong> 47.611.398/0001-66</p>
                <p><strong>Telefone:</strong> (11) 5118-3784 | <strong>WhatsApp:</strong> (67) 98218-2448</p>
                <p><strong>Endereço:</strong> Alameda Rio Negro, N° 1030, Escritório 2304 - Alphaville Industrial, Barueri - SP</p>
                <hr />
              </div>

              <div className="fatura-titulo">
                <h3>FATURA DE SERVIÇOS - FORNECEDOR</h3>
                <div className="fatura-numero-data">
                  <p><strong>Fatura Nº:</strong> {numeroFatura}</p>
                  <p><strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {fornecedorFatura && (
                <div className="fatura-fornecedor-info">
                  <h3>Dados do Fornecedor</h3>
                  <div><strong>Razão Social:</strong> {fornecedorFatura.razaoSocial || '-'}</div>
                  <div><strong>CNPJ:</strong> {fornecedorFatura.cnpjCpf || '-'}</div>
                  <div><strong>E-mail:</strong> {fornecedorFatura.email || '-'}</div>
                  <div><strong>Telefone:</strong> {fornecedorFatura.telefone || '-'}</div>
                  
                  <h4 style={{ marginTop: '15px', marginBottom: '10px', color: '#005BED', fontSize: '16px', fontWeight: '700' }}>Dados Bancários</h4>
                  <div><strong>Banco:</strong> {fornecedorFatura.banco || '-'}</div>
                  <div><strong>Agência:</strong> {fornecedorFatura.agencia || '-'}</div>
                  <div><strong>Conta:</strong> {fornecedorFatura.conta || '-'}</div>
                  <div><strong>Tipo:</strong> {fornecedorFatura.tipoConta || '-'}</div>
                  {fornecedorFatura.chavePix && <div><strong>Chave Pix:</strong> {fornecedorFatura.chavePix}</div>}
                </div>
              )}

              <table className="fatura-table">
                <thead>
                  <tr>
                    <th>N° OS</th>
                    <th>Cliente</th>
                    <th>Placa</th>
                    <th>Centro de Custo</th>
                    <th>Valor Peças</th>
                    <th>Valor Serviços</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ordensParaFatura.map(ordem => {
                    const centroCusto = ordem.centroCusto || '-';
                    const subunidade = ordem.subunidade ? ` / ${ordem.subunidade}` : '';
                    return (
                      <tr key={ordem._id}>
                        <td>{ordem.numeroOrdemServico || '-'}</td>
                        <td>{ordem.cliente?.razaoSocial || ordem.cliente?.nomeFantasia || '-'}</td>
                        <td>{ordem.placa || '-'}</td>
                        <td>{centroCusto + subunidade}</td>
                        <td>{formatCurrency(ordem.valorPecasComDesconto)}</td>
                        <td>{formatCurrency(ordem.valorServicoComDesconto)}</td>
                        <td>{formatCurrency(ordem.valorFinal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                Observação: Valores já com desconto conforme contrato com cliente.
              </p>

              {clienteTaxaInfo && clienteTaxaInfo.tipoTaxa === 'antecipacao_variavel' && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f0f7ff', 
                  borderRadius: '8px', 
                  border: '1px solid #005BED' 
                }}>
                  <h4 style={{ marginBottom: '12px', color: '#005BED', fontSize: '16px' }}>
                    Tipo de Pagamento *
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                    Este cliente utiliza <strong>Taxas Antecipação & Variáveis</strong>. Selecione como o fornecedor deseja receber:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      backgroundColor: tipoPagamento === 'aVista' ? '#e3f2fd' : 'white',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="tipoPagamento"
                        value="aVista"
                        checked={tipoPagamento === 'aVista'}
                        onChange={(e) => setTipoPagamento(e.target.value)}
                        style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1 }}>
                        <strong>À Vista</strong> - Taxa: {clienteTaxaInfo.taxasAntecipacao?.aVista || 15}%
                        <span style={{ fontSize: '0.85rem', color: '#666', display: 'block' }}>
                          Pagamento imediato após geração da fatura
                        </span>
                      </span>
                    </label>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      backgroundColor: tipoPagamento === 'aposFechamento' ? '#e3f2fd' : 'white',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="tipoPagamento"
                        value="aposFechamento"
                        checked={tipoPagamento === 'aposFechamento'}
                        onChange={(e) => setTipoPagamento(e.target.value)}
                        style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1 }}>
                        <strong>Receber Após Fechamento</strong> - Taxa: {clienteTaxaInfo.taxasAntecipacao?.aposFechamento || 13}%
                        <span style={{ fontSize: '0.85rem', color: '#666', display: 'block' }}>
                          Aguarda fechamento do período para pagamento
                        </span>
                      </span>
                    </label>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      backgroundColor: tipoPagamento === 'dias30' ? '#e3f2fd' : 'white',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="tipoPagamento"
                        value="dias30"
                        checked={tipoPagamento === 'dias30'}
                        onChange={(e) => setTipoPagamento(e.target.value)}
                        style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1 }}>
                        <strong>30 Dias Após Fatura</strong> - Taxa: {clienteTaxaInfo.taxasAntecipacao?.dias30 || 10}%
                        <span style={{ fontSize: '0.85rem', color: '#666', display: 'block' }}>
                          Pagamento 30 dias após emissão da fatura
                        </span>
                      </span>
                    </label>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      backgroundColor: tipoPagamento === 'dias40' ? '#e3f2fd' : 'white',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="tipoPagamento"
                        value="dias40"
                        checked={tipoPagamento === 'dias40'}
                        onChange={(e) => setTipoPagamento(e.target.value)}
                        style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1 }}>
                        <strong>40 Dias Após Fatura</strong> - Taxa: {clienteTaxaInfo.taxasAntecipacao?.dias40 || 8}%
                        <span style={{ fontSize: '0.85rem', color: '#666', display: 'block' }}>
                          Pagamento 40 dias após emissão da fatura
                        </span>
                      </span>
                    </label>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      backgroundColor: tipoPagamento === 'dias50' ? '#e3f2fd' : 'white',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="tipoPagamento"
                        value="dias50"
                        checked={tipoPagamento === 'dias50'}
                        onChange={(e) => setTipoPagamento(e.target.value)}
                        style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1 }}>
                        <strong>50 Dias Após Fatura</strong> - Taxa: {clienteTaxaInfo.taxasAntecipacao?.dias50 || 6}%
                        <span style={{ fontSize: '0.85rem', color: '#666', display: 'block' }}>
                          Pagamento 50 dias após emissão da fatura
                        </span>
                      </span>
                    </label>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      backgroundColor: tipoPagamento === 'dias60' ? '#e3f2fd' : 'white',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="tipoPagamento"
                        value="dias60"
                        checked={tipoPagamento === 'dias60'}
                        onChange={(e) => setTipoPagamento(e.target.value)}
                        style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1 }}>
                        <strong>60 Dias Após Fatura</strong> - Taxa: {clienteTaxaInfo.taxasAntecipacao?.dias60 || 0}%
                        <span style={{ fontSize: '0.85rem', color: '#666', display: 'block' }}>
                          Pagamento 60 dias após emissão da fatura
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {clienteTaxaInfo && clienteTaxaInfo.tipoTaxa === 'operacao' && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f0f7ff', 
                  borderRadius: '8px', 
                  border: '1px solid #005BED' 
                }}>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0' }}>
                    ℹ️ Este cliente utiliza <strong>Taxa de Operação fixa de {clienteTaxaInfo.taxaOperacao || 15}%</strong>
                  </p>
                </div>
              )}

              <div className="resumo-financeiro">
                {(() => {
                  const valorTotalAposDesconto = ordensParaFatura.reduce((sum, o) => sum + (o.valorFinal || 0), 0);
                  
                  let totalImpostos = 0;
                  const detalhesImpostos = [];
                  
                  console.log('=== DEBUG FATURA FORNECEDOR MODAL ===');
                  console.log('Fornecedor Fatura:', fornecedorFatura);
                  console.log('naoOptanteSimples:', fornecedorFatura?.naoOptanteSimples);
                  console.log('Cliente Taxa Info:', clienteTaxaInfo);
                  console.log('Tipo Pagamento:', tipoPagamento);
                  
                  if (fornecedorFatura?.naoOptanteSimples) {
                    console.log('✓ Fornecedor é NÃO OPTANTE - calculando impostos no modal');
                    ordensParaFatura.forEach((o, index) => {
                      const cliente = clientes.find(c => c._id === o.cliente?._id);
                      const resultado = calcularImpostosRetencoes(o, cliente, fornecedorFatura);
                      totalImpostos += resultado.total;
                      
                      // Adicionar cabeçalho da OS se houver detalhamento
                      if (resultado.detalhamento.length > 0) {
                        detalhesImpostos.push(`OS ${o.codigo || o.numeroOrdemServico || (index + 1)}:`);
                        resultado.detalhamento.forEach(det => {
                          detalhesImpostos.push(`  ${det}`);
                        });
                      }
                    });
                  }
                  
                  const taxaOperacao = calcularTaxaOperacao(valorTotalAposDesconto);
                  const valorAposImpostos = valorTotalAposDesconto - totalImpostos;
                  const valorDevido = valorAposImpostos - taxaOperacao;
                  
                  // Calcular porcentagem da taxa de operação para exibição
                  let taxaPercentual = 0;
                  if (clienteTaxaInfo?.tipoTaxa === 'operacao') {
                    taxaPercentual = clienteTaxaInfo.taxaOperacao || 15;
                  } else if (clienteTaxaInfo?.tipoTaxa === 'antecipacao_variavel' && tipoPagamento) {
                    if (tipoPagamento === 'aVista') {
                      taxaPercentual = clienteTaxaInfo.taxasAntecipacao?.aVista || 15;
                    } else if (tipoPagamento === 'aposFechamento') {
                      taxaPercentual = clienteTaxaInfo.taxasAntecipacao?.aposFechamento || 13;
                    } else if (tipoPagamento === 'aprazado') {
                      taxaPercentual = clienteTaxaInfo.taxasAntecipacao?.aprazado || 0;
                    }
                  }
                  
                  console.log('Taxa Percentual Calculada:', taxaPercentual);

                  return (
                    <>
                      <div className="resumo-linha">
                        <span>Valor Total após Desconto:</span>
                        <span>{formatCurrency(valorTotalAposDesconto)}</span>
                      </div>
                      {fornecedorFatura?.naoOptanteSimples && totalImpostos > 0 && (
                        <>
                          <div className="resumo-linha destaque-negativo">
                            <span>(-) Impostos & Retenções:</span>
                            <span>{formatCurrency(totalImpostos)}</span>
                          </div>
                          {detalhesImpostos.map((det, idx) => (
                            <div key={idx} className="resumo-linha detalhe-imposto">
                              <span>    {det}</span>
                            </div>
                          ))}
                          <div className="resumo-linha">
                            <span>Valor após Impostos & Retenções:</span>
                            <span>{formatCurrency(valorAposImpostos)}</span>
                          </div>
                        </>
                      )}
                      <div className="resumo-linha destaque-negativo">
                        <span>(-) Taxa de Operação ({taxaPercentual.toFixed(2)}%):</span>
                        <span>{formatCurrency(taxaOperacao)}</span>
                      </div>
                      <div className="resumo-linha destaque">
                        <span>Valor Devido:</span>
                        <span>{formatCurrency(valorDevido)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowFaturaModal(false)}>
                Fechar
              </button>
              <button className="btn-primary" onClick={exportarPDF}>
                Baixar PDF
              </button>
              <button className="btn-primary" onClick={() => window.print()}>
                Imprimir
              </button>
              {!isFornecedor && (
                <button 
                  className="btn-gerar-fatura" 
                  onClick={gerarFatura}
                  disabled={selectedOrdens.length === 0}
                  title="Gerar fatura para as ordens selecionadas"
                >
                  Gerar Fatura
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FaturasFornecedores;
