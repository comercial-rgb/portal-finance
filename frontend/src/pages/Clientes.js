import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './Clientes.css';

function Clientes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtros, setFiltros] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    cidade: '',
    estado: '',
    status: ''
  });

  const clientesPorPagina = 15;

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadClientes();
  }, [currentPage]);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clientes', {
        params: {
          page: currentPage,
          limit: clientesPorPagina,
          ...filtros
        }
      });
      setClientes(response.data.clientes || response.data);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
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
    loadClientes();
  };

  const handleLimpar = () => {
    setFiltros({
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      cidade: '',
      estado: '',
      status: ''
    });
    setCurrentPage(1);
    setTimeout(() => loadClientes(), 100);
  };

  const handleRelatorio = () => {
    toast.info('Funcionalidade de relatório em desenvolvimento');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await api.delete(`/clientes/${id}`);
        toast.success('Cliente excluído com sucesso!');
        loadClientes();
      } catch (error) {
        toast.error('Erro ao excluir cliente');
      }
    }
  };

  const handleToggleStatus = async (id, ativoAtual) => {
    try {
      await api.patch(`/clientes/${id}/status`, { ativo: !ativoAtual });
      toast.success(`Cliente ${!ativoAtual ? 'ativado' : 'desativado'} com sucesso!`);
      loadClientes();
    } catch (error) {
      toast.error('Erro ao alterar status do cliente');
    }
  };

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="clientes-container">
            <div className="page-header">
              <div>
                <h1>Clientes</h1>
                <p>Gerencie os clientes do sistema</p>
              </div>
              <button 
                className="btn-primary"
                onClick={() => navigate('/clientes/novo')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Adicionar Novo Cliente
              </button>
            </div>

            <div className="filtros-section">
              <div className="filtros-grid">
                <input
                  type="text"
                  name="razaoSocial"
                  placeholder="Razão Social"
                  value={filtros.razaoSocial}
                  onChange={handleFiltroChange}
                />
                <input
                  type="text"
                  name="nomeFantasia"
                  placeholder="Nome Fantasia"
                  value={filtros.nomeFantasia}
                  onChange={handleFiltroChange}
                />
                <input
                  type="text"
                  name="cnpj"
                  placeholder="CNPJ"
                  value={filtros.cnpj}
                  onChange={handleFiltroChange}
                />
                <input
                  type="text"
                  name="cidade"
                  placeholder="Cidade"
                  value={filtros.cidade}
                  onChange={handleFiltroChange}
                />
                <select
                  name="estado"
                  value={filtros.estado}
                  onChange={handleFiltroChange}
                >
                  <option value="">Todos os Estados</option>
                  {estados.map(estado => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </select>
                <select
                  name="status"
                  value={filtros.status}
                  onChange={handleFiltroChange}
                >
                  <option value="">Todos os Status</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div className="filtros-actions">
                <button className="btn-secondary" onClick={handleRelatorio}>
                  📄 Emitir Relatório
                </button>
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
                        <th>Razão Social</th>
                        <th>Nome Fantasia</th>
                        <th>Cidade/Estado</th>
                        <th>CNPJ</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                            Nenhum cliente cadastrado
                          </td>
                        </tr>
                      ) : (
                        clientes.map(cliente => (
                          <tr key={cliente._id}>
                            <td>
                              <button 
                                className="link-button"
                                onClick={() => navigate(`/clientes/${cliente._id}`)}
                              >
                                {cliente.razaoSocial}
                              </button>
                            </td>
                            <td>{cliente.nomeFantasia}</td>
                            <td>{cliente.endereco?.cidade || '-'}/{cliente.endereco?.estado || '-'}</td>
                            <td>{cliente.cnpj}</td>
                            <td>
                              <span className={`status-badge ${cliente.ativo ? 'status-ativo' : 'status-inativo'}`}>
                                {cliente.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button 
                                  className="btn-icon btn-view"
                                  onClick={() => navigate(`/clientes/${cliente._id}`)}
                                  title="Visualizar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                </button>
                                <button 
                                  className={`btn-icon ${cliente.ativo ? 'btn-warning' : 'btn-success'}`}
                                  onClick={() => handleToggleStatus(cliente._id, cliente.ativo)}
                                  title={cliente.ativo ? 'Desativar' : 'Ativar'}
                                >
                                  {cliente.ativo ? '🔒' : '🔓'}
                                </button>
                                <button 
                                  className="btn-icon btn-delete"
                                  onClick={() => handleDelete(cliente._id)}
                                  title="Excluir"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
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

export default Clientes;
