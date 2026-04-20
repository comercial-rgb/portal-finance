import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './Pagamentos.css';

function Pagamentos() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState([]);
  const [antecipacoes, setAntecipacoes] = useState([]);
  const [resumo, setResumo] = useState({
    totalRecebido: 0,
    totalPendente: 0,
    osPagas: 0,
    osPendentes: 0,
    antecipacoes: { total: 0, pendentes: 0, aprovadas: 0, pagas: 0, valorTotal: 0 }
  });
  const [abaAtiva, setAbaAtiva] = useState('ordens-pagamento');
  const [filtrosPagamentos, setFiltrosPagamentos] = useState({ busca: '' });
  const [filtrosAntecipacoes, setFiltrosAntecipacoes] = useState({ busca: '' });
  const [filtrosOrdens, setFiltrosOrdens] = useState({
    cliente: '',
    fornecedor: '',
    periodoInicio: '',
    periodoFim: '',
    statusOrdem: 'Pendente'
  });
  const [paginaAtualOrdens, setPaginaAtualOrdens] = useState(1);
  const itensPorPaginaOrdens = 15;

  // Modal de Comprovante (aba pagamentos)
  const [showModalComprovante, setShowModalComprovante] = useState(false);
  const [comprovanteAtual, setComprovanteAtual] = useState(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);

  // === ORDENS DE PAGAMENTO STATE ===
  const [ordens, setOrdens] = useState([]);
  const [resumoOrdens, setResumoOrdens] = useState({ totalOrdens: 0, pendentes: 0, pagas: 0, valorTotalPendente: 0, valorTotalPago: 0 });
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [fornecedoresLista, setFornecedoresLista] = useState([]);
  const [faturasAbertasFornecedor, setFaturasAbertasFornecedor] = useState([]);
  const [loadingFaturas, setLoadingFaturas] = useState(false);
  const [formData, setFormData] = useState({
    cliente: '', fornecedor: '', fatura: '', faturaNumeroManual: '',
    valor: '', dataGeracao: new Date().toISOString().split('T')[0], observacoes: ''
  });
  const [usarFaturaManual, setUsarFaturaManual] = useState(false);

  // Modal pagar ordem
  const [showModalPagar, setShowModalPagar] = useState(false);
  const [ordemPagar, setOrdemPagar] = useState(null);
  const [uploadingOrdemComprovante, setUploadingOrdemComprovante] = useState(false);

  // Modal vincular fatura
  const [showModalVincular, setShowModalVincular] = useState(false);
  const [ordemVincular, setOrdemVincular] = useState(null);
  const [faturasVincular, setFaturasVincular] = useState([]);
  const [faturaVinculadaSelecionada, setFaturaVinculadaSelecionada] = useState('');
  const [loadingVincular, setLoadingVincular] = useState(false);

  // Modal comprovante view (ordens)
  const [showModalOrdemComprovante, setShowModalOrdemComprovante] = useState(false);
  const [ordemComprovanteView, setOrdemComprovanteView] = useState(null);

  // Bank info popup
  const [bankInfoId, setBankInfoId] = useState(null);

  // Busca nos selects do form
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaFornecedor, setBuscaFornecedor] = useState('');

  const isAdmin = ['super_admin', 'admin'].includes(user?.role);
  const isAdminGerente = ['super_admin', 'admin', 'gerente'].includes(user?.role);
  const isFornecedor = user?.role === 'fornecedor';

  // === LOAD DATA ===
  // Carrega APENAS o necessário para a aba inicial (Ordens de Pagamento).
  // Pagamentos / Antecipações são buscados sob demanda para reduzir tempo de entrada na tela.
  const [abasCarregadas, setAbasCarregadas] = useState({ ordens: false, pagamentos: false, antecipacoes: false });

  const loadOrdens = useCallback(async () => {
    try {
      const [ordensRes, resumoOrdensRes] = await Promise.all([
        api.get('/ordens-pagamento'),
        api.get('/ordens-pagamento/resumo')
      ]);
      const ordensRaw = ordensRes?.data?.data ?? ordensRes?.data ?? [];
      const ordensArr = Array.isArray(ordensRaw) ? ordensRaw : [];
      setOrdens(ordensArr);
      const resumoRaw = resumoOrdensRes?.data?.data ?? resumoOrdensRes?.data ?? {};
      setResumoOrdens({
        totalOrdens: resumoRaw.totalOrdens || 0,
        pendentes: resumoRaw.pendentes || 0,
        pagas: resumoRaw.pagas || 0,
        valorTotalPendente: resumoRaw.valorTotalPendente || 0,
        valorTotalPago: resumoRaw.valorTotalPago || 0
      });
      setAbasCarregadas(prev => ({ ...prev, ordens: true }));
    } catch (error) {
      console.error('Erro ao carregar ordens:', error);
      toast.error('Erro ao carregar ordens de pagamento');
      setOrdens([]);
    }
  }, []);

  const loadPagamentos = useCallback(async () => {
    try {
      const [pagamentosRes, resumoRes] = await Promise.all([
        api.get('/pagamentos'),
        api.get('/pagamentos/resumo')
      ]);
      const pagRaw = pagamentosRes?.data?.data ?? pagamentosRes?.data ?? [];
      setPagamentos(Array.isArray(pagRaw) ? pagRaw : []);
      const resumoRaw = resumoRes?.data ?? {};
      setResumo({
        totalRecebido: resumoRaw.totalRecebido || 0,
        totalPendente: resumoRaw.totalPendente || 0,
        osPagas: resumoRaw.osPagas || 0,
        osPendentes: resumoRaw.osPendentes || 0,
        antecipacoes: resumoRaw.antecipacoes || { total: 0, pendentes: 0, aprovadas: 0, pagas: 0, valorTotal: 0 }
      });
      setAbasCarregadas(prev => ({ ...prev, pagamentos: true }));
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
      toast.error('Erro ao carregar pagamentos');
      setPagamentos([]);
    }
  }, []);

  const loadAntecipacoes = useCallback(async () => {
    try {
      const res = await api.get('/pagamentos/antecipacoes');
      const raw = res?.data?.data ?? res?.data ?? [];
      setAntecipacoes(Array.isArray(raw) ? raw : []);
      setAbasCarregadas(prev => ({ ...prev, antecipacoes: true }));
    } catch (error) {
      console.error('Erro ao carregar antecipações:', error);
      setAntecipacoes([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await loadOrdens();
    setLoading(false);
  }, [loadOrdens]);

  const loadClientesFornecedores = useCallback(async () => {
    try {
      const [clientesRes, fornecedoresRes] = await Promise.all([
        api.get('/clientes?limit=1000'),
        api.get('/fornecedores?limit=1000')
      ]);
      const extrairArray = (resp) => {
        const d = resp?.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        if (Array.isArray(d?.clientes)) return d.clientes;
        if (Array.isArray(d?.fornecedores)) return d.fornecedores;
        if (Array.isArray(d?.results)) return d.results;
        return [];
      };
      setClientes(extrairArray(clientesRes));
      setFornecedoresLista(extrairArray(fornecedoresRes));
    } catch (error) {
      console.error('Erro ao carregar clientes/fornecedores:', error);
      setClientes([]);
      setFornecedoresLista([]);
    }
  }, []);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadData();
  }, [loadData]);

  // Lazy load das abas secundárias: só busca quando o usuário abrir a aba
  useEffect(() => {
    if (abaAtiva === 'pagamentos' && !abasCarregadas.pagamentos) loadPagamentos();
    if (abaAtiva === 'antecipacoes' && !abasCarregadas.antecipacoes) loadAntecipacoes();
  }, [abaAtiva, abasCarregadas.pagamentos, abasCarregadas.antecipacoes, loadPagamentos, loadAntecipacoes]);

  useEffect(() => {
    if (isAdminGerente && showForm) {
      loadClientesFornecedores();
    }
  }, [isAdminGerente, showForm, loadClientesFornecedores]);

  // Click outside bank info
  useEffect(() => {
    const handleClickOutside = () => setBankInfoId(null);
    if (bankInfoId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [bankInfoId]);

  // === FORMATTERS ===
  const formatarValor = (valor) => {
    if (!valor && valor !== 0) return 'R$ 0,00';
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const normalizarTexto = (valor) => (valor || '').toString().toLowerCase().trim();

  // === PAGAMENTOS (aba existente) ===
  const handleFiltroPagamentosChange = (e) => {
    const { name, value } = e.target;
    setFiltrosPagamentos(prev => ({ ...prev, [name]: value }));
  };

  const handleFiltroAntecipacoesChange = (e) => {
    const { name, value } = e.target;
    setFiltrosAntecipacoes(prev => ({ ...prev, [name]: value }));
  };

  const handleFiltroOrdensChange = (e) => {
    const { name, value } = e.target;
    setFiltrosOrdens(prev => ({ ...prev, [name]: value }));
    setPaginaAtualOrdens(1);
  };

  const pagamentosFiltrados = (Array.isArray(pagamentos) ? pagamentos : []).filter(p => {
    const busca = normalizarTexto(filtrosPagamentos.busca);
    const matchBusca = !busca ||
      normalizarTexto(p.numeroFatura).includes(busca) ||
      normalizarTexto(p.ordemServico?.numeroOrdemServico).includes(busca);
    return matchBusca;
  });

  const antecipacoesFiltradas = (Array.isArray(antecipacoes) ? antecipacoes : []).filter(a => {
    const busca = normalizarTexto(filtrosAntecipacoes.busca);
    const matchBusca = !busca ||
      normalizarTexto(a.fornecedor?.razaoSocial).includes(busca);
    return matchBusca;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-badge status-pendente';
      case 'Aprovada': return 'status-badge status-aprovada';
      case 'Rejeitada': return 'status-badge status-rejeitada';
      case 'Paga': return 'status-badge status-paga';
      case 'Cancelada': return 'status-badge status-cancelada';
      default: return 'status-badge';
    }
  };

  const handleVerComprovante = (pagamento) => {
    setComprovanteAtual(pagamento);
    setShowModalComprovante(true);
  };

  const handleUploadComprovante = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!tiposPermitidos.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.');
      return;
    }

    setUploadingComprovante(true);
    const reader = new FileReader();
    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo');
      setUploadingComprovante(false);
    };
    reader.onload = async () => {
      try {
        const osId = comprovanteAtual?.ordemServico?._id || comprovanteAtual?.ordemServico?.id || comprovanteAtual?.osId;
        if (!comprovanteAtual?.faturaId || !osId) {
          toast.error('Erro: IDs da fatura ou OS não encontrados');
          setUploadingComprovante(false);
          return;
        }
        await api.put(`/pagamentos/${comprovanteAtual.faturaId}/os/${osId}/comprovante`, { comprovante: reader.result });
        toast.success('Comprovante anexado com sucesso!');
        setShowModalComprovante(false);
        loadData();
      } catch (error) {
        console.error('Erro ao anexar comprovante:', error);
        toast.error(error.response?.data?.message || 'Erro ao anexar comprovante');
      } finally {
        setUploadingComprovante(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // === ORDENS DE PAGAMENTO ===
  const carregarFaturasFornecedor = async (fornecedorId) => {
    if (!fornecedorId) { setFaturasAbertasFornecedor([]); return; }
    try {
      setLoadingFaturas(true);
      const res = await api.get(`/ordens-pagamento/faturas-fornecedor/${fornecedorId}`);
      setFaturasAbertasFornecedor(res.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
      setFaturasAbertasFornecedor([]);
    } finally {
      setLoadingFaturas(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'fornecedor') {
      setFormData(prev => ({ ...prev, fatura: '', faturaNumeroManual: '' }));
      setUsarFaturaManual(false);
      if (value) carregarFaturasFornecedor(value);
      else setFaturasAbertasFornecedor([]);
    }
  };

  const handleCriarOrdem = async (e) => {
    e.preventDefault();
    if (!formData.cliente || !formData.fornecedor || !formData.valor || !formData.dataGeracao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    const valor = parseFloat(formData.valor);
    if (isNaN(valor) || valor <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }
    try {
      setFormLoading(true);
      await api.post('/ordens-pagamento', {
        cliente: formData.cliente,
        fornecedor: formData.fornecedor,
        fatura: usarFaturaManual ? null : (formData.fatura || null),
        faturaNumeroManual: usarFaturaManual ? formData.faturaNumeroManual : null,
        valor,
        dataGeracao: formData.dataGeracao,
        observacoes: formData.observacoes
      });
      toast.success('Ordem de pagamento criada com sucesso!');
      setFormData({ cliente: '', fornecedor: '', fatura: '', faturaNumeroManual: '', valor: '', dataGeracao: new Date().toISOString().split('T')[0], observacoes: '' });
      setUsarFaturaManual(false);
      setFaturasAbertasFornecedor([]);
      setBuscaCliente('');
      setBuscaFornecedor('');
      setShowForm(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao criar ordem de pagamento');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAbrirPagar = (ordem) => { setOrdemPagar(ordem); setShowModalPagar(true); };

  const handleUploadOrdemComprovante = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo 5MB.'); return; }
    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!tiposPermitidos.includes(file.type)) { toast.error('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.'); return; }
    setUploadingOrdemComprovante(true);
    const reader = new FileReader();
    reader.onerror = () => { toast.error('Erro ao ler o arquivo'); setUploadingOrdemComprovante(false); };
    reader.onload = async () => {
      try {
        await api.put(`/ordens-pagamento/${ordemPagar._id}/pagar`, { comprovante: reader.result });
        toast.success('Pagamento registrado com sucesso!');
        setShowModalPagar(false);
        setOrdemPagar(null);
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Erro ao registrar pagamento');
      } finally {
        setUploadingOrdemComprovante(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAbrirVincular = async (ordem) => {
    setOrdemVincular(ordem);
    setFaturaVinculadaSelecionada('');
    setShowModalVincular(true);
    try {
      setLoadingVincular(true);
      const res = await api.get(`/ordens-pagamento/faturas-fornecedor/${ordem.fornecedor._id}`);
      setFaturasVincular(res.data.data || []);
    } catch (error) {
      toast.error('Erro ao carregar faturas');
    } finally {
      setLoadingVincular(false);
    }
  };

  const handleVincularFatura = async () => {
    if (!faturaVinculadaSelecionada) { toast.error('Selecione uma fatura para vincular'); return; }
    try {
      setLoadingVincular(true);
      await api.put(`/ordens-pagamento/${ordemVincular._id}/vincular-fatura`, { faturaId: faturaVinculadaSelecionada });
      toast.success('Pagamento vinculado à fatura com sucesso!');
      setShowModalVincular(false);
      setOrdemVincular(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao vincular fatura');
    } finally {
      setLoadingVincular(false);
    }
  };

  const handleVerOrdemComprovante = async (ordem) => {
    try {
      // O backend não envia o comprovante na listagem (evita trafegar base64 pesado).
      // Busca sob demanda quando o usuário clica em "Comprovante".
      if (!ordem.comprovante) {
        const res = await api.get(`/ordens-pagamento/${ordem._id}/comprovante`);
        const comprovante = res.data?.data?.comprovante;
        if (!comprovante) {
          toast.info('Esta ordem não possui comprovante anexado');
          return;
        }
        setOrdemComprovanteView({ ...ordem, comprovante });
      } else {
        setOrdemComprovanteView(ordem);
      }
      setShowModalOrdemComprovante(true);
    } catch (error) {
      console.error('Erro ao carregar comprovante:', error);
      toast.error('Erro ao carregar comprovante');
    }
  };

  // Resincronizar com FinSystem
  const handleResincronizar = async (ordemId) => {
    try {
      const res = await api.post(`/ordens-pagamento/${ordemId}/resincronizar`);
      toast.success(res.data.message || 'Sincronizado com FinSystem!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao resincronizar com FinSystem');
    }
  };

  // Filtros ordens
  const ordensFiltradas = (Array.isArray(ordens) ? ordens : []).filter(o => {
    const clienteFiltro = normalizarTexto(filtrosOrdens.cliente);
    const fornecedorFiltro = normalizarTexto(filtrosOrdens.fornecedor);

    const clienteTexto = normalizarTexto(o.cliente?.razaoSocial || o.cliente?.nomeFantasia);
    const fornecedorTexto = normalizarTexto(o.fornecedor?.razaoSocial || o.fornecedor?.nomeFantasia);
    const fornecedorDocumento = normalizarTexto(o.fornecedor?.cnpjCpf);

    const matchCliente = !clienteFiltro || clienteTexto.includes(clienteFiltro);
    const matchFornecedor = !fornecedorFiltro ||
      fornecedorTexto.includes(fornecedorFiltro) ||
      fornecedorDocumento.includes(fornecedorFiltro);

    const dataGeracao = o.dataGeracao ? new Date(o.dataGeracao) : null;
    const dataValida = dataGeracao && !Number.isNaN(dataGeracao.getTime());

    let matchPeriodo = true;
    if (filtrosOrdens.periodoInicio) {
      const inicio = new Date(`${filtrosOrdens.periodoInicio}T00:00:00`);
      matchPeriodo = matchPeriodo && dataValida && dataGeracao >= inicio;
    }
    if (filtrosOrdens.periodoFim) {
      const fim = new Date(`${filtrosOrdens.periodoFim}T23:59:59`);
      matchPeriodo = matchPeriodo && dataValida && dataGeracao <= fim;
    }

    const matchStatus = !filtrosOrdens.statusOrdem || o.status === filtrosOrdens.statusOrdem;
    return matchCliente && matchFornecedor && matchPeriodo && matchStatus;
  });

  // Paginação ordens
  const totalPaginasOrdens = Math.ceil(ordensFiltradas.length / itensPorPaginaOrdens);
  const ordensPaginadas = ordensFiltradas.slice(
    (paginaAtualOrdens - 1) * itensPorPaginaOrdens,
    paginaAtualOrdens * itensPorPaginaOrdens
  );

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="pagamentos-container">
            {/* Cabeçalho */}
            <div className="page-header">
              <div>
                <h1>💳 Pagamentos</h1>
                <p>Gerencie ordens de pagamento, acompanhe pagamentos e antecipações</p>
              </div>
              {isAdminGerente && abaAtiva === 'ordens-pagamento' && (
                <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                  {showForm ? '✕ Fechar' : '+ Criar Ordem de Pagamento'}
                </button>
              )}
            </div>

            {loading ? (
              <div className="loading">Carregando...</div>
            ) : (
              <>
                {/* Cards de Resumo - muda conforme a aba */}
                {abaAtiva === 'ordens-pagamento' ? (
                  <div className="stats-grid">
                    <div className="stat-card stat-info">
                      <div className="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h3>Total de Ordens</h3>
                        <p className="stat-value">{resumoOrdens.totalOrdens}</p>
                      </div>
                    </div>
                    <div className="stat-card stat-warning">
                      <div className="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h3>Pendentes</h3>
                        <p className="stat-value">{formatarValor(resumoOrdens.valorTotalPendente)}</p>
                        <span className="stat-label">{resumoOrdens.pendentes} ordens</span>
                      </div>
                    </div>
                    <div className="stat-card stat-success">
                      <div className="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h3>Pagas</h3>
                        <p className="stat-value">{formatarValor(resumoOrdens.valorTotalPago)}</p>
                        <span className="stat-label">{resumoOrdens.pagas} ordens</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="stats-grid">
                    <div className="stat-card stat-success">
                      <div className="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h3>Total Recebido</h3>
                        <p className="stat-value">{formatarValor(resumo.totalRecebido)}</p>
                        <span className="stat-label">{resumo.osPagas} OS pagas</span>
                      </div>
                    </div>
                    <div className="stat-card stat-warning">
                      <div className="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h3>Pendente</h3>
                        <p className="stat-value">{formatarValor(resumo.totalPendente)}</p>
                        <span className="stat-label">{resumo.osPendentes} OS aguardando</span>
                      </div>
                    </div>
                    {isFornecedor && (
                      <div className="stat-card stat-info">
                        <div className="stat-icon">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                        </div>
                        <div className="stat-content">
                          <h3>Antecipado</h3>
                          <p className="stat-value">{formatarValor(resumo.antecipacoes.valorTotal)}</p>
                          <span className="stat-label">{resumo.antecipacoes.pagas} antecipações pagas</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Abas */}
                <div className="tabs-container">
                  <button
                    className={`tab-button ${abaAtiva === 'ordens-pagamento' ? 'active' : ''}`}
                    onClick={() => setAbaAtiva('ordens-pagamento')}
                  >
                    <span className="tab-icon">📋</span>
                    Ordens de Pagamento
                  </button>
                  <button
                    className={`tab-button ${abaAtiva === 'pagamentos' ? 'active' : ''}`}
                    onClick={() => setAbaAtiva('pagamentos')}
                  >
                    <span className="tab-icon">💰</span>
                    Pagamentos
                  </button>
                  {isFornecedor && (
                    <button
                      className={`tab-button ${abaAtiva === 'antecipacoes' ? 'active' : ''}`}
                      onClick={() => setAbaAtiva('antecipacoes')}
                    >
                      <span className="tab-icon">⚡</span>
                      Antecipações
                    </button>
                  )}
                </div>

                {/* ========== ABA: ORDENS DE PAGAMENTO ========== */}
                {abaAtiva === 'ordens-pagamento' && (
                  <>
                    {/* Form criar ordem */}
                    {isAdminGerente && showForm && (
                      <div className="section-card form-card">
                        <div className="section-header">
                          <h2>➕ Nova Ordem de Pagamento</h2>
                        </div>
                        <form onSubmit={handleCriarOrdem} className="form-grid">
                          <div className="form-group">
                            <label htmlFor="cliente-input">Cliente *</label>
                            <input
                              id="cliente-input"
                              type="text"
                              list="lista-clientes"
                              placeholder="🔍 Digite para buscar ou selecione..."
                              value={buscaCliente}
                              onChange={(e) => {
                                const texto = e.target.value;
                                setBuscaCliente(texto);
                                const arr = Array.isArray(clientes) ? clientes : [];
                                const match = arr.find(c => {
                                  const label = `${c.razaoSocial || ''}${c.cnpj ? ` (${c.cnpj})` : ''}`;
                                  return label === texto;
                                });
                                setFormData(prev => ({ ...prev, cliente: match ? match._id : '' }));
                              }}
                              required
                              className="form-input"
                              autoComplete="off"
                            />
                            <datalist id="lista-clientes">
                              {(Array.isArray(clientes) ? clientes : []).map(c => (
                                <option key={c._id} value={`${c.razaoSocial || ''}${c.cnpj ? ` (${c.cnpj})` : ''}`}>
                                  {c.nomeFantasia || c.razaoSocial}
                                </option>
                              ))}
                            </datalist>
                          </div>
                          <div className="form-group">
                            <label htmlFor="fornecedor-input">Fornecedor *</label>
                            <input
                              id="fornecedor-input"
                              type="text"
                              list="lista-fornecedores"
                              placeholder="🔍 Digite para buscar ou selecione..."
                              value={buscaFornecedor}
                              onChange={(e) => {
                                const texto = e.target.value;
                                setBuscaFornecedor(texto);
                                const arr = Array.isArray(fornecedoresLista) ? fornecedoresLista : [];
                                const match = arr.find(f => {
                                  const label = `${f.razaoSocial || ''}${f.cnpjCpf ? ` (${f.cnpjCpf})` : ''}`;
                                  return label === texto;
                                });
                                const novoFornecedorId = match ? match._id : '';
                                setFormData(prev => ({ ...prev, fornecedor: novoFornecedorId, fatura: '', faturaNumeroManual: '' }));
                                setUsarFaturaManual(false);
                                if (novoFornecedorId) {
                                  carregarFaturasFornecedor(novoFornecedorId);
                                } else {
                                  setFaturasAbertasFornecedor([]);
                                }
                              }}
                              required
                              className="form-input"
                              autoComplete="off"
                            />
                            <datalist id="lista-fornecedores">
                              {(Array.isArray(fornecedoresLista) ? fornecedoresLista : []).map(f => (
                                <option key={f._id} value={`${f.razaoSocial || ''}${f.cnpjCpf ? ` (${f.cnpjCpf})` : ''}`}>
                                  {f.nomeFantasia || f.razaoSocial}
                                </option>
                              ))}
                            </datalist>
                          </div>
                          <div className="form-group">
                            <label>Fatura</label>
                            <div className="fatura-toggle">
                              <label className="toggle-label">
                                <input type="checkbox" checked={usarFaturaManual} onChange={(e) => { setUsarFaturaManual(e.target.checked); setFormData(prev => ({ ...prev, fatura: '', faturaNumeroManual: '' })); }} />
                                <span>Preencher manualmente</span>
                              </label>
                            </div>
                            {usarFaturaManual ? (
                              <input type="text" name="faturaNumeroManual" value={formData.faturaNumeroManual} onChange={handleFormChange} placeholder="Número da fatura manual..." className="form-input" />
                            ) : (
                              <select name="fatura" value={formData.fatura} onChange={handleFormChange} className="form-input" disabled={!formData.fornecedor || loadingFaturas}>
                                <option value="">
                                  {!formData.fornecedor ? 'Selecione um fornecedor primeiro...' : loadingFaturas ? 'Carregando faturas...' : faturasAbertasFornecedor.length === 0 ? 'Nenhuma fatura em aberto' : 'Selecione a fatura...'}
                                </option>
                                {(Array.isArray(faturasAbertasFornecedor) ? faturasAbertasFornecedor : []).map(f => (
                                  <option key={f._id} value={f._id}>{f.numeroFatura} - {formatarValor(f.valorRestante || f.valorDevido)} ({f.statusFatura})</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="form-group">
                            <label htmlFor="valor">Valor *</label>
                            <input type="number" id="valor" name="valor" value={formData.valor} onChange={handleFormChange} placeholder="0,00" step="0.01" min="0.01" required className="form-input" />
                          </div>
                          <div className="form-group">
                            <label htmlFor="dataGeracao">Data Gerada *</label>
                            <input type="date" id="dataGeracao" name="dataGeracao" value={formData.dataGeracao} onChange={handleFormChange} required className="form-input" />
                          </div>
                          <div className="form-group form-group-full">
                            <label htmlFor="observacoes">Observações</label>
                            <textarea id="observacoes" name="observacoes" value={formData.observacoes} onChange={handleFormChange} placeholder="Observações opcionais..." className="form-input form-textarea" rows="2" />
                          </div>
                          <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                            <button type="submit" className="btn-primary" disabled={formLoading}>{formLoading ? 'Criando...' : '✓ Criar Ordem de Pagamento'}</button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Sub-abas de status */}
                    <div className="status-subtabs">
                      <button
                        className={`status-subtab ${filtrosOrdens.statusOrdem === 'Pendente' ? 'active subtab-pendente' : ''}`}
                        onClick={() => { setFiltrosOrdens(prev => ({ ...prev, statusOrdem: 'Pendente' })); setPaginaAtualOrdens(1); }}
                      >
                        ⏳ Pendentes
                        <span className="subtab-count">{ordens.filter(o => o.status === 'Pendente').length}</span>
                      </button>
                      <button
                        className={`status-subtab ${filtrosOrdens.statusOrdem === 'Paga' ? 'active subtab-paga' : ''}`}
                        onClick={() => { setFiltrosOrdens(prev => ({ ...prev, statusOrdem: 'Paga' })); setPaginaAtualOrdens(1); }}
                      >
                        ✅ Pagas
                        <span className="subtab-count">{ordens.filter(o => o.status === 'Paga').length}</span>
                      </button>
                      <button
                        className={`status-subtab ${filtrosOrdens.statusOrdem === '' ? 'active subtab-todas' : ''}`}
                        onClick={() => { setFiltrosOrdens(prev => ({ ...prev, statusOrdem: '' })); setPaginaAtualOrdens(1); }}
                      >
                        📋 Todas
                        <span className="subtab-count">{ordens.length}</span>
                      </button>
                    </div>

                    {/* Filtros ordens */}
                    <div className="filtros-card">
                      <div className="ordens-filtros-grid">
                        <input
                          type="text"
                          name="cliente"
                          value={filtrosOrdens.cliente}
                          onChange={handleFiltroOrdensChange}
                          placeholder="Pesquisar cliente"
                          className="filtro-input"
                        />
                        <input
                          type="text"
                          name="fornecedor"
                          value={filtrosOrdens.fornecedor}
                          onChange={handleFiltroOrdensChange}
                          placeholder="Pesquisar fornecedor ou CNPJ"
                          className="filtro-input"
                        />
                        <input
                          type="date"
                          name="periodoInicio"
                          value={filtrosOrdens.periodoInicio}
                          onChange={handleFiltroOrdensChange}
                          className="filtro-input filtro-date"
                        />
                        <input
                          type="date"
                          name="periodoFim"
                          value={filtrosOrdens.periodoFim}
                          onChange={handleFiltroOrdensChange}
                          className="filtro-input filtro-date"
                        />
                      </div>
                      <div className="ordens-filtro-actions">
                        <button
                          type="button"
                          className="btn-limpar-filtros"
                          onClick={() => {
                            setFiltrosOrdens(prev => ({
                              ...prev,
                              cliente: '',
                              fornecedor: '',
                              periodoInicio: '',
                              periodoFim: ''
                            }));
                            setPaginaAtualOrdens(1);
                          }}
                        >
                          Limpar Filtros
                        </button>
                      </div>
                      <span className="filtro-count">{ordensFiltradas.length} registro{ordensFiltradas.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Tabela ordens */}
                    <div className="section-card">
                      <div className="section-header">
                        <h2>📋 Ordens de Pagamento {filtrosOrdens.statusOrdem === 'Pendente' ? '- Pendentes' : filtrosOrdens.statusOrdem === 'Paga' ? '- Pagas' : ''}</h2>
                        <span className="badge">{ordensFiltradas.length} registros</span>
                      </div>
                      {ordensFiltradas.length === 0 ? (
                        <div className="empty-state">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <p>Nenhuma ordem de pagamento encontrada</p>
                          <span>{isAdminGerente ? 'Clique em "Criar Ordem de Pagamento" para começar' : 'Suas ordens de pagamento aparecerão aqui'}</span>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Nº Ordem</th>
                                <th>Cliente</th>
                                <th>Fornecedor / CNPJ</th>
                                <th>Fatura</th>
                                <th>Valor</th>
                                <th>Data Gerada</th>
                                <th>Data Pagamento</th>
                                <th>Status</th>
                                <th>Vinculada a</th>
                                <th>FinSystem</th>
                                <th>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ordensPaginadas.map(ordem => (
                                <tr key={ordem._id}>
                                  <td><strong>{ordem.codigo}</strong></td>
                                  <td>{ordem.cliente?.razaoSocial || '-'}</td>
                                  <td>
                                    <div className="cnpj-cell">
                                      <div>
                                        <span className="fornecedor-nome">{ordem.fornecedor?.razaoSocial || '-'}</span>
                                        <br />
                                        <small className="cnpj-text">{ordem.fornecedor?.cnpjCpf || ''}</small>
                                      </div>
                                      {ordem.fornecedor && (
                                        <button className="btn-bank-info" title="Ver Dados Bancários" onClick={(e) => { e.stopPropagation(); setBankInfoId(bankInfoId === ordem._id ? null : ordem._id); }}>
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                            <line x1="1" y1="10" x2="23" y2="10"></line>
                                          </svg>
                                        </button>
                                      )}
                                      {bankInfoId === ordem._id && ordem.fornecedor && (
                                        <div className="bank-info-overlay" onClick={() => setBankInfoId(null)}>
                                          <div className="bank-info-popup" onClick={(e) => e.stopPropagation()}>
                                            <div className="bank-info-header">
                                              <strong>Dados Bancários</strong>
                                              <button className="bank-info-close" onClick={() => setBankInfoId(null)}>×</button>
                                            </div>
                                            <div className="bank-info-body">
                                              <div className="bank-info-row"><span className="bank-info-label">Banco:</span><span className="bank-info-value">{ordem.fornecedor.banco || '—'}</span></div>
                                              <div className="bank-info-row"><span className="bank-info-label">Tipo Conta:</span><span className="bank-info-value">{ordem.fornecedor.tipoConta ? ordem.fornecedor.tipoConta.charAt(0).toUpperCase() + ordem.fornecedor.tipoConta.slice(1) : '—'}</span></div>
                                              <div className="bank-info-row"><span className="bank-info-label">Agência:</span><span className="bank-info-value">{ordem.fornecedor.agencia || '—'}</span></div>
                                              <div className="bank-info-row"><span className="bank-info-label">Conta:</span><span className="bank-info-value">{ordem.fornecedor.conta || '—'}</span></div>
                                              {ordem.fornecedor.chavePix && (
                                                <div className="bank-info-row bank-info-pix"><span className="bank-info-label">Chave PIX:</span><span className="bank-info-value">{ordem.fornecedor.chavePix}</span></div>
                                              )}
                                              {ordem.fornecedor.tipoChavePix && (
                                                <div className="bank-info-row"><span className="bank-info-label">Tipo Chave:</span><span className="bank-info-value">{ordem.fornecedor.tipoChavePix.toUpperCase()}</span></div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td>{ordem.fatura?.numeroFatura || ordem.faturaNumeroManual || '-'}</td>
                                  <td><strong className="valor-destaque">{formatarValor(ordem.valor)}</strong></td>
                                  <td>{formatarData(ordem.dataGeracao)}</td>
                                  <td>{formatarData(ordem.dataPagamento)}</td>
                                  <td><span className={`status-badge ${ordem.status === 'Paga' ? 'status-paga' : 'status-pendente'}`}>{ordem.status}</span></td>
                                  <td>{ordem.faturaVinculada ? <span className="fatura-vinculada">{ordem.faturaVinculada.numeroFatura}</span> : <span className="text-muted">-</span>}</td>
                                  <td>
                                    {ordem.finsystemSincronizado ? (
                                      <span className="status-badge status-paga" title={`ID: ${ordem.finsystemId}`}>✓ Sincronizado</span>
                                    ) : (
                                      <span className="status-badge status-pendente" title={ordem.finsystemErro || 'Não sincronizado'}>
                                        ⚠ Pendente
                                        {isAdmin && (
                                          <button className="btn-link btn-resync" title="Resincronizar" onClick={() => handleResincronizar(ordem._id)} style={{marginLeft: '4px', fontSize: '11px'}}>🔄</button>
                                        )}
                                      </span>
                                    )}
                                  </td>
                                  <td className="acoes-cell">
                                    {isAdminGerente && ordem.status === 'Pendente' && (
                                      <button className="btn-pagar" title="Registrar Pagamento" onClick={() => handleAbrirPagar(ordem)}>💰 Pagar</button>
                                    )}
                                    {ordem.status === 'Paga' && (ordem.temComprovante || ordem.comprovante) && (
                                      <button className="btn-link" title="Ver Comprovante" onClick={() => handleVerOrdemComprovante(ordem)}>📎 Comprovante</button>
                                    )}
                                    {isAdminGerente && ordem.status === 'Paga' && !ordem.faturaVinculada && (
                                      <button className="btn-vincular" title="Vincular a Fatura" onClick={() => handleAbrirVincular(ordem)}>🔗 Vincular</button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Paginação */}
                      {totalPaginasOrdens > 1 && (
                        <div className="paginacao">
                          <button className="pag-btn" disabled={paginaAtualOrdens === 1} onClick={() => setPaginaAtualOrdens(1)} title="Primeira">«</button>
                          <button className="pag-btn" disabled={paginaAtualOrdens === 1} onClick={() => setPaginaAtualOrdens(prev => prev - 1)} title="Anterior">‹</button>
                          {Array.from({ length: totalPaginasOrdens }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPaginasOrdens || Math.abs(p - paginaAtualOrdens) <= 2)
                            .reduce((acc, p, i, arr) => {
                              if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                              acc.push(p);
                              return acc;
                            }, [])
                            .map((item, i) =>
                              item === '...' ? (
                                <span key={`dots-${i}`} className="pag-dots">...</span>
                              ) : (
                                <button key={item} className={`pag-btn ${paginaAtualOrdens === item ? 'pag-ativo' : ''}`} onClick={() => setPaginaAtualOrdens(item)}>{item}</button>
                              )
                            )}
                          <button className="pag-btn" disabled={paginaAtualOrdens === totalPaginasOrdens} onClick={() => setPaginaAtualOrdens(prev => prev + 1)} title="Próxima">›</button>
                          <button className="pag-btn" disabled={paginaAtualOrdens === totalPaginasOrdens} onClick={() => setPaginaAtualOrdens(totalPaginasOrdens)} title="Última">»</button>
                          <span className="pag-info">Página {paginaAtualOrdens} de {totalPaginasOrdens}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ========== ABA: PAGAMENTOS ========== */}
                {abaAtiva === 'pagamentos' && (
                  <>
                    <div className="filtros-card">
                      <input type="text" name="busca" value={filtrosPagamentos.busca} onChange={handleFiltroPagamentosChange} placeholder="Buscar por nº fatura ou OS..." className="filtro-input" />
                    </div>
                    <div className="section-card">
                      <div className="section-header">
                        <h2>📋 Ordens de Serviço Pagas</h2>
                        <span className="badge">{pagamentosFiltrados.length} registros</span>
                      </div>
                      {pagamentosFiltrados.length === 0 ? (
                        <div className="empty-state">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="5" width="20" height="14" rx="2"/>
                            <line x1="2" y1="10" x2="22" y2="10"/>
                          </svg>
                          <p>Nenhum pagamento encontrado</p>
                          <span>Os pagamentos realizados aparecerão aqui</span>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Nº Fatura</th>
                                <th>Nº OS</th>
                                <th>{user?.role === 'cliente' ? 'Fornecedor' : 'Cliente/Fornecedor'}</th>
                                <th>Valor OS</th>
                                <th>Data Pagamento</th>
                                <th>Comprovante</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pagamentosFiltrados.map(p => (
                                <tr key={p._id}>
                                  <td><strong>{p.numeroFatura}</strong></td>
                                  <td>{p.ordemServico?.numeroOrdemServico || p.ordemServico?.codigo || '-'}</td>
                                  <td>{p.tipo === 'Fornecedor' ? p.fornecedor?.razaoSocial : p.cliente?.razaoSocial}</td>
                                  <td><strong className="valor-destaque">{formatarValor(p.valorOS)}</strong></td>
                                  <td>{formatarData(p.dataPagamento)}</td>
                                  <td>
                                    {p.comprovante ? (
                                      <button className="btn-link" onClick={() => handleVerComprovante(p)}>📎 Ver</button>
                                    ) : isAdmin ? (
                                      <button className="btn-link" onClick={() => handleVerComprovante(p)}>➕ Anexar</button>
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ========== ABA: ANTECIPAÇÕES ========== */}
                {abaAtiva === 'antecipacoes' && isFornecedor && (
                  <>
                    <div className="filtros-card">
                      <input type="text" name="busca" value={filtrosAntecipacoes.busca} onChange={handleFiltroAntecipacoesChange} placeholder="Buscar por fornecedor..." className="filtro-input" />
                    </div>
                    <div className="section-card">
                      <div className="section-header">
                        <h2>⚡ Histórico de Antecipações</h2>
                        <span className="badge">{antecipacoesFiltradas.length} registros</span>
                      </div>
                      {antecipacoesFiltradas.length === 0 ? (
                        <div className="empty-state">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                          <p>Nenhuma antecipação encontrada</p>
                          <span>Suas solicitações de antecipação aparecerão aqui</span>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Data Solicitação</th>
                                <th>Data Desejada</th>
                                <th>Valor Solicitado</th>
                                <th>Taxa</th>
                                <th>Desconto</th>
                                <th>Valor Recebido</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {antecipacoesFiltradas.map(a => (
                                <tr key={a._id}>
                                  <td>{formatarData(a.dataSolicitacao)}</td>
                                  <td>{formatarData(a.dataDesejadaRecebimento)}</td>
                                  <td>{formatarValor(a.valorSolicitado)}</td>
                                  <td>{a.taxaAplicada}%</td>
                                  <td className="valor-negativo">-{formatarValor(a.valorDesconto)}</td>
                                  <td><strong className="valor-destaque">{formatarValor(a.valorAReceber)}</strong></td>
                                  <td><span className={getStatusBadgeClass(a.status)}>{a.status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
      <Footer />

      {/* Modal de Comprovante (aba pagamentos) */}
      {showModalComprovante && (
        <div className="modal-overlay" onClick={() => setShowModalComprovante(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📎 Comprovante de Pagamento</h2>
              <button className="btn-close" onClick={() => setShowModalComprovante(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="comprovante-info">
                <p><strong>Fatura:</strong> {comprovanteAtual?.numeroFatura}</p>
                <p><strong>OS:</strong> {comprovanteAtual?.ordemServico?.numeroOrdemServico}</p>
                <p><strong>Valor:</strong> {formatarValor(comprovanteAtual?.valorOS)}</p>
              </div>
              {comprovanteAtual?.comprovante ? (
                <div className="comprovante-preview">
                  {comprovanteAtual.comprovante.startsWith('data:image') ? (
                    <img src={comprovanteAtual.comprovante} alt="Comprovante" />
                  ) : (
                    <a href={comprovanteAtual.comprovante} target="_blank" rel="noopener noreferrer" className="btn-secondary">📥 Baixar Comprovante</a>
                  )}
                </div>
              ) : isAdmin ? (
                <div className="upload-area">
                  <input type="file" id="comprovante-upload" accept="image/*,.pdf" onChange={handleUploadComprovante} disabled={uploadingComprovante} />
                  <label htmlFor="comprovante-upload" className="upload-label">
                    {uploadingComprovante ? 'Enviando...' : (
                      <>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <span>Clique para anexar comprovante</span>
                        <small>Imagem ou PDF até 5MB</small>
                      </>
                    )}
                  </label>
                </div>
              ) : (
                <div className="empty-state"><p>Comprovante não anexado</p></div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModalComprovante(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagar Ordem */}
      {showModalPagar && ordemPagar && (
        <div className="modal-overlay" onClick={() => !uploadingOrdemComprovante && setShowModalPagar(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💰 Registrar Pagamento</h2>
              <button className="btn-close" onClick={() => !uploadingOrdemComprovante && setShowModalPagar(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="comprovante-info">
                <p><strong>Ordem:</strong> {ordemPagar.numero}</p>
                <p><strong>Fornecedor:</strong> {ordemPagar.fornecedor?.razaoSocial}</p>
                <p><strong>CNPJ:</strong> {ordemPagar.fornecedor?.cnpjCpf}</p>
                <p><strong>Valor:</strong> {formatarValor(ordemPagar.valor)}</p>
              </div>
              <div className="upload-area">
                <input type="file" id="comprovante-pagar" accept="image/*,.pdf" onChange={handleUploadOrdemComprovante} disabled={uploadingOrdemComprovante} />
                <label htmlFor="comprovante-pagar" className="upload-label">
                  {uploadingOrdemComprovante ? 'Enviando comprovante e registrando pagamento...' : (
                    <>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <span>Anexe o comprovante para registrar o pagamento</span>
                      <small>PDF, JPG ou PNG até 5MB</small>
                    </>
                  )}
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => !uploadingOrdemComprovante && setShowModalPagar(false)} disabled={uploadingOrdemComprovante}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vincular Fatura */}
      {showModalVincular && ordemVincular && (
        <div className="modal-overlay" onClick={() => !loadingVincular && setShowModalVincular(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔗 Vincular Pagamento a Fatura</h2>
              <button className="btn-close" onClick={() => !loadingVincular && setShowModalVincular(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="comprovante-info">
                <p><strong>Ordem:</strong> {ordemVincular.numero}</p>
                <p><strong>Fornecedor:</strong> {ordemVincular.fornecedor?.razaoSocial}</p>
                <p><strong>Valor Pago:</strong> {formatarValor(ordemVincular.valor)}</p>
                <p><strong>Data Pagamento:</strong> {formatarData(ordemVincular.dataPagamento)}</p>
              </div>
              <div className="form-group">
                <label>Selecione a fatura para vincular:</label>
                {loadingVincular ? (
                  <p>Carregando faturas...</p>
                ) : faturasVincular.length === 0 ? (
                  <p className="text-muted">Nenhuma fatura em aberto para este fornecedor</p>
                ) : (
                  <select value={faturaVinculadaSelecionada} onChange={(e) => setFaturaVinculadaSelecionada(e.target.value)} className="form-input">
                    <option value="">Selecione a fatura...</option>
                    {(Array.isArray(faturasVincular) ? faturasVincular : []).map(f => (
                      <option key={f._id} value={f._id}>{f.numeroFatura} - {formatarValor(f.valorRestante || f.valorDevido)} ({f.statusFatura})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModalVincular(false)} disabled={loadingVincular}>Cancelar</button>
              <button className="btn-primary" onClick={handleVincularFatura} disabled={loadingVincular || !faturaVinculadaSelecionada}>{loadingVincular ? 'Vinculando...' : '✓ Vincular Fatura'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Comprovante Ordem */}
      {showModalOrdemComprovante && ordemComprovanteView && (
        <div className="modal-overlay" onClick={() => setShowModalOrdemComprovante(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📎 Comprovante de Pagamento</h2>
              <button className="btn-close" onClick={() => setShowModalOrdemComprovante(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="comprovante-info">
                <p><strong>Ordem:</strong> {ordemComprovanteView.numero}</p>
                <p><strong>Fornecedor:</strong> {ordemComprovanteView.fornecedor?.razaoSocial}</p>
                <p><strong>Valor:</strong> {formatarValor(ordemComprovanteView.valor)}</p>
                <p><strong>Data Pagamento:</strong> {formatarData(ordemComprovanteView.dataPagamento)}</p>
              </div>
              {ordemComprovanteView.comprovante && (
                <div className="comprovante-preview">
                  {ordemComprovanteView.comprovante.startsWith('data:image') ? (
                    <img src={ordemComprovanteView.comprovante} alt="Comprovante" />
                  ) : ordemComprovanteView.comprovante.startsWith('data:application/pdf') ? (
                    <div className="pdf-preview">
                      <a href={ordemComprovanteView.comprovante} download={`comprovante-${ordemComprovanteView.numero}.pdf`} className="btn-secondary">📥 Baixar Comprovante PDF</a>
                    </div>
                  ) : (
                    <a href={ordemComprovanteView.comprovante} target="_blank" rel="noopener noreferrer" className="btn-secondary">📥 Baixar Comprovante</a>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModalOrdemComprovante(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pagamentos;
