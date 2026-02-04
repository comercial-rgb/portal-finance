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
import './FaturasClientes.css';

function FaturasClientes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ordensServico, setOrdensServico] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrdens, setSelectedOrdens] = useState([]);
  const [showFaturaModal, setShowFaturaModal] = useState(false);
  const [impostos, setImpostos] = useState(null);
  const [tipoFatura, setTipoFatura] = useState('completa'); // 'completa', 'pecas', 'servicos'
  const [clienteFaturaCompleto, setClienteFaturaCompleto] = useState(null);
  const [dataVencimento, setDataVencimento] = useState('');
  
  const [filtros, setFiltros] = useState({
    codigo: '',
    cliente: '',
    fornecedor: '',
    tipo: '',
    tipoServico: '',
    centroCusto: '',
    subunidade: '',
    dataInicio: '',
    dataFim: ''
  });

  const [clientes, setClientes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [tiposServico, setTiposServico] = useState([]);
  const [centrosCustoDisponiveis, setCentrosCustoDisponiveis] = useState([]);
  const [subunidadesDisponiveis, setSubunidadesDisponiveis] = useState([]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordensRes, clientesRes, fornecedoresRes, tiposRes, tiposServicoRes, impostosRes] = await Promise.all([
        api.get('/ordens-servico?limit=1000'),
        api.get('/clientes'),
        api.get('/fornecedores'),
        api.get('/tipo-servicos/tipos'),
        api.get('/tipo-servicos/tipos-servico-solicitado'),
        api.get('/impostos-retencoes')
      ]);
      
      const ordensData = ordensRes.data.ordensServico || ordensRes.data;
      let ordensArray = Array.isArray(ordensData) ? ordensData : [];
      
      // Filtrar ordens para Faturas Clientes:
      // - Não pode ter faturadoCliente = true
      // - Status "Autorizada" OU Status "Aguardando pagamento" ou "Paga" (permite ordens já faturadas para fornecedor)
      ordensArray = ordensArray.filter(o => 
        !o.faturadoCliente && (o.status === 'Autorizada' || o.status === 'Aguardando pagamento' || o.status === 'Paga')
      );
      
      setOrdensServico(ordensArray);
      
      // Extrair centros de custo e subunidades únicos
      const centrosCusto = [...new Set(ordensArray.map(o => o.centroCusto).filter(Boolean))];
      const subunidades = [...new Set(ordensArray.map(o => o.subunidade).filter(Boolean))];
      setCentrosCustoDisponiveis(centrosCusto);
      setSubunidadesDisponiveis(subunidades);
      
      const clientesData = clientesRes.data.clientes || clientesRes.data;
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      
      const fornecedoresData = fornecedoresRes.data.fornecedores || fornecedoresRes.data;
      setFornecedores(Array.isArray(fornecedoresData) ? fornecedoresData : []);
      
      setTipos(Array.isArray(tiposRes.data) ? tiposRes.data : []);
      setTiposServico(Array.isArray(tiposServicoRes.data) ? tiposServicoRes.data : []);
      
      const impostosData = impostosRes.data;
      if (Array.isArray(impostosData) && impostosData.length > 0) {
        setImpostos(impostosData[0]);
      } else if (impostosData && typeof impostosData === 'object' && !Array.isArray(impostosData)) {
        setImpostos(impostosData);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
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
      ordensData = Array.isArray(ordensData) ? ordensData : [];
      
      // FILTRO CRÍTICO: Aplicar os mesmos filtros do loadData inicial
      // - Não pode ter faturadoCliente = true
      // - Status "Autorizada" OU Status "Aguardando pagamento" ou "Paga"
      ordensData = ordensData.filter(o => 
        !o.faturadoCliente && (o.status === 'Autorizada' || o.status === 'Aguardando pagamento' || o.status === 'Paga')
      );
      
      // Filtros adicionais no frontend (exceto cliente que já vem filtrado do backend)
      if (filtros.tipo) {
        ordensData = ordensData.filter(o => o.tipo?._id === filtros.tipo);
      }
      if (filtros.tipoServico) {
        ordensData = ordensData.filter(o => o.tipoServicoSolicitado?._id === filtros.tipoServico);
      }
      if (filtros.centroCusto) {
        ordensData = ordensData.filter(o => o.centroCusto === filtros.centroCusto);
      }
      if (filtros.subunidade) {
        ordensData = ordensData.filter(o => o.subunidade === filtros.subunidade);
      }
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
      tipo: '',
      tipoServico: '',
      centroCusto: '',
      subunidade: '',
      dataInicio: '',
      dataFim: ''
    });
    loadData();
  };

  const toggleOrdemSelection = (id) => {
    setSelectedOrdens(prev => 
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    );
  };

  const calcularImpostosRetencoes = (valorPecas, valorServico, cliente, ordensParaFatura, tipoFatura = 'completa') => {
    let total = 0;
    const detalhamento = [];
    
    // REGRA CORRIGIDA: Calcular impostos SOMENTE para ordens de fornecedores NÃO OPTANTES
    // Não usar valorPecas/valorServico totais - calcular por ordem individual
    if (ordensParaFatura && Array.isArray(ordensParaFatura) && impostos && cliente?.tipoImposto && Array.isArray(cliente.tipoImposto) && cliente.tipoImposto.length > 0) {
      console.log('=== CALCULANDO IMPOSTOS POR ORDEM (FATURA CLIENTE) ===');
      console.log('Tipo de Fatura:', tipoFatura);
      console.log('Cliente tem tipos de imposto configurados:', cliente.tipoImposto);
      console.log('Total de ordens:', ordensParaFatura.length);
      
      ordensParaFatura.forEach(ordem => {
        const fornecedor = ordem.fornecedor;
        
        // VERIFICAÇÃO CRÍTICA: Só aplicar se fornecedor é NÃO OPTANTE
        if (fornecedor?.naoOptanteSimples) {
          console.log(`✓ Aplicando impostos - Fornecedor NÃO OPTANTE: ${fornecedor.razaoSocial || fornecedor.nomeFantasia} (OS: ${ordem.codigo || ordem.numeroOrdemServico})`);
          
          // Valores DESTA ORDEM específica - CONSIDERAR TIPO DE FATURA
          let valorPecasOrdem = 0;
          let valorServicoOrdem = 0;
          
          if (tipoFatura === 'completa') {
            valorPecasOrdem = ordem.valorPecasComDesconto || 0;
            valorServicoOrdem = ordem.valorServicoComDesconto || 0;
          } else if (tipoFatura === 'pecas') {
            valorPecasOrdem = ordem.valorPecasComDesconto || 0;
            valorServicoOrdem = 0; // Ignorar serviços
          } else if (tipoFatura === 'servicos') {
            valorPecasOrdem = 0; // Ignorar peças
            valorServicoOrdem = ordem.valorServicoComDesconto || 0;
          }
          
          // Adicionar cabeçalho do fornecedor
          if (!detalhamento.find(d => d.includes(fornecedor.razaoSocial || fornecedor.nomeFantasia))) {
            detalhamento.push(``);
            detalhamento.push(`Fornecedor Não Optante: ${fornecedor.razaoSocial || fornecedor.nomeFantasia}`);
          }
          
          // Aplicar os MESMOS tipos de imposto do cliente
          cliente.tipoImposto.forEach(tipo => {
            try {
              switch (tipo) {
                case 'municipais':
                  if (impostos.impostosMunicipais) {
                    const percPecas = impostos.impostosMunicipais.pecas?.ir || 1.20;
                    const percServicos = impostos.impostosMunicipais.servicos?.ir || 4.80;
                    const irPecas = valorPecasOrdem * percPecas / 100;
                    const irServicos = valorServicoOrdem * percServicos / 100;
                    const totalMun = irPecas + irServicos;
                    total += totalMun;
                    if (totalMun > 0) {
                      detalhamento.push(`  • Municipal - Peças (${percPecas.toFixed(2)}%): R$ ${irPecas.toFixed(2)} | Serviços (${percServicos.toFixed(2)}%): R$ ${irServicos.toFixed(2)}`);
                    }
                  }
                  break;
                case 'estaduais':
                  if (impostos.impostosEstaduais) {
                    const estaduaisPecas = impostos.impostosEstaduais.pecas || {};
                    const estaduaisServicos = impostos.impostosEstaduais.servicos || {};
                    const percTotalPecas = (estaduaisPecas.ir || 0) + (estaduaisPecas.pis || 0) + (estaduaisPecas.cofins || 0) + (estaduaisPecas.csll || 0);
                    const percTotalServicos = (estaduaisServicos.ir || 0) + (estaduaisServicos.pis || 0) + (estaduaisServicos.cofins || 0) + (estaduaisServicos.csll || 0);
                    const totalEstPecas = valorPecasOrdem * percTotalPecas / 100;
                    const totalEstServicos = valorServicoOrdem * percTotalServicos / 100;
                    const totalEst = totalEstPecas + totalEstServicos;
                    total += totalEst;
                    if (totalEst > 0) {
                      detalhamento.push(`  • Estadual - Peças (${percTotalPecas.toFixed(2)}%): R$ ${totalEstPecas.toFixed(2)} | Serviços (${percTotalServicos.toFixed(2)}%): R$ ${totalEstServicos.toFixed(2)}`);
                    }
                  }
                  break;
                case 'federais':
                  if (impostos.impostosFederais) {
                    const federaisPecas = impostos.impostosFederais.pecas || {};
                    const federaisServicos = impostos.impostosFederais.servicos || {};
                    const percTotalPecas = (federaisPecas.ir || 0) + (federaisPecas.pis || 0) + (federaisPecas.cofins || 0) + (federaisPecas.csll || 0);
                    const percTotalServicos = (federaisServicos.ir || 0) + (federaisServicos.pis || 0) + (federaisServicos.cofins || 0) + (federaisServicos.csll || 0);
                    const totalFedPecas = valorPecasOrdem * percTotalPecas / 100;
                    const totalFedServicos = valorServicoOrdem * percTotalServicos / 100;
                    const totalFed = totalFedPecas + totalFedServicos;
                    total += totalFed;
                    if (totalFed > 0) {
                      detalhamento.push(`  • Federal - Peças (${percTotalPecas.toFixed(2)}%): R$ ${totalFedPecas.toFixed(2)} | Serviços (${percTotalServicos.toFixed(2)}%): R$ ${totalFedServicos.toFixed(2)}`);
                    }
                  }
                  break;
                case 'retencoes':
                  if (impostos.retencoesOrgao) {
                    const percentual = impostos.retencoesOrgao.percentual || 0;
                    const retencoes = (valorPecasOrdem + valorServicoOrdem) * percentual / 100;
                    total += retencoes;
                    if (retencoes > 0) {
                      detalhamento.push(`  • Retenções Órgão (${percentual.toFixed(2)}%): R$ ${retencoes.toFixed(2)}`);
                    }
                  }
                  break;
                default:
                  break;
              }
            } catch (error) {
              console.error(`Erro ao calcular imposto ${tipo} para fornecedor não optante:`, error);
            }
          });
        } else {
          console.log(`✗ Ignorando - Fornecedor OPTANTE pelo Simples Nacional: ${fornecedor?.razaoSocial || fornecedor?.nomeFantasia} (OS: ${ordem.codigo || ordem.numeroOrdemServico})`);
        }
      });
      
      if (total === 0) {
        console.log('ℹ️ Nenhum imposto calculado. Motivos possíveis:');
        console.log('  - Todos os fornecedores são OPTANTES pelo Simples Nacional');
        console.log('  - Cliente não possui tipos de imposto configurados');
        console.log('  - Impostos e Retenções não foram configurados no sistema');
      }
    } else {
      console.warn('⚠️ Não foi possível calcular impostos:');
      if (!ordensParaFatura || !Array.isArray(ordensParaFatura)) console.warn('  - Ordens para fatura inválidas');
      if (!impostos) console.warn('  - Impostos não configurados no sistema');
      if (!cliente?.tipoImposto || !Array.isArray(cliente.tipoImposto) || cliente.tipoImposto.length === 0) {
        console.warn(`  - Cliente ${cliente?.razaoSocial || 'sem nome'} não possui tipos de imposto configurados`);
      }
    }
    
    return { total, detalhamento };
  };

  const gerarFatura = async () => {
    if (selectedOrdens.length === 0) {
      toast.warning('Selecione pelo menos uma ordem de serviço');
      return;
    }

    const ordensParaFatura = ordensServico.filter(o => selectedOrdens.includes(o._id));
    const clienteId = ordensParaFatura[0].cliente?._id || ordensParaFatura[0].cliente;
    
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
      tipo: 'Cliente',
      cliente: clienteId,
      ordensServicoIds: selectedOrdens,
      periodoInicio,
      periodoFim,
      dataVencimento: dataVencimento || undefined
    };

    try {
      console.log('=== GERANDO FATURA CLIENTE ===');
      console.log('Payload:', payload);
      console.log('Ordens selecionadas:', selectedOrdens.length);

      const response = await api.post('/faturas', payload);
      
      console.log('Fatura criada:', response.data);
      toast.success(`Fatura ${response.data.numeroFatura} gerada com sucesso!`);
      
      // Recarregar ordens para atualizar status
      await loadData();
      
      setShowFaturaModal(false);
      setSelectedOrdens([]);
      
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

  const exportarExcel = () => {
    const ordensParaExportar = ordensServico.filter(o => selectedOrdens.includes(o._id));
    if (ordensParaExportar.length === 0) {
      toast.warning('Selecione pelo menos uma ordem de serviço');
      return;
    }

    const dados = ordensParaExportar.map(ordem => ({
      'Código': ordem.codigo,
      'Nº OS': ordem.numeroOrdemServico,
      'Cliente': ordem.cliente?.razaoSocial || ordem.cliente?.nomeFantasia || '-',
      'Fornecedor': ordem.fornecedor?.razaoSocial || ordem.fornecedor?.nomeFantasia || '-',
      'Tipo': ordem.tipo?.nome || '-',
      'Tipo Serviço': ordem.tipoServicoSolicitado?.nome || '-',
      'Centro de Custo': ordem.centroCusto || '-',
      'Subunidade': ordem.subunidade || '-',
      'Placa': ordem.placa || '-',
      'Veículo': ordem.veiculo || '-',
      'Contrato': ordem.contrato || '-',
      'Empenho': ordem.empenho || '-',
      'Valor Peças': ordem.valorPecas || 0,
      'Desconto Peças %': ordem.descontoPecasPerc || 0,
      'Valor Peças c/ Desconto': ordem.valorPecasComDesconto || 0,
      'Valor Serviços': ordem.valorServico || 0,
      'Desconto Serviços %': ordem.descontoServicoPerc || 0,
      'Valor Serviços c/ Desconto': ordem.valorServicoComDesconto || 0,
      'Valor Final': ordem.valorFinal || 0,
      'NF Peça': ordem.notaFiscalPeca || '-',
      'NF Serviço': ordem.notaFiscalServico || '-',
      'Status': ordem.status || '-',
      'Data Criação': new Date(ordem.createdAt).toLocaleDateString('pt-BR')
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ordens de Serviço');
    XLSX.writeFile(wb, `ordens_servico_${Date.now()}.xlsx`);
    toast.success('Excel exportado com sucesso!');
  };

  const visualizarFatura = async (tipo = 'completa') => {
    if (selectedOrdens.length === 0) {
      toast.warning('Selecione pelo menos uma ordem de serviço');
      return;
    }
    
    const ordensParaFatura = ordensServico.filter(o => selectedOrdens.includes(o._id));
    const clientesDiferentes = new Set(ordensParaFatura.map(o => o.cliente?._id)).size;
    
    if (clientesDiferentes > 1) {
      toast.error('Selecione ordens de serviço do mesmo cliente');
      return;
    }
    
    // Buscar dados completos do cliente antes de abrir modal
    const clienteOrdem = ordensParaFatura[0].cliente;
    try {
      const clienteId = clienteOrdem?._id || clienteOrdem;
      if (clienteId) {
        const response = await api.get(`/clientes/${clienteId}`);
        setClienteFaturaCompleto(response.data);
        console.log('Cliente completo carregado para modal:', response.data);
      } else {
        setClienteFaturaCompleto(clienteOrdem);
      }
    } catch (error) {
      console.error('Erro ao buscar cliente para modal:', error);
      const clienteCompleto = clientes.find(c => c._id === (clienteOrdem?._id || clienteOrdem));
      setClienteFaturaCompleto(clienteCompleto || clienteOrdem);
    }
    
    setTipoFatura(tipo);
    setShowFaturaModal(true);
  };

  const exportarPDF = async () => {
    const ordensParaFatura = ordensServico.filter(o => selectedOrdens.includes(o._id));
    if (ordensParaFatura.length === 0) return;

    const clienteOrdem = ordensParaFatura[0].cliente;
    let cliente = null;
    
    // Buscar dados completos do cliente da API
    try {
      const clienteId = clienteOrdem?._id || clienteOrdem;
      if (clienteId) {
        const response = await api.get(`/clientes/${clienteId}`);
        cliente = response.data;
        console.log('Cliente carregado da API:', cliente);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do cliente:', error);
      // Fallback para lista de clientes em memória
      const clienteId = clienteOrdem?._id || clienteOrdem;
      cliente = clientes.find(c => c._id === clienteId);
      console.log('Cliente carregado da memória:', cliente);
    }
    
    if (!cliente) {
      toast.error('Erro ao carregar dados do cliente');
      return;
    }
    
    const numeroFatura = `FAT-CLI-${Date.now().toString().slice(-8)}`;

    const doc = new jsPDF('p', 'mm', 'a4');

    // Cabeçalho - Dados da InstaSolutions no topo
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
    doc.text('FATURA DE SERVIÇOS', 105, 42, { align: 'center' });
    doc.setFont(undefined, 'normal');
    
    doc.setFontSize(9);
    doc.setTextColor(0);
    const tipoFaturaTexto = tipoFatura === 'completa' ? 'Completa' : tipoFatura === 'pecas' ? 'Somente Peças' : 'Somente Serviços';
    doc.text(`Fatura Nº: ${numeroFatura}`, 20, 49);
    doc.text(`Tipo: ${tipoFaturaTexto}`, 105, 49, { align: 'center' });
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 190, 49, { align: 'right' });

    // Dados do Cliente
    doc.setFontSize(11);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('Dados do Cliente', 20, 57);
    doc.setFont(undefined, 'normal');
    
    doc.setFontSize(9);
    doc.setTextColor(0);
    let yPos = 63;
    doc.text(`Razão Social: ${cliente.razaoSocial || '-'}`, 20, yPos);
    yPos += 4;
    
    if (cliente.nomeFantasia) {
      doc.text(`Nome Fantasia: ${cliente.nomeFantasia}`, 20, yPos);
      yPos += 4;
    }
    
    doc.text(`CNPJ: ${cliente.cnpj || cliente.cnpjCpf || '-'}`, 20, yPos);
    yPos += 4;
    
    const inscMunicipal = cliente.inscricoes?.inscricaoMunicipal || cliente.inscricaoMunicipal || '-';
    const inscEstadual = cliente.inscricoes?.inscricaoEstadual || cliente.inscricaoEstadual || '-';
    doc.text(`Insc. Municipal: ${inscMunicipal}  |  Insc. Estadual: ${inscEstadual}`, 20, yPos);
    yPos += 4;
    
    const logradouro = cliente.endereco?.logradouro || '-';
    const numero = cliente.endereco?.numero || '-';
    const complemento = cliente.endereco?.complemento ? `, ${cliente.endereco.complemento}` : '';
    doc.text(`Endereço: ${logradouro}, ${numero}${complemento}`, 20, yPos);
    yPos += 4;
    
    const bairro = cliente.endereco?.bairro || '-';
    doc.text(`Bairro: ${bairro}`, 20, yPos);
    yPos += 4;
    
    const cidade = cliente.endereco?.cidade || '-';
    const estado = cliente.endereco?.estado || '-';
    const cep = cliente.endereco?.cep || '-';
    doc.text(`Cidade/UF: ${cidade}/${estado}  -  CEP: ${cep}`, 20, yPos);
    yPos += 4;
    
    const telefone = cliente.contatos?.telefone || cliente.telefone || '-';
    const email = cliente.contatos?.email || cliente.email || '-';
    doc.text(`Telefone: ${telefone}  |  E-mail: ${email}`, 20, yPos);
    yPos += 6;
    
    const yEnd = yPos;

    // Dados dos Centros de Custo e Subunidades
    const centrosCustoData = ordensParaFatura
      .filter(o => o.centroCusto)
      .map(o => {
        const cc = o.centroCusto;
        const sub = o.subunidade ? ` / ${o.subunidade}` : '';
        return cc + sub;
      });
    const centrosCustoUnicos = [...new Set(centrosCustoData)];
    const yStartCentros = yEnd + 5;
    
    if (centrosCustoUnicos.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0, 91, 237);
      doc.setFont(undefined, 'bold');
      doc.text('Centros de Custo / Subunidades', 20, yStartCentros);
      doc.setFont(undefined, 'normal');
      
      doc.setFontSize(9);
      doc.setTextColor(0);
      let yPosCentros = yStartCentros + 5;
      let linha = '';
      centrosCustoUnicos.forEach((cc, index) => {
        if ((index + 1) % 3 === 0 || index === centrosCustoUnicos.length - 1) {
          linha += cc;
          doc.text(linha, 20, yPosCentros);
          yPosCentros += 5;
          linha = '';
        } else {
          linha += cc + ' | ';
        }
      });
      yPosCentros += 3;
    }

    // Tabela de Ordens de Serviço - Adaptada conforme tipo de fatura
    const startY = centrosCustoUnicos.length > 0 ? yStartCentros + (centrosCustoUnicos.length * 5) + 10 : yEnd + 10;
    
    let tableHead = [];
    let tableData = [];
    let columnStyles = {};
    
    if (tipoFatura === 'completa') {
      tableHead = [['Nº OS', 'Fornecedor', 'Placa', 'Vlr Peças', 'Desc%', 'Vlr c/Desc', 'Vlr Serv.', 'Desc%', 'Vlr c/Desc', 'Total']];
      tableData = ordensParaFatura.map(ordem => [
        ordem.numeroOrdemServico || '-',
        ordem.fornecedor?.razaoSocial || ordem.fornecedor?.nomeFantasia || '-',
        ordem.placa || '-',
        `R$ ${(ordem.valorPecas || 0).toFixed(2)}`,
        `${(ordem.descontoPecasPerc || 0).toFixed(1)}%`,
        `R$ ${(ordem.valorPecasComDesconto || 0).toFixed(2)}`,
        `R$ ${(ordem.valorServico || 0).toFixed(2)}`,
        `${(ordem.descontoServicoPerc || 0).toFixed(1)}%`,
        `R$ ${(ordem.valorServicoComDesconto || 0).toFixed(2)}`,
        `R$ ${(ordem.valorFinal || 0).toFixed(2)}`
      ]);
      columnStyles = {
        0: { cellWidth: 18 }, 1: { cellWidth: 35 }, 2: { cellWidth: 15 },
        3: { cellWidth: 18 }, 4: { cellWidth: 12 }, 5: { cellWidth: 20 },
        6: { cellWidth: 18 }, 7: { cellWidth: 12 }, 8: { cellWidth: 20 }, 9: { cellWidth: 20 }
      };
    } else if (tipoFatura === 'pecas') {
      tableHead = [['Nº OS', 'Fornecedor', 'Placa', 'Valor Peças', 'Desconto %', 'Valor c/ Desconto']];
      tableData = ordensParaFatura.map(ordem => [
        ordem.numeroOrdemServico || '-',
        ordem.fornecedor?.razaoSocial || ordem.fornecedor?.nomeFantasia || '-',
        ordem.placa || '-',
        `R$ ${(ordem.valorPecas || 0).toFixed(2)}`,
        `${(ordem.descontoPecasPerc || 0).toFixed(1)}%`,
        `R$ ${(ordem.valorPecasComDesconto || 0).toFixed(2)}`
      ]);
      columnStyles = {
        0: { cellWidth: 25 }, 1: { cellWidth: 55 }, 2: { cellWidth: 20 },
        3: { cellWidth: 25 }, 4: { cellWidth: 20 }, 5: { cellWidth: 30 }
      };
    } else if (tipoFatura === 'servicos') {
      tableHead = [['Nº OS', 'Fornecedor', 'Placa', 'Valor Serviços', 'Desconto %', 'Valor c/ Desconto']];
      tableData = ordensParaFatura.map(ordem => [
        ordem.numeroOrdemServico || '-',
        ordem.fornecedor?.razaoSocial || ordem.fornecedor?.nomeFantasia || '-',
        ordem.placa || '-',
        `R$ ${(ordem.valorServico || 0).toFixed(2)}`,
        `${(ordem.descontoServicoPerc || 0).toFixed(1)}%`,
        `R$ ${(ordem.valorServicoComDesconto || 0).toFixed(2)}`
      ]);
      columnStyles = {
        0: { cellWidth: 25 }, 1: { cellWidth: 55 }, 2: { cellWidth: 20 },
        3: { cellWidth: 25 }, 4: { cellWidth: 20 }, 5: { cellWidth: 30 }
      };
    }

    autoTable(doc, {
      startY: startY,
      head: tableHead,
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 28, 89], fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: columnStyles
    });

    // Cálculos financeiros baseados no tipo de fatura
    const afterTableY = doc.lastAutoTable.finalY + 5;
    
    let valorTotalPecas = 0;
    let valorTotalServicos = 0;
    let valorTotalPecasComDesconto = 0;
    let valorTotalServicosComDesconto = 0;
    
    if (tipoFatura === 'completa') {
      valorTotalPecas = ordensParaFatura.reduce((sum, o) => sum + (o.valorPecas || 0), 0);
      valorTotalServicos = ordensParaFatura.reduce((sum, o) => sum + (o.valorServico || 0), 0);
      valorTotalPecasComDesconto = ordensParaFatura.reduce((sum, o) => sum + (o.valorPecasComDesconto || 0), 0);
      valorTotalServicosComDesconto = ordensParaFatura.reduce((sum, o) => sum + (o.valorServicoComDesconto || 0), 0);
    } else if (tipoFatura === 'pecas') {
      valorTotalPecas = ordensParaFatura.reduce((sum, o) => sum + (o.valorPecas || 0), 0);
      valorTotalPecasComDesconto = ordensParaFatura.reduce((sum, o) => sum + (o.valorPecasComDesconto || 0), 0);
    } else if (tipoFatura === 'servicos') {
      valorTotalServicos = ordensParaFatura.reduce((sum, o) => sum + (o.valorServico || 0), 0);
      valorTotalServicosComDesconto = ordensParaFatura.reduce((sum, o) => sum + (o.valorServicoComDesconto || 0), 0);
    }
    
    const valorComDesconto = valorTotalPecasComDesconto + valorTotalServicosComDesconto;
    
    const { total: totalImpostos, detalhamento } = calcularImpostosRetencoes(
      valorTotalPecasComDesconto,
      valorTotalServicosComDesconto,
      cliente,
      ordensParaFatura,
      tipoFatura
    );
    
    const valorDevido = valorComDesconto - totalImpostos;
    const descontoTotal = (valorTotalPecas + valorTotalServicos) - valorComDesconto;

    // Resumo Financeiro em formato de tabela
    doc.setFontSize(11);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    let finalY = afterTableY;
    doc.text('RESUMO FINANCEIRO', 20, finalY);
    finalY += 5;
    
    // Background cinza claro
    doc.setFillColor(248, 249, 250);
    doc.rect(20, finalY, 170, 45, 'F');
    
    // Borda da caixa
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.rect(20, finalY, 170, 45);
    
    finalY += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0);
    
    if (tipoFatura === 'completa' || tipoFatura === 'pecas') {
      doc.text('Valor Peças Total:', 25, finalY);
      doc.text(`R$ ${valorTotalPecas.toFixed(2)}`, 185, finalY, { align: 'right' });
      doc.setDrawColor(224, 224, 224);
      doc.line(20, finalY + 2, 190, finalY + 2);
      finalY += 7;
    }
    
    if (tipoFatura === 'completa' || tipoFatura === 'servicos') {
      doc.text('Valor Serviços Total:', 25, finalY);
      doc.text(`R$ ${valorTotalServicos.toFixed(2)}`, 185, finalY, { align: 'right' });
      doc.setDrawColor(224, 224, 224);
      doc.line(20, finalY + 2, 190, finalY + 2);
      finalY += 7;
    }
    
    doc.text('Desconto Contrato:', 25, finalY);
    doc.text(`- R$ ${descontoTotal.toFixed(2)}`, 185, finalY, { align: 'right' });
    doc.setDrawColor(224, 224, 224);
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 7;
    
    // Valor com Desconto - Destacado
    doc.setFillColor(227, 242, 253);
    doc.rect(20, finalY - 4, 170, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Valor com Desconto:', 25, finalY);
    doc.text(`R$ ${valorComDesconto.toFixed(2)}`, 185, finalY, { align: 'right' });
    doc.setDrawColor(0, 91, 237);
    doc.setLineWidth(1);
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 10;
    
    if (totalImpostos > 0) {
      // Seção de Impostos
      doc.setFillColor(255, 255, 255);
      doc.rect(20, finalY, 170, 35, 'F');
      doc.setDrawColor(224, 224, 224);
      doc.setLineWidth(0.5);
      doc.rect(20, finalY, 170, 35);
      
      finalY += 6;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 91, 237);
      doc.text('IMPOSTOS & RETENÇÕES', 25, finalY);
      
      finalY += 5;
      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.setFont(undefined, 'normal');
      detalhamento.forEach(item => {
        if (item.startsWith('  •')) {
          doc.text(item, 28, finalY);
        } else {
          doc.setFont(undefined, 'bold');
          doc.text(item, 25, finalY);
          doc.setFont(undefined, 'normal');
        }
        finalY += 4;
      });
      
      finalY += 1;
      doc.setDrawColor(224, 224, 224);
      doc.line(20, finalY, 190, finalY);
      finalY += 5;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Total Impostos:', 25, finalY);
      doc.text(`- R$ ${totalImpostos.toFixed(2)}`, 185, finalY, { align: 'right' });
      finalY += 8;
    }
    
    // Valor Devido - Final destacado
    doc.setFillColor(0, 91, 237);
    doc.rect(20, finalY, 170, 10, 'F');
    doc.setDrawColor(0, 91, 237);
    doc.setLineWidth(1);
    doc.rect(20, finalY, 170, 10);
    
    finalY += 7;
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('VALOR DEVIDO:', 25, finalY);
    doc.text(`R$ ${valorDevido.toFixed(2)}`, 185, finalY, { align: 'right' });

    doc.save(`fatura_cliente_${numeroFatura}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Helper para obter ordens selecionadas
  const getOrdensParaFatura = () => {
    return ordensServico.filter(o => selectedOrdens.includes(o._id));
  };
  
  // clienteFaturaCompleto é um state, carregado quando modal abre

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="faturas-clientes-container">
            <div className="page-header">
              <h1>Fatura Clientes</h1>
            </div>

            <div className="filtros-section">
              <h3>Filtros</h3>
              <div className="filtros-grid">
                <div className="form-group">
                  <label>Código OS</label>
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
                  <label>Tipo</label>
                  <select name="tipo" value={filtros.tipo} onChange={handleFiltroChange}>
                    <option value="">Todos</option>
                    {Array.isArray(tipos) && tipos.map(t => (
                      <option key={t._id} value={t._id}>{t.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Solicitação</label>
                  <select name="tipoServico" value={filtros.tipoServico} onChange={handleFiltroChange}>
                    <option value="">Todos</option>
                    {Array.isArray(tiposServico) && tiposServico.map(ts => (
                      <option key={ts._id} value={ts._id}>{ts.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Centro de Custo</label>
                  <select name="centroCusto" value={filtros.centroCusto} onChange={handleFiltroChange}>
                    <option value="">Todos</option>
                    {centrosCustoDisponiveis.map((cc, index) => (
                      <option key={index} value={cc}>{cc}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subunidade</label>
                  <select name="subunidade" value={filtros.subunidade} onChange={handleFiltroChange}>
                    <option value="">Todas</option>
                    {subunidadesDisponiveis.map((sub, index) => (
                      <option key={index} value={sub}>{sub}</option>
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
              <div className="filtro-info" style={{ marginTop: '10px', padding: '10px', background: '#e3f2fd', borderRadius: '4px', fontSize: '13px', color: '#1976d2' }}>
                ℹ️ <strong>Critérios de elegibilidade:</strong> Esta tela exibe apenas ordens com status <strong>Autorizada</strong>, <strong>Aguardando pagamento</strong> ou <strong>Paga</strong> que ainda <strong>não foram faturadas para o cliente</strong>.
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
                  <div className="btn-group-fatura">
                    <button 
                      className="btn-export btn-gerar-fatura" 
                      onClick={() => visualizarFatura('completa')}
                      disabled={selectedOrdens.length === 0}
                    >
                      <span>📄</span> Visualizar Fatura
                    </button>
                  </div>
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
                    <div className="ordem-header">
                      <input 
                        type="checkbox" 
                        checked={selectedOrdens.includes(ordem._id)}
                        onChange={() => {}}
                      />
                      <span className="ordem-codigo">{ordem.codigo}</span>
                      <span className="ordem-numero">OS: {ordem.numeroOrdemServico}</span>
                    </div>
                    <div className="ordem-body">
                      <div className="ordem-info">
                        <strong>Cliente:</strong> {ordem.cliente?.razaoSocial || ordem.cliente?.nomeFantasia}
                      </div>
                      <div className="ordem-info">
                        <strong>Fornecedor:</strong> {ordem.fornecedor?.razaoSocial || ordem.fornecedor?.nomeFantasia}
                      </div>
                      <div className="ordem-info">
                        <strong>Placa:</strong> {ordem.placa}
                      </div>
                      <div className="ordem-info">
                        <strong>Centro de Custo:</strong> {ordem.centroCusto}{ordem.subunidade ? ` / ${ordem.subunidade}` : ''}
                      </div>
                      <div className="ordem-info">
                        <strong>Valor Final:</strong> {formatCurrency(ordem.valorFinal)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {showFaturaModal && (
            <div className="modal-overlay" onClick={() => setShowFaturaModal(false)}>
              <div className="modal-fatura" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Prévia da Fatura - {
                    tipoFatura === 'completa' ? 'Completa' : 
                    tipoFatura === 'pecas' ? 'Somente Peças' : 
                    'Somente Serviços'
                  }</h2>
                  <button className="btn-close" onClick={() => setShowFaturaModal(false)}>×</button>
                </div>
                
                <div className="modal-body">
                  {clienteFaturaCompleto && (
                    <div className="fatura-preview">
                      <div className="fatura-empresa-info">
                        <h2>InstaSolutions Produtos e Gestão Empresarial LTDA</h2>
                        <p><strong>CNPJ:</strong> 47.611.398/0001-66</p>
                        <p><strong>Telefone:</strong> (11) 5118-3784 | <strong>WhatsApp:</strong> (67) 98218-2448</p>
                        <p><strong>Endereço:</strong> Alameda Rio Negro, N° 1030, Escritório 2304 - Alphaville Industrial, Barueri - SP</p>
                        <hr />
                      </div>

                      <div className="fatura-cliente-info">
                        <h3>Dados do Cliente</h3>
                        <div><strong>Razão Social:</strong> {clienteFaturaCompleto.razaoSocial || '-'}</div>
                        {clienteFaturaCompleto.nomeFantasia && (
                          <div><strong>Nome Fantasia:</strong> {clienteFaturaCompleto.nomeFantasia}</div>
                        )}
                        <div><strong>CNPJ:</strong> {clienteFaturaCompleto.cnpj || clienteFaturaCompleto.cnpjCpf || '-'}</div>
                        {clienteFaturaCompleto.inscricaoMunicipal && (
                          <div><strong>Inscrição Municipal:</strong> {clienteFaturaCompleto.inscricaoMunicipal}</div>
                        )}
                        {clienteFaturaCompleto.inscricaoEstadual && (
                          <div><strong>Inscrição Estadual:</strong> {clienteFaturaCompleto.inscricaoEstadual}</div>
                        )}
                        {clienteFaturaCompleto.endereco && (
                          <>
                            <div><strong>Endereço:</strong> {clienteFaturaCompleto.endereco.logradouro || clienteFaturaCompleto.endereco || '-'}, {clienteFaturaCompleto.endereco.numero || ''}</div>
                            <div><strong>Bairro:</strong> {clienteFaturaCompleto.endereco.bairro || '-'}</div>
                            <div><strong>Cidade/UF:</strong> {clienteFaturaCompleto.endereco.cidade || '-'}/{clienteFaturaCompleto.endereco.estado || '-'}</div>
                            <div><strong>CEP:</strong> {clienteFaturaCompleto.endereco.cep || '-'}</div>
                          </>
                        )}
                        {clienteFaturaCompleto.contatos?.telefone && (
                          <div><strong>Telefone:</strong> {clienteFaturaCompleto.contatos.telefone}</div>
                        )}
                        {clienteFaturaCompleto.contatos?.email && (
                          <div><strong>Email:</strong> {clienteFaturaCompleto.contatos.email}</div>
                        )}
                      </div>

                      {(() => {
                        const ordensParaFatura = getOrdensParaFatura();
                        const centrosCustoData = ordensParaFatura
                          .filter(o => o.centroCusto)
                          .map(o => {
                            const cc = o.centroCusto;
                            const sub = o.subunidade ? ` / ${o.subunidade}` : '';
                            return cc + sub;
                          });
                        const centrosCusto = [...new Set(centrosCustoData)];
                        return centrosCusto.length > 0 && (
                          <div className="fatura-centros-custo">
                            <h3>Centros de Custo / Subunidades</h3>
                            <div className="centros-list">{centrosCusto.join(' | ')}</div>
                          </div>
                        );
                      })()}

                      <table className="fatura-table">
                        <thead>
                          <tr>
                            <th>Nº OS</th>
                            <th>Fornecedor</th>
                            <th>Placa</th>
                            {(tipoFatura === 'completa' || tipoFatura === 'pecas') && (
                              <>
                                <th>Vlr Peças</th>
                                <th>Desc%</th>
                                <th>Vlr c/Desc</th>
                              </>
                            )}
                            {(tipoFatura === 'completa' || tipoFatura === 'servicos') && (
                              <>
                                <th>Vlr Serv.</th>
                                <th>Desc%</th>
                                <th>Vlr c/Desc</th>
                              </>
                            )}
                            {tipoFatura === 'completa' && <th>Total</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {getOrdensParaFatura().map(ordem => (
                            <tr key={ordem._id}>
                              <td>{ordem.numeroOrdemServico || '-'}</td>
                              <td>{ordem.fornecedor?.razaoSocial || ordem.fornecedor?.nomeFantasia || '-'}</td>
                              <td>{ordem.placa || '-'}</td>
                              {(tipoFatura === 'completa' || tipoFatura === 'pecas') && (
                                <>
                                  <td>{formatCurrency(ordem.valorPecas)}</td>
                                  <td>{(ordem.descontoPecasPerc || 0).toFixed(1)}%</td>
                                  <td>{formatCurrency(ordem.valorPecasComDesconto)}</td>
                                </>
                              )}
                              {(tipoFatura === 'completa' || tipoFatura === 'servicos') && (
                                <>
                                  <td>{formatCurrency(ordem.valorServico)}</td>
                                  <td>{(ordem.descontoServicoPerc || 0).toFixed(1)}%</td>
                                  <td>{formatCurrency(ordem.valorServicoComDesconto)}</td>
                                </>
                              )}
                              {tipoFatura === 'completa' && <td>{formatCurrency(ordem.valorFinal)}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="resumo-financeiro">
                        <h3>Resumo Financeiro</h3>
                        {(() => {
                          const ordensParaFatura = getOrdensParaFatura();
                          
                          if (!ordensParaFatura || ordensParaFatura.length === 0) {
                            return <p>Nenhuma ordem selecionada</p>;
                          }
                          
                          console.log('🔍 Modal - Debug Resumo:', {
                            ordensTotal: ordensParaFatura.length,
                            tipoFatura,
                            clienteFaturaCompleto: !!clienteFaturaCompleto,
                            impostos: !!impostos,
                            clienteTipoImposto: clienteFaturaCompleto?.tipoImposto
                          });
                          
                          let valorTotalPecas = 0;
                          let valorTotalServicos = 0;
                          let valorTotalPecasComDesconto = 0;
                          let valorTotalServicosComDesconto = 0;
                          
                          if (tipoFatura === 'completa') {
                            valorTotalPecas = ordensParaFatura.reduce((sum, o) => sum + (o.valorPecas || 0), 0);
                            valorTotalServicos = ordensParaFatura.reduce((sum, o) => sum + (o.valorServico || 0), 0);
                            valorTotalPecasComDesconto = ordensParaFatura.reduce((sum, o) => sum + (o.valorPecasComDesconto || 0), 0);
                            valorTotalServicosComDesconto = ordensParaFatura.reduce((sum, o) => sum + (o.valorServicoComDesconto || 0), 0);
                          } else if (tipoFatura === 'pecas') {
                            valorTotalPecas = ordensParaFatura.reduce((sum, o) => sum + (o.valorPecas || 0), 0);
                            valorTotalPecasComDesconto = ordensParaFatura.reduce((sum, o) => sum + (o.valorPecasComDesconto || 0), 0);
                          } else if (tipoFatura === 'servicos') {
                            valorTotalServicos = ordensParaFatura.reduce((sum, o) => sum + (o.valorServico || 0), 0);
                            valorTotalServicosComDesconto = ordensParaFatura.reduce((sum, o) => sum + (o.valorServicoComDesconto || 0), 0);
                          }
                          
                          console.log('💰 Valores calculados:', {
                            valorTotalPecas,
                            valorTotalServicos,
                            valorTotalPecasComDesconto,
                            valorTotalServicosComDesconto
                          });
                          
                          const valorTotal = valorTotalPecas + valorTotalServicos;
                          const valorComDesconto = valorTotalPecasComDesconto + valorTotalServicosComDesconto;
                          const descontoTotal = valorTotal - valorComDesconto;
                          
                          const { total: totalImpostos, detalhamento } = calcularImpostosRetencoes(
                            valorTotalPecasComDesconto,
                            valorTotalServicosComDesconto,
                            clienteFaturaCompleto,
                            ordensParaFatura,
                            tipoFatura
                          );
                          
                          console.log('📊 Impostos calculados:', {
                            totalImpostos,
                            detalhamento: detalhamento.length
                          });
                          
                          // Taxa de operação não existe para cliente, só para fornecedor
                          const valorTaxasOperacao = 0;
                          
                          // Fórmula: Valor com Desconto - Impostos - Taxa de Operação
                          const valorAposImpostos = valorComDesconto - totalImpostos;
                          const valorDevido = valorAposImpostos - valorTaxasOperacao;

                          return (
                            <>
                              {(tipoFatura === 'completa' || tipoFatura === 'pecas') && (
                                <div className="resumo-linha">
                                  <span>Valor Total Peças:</span>
                                  <span>{formatCurrency(valorTotalPecas)}</span>
                                </div>
                              )}
                              {(tipoFatura === 'completa' || tipoFatura === 'servicos') && (
                                <div className="resumo-linha">
                                  <span>Valor Total Serviços:</span>
                                  <span>{formatCurrency(valorTotalServicos)}</span>
                                </div>
                              )}
                              <div className="resumo-linha">
                                <span>(-) Desconto Contrato:</span>
                                <span>{formatCurrency(descontoTotal)}</span>
                              </div>
                              <div className="resumo-linha destaque">
                                <span>Valor com Desconto:</span>
                                <span>{formatCurrency(valorComDesconto)}</span>
                              </div>
                              
                              {totalImpostos > 0 && (
                                <>
                                  <div className="resumo-linha">
                                    <span>(-) Impostos & Retenções:</span>
                                    <span>{formatCurrency(totalImpostos)}</span>
                                  </div>
                                  <div className="resumo-linha destaque">
                                    <span>Valor após Impostos & Retenções:</span>
                                    <span>{formatCurrency(valorAposImpostos)}</span>
                                  </div>
                                </>
                              )}
                              
                              {valorTaxasOperacao > 0 && (
                                <div className="resumo-linha">
                                  <span>(-) Taxa de Operação:</span>
                                  <span>{formatCurrency(valorTaxasOperacao)}</span>
                                </div>
                              )}
                              
                              <div className="resumo-linha destaque-final">
                                <span>VALOR DEVIDO:</span>
                                <span>{formatCurrency(valorDevido)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      
                      <div className="fatura-vencimento" style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                          Data de Vencimento (opcional):
                        </label>
                        <input
                          type="date"
                          value={dataVencimento}
                          onChange={(e) => setDataVencimento(e.target.value)}
                          style={{ 
                            padding: '8px', 
                            fontSize: '14px', 
                            border: '1px solid #ccc', 
                            borderRadius: '4px',
                            width: '200px'
                          }}
                        />
                        <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                          A fatura vencida será notificada automaticamente aos administradores
                        </small>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => setShowFaturaModal(false)}>
                    Fechar
                  </button>
                  <button className="btn-primary" onClick={exportarPDF}>
                    <span>📄</span> Gerar PDF
                  </button>
                  {(user?.role === 'admin' || user?.role === 'super_admin') && (
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
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default FaturasClientes;
