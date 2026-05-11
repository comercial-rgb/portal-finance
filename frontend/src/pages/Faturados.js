import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './Faturados.css';

const LIMIT = 15;

function Faturados() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [faturas, setFaturas] = useState([]);
  const [busca, setBusca] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('fornecedores');
  const [statusGroup, setStatusGroup] = useState('pendente');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const isFornecedor = user?.role === 'fornecedor';
  const isCliente = user?.role === 'cliente';
  const isReadOnly = isFornecedor || isCliente;

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      if (currentUser.role === 'cliente') setAbaAtiva('clientes');
    }
  }, []);

  const loadFaturas = useCallback(async (page = 1, tentativa = 1) => {
    if (!user) return;
    if (tentativa === 1) setLoading(true);
    try {
      const tipo = abaAtiva === 'fornecedores' ? 'Fornecedor' : 'Cliente';
      const response = await api.get('/faturas', {
        params: { tipo, statusGroup, page, limit: LIMIT }
      });
      const { faturas: data, total: tot, totalPages: pages, currentPage: cp } = response.data;
      setFaturas(Array.isArray(data) ? data : []);
      setTotal(tot || 0);
      setTotalPages(pages || 1);
      setCurrentPage(cp || 1);
      setLoading(false);
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
        setLoading(false);
      } else if (status >= 500 || !status) {
        if (tentativa < 3) {
          setTimeout(() => loadFaturas(page, tentativa + 1), 3000 * tentativa);
        } else {
          toast.error('Servidor indisponível. Tente novamente em alguns instantes.');
          setLoading(false);
        }
      } else {
        toast.error('Erro ao carregar faturas');
        setLoading(false);
      }
    }
  }, [user, abaAtiva, statusGroup]);

  useEffect(() => {
    setCurrentPage(1);
  }, [abaAtiva, statusGroup]);

  useEffect(() => {
    loadFaturas(currentPage);
  }, [loadFaturas, currentPage]);

  const handleAbaAtiva = (aba) => {
    setAbaAtiva(aba);
    setBusca('');
    setStatusGroup('pendente');
  };

  const handleStatusGroup = (group) => {
    setStatusGroup(group);
    setBusca('');
  };

  const faturasFiltradas = faturas.filter(fatura => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      fatura.numeroFatura?.toLowerCase().includes(q) ||
      (fatura.fornecedor?.razaoSocial || fatura.cliente?.razaoSocial || '').toLowerCase().includes(q) ||
      (fatura.fornecedor?.nomeFantasia || fatura.cliente?.nomeFantasia || '').toLowerCase().includes(q)
    );
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Aguardando pagamento': return 'status-badge status-aguardando';
      case 'Parcialmente paga': return 'status-badge status-parcial';
      case 'Paga': return 'status-badge status-paga';
      default: return 'status-badge';
    }
  };

  const getStatusLabel = (status) => {
    if (abaAtiva === 'clientes') {
      switch (status) {
        case 'Aguardando pagamento': return 'Aguardando recebimento';
        case 'Parcialmente paga': return 'Parcialmente recebida';
        case 'Paga': return 'Recebida';
        default: return status;
      }
    }
    return status;
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const formatarValor = (valor) => {
    if (!valor && valor !== 0) return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleVerFatura = (faturaId) => navigate(`/faturados/editar/${faturaId}`);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPaginacao = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="paginacao">
        <button
          className="pag-btn pag-nav"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >&#8592;</button>

        {start > 1 && <>
          <button className="pag-btn" onClick={() => handlePageChange(1)}>1</button>
          {start > 2 && <span className="pag-ellipsis">...</span>}
        </>}

        {pages.map(p => (
          <button
            key={p}
            className={`pag-btn${p === currentPage ? ' pag-ativa' : ''}`}
            onClick={() => handlePageChange(p)}
          >{p}</button>
        ))}

        {end < totalPages && <>
          {end < totalPages - 1 && <span className="pag-ellipsis">...</span>}
          <button className="pag-btn" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
        </>}

        <button
          className="pag-btn pag-nav"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >&#8594;</button>

        <span className="pag-info">
          {total} {total === 1 ? 'fatura' : 'faturas'} · página {currentPage} de {totalPages}
        </span>
      </div>
    );
  };

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="faturados-container">
            {isReadOnly && (
              <div className="readonly-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Visualização Somente Leitura — Você pode visualizar as faturas mas não editá-las
              </div>
            )}

            <div className="page-header">
              <div>
                <h1>Faturados</h1>
                <p>Gerencie as faturas geradas e seus pagamentos</p>
              </div>
            </div>

            {/* Abas principais: Fornecedores / Clientes */}
            <div className="tabs-container">
              {!isCliente && (
                <button
                  className={`tab-button ${abaAtiva === 'fornecedores' ? 'active' : ''}`}
                  onClick={() => handleAbaAtiva('fornecedores')}
                >
                  <span className="tab-icon">👥</span>
                  Fornecedores
                </button>
              )}
              {!isFornecedor && (
                <button
                  className={`tab-button ${abaAtiva === 'clientes' ? 'active' : ''}`}
                  onClick={() => handleAbaAtiva('clientes')}
                >
                  <span className="tab-icon">🏢</span>
                  Clientes
                </button>
              )}
            </div>

            {/* Sub-abas: Pendentes / Pagas */}
            <div className="subtabs-container">
              <button
                className={`subtab-btn ${statusGroup === 'pendente' ? 'active' : ''}`}
                onClick={() => handleStatusGroup('pendente')}
              >
                Pendentes
              </button>
              <button
                className={`subtab-btn ${statusGroup === 'paga' ? 'active' : ''}`}
                onClick={() => handleStatusGroup('paga')}
              >
                {abaAtiva === 'clientes' ? 'Recebidas' : 'Pagas'}
              </button>
            </div>

            {/* Filtro de busca */}
            <div className="filtros-section">
              <div className="filtros-grid">
                <input
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder={`Buscar por nº fatura ou ${abaAtiva === 'fornecedores' ? 'fornecedor' : 'cliente'}...`}
                />
              </div>
              {busca && (
                <div className="filtros-actions">
                  <button className="btn-secondary" onClick={() => setBusca('')}>
                    🗑️ Limpar
                  </button>
                </div>
              )}
            </div>

            {/* Tabela */}
            {loading ? (
              <div className="loading">Carregando faturas...</div>
            ) : (
              <div className="table-card">
                {faturasFiltradas.length === 0 ? (
                  <div className="empty-state">
                    <p>📋 Nenhuma fatura encontrada</p>
                    <span>
                      {busca
                        ? 'Nenhum resultado para a busca'
                        : statusGroup === 'pendente'
                          ? 'Não há faturas pendentes'
                          : abaAtiva === 'clientes' ? 'Não há faturas recebidas' : 'Não há faturas pagas'}
                    </span>
                  </div>
                ) : (
                  <>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nº Fatura</th>
                          <th>{abaAtiva === 'fornecedores' ? 'Fornecedor' : 'Cliente'}</th>
                          <th>Período Apurado</th>
                          {abaAtiva === 'fornecedores' && <th>Previsão Recebimento</th>}
                          <th>Valor Devido</th>
                          <th>{abaAtiva === 'clientes' ? 'Valor Recebido' : 'Valor Pago'}</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faturasFiltradas.map(fatura => (
                          <tr key={fatura._id}>
                            <td><strong>{fatura.numeroFatura}</strong></td>
                            <td>
                              {abaAtiva === 'fornecedores'
                                ? fatura.fornecedor?.razaoSocial || fatura.fornecedor?.nomeFantasia
                                : fatura.cliente?.razaoSocial || fatura.cliente?.nomeFantasia}
                            </td>
                            <td>{formatarData(fatura.periodoInicio)} — {formatarData(fatura.periodoFim)}</td>
                            {abaAtiva === 'fornecedores' && (
                              <td className={fatura.previsaoRecebimento ? 'previsao-definida' : 'previsao-indefinida'}>
                                {fatura.previsaoRecebimento ? formatarData(fatura.previsaoRecebimento) : '-'}
                              </td>
                            )}
                            <td>{formatarValor(fatura.valorDevido)}</td>
                            <td>{formatarValor(fatura.valorPago)}</td>
                            <td>
                              <span className={getStatusBadgeClass(fatura.statusFatura)}>
                                {getStatusLabel(fatura.statusFatura)}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  className="btn-icon btn-view"
                                  onClick={() => handleVerFatura(fatura._id)}
                                  title="Ver/Editar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!busca && renderPaginacao()}
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default Faturados;
