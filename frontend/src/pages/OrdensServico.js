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
  const [filtros, setFiltros] = useState({
    codigo: '',
    cliente: '',
    fornecedor: '',
    status: '',
    dataInicio: '',
    dataFim: ''
  });
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [clientes, setClientes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaFornecedor, setBuscaFornecedor] = useState('');

  const ordensPorPagina = 15;

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadOrdensServico();
    loadListas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadListas = async () => {
    try {
      const [cliRes, fornRes] = await Promise.all([
        api.get('/clientes', { params: { limit: 1000 } }),
        api.get('/fornecedores', { params: { limit: 1000 } })
      ]);
      const cliData = cliRes.data.clientes || cliRes.data;
      setClientes(Array.isArray(cliData) ? cliData : []);
      const fornData = fornRes.data.fornecedores || fornRes.data;
      setFornecedores(Array.isArray(fornData) ? fornData : []);
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
    }
  };

  const loadOrdensServico = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ordens-servico', {
        params: {
          page: currentPage,
          limit: ordensPorPagina,
          ...filtros
        }
      });
      setOrdensServico(response.data.ordensServico || response.data);
      setTotalPages(response.data.totalPages || 1);
      setTotalRegistros(response.data.total || 0);
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

  const handleLimpar = async () => {
    const filtrosLimpos = {
      codigo: '',
      cliente: '',
      fornecedor: '',
      status: '',
      dataInicio: '',
      dataFim: ''
    };
    setFiltros(filtrosLimpos);
    setCurrentPage(1);
    try {
      setLoading(true);
      const response = await api.get('/ordens-servico', {
        params: { page: 1, limit: ordensPorPagina }
      });
      setOrdensServico(response.data.ordensServico || response.data);
      setTotalPages(response.data.totalPages || 1);
      setTotalRegistros(response.data.total || 0);
    } catch (error) {
      toast.error('Erro ao carregar ordens de serviço');
    } finally {
      setLoading(false);
    }
  };

  const handleRelatorio = () => {
    toast.info('Funcionalidade de relatório em desenvolvimento');
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusClass = (status) => {
    const classes = {
      'Autorizada': 'status-autorizada',
      'Aguardando pagamento': 'status-aguardando',
      'Paga': 'status-paga'
    };
    return classes[status] || 'status-autorizada';
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
                <button className="btn-primary" onClick={() => navigate('/ordens-servico/novo')}>
                  + Nova Ordem de Serviço
                </button>
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
                  <input
                    type="text"
                    placeholder="Buscar cliente por nome..."
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    className="filtro-busca-input"
                  />
                  <select name="cliente" value={filtros.cliente} onChange={handleFiltroChange}>
                    <option value="">Todos</option>
                    {clientes
                      .filter(c => !buscaCliente || (c.razaoSocial || c.nomeFantasia || '').toLowerCase().includes(buscaCliente.toLowerCase()))
                      .map(c => (
                      <option key={c._id} value={c._id}>{c.razaoSocial || c.nomeFantasia}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fornecedor</label>
                  <input
                    type="text"
                    placeholder="Buscar fornecedor por nome..."
                    value={buscaFornecedor}
                    onChange={(e) => setBuscaFornecedor(e.target.value)}
                    className="filtro-busca-input"
                  />
                  <select name="fornecedor" value={filtros.fornecedor} onChange={handleFiltroChange}>
                    <option value="">Todos</option>
                    {fornecedores
                      .filter(f => !buscaFornecedor || (f.razaoSocial || f.nomeFantasia || '').toLowerCase().includes(buscaFornecedor.toLowerCase()))
                      .map(f => (
                      <option key={f._id} value={f._id}>{f.razaoSocial || f.nomeFantasia}</option>
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
                    <option value="Autorizada">Autorizada</option>
                    <option value="Aguardando pagamento">Aguardando pagamento</option>
                    <option value="Paga">Paga</option>
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
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
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
                          <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                            Nenhuma ordem de serviço encontrada
                          </td>
                        </tr>
                      ) : (
                        ordensServico.map((ordem) => (
                          <tr key={ordem._id}>
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

                <div className="pagination-wrapper">
                  <span className="pagination-total">
                    Exibindo {ordensServico.length} de {totalRegistros} registro{totalRegistros !== 1 ? 's' : ''}
                  </span>
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button
                        className="btn-pagination"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        title="Primeira página"
                      >
                        «
                      </button>
                      <button
                        className="btn-pagination"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        ‹ Anterior
                      </button>
                      {(() => {
                        const pages = [];
                        let startPage = Math.max(1, currentPage - 2);
                        let endPage = Math.min(totalPages, currentPage + 2);
                        if (currentPage <= 3) endPage = Math.min(5, totalPages);
                        if (currentPage >= totalPages - 2) startPage = Math.max(1, totalPages - 4);
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <button
                              key={i}
                              className={`btn-pagination-number ${currentPage === i ? 'active' : ''}`}
                              onClick={() => setCurrentPage(i)}
                            >
                              {i}
                            </button>
                          );
                        }
                        return pages;
                      })()}
                      <button
                        className="btn-pagination"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima ›
                      </button>
                      <button
                        className="btn-pagination"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        title="Última página"
                      >
                        »
                      </button>
                    </div>
                  )}
                </div>

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
    </div>
  );
}

export default OrdensServico;
