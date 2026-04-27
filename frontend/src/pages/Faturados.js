import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './Faturados.css';

function Faturados() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [faturas, setFaturas] = useState([]);
  const [filtros, setFiltros] = useState({
    busca: '',
    status: ''
  });

  // Verificar se é fornecedor ou cliente (somente leitura)
  const isFornecedor = user?.role === 'fornecedor';
  const isCliente = user?.role === 'cliente';
  const isReadOnly = isFornecedor || isCliente;
  
  // Definir aba inicial baseada no tipo de usuário
  const abaInicial = isCliente ? 'clientes' : 'fornecedores';
  const [abaAtiva, setAbaAtiva] = useState(abaInicial);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Ajustar aba ativa baseado no tipo de usuário
    if (user?.role === 'cliente') {
      setAbaAtiva('clientes');
    } else if (user?.role === 'fornecedor') {
      setAbaAtiva('fornecedores');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadFaturas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaAtiva, user]);

  const loadFaturas = async () => {
    try {
      setLoading(true);
      const tipo = abaAtiva === 'fornecedores' ? 'Fornecedor' : 'Cliente';
      console.log('Carregando faturas tipo:', tipo);
      const response = await api.get(`/faturas?tipo=${tipo}`);
      console.log('Faturas recebidas:', response.data?.length || 0);
      const data = Array.isArray(response.data) ? response.data : [];
      setFaturas(data);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
      if (error.response?.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
      } else if (error.response?.status >= 500) {
        toast.error('Servidor indisponível. Tente novamente em alguns instantes.');
      } else {
        toast.error('Erro ao carregar faturas');
      }
      setFaturas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const faturasFiltradas = faturas.filter(fatura => {
    const matchBusca = !filtros.busca || 
      fatura.numeroFatura.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      (fatura.fornecedor?.razaoSocial || fatura.cliente?.razaoSocial || '').toLowerCase().includes(filtros.busca.toLowerCase());
    
    const matchStatus = !filtros.status || fatura.statusFatura === filtros.status;
    
    return matchBusca && matchStatus;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Aguardando pagamento':
        return 'status-badge status-aguardando';
      case 'Parcialmente paga':
        return 'status-badge status-parcial';
      case 'Paga':
        return 'status-badge status-paga';
      default:
        return 'status-badge';
    }
  };

  // Traduzir status para Cliente (Recebido ao invés de Pago)
  const getStatusLabel = (status) => {
    if (abaAtiva === 'clientes') {
      switch (status) {
        case 'Aguardando pagamento':
          return 'Aguardando recebimento';
        case 'Parcialmente paga':
          return 'Parcialmente recebida';
        case 'Paga':
          return 'Recebida';
        default:
          return status;
      }
    }
    return status;
  };

  const formatarData = (data) => {
    if (!data) return '-';
    const date = new Date(data);
    // Usar UTC para evitar problemas de timezone
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const formatarPeriodo = (inicio, fim) => {
    return `${formatarData(inicio)} - ${formatarData(fim)}`;
  };

  const formatarValor = (valor) => {
    if (!valor && valor !== 0) return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleVerFatura = (faturaId) => {
    navigate(`/faturados/editar/${faturaId}`);
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
                Visualização Somente Leitura - Você pode visualizar as faturas mas não editá-las
              </div>
            )}
            {/* Cabeçalho */}
            <div className="page-header">
              <div>
                <h1>Faturados</h1>
                <p>Gerencie as faturas geradas e seus pagamentos</p>
              </div>
            </div>

            {/* Abas - Cliente vê apenas Clientes, Fornecedor vê apenas Fornecedores */}
            <div className="tabs-container">
              {!isCliente && (
                <button
                  className={`tab-button ${abaAtiva === 'fornecedores' ? 'active' : ''}`}
                  onClick={() => setAbaAtiva('fornecedores')}
                >
                  <span className="tab-icon">👥</span>
                  Fornecedores
                </button>
              )}
              {!isFornecedor && (
                <button
                  className={`tab-button ${abaAtiva === 'clientes' ? 'active' : ''}`}
                  onClick={() => setAbaAtiva('clientes')}
                >
                  <span className="tab-icon">🏢</span>
                  Clientes
                </button>
              )}
            </div>

            {/* Filtros */}
            <div className="filtros-section">
              <div className="filtros-grid">
                <input
                  type="text"
                  name="busca"
                  value={filtros.busca}
                  onChange={handleFiltroChange}
                  placeholder={`Buscar por nº fatura ou ${abaAtiva === 'fornecedores' ? 'fornecedor' : 'cliente'}...`}
                />
                <select
                  name="status"
                  value={filtros.status}
                  onChange={handleFiltroChange}
                >
                  <option value="">Todos os Status</option>
                  <option value="Aguardando pagamento">
                    {abaAtiva === 'clientes' ? 'Aguardando recebimento' : 'Aguardando pagamento'}
                  </option>
                  <option value="Parcialmente paga">
                    {abaAtiva === 'clientes' ? 'Parcialmente recebida' : 'Parcialmente paga'}
                  </option>
                  <option value="Paga">
                    {abaAtiva === 'clientes' ? 'Recebida' : 'Paga'}
                  </option>
                </select>
              </div>
              <div className="filtros-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setFiltros({ busca: '', status: '' })}
                >
                  🗑️ Limpar
                </button>
              </div>
            </div>

            {/* Tabela de faturas */}
            {loading ? (
              <div className="loading">Carregando faturas...</div>
            ) : (
              <div className="table-card">
                {faturasFiltradas.length === 0 ? (
                  <div className="empty-state">
                    <p>📋 Nenhuma fatura encontrada</p>
                    <span>As faturas geradas aparecerão aqui</span>
                  </div>
                ) : (
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
                              : fatura.cliente?.razaoSocial || fatura.cliente?.nomeFantasia
                            }
                          </td>
                          <td>{formatarPeriodo(fatura.periodoInicio, fatura.periodoFim)}</td>
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
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
