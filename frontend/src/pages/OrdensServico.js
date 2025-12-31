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
    status: ''
  });

  const ordensPorPagina = 15;

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadOrdensServico();
  }, [currentPage]);

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
      status: ''
    });
    setCurrentPage(1);
    setTimeout(() => loadOrdensServico(), 100);
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
                  <label>Status</label>
                  <select
                    name="status"
                    value={filtros.status}
                    onChange={handleFiltroChange}
                  >
                    <option value="">Todos</option>
                    <option value="Aberta">Aberta</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
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
    </div>
  );
}

export default OrdensServico;
