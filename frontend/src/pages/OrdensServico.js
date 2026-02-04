import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './OrdensServico.css';

function OrdensServico() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ordensServico, setOrdensServico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrdens, setSelectedOrdens] = useState([]);
  const [filtros, setFiltros] = useState({
    codigo: '',
    cliente: '',
    fornecedor: '',
    tipo: '',
    tipoServico: '',
    centroCusto: '',
    subunidade: '',
    status: '',
    dataInicio: '',
    dataFim: ''
  });
  const [clientes, setClientes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [tiposServico, setTiposServico] = useState([]);
  const [centrosCustoDisponiveis, setCentrosCustoDisponiveis] = useState([]);
  const [subunidadesDisponiveis, setSubunidadesDisponiveis] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [importando, setImportando] = useState(false);
  const [resultadosImportacao, setResultadosImportacao] = useState(null);

  const ordensPorPagina = 15;

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadDadosFiltros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadOrdensServico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadDadosFiltros = async () => {
    try {
      const [clientesRes, fornecedoresRes, tiposRes, tiposServicoRes, ordensRes] = await Promise.all([
        api.get('/clientes?limit=1000'),
        api.get('/fornecedores?limit=1000'),
        api.get('/tipo-servicos/tipos'),
        api.get('/tipo-servicos/tipos-servico-solicitado'),
        api.get('/ordens-servico?limit=1000')
      ]);

      const clientesData = clientesRes.data.clientes || clientesRes.data;
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      console.log('📋 Clientes carregados para filtro:', clientesData.length);
      console.log('Amostra de clientes:', clientesData.slice(0, 3).map(c => c.razaoSocial || c.nomeFantasia));

      const fornecedoresData = fornecedoresRes.data.fornecedores || fornecedoresRes.data;
      setFornecedores(Array.isArray(fornecedoresData) ? fornecedoresData : []);

      setTipos(Array.isArray(tiposRes.data) ? tiposRes.data : []);
      setTiposServico(Array.isArray(tiposServicoRes.data) ? tiposServicoRes.data : []);

      // Extrair centros de custo e subunidades únicos
      const ordensData = ordensRes.data.ordensServico || ordensRes.data;
      const ordensArray = Array.isArray(ordensData) ? ordensData : [];
      const centrosCusto = [...new Set(ordensArray.map(o => o.centroCusto).filter(Boolean))];
      const subunidades = [...new Set(ordensArray.map(o => o.subunidade).filter(Boolean))];
      setCentrosCustoDisponiveis(centrosCusto);
      setSubunidadesDisponiveis(subunidades);

      loadOrdensServico();
    } catch (error) {
      console.error('Erro ao carregar dados dos filtros:', error);
      loadOrdensServico();
    }
  };

  const loadOrdensServico = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: ordensPorPagina
      };

      // Adicionar filtros se preenchidos
      if (filtros.codigo) params.codigo = filtros.codigo;
      if (filtros.cliente) params.cliente = filtros.cliente;
      if (filtros.fornecedor) params.fornecedor = filtros.fornecedor;
      if (filtros.status) params.status = filtros.status;

      const response = await api.get('/ordens-servico', { params });
      let ordensData = response.data.ordensServico || response.data;
      ordensData = Array.isArray(ordensData) ? ordensData : [];

      // Aplicar filtros adicionais no frontend
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
          new Date(o.dataReferencia || o.createdAt) >= new Date(filtros.dataInicio)
        );
      }
      if (filtros.dataFim) {
        ordensData = ordensData.filter(o => 
          new Date(o.dataReferencia || o.createdAt) <= new Date(filtros.dataFim + 'T23:59:59')
        );
      }

      setOrdensServico(ordensData);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      toast.error('Erro ao carregar ordens de serviço');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros({
      ...filtros,
      [name]: value
    });
  };

  const handleFiltrar = () => {
    setCurrentPage(1);
    loadOrdensServico();
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
      status: '',
      dataInicio: '',
      dataFim: ''
    });
    setCurrentPage(1);
    setTimeout(() => loadOrdensServico(), 100);
  };

  const handleRelatorio = () => {
    toast.info('Funcionalidade de relatório em desenvolvimento');
  };

  // Funções de importação
  const downloadTemplate = () => {
    const template = [
      'N° Ordem de Serviço *;Data de Referência *;Cliente *;Fornecedor *;Tipo de Serviço Solicitado *;Tipo *;Centro de Custo *;Subunidade;Placa;Veículo;Valor Peças (R$);Valor Serviço (R$);N° Nota Fiscal Peça;N° Nota Fiscal Serviço',
      'OS/2024/001;15/01/2024;Cliente ABC Ltda;Fornecedor XYZ;Manutenção Preventiva;Peças e Serviços;Frota Leve;Região Sul;ABC-1234;Fiat Strada 2020;R$ 1.000,00;R$ 500,00;NFe-12345;NFe-12346',
      'OS/2024/002;20/01/2024;Cliente ABC Ltda;Fornecedor XYZ;Manutenção Corretiva;Peças;Frota Pesada;;DEF-5678;Mercedes Actros 2019;R$ 2.500,00;0;NFe-12347;'
    ].join('\n');

    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_importacao_os.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.info('📥 Template baixado com sucesso!');
  };

  const processarCSV = (texto) => {
    console.log('🔍 Iniciando processamento CSV...');
    const linhas = texto.split('\n').filter(linha => linha.trim());
    console.log(`📊 Total de linhas: ${linhas.length}`);
    
    if (linhas.length < 2) {
      toast.error('Arquivo CSV vazio ou sem dados');
      return [];
    }

    // Detecta o separador (ponto-e-vírgula para PT-BR, vírgula para EN)
    const separador = linhas[0].includes(';') ? ';' : ',';
    console.log(`🔧 Separador detectado: "${separador}"`);
    console.log(`📋 Cabeçalho: ${linhas[0].substring(0, 100)}...`);
    
    const ordensServico = [];
    const errosValidacao = [];
    
    for (let i = 1; i < linhas.length; i++) {
      try {
        // Usa split() para manter campos vazios - CORRIGIDO
        // Remove aspas duplas e trim em cada valor
        const valores = linhas[i].split(separador).map(v => {
          let valor = v.trim();
          // Remove aspas duplas no início e fim
          if (valor.startsWith('"') && valor.endsWith('"')) {
            valor = valor.substring(1, valor.length - 1);
          }
          return valor.trim();
        });
        
        console.log(`📝 Linha ${i + 1}: ${valores.length} campos detectados`);
        
        if (valores.length < 7) {
          errosValidacao.push(`Linha ${i + 1}: Dados insuficientes (mínimo 7 campos obrigatórios, encontrado ${valores.length})`);
          console.warn(`⚠️ Linha ${i + 1} com apenas ${valores.length} campos:`, valores);
          continue;
        }
        
        const os = {
          numeroOrdemServico: valores[0] || '',
          dataReferencia: valores[1] || '',
          clienteNome: valores[2] || '',
          fornecedorNome: valores[3] || '',
          tipoServicoSolicitado: valores[4] || '',
          tipo: valores[5] || '',
          centroCusto: valores[6] || '',
          subunidade: valores[7] || '',
          placa: valores[8] || '',
          veiculo: valores[9] || '',
          valorPecas: valores[10] || '0',
          valorServico: valores[11] || '0',
          notaFiscalPeca: valores[12] || '',
          notaFiscalServico: valores[13] || ''
        };
        
        console.log(`✅ OS ${os.numeroOrdemServico}: Placa="${os.placa}", Veículo="${os.veiculo}", Subunidade="${os.subunidade}"`);
        
        // Validações básicas no frontend
        if (!os.numeroOrdemServico) {
          errosValidacao.push(`Linha ${i + 1}: N° Ordem de Serviço é obrigatório`);
          continue;
        }
        if (!os.dataReferencia) {
          errosValidacao.push(`Linha ${i + 1}: Data de Referência é obrigatória`);
          continue;
        }
        if (!os.clienteNome) {
          errosValidacao.push(`Linha ${i + 1}: Cliente é obrigatório`);
          continue;
        }
        if (!os.fornecedorNome) {
          errosValidacao.push(`Linha ${i + 1}: Fornecedor é obrigatório`);
          continue;
        }
        
        ordensServico.push(os);
      } catch (error) {
        errosValidacao.push(`Linha ${i + 1}: Erro ao processar dados - ${error.message}`);
      }
    }
    
    if (errosValidacao.length > 0) {
      console.warn('Erros de validação no CSV:', errosValidacao);
      toast.warning(`${errosValidacao.length} linha(s) com problema foram ignoradas`);
    }
    
    console.log(`✅ Total de OS processadas: ${ordensServico.length}`);
    return ordensServico;
  };

  const handleImportar = async () => {
    if (!arquivo) {
      toast.error('Selecione um arquivo CSV para importar');
      return;
    }

    setImportando(true);
    setResultadosImportacao(null);

    try {
      console.log('📄 Lendo arquivo:', arquivo.name, arquivo.type, arquivo.size);
      
      const texto = await arquivo.text();
      console.log('📝 Conteúdo lido:', texto.substring(0, 200));
      
      const ordensServico = processarCSV(texto);
      console.log('✅ OS processadas:', ordensServico.length);

      if (ordensServico.length === 0) {
        toast.error('Nenhuma OS válida encontrada no arquivo');
        setImportando(false);
        return;
      }

      const response = await api.post('/importacao/ordens-servico', {
        ordensServico
      });

      setResultadosImportacao(response.data.resultados);
      
      if (response.data.resultados.erros.length === 0) {
        toast.success(response.data.message);
        loadOrdensServico(); // Recarregar lista
      } else {
        toast.warning(response.data.message);
      }

    } catch (error) {
      console.error('❌ Erro ao importar:', error);
      console.error('Stack:', error.stack);
      
      const mensagemErro = error.response?.data?.message || error.message || 'Erro ao importar OS';
      toast.error(`Erro: ${mensagemErro}`);
    } finally {
      setImportando(false);
    }
  };

  const fecharModalImportacao = () => {
    setShowImportModal(false);
    setArquivo(null);
    setResultadosImportacao(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
      try {
        await api.delete(`/ordens-servico/${id}`);
        toast.success('Ordem de serviço excluída com sucesso!');
        loadOrdensServico();
      } catch (error) {
        toast.error('Erro ao excluir ordem de serviço');
      }
    }
  };

  const toggleOrdemSelection = (ordemId) => {
    setSelectedOrdens(prev => 
      prev.includes(ordemId)
        ? prev.filter(id => id !== ordemId)
        : [...prev, ordemId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrdens.length === ordensServico.length) {
      setSelectedOrdens([]);
    } else {
      setSelectedOrdens(ordensServico.map(o => o._id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedOrdens.length === 0) {
      toast.warning('Selecione pelo menos uma ordem de serviço para excluir');
      return;
    }

    const confirmacao = window.confirm(
      `Tem certeza que deseja excluir ${selectedOrdens.length} ordem(ns) de serviço selecionada(s)? Esta ação não pode ser desfeita.`
    );

    if (!confirmacao) return;

    try {
      await api.post('/ordens-servico/delete-multiple', {
        ids: selectedOrdens
      });
      toast.success(`${selectedOrdens.length} ordem(ns) de serviço excluída(s) com sucesso!`);
      setSelectedOrdens([]);
      loadOrdensServico();
    } catch (error) {
      toast.error('Erro ao excluir ordens de serviço');
      console.error(error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusClass = (status) => {
    const classes = {
      'Aberta': 'status-aberta',
      'Em Andamento': 'status-andamento',
      'Concluída': 'status-concluida',
      'Cancelada': 'status-cancelada'
    };
    return classes[status] || 'status-aberta';
  };

  const abreviarNome = (nome, maxLength = 25) => {
    if (!nome) return '-';
    if (nome.length <= maxLength) return nome;
    return nome.substring(0, maxLength) + '...';
  };

  // Verificar se é fornecedor ou cliente (somente leitura)
  const isFornecedor = user?.role === 'fornecedor';
  const isCliente = user?.role === 'cliente';
  const isReadOnly = isFornecedor || isCliente;

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="ordens-servico-container">
            {isReadOnly && (
              <div className="readonly-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Visualização Somente Leitura - Você pode visualizar mas não editar ou criar ordens de serviço
              </div>
            )}
            <div className="page-header">
              <div>
                <h1>Ordens de Serviço</h1>
                <p>Gerencie as ordens de serviço do sistema</p>
              </div>
              {!isReadOnly && (
                <div className="header-actions">
                  {(user?.role === 'super_admin' || user?.role === 'admin') && (
                    <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                      📥 Importar OS
                    </button>
                  )}
                  <button className="btn-primary" onClick={() => navigate('/ordens-servico/novo')}>
                    + Nova Ordem de Serviço
                  </button>
                </div>
              )}
            </div>

            <div className="filtros-card">
              <h3>Filtros</h3>
              <div className="filtros-grid">
                <div className="form-group">
                  <label>Código</label>
                  <input
                    type="text"
                    name="codigo"
                    value={filtros.codigo}
                    onChange={handleFiltroChange}
                    placeholder="Ex: OS-000001"
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
                  <label>Status</label>
                  <select
                    name="status"
                    value={filtros.status}
                    onChange={handleFiltroChange}
                  >
                    <option value="">Todos</option>
                    <option value="Aberta">Aberta</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Autorizada">Autorizada</option>
                    <option value="Aguardando pagamento">Aguardando pagamento</option>
                    <option value="Paga">Paga</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Cancelada">Cancelada</option>
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
                <button className="btn-secondary" onClick={handleLimpar}>
                  🗑️ Limpar
                </button>
                <button className="btn-primary" onClick={handleFiltrar}>
                  🔍 Filtrar
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loading">Carregando...</div>
            ) : (
              <>
                {!isReadOnly && selectedOrdens.length > 0 && (
                  <div className="selected-actions">
                    <span>
                      {selectedOrdens.length} ordem(ns) selecionada(s)
                    </span>
                    <button 
                      className="btn-delete"
                      onClick={handleDeleteSelected}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Excluir Selecionadas
                    </button>
                  </div>
                )}
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selectedOrdens.length === ordensServico.length && ordensServico.length > 0}
                            onChange={toggleSelectAll}
                            title="Selecionar todos"
                          />
                        </th>
                        <th>Código</th>
                        <th>Cliente</th>
                        <th>Fornecedor</th>
                        <th>Tipo Serviço</th>
                        <th>Valor Final</th>
                        <th>Status</th>
                        <th>Data Ref.</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordensServico.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                            Nenhuma ordem de serviço encontrada
                          </td>
                        </tr>
                      ) : (
                        ordensServico.map((ordem) => (
                          <tr key={ordem._id} className={selectedOrdens.includes(ordem._id) ? 'selected' : ''}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedOrdens.includes(ordem._id)}
                                onChange={() => toggleOrdemSelection(ordem._id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td><strong>{ordem.numeroOrdemServico}</strong></td>
                            <td>{ordem.cliente?.razaoSocial || ordem.cliente?.nomeFantasia}</td>
                            <td title={ordem.fornecedor?.nomeFantasia || ordem.fornecedor?.razaoSocial}>
                              {abreviarNome(ordem.fornecedor?.nomeFantasia || ordem.fornecedor?.razaoSocial)}
                            </td>
                            <td>{ordem.tipoServicoSolicitado?.nome}</td>
                            <td><strong>{formatCurrency(ordem.valorFinal)}</strong></td>
                            <td>
                              <span className={`status-badge ${getStatusClass(ordem.status)}`}>
                                {ordem.status}
                              </span>
                            </td>
                            <td>{new Date(ordem.dataReferencia || ordem.createdAt).toLocaleDateString('pt-BR')}</td>
                            <td>
                              <div className="table-actions">
                                <button 
                                  className="btn-icon btn-view"
                                  onClick={() => navigate(`/ordens-servico/${ordem._id}`)}
                                  title="Visualizar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                </button>
                                {!isReadOnly && (
                                  <>
                                    <button 
                                      className="btn-icon btn-edit"
                                      onClick={() => navigate(`/ordens-servico/editar/${ordem._id}`)}
                                      title="Editar"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                      </svg>
                                    </button>
                                    <button 
                                      className="btn-icon btn-delete"
                                      onClick={() => handleDelete(ordem._id)}
                                      title="Excluir"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="btn-pagination"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      ← Anterior
                    </button>
                    <span className="pagination-info">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      className="btn-pagination"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima →
                    </button>
                  </div>
                )}

                <div className="filtros-section">
                  <div className="filtros-actions">
                    <button className="btn-relatorio" onClick={handleRelatorio}>
                      📄 Emitir Relatório
                    </button>
                    <button className="btn-limpar" onClick={handleLimpar}>
                      🗑️ Limpar
                    </button>
                    <button className="btn-filtrar" onClick={handleFiltrar}>
                      🔍 Filtrar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
      <Footer />

      {/* Modal de Importação */}
      {showImportModal && (
        <div className="modal-overlay" onClick={fecharModalImportacao}>
          <div className="modal-import" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📦 Importar Ordens de Serviço</h2>
              <button className="btn-close" onClick={fecharModalImportacao}>×</button>
            </div>
            
            <div className="modal-body">
              {!resultadosImportacao ? (
                <>
                  <div className="import-instructions">
                    <h3>📋 Instruções</h3>
                    <ol>
                      <li>Baixe o template CSV clicando no botão abaixo</li>
                      <li>Preencha com os dados das OS (não remova o cabeçalho)</li>
                      <li>Campos com * são obrigatórios</li>
                      <li>Use formato de data: YYYY-MM-DD (ex: 2024-01-15)</li>
                      <li>Valores use ponto decimal (ex: 1000.00)</li>
                    </ol>
                    <button className="btn-download" onClick={downloadTemplate}>
                      📥 Baixar Template CSV
                    </button>
                  </div>

                  <div className="import-upload">
                    <h3>📤 Selecione o arquivo CSV</h3>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setArquivo(e.target.files[0])}
                      id="arquivo-import"
                      className="file-input"
                    />
                    <label htmlFor="arquivo-import" className="file-label">
                      {arquivo ? `📄 ${arquivo.name}` : '📂 Escolher arquivo CSV'}
                    </label>
                  </div>
                </>
              ) : (
                <div className="import-results">
                  <h3>📊 Resultados da Importação</h3>
                  <div className="results-summary">
                    <div className="summary-card success">
                      <span className="number">{resultadosImportacao.sucesso.length}</span>
                      <span className="label">Sucessos</span>
                    </div>
                    <div className="summary-card error">
                      <span className="number">{resultadosImportacao.erros.length}</span>
                      <span className="label">Erros</span>
                    </div>
                    <div className="summary-card total">
                      <span className="number">{resultadosImportacao.total}</span>
                      <span className="label">Total</span>
                    </div>
                  </div>

                  {resultadosImportacao.erros.length > 0 && (
                    <div className="errors-list">
                      <h4>❌ Erros:</h4>
                      {resultadosImportacao.erros.map((erro, idx) => (
                        <div key={idx} className="error-item">
                          <strong>Linha {erro.linha}:</strong> {erro.erro}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!resultadosImportacao ? (
                <>
                  <button className="btn-cancel" onClick={fecharModalImportacao}>
                    Cancelar
                  </button>
                  <button 
                    className="btn-import" 
                    onClick={handleImportar}
                    disabled={!arquivo || importando}
                  >
                    {importando ? '⏳ Importando...' : '🚀 Importar'}
                  </button>
                </>
              ) : (
                <button className="btn-primary" onClick={fecharModalImportacao}>
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdensServico;
