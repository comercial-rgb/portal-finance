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
  const [filtros, setFiltros] = useState({ busca: '', statusOrdem: '', dataInicio: '', dataFim: '' });
  const [pagePendentes, setPagePendentes] = useState(1);
  const [pagePagas, setPagePagas] = useState(1);
  const ordensPorPagina = 15;

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
  // Busca nos selects de Cliente e Fornecedor
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaFornecedor, setBuscaFornecedor] = useState('');
  const [showDropdownCliente, setShowDropdownCliente] = useState(false);
  const [showDropdownFornecedor, setShowDropdownFornecedor] = useState(false);

  // Formatação brasileira de valor (R$ 1.234,56)
  const [valorFormatado, setValorFormatado] = useState('');

  const formatarMoeda = (centavos) => {
    if (!centavos) return '';
    const valor = centavos / 100;
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleValorChange = (e) => {
    // Extrai apenas dígitos
    const apenasDigitos = e.target.value.replace(/\D/g, '');
    if (!apenasDigitos) {
      setValorFormatado('');
      setFormData(prev => ({ ...prev, valor: '' }));
      return;
    }
    const centavos = parseInt(apenasDigitos, 10);
    setValorFormatado(formatarMoeda(centavos));
    setFormData(prev => ({ ...prev, valor: centavos / 100 }));
  };

  const handleValorFocus = () => {};
  const handleValorBlur = () => {};

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

  // Modal editar ordem
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [ordemEditar, setOrdemEditar] = useState(null);
  const [editFormData, setEditFormData] = useState({ valor: '', dataGeracao: '', observacoes: '', faturaNumeroManual: '' });
  const [editValorFormatado, setEditValorFormatado] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Sincronização em lote FinSystem
  const [sincronizandoLote, setSincronizandoLote] = useState(false);

  // Bank info popup
  const [bankInfoId, setBankInfoId] = useState(null);

  const isAdmin = ['super_admin', 'admin'].includes(user?.role);
  const isAdminGerente = ['super_admin', 'admin', 'gerente'].includes(user?.role);
  const isFornecedor = user?.role === 'fornecedor';

  // === LOAD DATA ===
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        api.get('/pagamentos'),
        api.get('/pagamentos/antecipacoes'),
        api.get('/pagamentos/resumo'),
        api.get('/ordens-pagamento'),
        api.get('/ordens-pagamento/resumo')
      ]);

      if (results[0].status === 'fulfilled') setPagamentos(results[0].value.data || []);
      if (results[1].status === 'fulfilled') setAntecipacoes(results[1].value.data || []);
      if (results[2].status === 'fulfilled') setResumo(results[2].value.data);
      if (results[3].status === 'fulfilled') setOrdens(results[3].value.data?.data || []);
      if (results[4].status === 'fulfilled') setResumoOrdens(results[4].value.data?.data || { totalOrdens: 0, pendentes: 0, pagas: 0, valorTotalPendente: 0, valorTotalPago: 0 });
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClientesFornecedores = useCallback(async () => {
    try {
      const [clientesRes, fornecedoresRes] = await Promise.all([
        api.get('/clientes?limit=1000'),
        api.get('/fornecedores?limit=1000')
      ]);
      setClientes(clientesRes.data?.clientes || clientesRes.data?.data || []);
      setFornecedoresLista(fornecedoresRes.data?.fornecedores || fornecedoresRes.data?.data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes/fornecedores:', error);
      toast.error('Erro ao carregar clientes e fornecedores');
    }
  }, []);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadData();
  }, [loadData]);

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

  // === EDITAR ORDEM ===
  const handleAbrirEditar = (ordem) => {
    setOrdemEditar(ordem);
    const centavos = Math.round((ordem.valor || 0) * 100);
    setEditFormData({
      valor: ordem.valor || '',
      dataGeracao: ordem.dataGeracao ? new Date(ordem.dataGeracao).toISOString().split('T')[0] : '',
      observacoes: ordem.observacoes || '',
      faturaNumeroManual: ordem.faturaNumeroManual || ''
    });
    setEditValorFormatado(centavos ? formatarMoeda(centavos) : '');
    setShowModalEditar(true);
  };

  const handleEditValorChange = (e) => {
    const apenasDigitos = e.target.value.replace(/\D/g, '');
    if (!apenasDigitos) {
      setEditValorFormatado('');
      setEditFormData(prev => ({ ...prev, valor: '' }));
      return;
    }
    const centavos = parseInt(apenasDigitos, 10);
    setEditValorFormatado(formatarMoeda(centavos));
    setEditFormData(prev => ({ ...prev, valor: centavos / 100 }));
  };

  const handleSalvarEdicao = async () => {
    if (!editFormData.valor || editFormData.valor <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }
    try {
      setEditLoading(true);
      await api.put(`/ordens-pagamento/${ordemEditar._id}`, {
        valor: editFormData.valor,
        dataGeracao: editFormData.dataGeracao,
        observacoes: editFormData.observacoes,
        faturaNumeroManual: editFormData.faturaNumeroManual
      });
      toast.success('Ordem atualizada com sucesso!');
      setShowModalEditar(false);
      setOrdemEditar(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar ordem');
    } finally {
      setEditLoading(false);
    }
  };

  // === RELATÓRIO / EXPORTAÇÃO ===
  const exportarRelatorio = (formato) => {
    const dados = ordensFiltradas;
    if (dados.length === 0) { toast.warn('Nenhuma ordem para exportar'); return; }

    if (formato === 'csv') {
      const header = ['Nº Ordem', 'Cliente', 'Fornecedor', 'CNPJ', 'Fatura', 'Valor', 'Data Geração', 'Data Pagamento', 'Status', 'Vinculada a'];
      const rows = dados.map(o => [
        o.codigo,
        o.cliente?.razaoSocial || '-',
        o.fornecedor?.razaoSocial || '-',
        o.fornecedor?.cnpjCpf || '-',
        o.fatura?.numeroFatura || o.faturaNumeroManual || '-',
        o.valor?.toFixed(2).replace('.', ','),
        o.dataGeracao ? new Date(o.dataGeracao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
        o.dataPagamento ? new Date(o.dataPagamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
        o.status,
        o.faturaVinculada?.numeroFatura || '-'
      ]);
      const csvContent = [header, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n');
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_ordens_pagamento_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Relatório CSV exportado com ${dados.length} registros`);
    } else if (formato === 'pdf') {
      const printWindow = window.open('', '_blank');
      const totalValor = dados.reduce((s, o) => s + (o.valor || 0), 0);
      const totalPendente = dados.filter(o => o.status === 'Pendente').reduce((s, o) => s + (o.valor || 0), 0);
      const totalPago = dados.filter(o => o.status === 'Paga').reduce((s, o) => s + (o.valor || 0), 0);
      printWindow.document.write(`
        <html><head><title>Relatório Ordens de Pagamento</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #003366; font-size: 18px; border-bottom: 2px solid #003366; padding-bottom: 8px; }
          .info { display: flex; gap: 20px; margin: 12px 0 20px; font-size: 12px; }
          .info-card { background: #f0f4f8; padding: 8px 14px; border-radius: 6px; }
          .info-card strong { color: #003366; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #003366; color: white; padding: 8px 6px; text-align: left; }
          td { padding: 6px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9f9f9; }
          .status-paga { color: #27ae60; font-weight: bold; }
          .status-pendente { color: #e67e22; font-weight: bold; }
          .footer { margin-top: 20px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
          @media print { body { padding: 0; } }
        </style></head><body>
        <h1>📋 Relatório de Ordens de Pagamento</h1>
        <div class="info">
          <div class="info-card"><strong>Total:</strong> ${dados.length} ordens</div>
          <div class="info-card"><strong>Valor Total:</strong> ${formatarValor(totalValor)}</div>
          <div class="info-card"><strong>Pendente:</strong> ${formatarValor(totalPendente)}</div>
          <div class="info-card"><strong>Pago:</strong> ${formatarValor(totalPago)}</div>
          <div class="info-card"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
        <table>
          <thead><tr><th>Nº</th><th>Cliente</th><th>Fornecedor</th><th>CNPJ</th><th>Fatura</th><th>Valor</th><th>Geração</th><th>Pagamento</th><th>Status</th></tr></thead>
          <tbody>
          ${dados.map(o => `<tr>
            <td>${o.codigo}</td>
            <td>${o.cliente?.razaoSocial || '-'}</td>
            <td>${o.fornecedor?.razaoSocial || '-'}</td>
            <td>${o.fornecedor?.cnpjCpf || '-'}</td>
            <td>${o.fatura?.numeroFatura || o.faturaNumeroManual || '-'}</td>
            <td>${formatarValor(o.valor)}</td>
            <td>${o.dataGeracao ? new Date(o.dataGeracao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
            <td>${o.dataPagamento ? new Date(o.dataPagamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
            <td class="${o.status === 'Paga' ? 'status-paga' : 'status-pendente'}">${o.status}</td>
          </tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">Portal Finance — Relatório gerado em ${new Date().toLocaleString('pt-BR')}</div>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
      toast.success('Relatório PDF aberto para impressão');
    }
  };

  // === PAGAMENTOS (aba existente) ===
  const handleFiltroChange = (e) => {
    setFiltros(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const pagamentosFiltrados = pagamentos.filter(p => {
    const matchBusca = !filtros.busca ||
      p.numeroFatura?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      p.ordemServico?.numeroOrdemServico?.toLowerCase().includes(filtros.busca.toLowerCase());
    return matchBusca;
  });

  const antecipacoesFiltradas = antecipacoes.filter(a => {
    const matchBusca = !filtros.busca ||
      a.fornecedor?.razaoSocial?.toLowerCase().includes(filtros.busca.toLowerCase());
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
      setValorFormatado('');
      setBuscaCliente('');
      setBuscaFornecedor('');
      setUsarFaturaManual(false);
      setFaturasAbertasFornecedor([]);
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

  const handleVerOrdemComprovante = (ordem) => { setOrdemComprovanteView(ordem); setShowModalOrdemComprovante(true); };

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

  // Ignorar sincronização FinSystem
  const handleIgnorarSync = async (ordemId) => {
    if (!window.confirm('Deseja ignorar a sincronização desta ordem com o FinSystem? Ela não será mais solicitada.')) return;
    try {
      const res = await api.post(`/ordens-pagamento/${ordemId}/ignorar-sync`);
      toast.success(res.data.message || 'Sincronização ignorada');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao ignorar sincronização');
    }
  };

  // Sincronizar em lote com FinSystem
  const handleSincronizarLote = async () => {
    const naoSincronizadas = ordens.filter(o => !o.finsystemSincronizado && !o.finsystemIgnorado).length;
    if (naoSincronizadas === 0) {
      toast.info('Todas as ordens já estão sincronizadas com o FinSystem');
      return;
    }
    if (!window.confirm(`Deseja sincronizar ${naoSincronizadas} ordem(ns) pendente(s) com o FinSystem?`)) return;
    try {
      setSincronizandoLote(true);
      const res = await api.post('/ordens-pagamento/sincronizar-lote');
      const { resultados } = res.data;
      if (resultados.falha === 0) {
        toast.success(`${resultados.sucesso} ordem(ns) sincronizada(s) com sucesso!`);
      } else {
        toast.warning(`${resultados.sucesso} sincronizada(s), ${resultados.falha} com falha`);
      }
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro na sincronização em lote');
    } finally {
      setSincronizandoLote(false);
    }
  };

  // Filtros ordens
  const ordensFiltradas = ordens.filter(o => {
    const matchBusca = !filtros.busca ||
      o.codigo?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      o.fornecedor?.razaoSocial?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      o.fornecedor?.nomeFantasia?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      o.fornecedor?.cnpjCpf?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      o.cliente?.razaoSocial?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      o.fatura?.numeroFatura?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      o.faturaNumeroManual?.toLowerCase().includes(filtros.busca.toLowerCase());
    const matchStatus = !filtros.statusOrdem || o.status === filtros.statusOrdem;
    const matchDataInicio = !filtros.dataInicio || new Date(o.dataGeracao) >= new Date(filtros.dataInicio);
    const matchDataFim = !filtros.dataFim || new Date(o.dataGeracao) <= new Date(filtros.dataFim + 'T23:59:59');
    return matchBusca && matchStatus && matchDataInicio && matchDataFim;
  }).sort((a, b) => (a.valor || 0) - (b.valor || 0));

  // Separar ordens pendentes e pagas do total filtrado
  const todasPendentes = ordensFiltradas.filter(o => o.status === 'Pendente');
  const todasPagas = ordensFiltradas.filter(o => o.status === 'Paga');

  // Paginação independente por seção
  const totalPagesPendentes = Math.ceil(todasPendentes.length / ordensPorPagina);
  const totalPagesPagas = Math.ceil(todasPagas.length / ordensPorPagina);
  const ordensPendentes = todasPendentes.slice((pagePendentes - 1) * ordensPorPagina, pagePendentes * ordensPorPagina);
  const ordensPagas = todasPagas.slice((pagePagas - 1) * ordensPorPagina, pagePagas * ordensPorPagina);

  // Helper para renderizar paginação
  const renderPaginacao = (currentPage, totalPagesSection, totalItems, itemsOnPage, setPage) => {
    if (totalPagesSection <= 1) return null;
    return (
      <div className="pagination-wrapper">
        <span className="pagination-total">
          Exibindo {itemsOnPage} de {totalItems} registro{totalItems !== 1 ? 's' : ''}
        </span>
        <div className="pagination">
          <button className="btn-pagination" onClick={() => setPage(1)} disabled={currentPage === 1} title="Primeira página">«</button>
          <button className="btn-pagination" onClick={() => setPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>‹ Anterior</button>
          {(() => {
            const pages = [];
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPagesSection, currentPage + 2);
            if (currentPage <= 3) endPage = Math.min(5, totalPagesSection);
            if (currentPage >= totalPagesSection - 2) startPage = Math.max(1, totalPagesSection - 4);
            for (let i = startPage; i <= endPage; i++) {
              pages.push(
                <button key={i} className={`btn-pagination-number ${currentPage === i ? 'active' : ''}`} onClick={() => setPage(i)}>{i}</button>
              );
            }
            return pages;
          })()}
          <button className="btn-pagination" onClick={() => setPage(prev => Math.min(prev + 1, totalPagesSection))} disabled={currentPage === totalPagesSection}>Próxima ›</button>
          <button className="btn-pagination" onClick={() => setPage(totalPagesSection)} disabled={currentPage === totalPagesSection} title="Última página">»</button>
        </div>
      </div>
    );
  };

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
                <div style={{ display: 'flex', gap: '10px' }}>
                  {isAdmin && ordens.some(o => !o.finsystemSincronizado && !o.finsystemIgnorado) && (
                    <button
                      className="btn-secondary"
                      onClick={handleSincronizarLote}
                      disabled={sincronizandoLote}
                      title="Enviar ordens pendentes para o FinSystem"
                    >
                      {sincronizandoLote ? '⏳ Sincronizando...' : `🔄 Sincronizar FinSystem (${ordens.filter(o => !o.finsystemSincronizado && !o.finsystemIgnorado).length})`}
                    </button>
                  )}
                  <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? '✕ Fechar' : '+ Criar Ordem de Pagamento'}
                  </button>
                </div>
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
                            <label htmlFor="cliente">Cliente *</label>
                            <div className="searchable-select">
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Buscar cliente por nome ou CNPJ..."
                                value={formData.cliente ? (clientes.find(c => c._id === formData.cliente)?.razaoSocial || buscaCliente) : buscaCliente}
                                onChange={(e) => {
                                  setBuscaCliente(e.target.value);
                                  setShowDropdownCliente(true);
                                  if (formData.cliente) setFormData(prev => ({ ...prev, cliente: '' }));
                                }}
                                onFocus={() => setShowDropdownCliente(true)}
                                onBlur={() => setTimeout(() => setShowDropdownCliente(false), 200)}
                              />
                              {formData.cliente && (
                                <button type="button" className="clear-select" onClick={() => { setFormData(prev => ({ ...prev, cliente: '' })); setBuscaCliente(''); }}>✕</button>
                              )}
                              {showDropdownCliente && (
                                <ul className="select-dropdown">
                                  {clientes
                                    .filter(c => {
                                      const termo = buscaCliente.toLowerCase();
                                      return !termo || c.razaoSocial?.toLowerCase().includes(termo) || c.cnpj?.includes(termo);
                                    })
                                    .map(c => (
                                      <li key={c._id} onMouseDown={() => {
                                        setFormData(prev => ({ ...prev, cliente: c._id }));
                                        setBuscaCliente('');
                                        setShowDropdownCliente(false);
                                      }}>
                                        {c.razaoSocial} {c.cnpj ? <span className="select-hint">({c.cnpj})</span> : ''}
                                      </li>
                                    ))}
                                  {clientes.filter(c => { const t = buscaCliente.toLowerCase(); return !t || c.razaoSocial?.toLowerCase().includes(t) || c.cnpj?.includes(t); }).length === 0 && (
                                    <li className="select-empty">Nenhum cliente encontrado</li>
                                  )}
                                </ul>
                              )}
                            </div>
                            <input type="hidden" name="cliente" value={formData.cliente} required />
                          </div>
                          <div className="form-group">
                            <label htmlFor="fornecedor">Fornecedor *</label>
                            <div className="searchable-select">
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Buscar fornecedor por nome, nome fantasia ou CNPJ..."
                                value={formData.fornecedor ? (fornecedoresLista.find(f => f._id === formData.fornecedor)?.razaoSocial || buscaFornecedor) : buscaFornecedor}
                                onChange={(e) => {
                                  setBuscaFornecedor(e.target.value);
                                  setShowDropdownFornecedor(true);
                                  if (formData.fornecedor) setFormData(prev => ({ ...prev, fornecedor: '', fatura: '' }));
                                }}
                                onFocus={() => setShowDropdownFornecedor(true)}
                                onBlur={() => setTimeout(() => setShowDropdownFornecedor(false), 200)}
                              />
                              {formData.fornecedor && (
                                <button type="button" className="clear-select" onClick={() => { setFormData(prev => ({ ...prev, fornecedor: '', fatura: '' })); setBuscaFornecedor(''); setFaturasAbertasFornecedor([]); }}>✕</button>
                              )}
                              {showDropdownFornecedor && (
                                <ul className="select-dropdown">
                                  {fornecedoresLista
                                    .filter(f => {
                                      const termo = buscaFornecedor.toLowerCase();
                                      return !termo || f.razaoSocial?.toLowerCase().includes(termo) || f.nomeFantasia?.toLowerCase().includes(termo) || f.cnpjCpf?.includes(termo);
                                    })
                                    .map(f => (
                                      <li key={f._id} onMouseDown={() => {
                                        setFormData(prev => ({ ...prev, fornecedor: f._id, fatura: '' }));
                                        setBuscaFornecedor('');
                                        setShowDropdownFornecedor(false);
                                        carregarFaturasFornecedor(f._id);
                                      }}>
                                        {f.razaoSocial} {f.nomeFantasia ? <span className="select-hint">({f.nomeFantasia})</span> : ''} <span className="select-hint">({f.cnpjCpf})</span>
                                      </li>
                                    ))}
                                  {fornecedoresLista.filter(f => { const t = buscaFornecedor.toLowerCase(); return !t || f.razaoSocial?.toLowerCase().includes(t) || f.nomeFantasia?.toLowerCase().includes(t) || f.cnpjCpf?.includes(t); }).length === 0 && (
                                    <li className="select-empty">Nenhum fornecedor encontrado</li>
                                  )}
                                </ul>
                              )}
                            </div>
                            <input type="hidden" name="fornecedor" value={formData.fornecedor} required />
                          </div>
                          <div className="form-group">
                            <div className="fatura-label-row">
                              <label>Fatura</label>
                              <label className="toggle-label">
                                <input type="checkbox" checked={usarFaturaManual} onChange={(e) => { setUsarFaturaManual(e.target.checked); setFormData(prev => ({ ...prev, fatura: '', faturaNumeroManual: '' })); }} />
                                <span>Manual</span>
                              </label>
                            </div>
                            {usarFaturaManual ? (
                              <input type="text" name="faturaNumeroManual" value={formData.faturaNumeroManual} onChange={handleFormChange} placeholder="Número da fatura manual..." className="form-input" />
                            ) : (
                              <select name="fatura" value={formData.fatura} onChange={handleFormChange} className="form-input" disabled={!formData.fornecedor || loadingFaturas}>
                                <option value="">
                                  {!formData.fornecedor ? 'Selecione um fornecedor primeiro...' : loadingFaturas ? 'Carregando faturas...' : faturasAbertasFornecedor.length === 0 ? 'Nenhuma fatura em aberto' : 'Selecione a fatura...'}
                                </option>
                                {faturasAbertasFornecedor.map(f => (
                                  <option key={f._id} value={f._id}>{f.numeroFatura} - {formatarValor(f.valorRestante || f.valorDevido)} ({f.statusFatura})</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="form-group">
                            <label htmlFor="valor">Valor *</label>
                            <div className="valor-input-wrapper">
                              <span className="valor-prefix">R$</span>
                              <input type="text" id="valor" name="valor" value={valorFormatado} onChange={handleValorChange} onFocus={handleValorFocus} onBlur={handleValorBlur} placeholder="0,00" required className="form-input valor-input" inputMode="decimal" />
                            </div>
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

                    {/* Filtros ordens */}
                    <div className="pag-filtros-card">
                      <div className="filtros-row">
                        <input type="text" name="busca" value={filtros.busca} onChange={handleFiltroChange} placeholder="Buscar por nº ordem, fornecedor, CNPJ, cliente, fatura..." className="filtro-input" />
                        <select value={filtros.statusOrdem} onChange={(e) => { setFiltros(prev => ({ ...prev, statusOrdem: e.target.value })); setPagePendentes(1); setPagePagas(1); }} className="filtro-select">
                          <option value="">Todos os status</option>
                          <option value="Pendente">Pendente</option>
                          <option value="Paga">Paga</option>
                        </select>
                        <input type="date" name="dataInicio" value={filtros.dataInicio} onChange={(e) => { handleFiltroChange(e); setPagePendentes(1); setPagePagas(1); }} className="filtro-input filtro-date" title="Data início" />
                        <input type="date" name="dataFim" value={filtros.dataFim} onChange={(e) => { handleFiltroChange(e); setPagePendentes(1); setPagePagas(1); }} className="filtro-input filtro-date" title="Data fim" />
                        <button className="btn-limpar-filtros" onClick={() => { setFiltros({ busca: '', statusOrdem: '', dataInicio: '', dataFim: '' }); setPagePendentes(1); setPagePagas(1); }}>🗑️ Limpar</button>
                      </div>
                      <div className="filtros-acoes">
                        <button className="btn-export btn-csv" onClick={() => exportarRelatorio('csv')} title="Exportar CSV (Excel)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                          Exportar CSV
                        </button>
                        <button className="btn-export btn-pdf" onClick={() => exportarRelatorio('pdf')} title="Gerar Relatório PDF">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2"/><rect x="7" y="13" width="10" height="8" rx="1"/><path d="M7 3h10v4H7z"/></svg>
                          Relatório PDF
                        </button>
                      </div>
                    </div>

                    {/* Tabela ordens PENDENTES */}
                    {(!filtros.statusOrdem || filtros.statusOrdem === 'Pendente') && (
                    <div className="section-card">
                      <div className="section-header">
                        <h2>📋 Ordens de Pagamento — Pendentes</h2>
                        <span className="badge badge-pendente">{todasPendentes.length} registros</span>
                      </div>
                      {ordensPendentes.length === 0 ? (
                        <div className="empty-state">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <p>Nenhuma ordem pendente encontrada</p>
                          <span>{isAdminGerente ? 'Clique em "Criar Ordem de Pagamento" para começar' : 'Suas ordens pendentes aparecerão aqui'}</span>
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
                                <th>Status</th>
                                <th>FinSystem</th>
                                <th>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ordensPendentes.map(ordem => (
                                <tr key={ordem._id}>
                                  <td><span className="numero-ordem">{ordem.codigo}</span></td>
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
                                    </div>
                                  </td>
                                  <td>{ordem.fatura?.numeroFatura || ordem.faturaNumeroManual || '-'}</td>
                                  <td><strong className="valor-destaque">{formatarValor(ordem.valor)}</strong></td>
                                  <td>{formatarData(ordem.dataGeracao)}</td>
                                  <td><span className="status-badge status-pendente">{ordem.status}</span></td>
                                  <td>
                                    {ordem.finsystemSincronizado ? (
                                      <span className="status-badge status-paga" title={ordem.finsystemIgnorado ? 'Ignorado' : `ID: ${ordem.finsystemId}`}>
                                        {ordem.finsystemIgnorado ? '⊘ Ignorado' : '✓ Sync'}
                                      </span>
                                    ) : (
                                      <div className="finsystem-actions">
                                        <span className="status-badge status-pendente" title={ordem.finsystemErro || 'Não sincronizado'}>
                                          ⚠ Pendente
                                        </span>
                                        {isAdmin && (
                                          <div className="finsystem-btns">
                                            <button className="btn-link btn-resync" title="Resincronizar" onClick={() => handleResincronizar(ordem._id)} style={{fontSize: '11px'}}>🔄</button>
                                            <button className="btn-link btn-skip-sync" title="Não sincronizar" onClick={() => handleIgnorarSync(ordem._id)} style={{fontSize: '11px'}}>⊘</button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="acoes-cell">
                                    {isAdminGerente && (
                                      <button className="btn-editar" title="Editar Ordem" onClick={() => handleAbrirEditar(ordem)}>✏️ Editar</button>
                                    )}
                                    {isAdminGerente && (
                                      <button className="btn-pagar" title="Registrar Pagamento" onClick={() => handleAbrirPagar(ordem)}>💰 Pagar</button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {renderPaginacao(pagePendentes, totalPagesPendentes, todasPendentes.length, ordensPendentes.length, setPagePendentes)}
                    </div>
                    )}

                    {/* Tabela ordens PAGAS */}
                    {(!filtros.statusOrdem || filtros.statusOrdem === 'Paga') && (
                    <div className="section-card">
                      <div className="section-header">
                        <h2>✅ Ordens de Pagamento — Pagas</h2>
                        <span className="badge badge-paga">{todasPagas.length} registros</span>
                      </div>
                      {ordensPagas.length === 0 ? (
                        <div className="empty-state">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                          <p>Nenhuma ordem paga encontrada</p>
                          <span>Ordens pagas aparecerão aqui</span>
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
                              {ordensPagas.map(ordem => (
                                <tr key={ordem._id}>
                                  <td><span className="numero-ordem">{ordem.codigo}</span></td>
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
                                    </div>
                                  </td>
                                  <td>{ordem.fatura?.numeroFatura || ordem.faturaNumeroManual || '-'}</td>
                                  <td><strong className="valor-destaque">{formatarValor(ordem.valor)}</strong></td>
                                  <td>{formatarData(ordem.dataGeracao)}</td>
                                  <td>{formatarData(ordem.dataPagamento)}</td>
                                  <td><span className="status-badge status-paga">{ordem.status}</span></td>
                                  <td>{ordem.faturaVinculada ? <span className="fatura-vinculada">{ordem.faturaVinculada.numeroFatura}</span> : <span className="text-muted">-</span>}</td>
                                  <td>
                                    {ordem.finsystemSincronizado ? (
                                      <span className="status-badge status-paga" title={ordem.finsystemIgnorado ? 'Ignorado' : `ID: ${ordem.finsystemId}`}>
                                        {ordem.finsystemIgnorado ? '⊘ Ignorado' : '✓ Sync'}
                                      </span>
                                    ) : (
                                      <div className="finsystem-actions">
                                        <span className="status-badge status-pendente" title={ordem.finsystemErro || 'Não sincronizado'}>
                                          ⚠ Pendente
                                        </span>
                                        {isAdmin && (
                                          <div className="finsystem-btns">
                                            <button className="btn-link btn-resync" title="Resincronizar" onClick={() => handleResincronizar(ordem._id)} style={{fontSize: '11px'}}>🔄</button>
                                            <button className="btn-link btn-skip-sync" title="Não sincronizar" onClick={() => handleIgnorarSync(ordem._id)} style={{fontSize: '11px'}}>⊘</button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="acoes-cell">
                                    {isAdminGerente && (
                                      <button className="btn-editar" title="Editar Ordem" onClick={() => handleAbrirEditar(ordem)}>✏️ Editar</button>
                                    )}
                                    {ordem.comprovante && (
                                      <button className="btn-link" title="Ver Comprovante" onClick={() => handleVerOrdemComprovante(ordem)}>📎 Comprovante</button>
                                    )}
                                    {isAdminGerente && !ordem.faturaVinculada && (
                                      <button className="btn-vincular" title="Vincular a Fatura" onClick={() => handleAbrirVincular(ordem)}>🔗 Vincular</button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {renderPaginacao(pagePagas, totalPagesPagas, todasPagas.length, ordensPagas.length, setPagePagas)}
                    </div>
                    )}

                    {/* Modal Dados Bancários (fora da tabela) */}
                    {bankInfoId && (() => {
                      const ordemBanco = ordensFiltradas.find(o => o._id === bankInfoId);
                      if (!ordemBanco?.fornecedor) return null;
                      const f = ordemBanco.fornecedor;
                      return (
                        <>
                          <div className="bank-info-overlay" onClick={() => setBankInfoId(null)}></div>
                          <div className="bank-info-popup" onClick={(e) => e.stopPropagation()}>
                            <div className="bank-info-header">
                              <strong>🏦 Dados Bancários — {f.razaoSocial}</strong>
                              <button className="bank-info-close" onClick={() => setBankInfoId(null)}>×</button>
                            </div>
                            <div className="bank-info-body">
                              <div className="bank-info-row"><span className="bank-info-label">CNPJ:</span><span className="bank-info-value">{f.cnpjCpf || '—'}</span></div>
                              <div className="bank-info-row"><span className="bank-info-label">Banco:</span><span className="bank-info-value">{f.banco || '—'}</span></div>
                              <div className="bank-info-row"><span className="bank-info-label">Tipo Conta:</span><span className="bank-info-value">{f.tipoConta ? f.tipoConta.charAt(0).toUpperCase() + f.tipoConta.slice(1) : '—'}</span></div>
                              <div className="bank-info-row"><span className="bank-info-label">Agência:</span><span className="bank-info-value">{f.agencia || '—'}</span></div>
                              <div className="bank-info-row"><span className="bank-info-label">Conta:</span><span className="bank-info-value">{f.conta || '—'}</span></div>
                              {f.chavePix && (
                                <div className="bank-info-row bank-info-pix"><span className="bank-info-label">Chave PIX:</span><span className="bank-info-value">{f.chavePix}</span></div>
                              )}
                              {f.tipoChavePix && (
                                <div className="bank-info-row"><span className="bank-info-label">Tipo Chave:</span><span className="bank-info-value">{f.tipoChavePix.toUpperCase()}</span></div>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* Modal Editar Ordem */}
                    {showModalEditar && ordemEditar && (
                      <div className="modal-overlay" onClick={() => setShowModalEditar(false)}>
                        <div className="modal-content modal-editar" onClick={(e) => e.stopPropagation()}>
                          <div className="modal-header">
                            <h3>✏️ Editar Ordem {ordemEditar.codigo}</h3>
                            <button className="modal-close" onClick={() => setShowModalEditar(false)}>×</button>
                          </div>
                          <div className="modal-body">
                            <div className="edit-form-grid">
                              <div className="form-group">
                                <label>Cliente</label>
                                <input type="text" className="form-input" value={ordemEditar.cliente?.razaoSocial || '-'} disabled />
                              </div>
                              <div className="form-group">
                                <label>Fornecedor</label>
                                <input type="text" className="form-input" value={ordemEditar.fornecedor?.razaoSocial || '-'} disabled />
                              </div>
                              <div className="form-group">
                                <label>Valor *</label>
                                <div className="valor-input-wrapper">
                                  <span className="valor-prefix">R$</span>
                                  <input type="text" value={editValorFormatado} onChange={handleEditValorChange} placeholder="0,00" className="form-input valor-input" inputMode="decimal" />
                                </div>
                              </div>
                              <div className="form-group">
                                <label>Data Geração</label>
                                <input type="date" value={editFormData.dataGeracao} onChange={(e) => setEditFormData(prev => ({ ...prev, dataGeracao: e.target.value }))} className="form-input" />
                              </div>
                              <div className="form-group">
                                <label>Nº Fatura Manual</label>
                                <input type="text" value={editFormData.faturaNumeroManual} onChange={(e) => setEditFormData(prev => ({ ...prev, faturaNumeroManual: e.target.value }))} placeholder="Número da fatura..." className="form-input" />
                              </div>
                              <div className="form-group">
                                <label>Observações</label>
                                <textarea value={editFormData.observacoes} onChange={(e) => setEditFormData(prev => ({ ...prev, observacoes: e.target.value }))} placeholder="Observações..." className="form-input form-textarea" rows="2" />
                              </div>
                            </div>
                          </div>
                          <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModalEditar(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleSalvarEdicao} disabled={editLoading}>{editLoading ? 'Salvando...' : '✓ Salvar Alterações'}</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ========== ABA: PAGAMENTOS ========== */}
                {abaAtiva === 'pagamentos' && (
                  <>
                    <div className="pag-filtros-card">
                      <input type="text" name="busca" value={filtros.busca} onChange={handleFiltroChange} placeholder="Buscar por nº fatura ou OS..." className="filtro-input" />
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
                    <div className="pag-filtros-card">
                      <input type="text" name="busca" value={filtros.busca} onChange={handleFiltroChange} placeholder="Buscar por fornecedor..." className="filtro-input" />
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
                <p><strong>Ordem:</strong> {ordemPagar.codigo}</p>
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
                <p><strong>Ordem:</strong> {ordemVincular.codigo}</p>
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
                    {faturasVincular.map(f => (
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
                <p><strong>Ordem:</strong> {ordemComprovanteView.codigo}</p>
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
                      <a href={ordemComprovanteView.comprovante} download={`comprovante-${ordemComprovanteView.codigo}.pdf`} className="btn-secondary">📥 Baixar Comprovante PDF</a>
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
