import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './OrdensServico.css';

const TIPOS_COMBUSTIVEL = {
  alcool: 'Álcool',
  gasolina_comum: 'Gasolina Comum',
  gasolina_aditivada: 'Gasolina Aditivada',
  gnv: 'GNV',
  diesel: 'Diesel',
  diesel_500: 'Diesel S-500',
  diesel_s10: 'Diesel S-10',
  arla: 'ARLA',
  querosene: 'Querosene',
  glp: 'GLP'
};

function Abastecimentos() {
  const [user, setUser] = useState(null);
  const [abastecimentos, setAbastecimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [filtros, setFiltros] = useState({
    codigo: '',
    status: '',
    tipoCombustivel: '',
    dataInicio: '',
    dataFim: ''
  });

  const registrosPorPagina = 15;

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadAbastecimentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadAbastecimentos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/abastecimentos', {
        params: {
          page: currentPage,
          limit: registrosPorPagina,
          ...filtros
        }
      });
      setAbastecimentos(response.data.abastecimentos || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalRegistros(response.data.total || 0);
    } catch (error) {
      toast.error('Erro ao carregar abastecimentos');
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
    setCurrentPage(1);
    loadAbastecimentos();
  };

  const handleLimpar = async () => {
    const filtrosLimpos = {
      codigo: '',
      status: '',
      tipoCombustivel: '',
      dataInicio: '',
      dataFim: ''
    };
    setFiltros(filtrosLimpos);
    setCurrentPage(1);
    try {
      setLoading(true);
      const response = await api.get('/abastecimentos', {
        params: { page: 1, limit: registrosPorPagina }
      });
      setAbastecimentos(response.data.abastecimentos || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalRegistros(response.data.total || 0);
    } catch (error) {
      toast.error('Erro ao carregar abastecimentos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
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
                Visualização Somente Leitura - Você pode visualizar mas não editar abastecimentos
              </div>
            )}
            <div className="page-header">
              <div>
                <h1>⛽ Abastecimentos</h1>
                <p>Gerencie os abastecimentos recebidos do sistema de combustível</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#666' }}>
                  {totalRegistros} registro(s)
                </span>
              </div>
            </div>

            <div className="filtros-card">
              <h3>Filtros</h3>
              <div className="filtros-grid">
                <div className="form-group">
                  <label>Código / Placa</label>
                  <input
                    type="text"
                    name="codigo"
                    value={filtros.codigo}
                    onChange={handleFiltroChange}
                    placeholder="Ex: AB-0001 ou ABC1234"
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
                    <option value="Autorizada">Autorizada</option>
                    <option value="Aguardando pagamento">Aguardando pagamento</option>
                    <option value="Paga">Paga</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Combustível</label>
                  <select
                    name="tipoCombustivel"
                    value={filtros.tipoCombustivel}
                    onChange={handleFiltroChange}
                  >
                    <option value="">Todos</option>
                    {Object.entries(TIPOS_COMBUSTIVEL).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
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
                        <th>Placa</th>
                        <th>Motorista</th>
                        <th>Cliente</th>
                        <th>Posto</th>
                        <th>Combustível</th>
                        <th>Litros</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abastecimentos.length === 0 ? (
                        <tr>
                          <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>
                            Nenhum abastecimento encontrado
                          </td>
                        </tr>
                      ) : (
                        abastecimentos.map((ab) => (
                          <tr key={ab._id}>
                            <td><strong>{ab.codigo}</strong></td>
                            <td>{ab.placa || '-'}</td>
                            <td title={ab.motorista}>{abreviarNome(ab.motorista, 20)}</td>
                            <td title={ab.cliente?.nomeFantasia || ab.cliente?.razaoSocial}>
                              {abreviarNome(ab.cliente?.nomeFantasia || ab.cliente?.razaoSocial, 20)}
                            </td>
                            <td title={ab.fornecedor?.nomeFantasia || ab.fornecedor?.razaoSocial}>
                              {abreviarNome(ab.fornecedor?.nomeFantasia || ab.fornecedor?.razaoSocial, 20)}
                            </td>
                            <td>{TIPOS_COMBUSTIVEL[ab.tipoCombustivel] || ab.tipoCombustivel}</td>
                            <td>{ab.litrosAbastecidos?.toFixed(2)}L</td>
                            <td><strong>{formatCurrency(ab.valorFinal)}</strong></td>
                            <td>
                              <span className={`status-badge ${getStatusClass(ab.status)}`}>
                                {ab.status}
                              </span>
                            </td>
                            <td>{new Date(ab.dataReferencia || ab.createdAt).toLocaleDateString('pt-BR')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="btn-secondary"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      ← Anterior
                    </button>
                    <span className="page-info">
                      Página {currentPage} de {totalPages} ({totalRegistros} registros)
                    </span>
                    <button
                      className="btn-secondary"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default Abastecimentos;
