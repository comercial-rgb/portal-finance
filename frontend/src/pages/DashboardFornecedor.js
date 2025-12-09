import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './DashboardFornecedor.css';

function DashboardFornecedor() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOS: 0,
    osAutorizadas: 0,
    faturasPendentes: 0,
    valorTotalPendente: 0
  });
  const [recentOS, setRecentOS] = useState([]);
  const [recentFaturas, setRecentFaturas] = useState([]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar ordens de serviço
      const osResponse = await api.get('/ordens-servico');
      const ordensData = osResponse.data.ordensServico || osResponse.data || [];
      
      // Carregar faturas
      const faturasResponse = await api.get('/faturas?tipo=Fornecedor');
      const faturasData = faturasResponse.data || [];
      
      // Calcular estatísticas
      const totalOS = ordensData.length;
      const osAutorizadas = ordensData.filter(os => os.status === 'Autorizada').length;
      const faturasPendentes = faturasData.filter(f => f.statusFatura !== 'Paga').length;
      const valorTotalPendente = faturasData
        .filter(f => f.statusFatura !== 'Paga')
        .reduce((sum, f) => sum + (f.valorDevido || 0), 0);
      
      setStats({
        totalOS,
        osAutorizadas,
        faturasPendentes,
        valorTotalPendente
      });
      
      // Últimas 5 OS
      setRecentOS(ordensData.slice(0, 5));
      
      // Últimas 3 faturas
      setRecentFaturas(faturasData.slice(0, 3));
      
    } catch (error) {
      toast.error('Erro ao carregar dados do dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatarValor = (valor) => {
    if (!valor && valor !== 0) return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getStatusClass = (status) => {
    const statusMap = {
      'Aberta': 'status-aberta',
      'Em Andamento': 'status-andamento',
      'Concluída': 'status-concluida',
      'Autorizada': 'status-autorizada',
      'Aguardando pagamento': 'status-aguardando',
      'Paga': 'status-paga',
      'Parcialmente paga': 'status-parcial'
    };
    return statusMap[status] || '';
  };

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="dashboard-fornecedor-container">
            <div className="welcome-section">
              <div>
                <h1>Bem-vindo(a), {user?.nome?.split(' ')[0]}!</h1>
                <p>Acompanhe suas ordens de serviço e faturas</p>
              </div>
              <button 
                className="btn-perfil"
                onClick={() => navigate('/perfil-fornecedor-usuario')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Editar Perfil
              </button>
            </div>

            {loading ? (
              <div className="loading">Carregando...</div>
            ) : (
              <>
                {/* Cards de Estatísticas */}
                <div className="stats-grid">
                  <div className="stat-card stat-primary">
                    <div className="stat-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                      </svg>
                    </div>
                    <div className="stat-content">
                      <h3>Total de OS</h3>
                      <p className="stat-value">{stats.totalOS}</p>
                      <span className="stat-label">Ordens de Serviço</span>
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
                      <h3>OS Autorizadas</h3>
                      <p className="stat-value">{stats.osAutorizadas}</p>
                      <span className="stat-label">Prontas para faturar</span>
                    </div>
                  </div>

                  <div className="stat-card stat-warning">
                    <div className="stat-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="5" width="20" height="14" rx="2"/>
                        <line x1="2" y1="10" x2="22" y2="10"/>
                      </svg>
                    </div>
                    <div className="stat-content">
                      <h3>Faturas Pendentes</h3>
                      <p className="stat-value">{stats.faturasPendentes}</p>
                      <span className="stat-label">Aguardando pagamento</span>
                    </div>
                  </div>

                  <div 
                    className="stat-card stat-info stat-clickable"
                    onClick={() => navigate('/valores-pendentes')}
                    title="Clique para ver detalhes e solicitar antecipação"
                  >
                    <div className="stat-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                    </div>
                    <div className="stat-content">
                      <h3>Valor Pendente 💰</h3>
                      <p className="stat-value stat-value-small">{formatarValor(stats.valorTotalPendente)}</p>
                      <span className="stat-label">Clique para ver detalhes →</span>
                    </div>
                  </div>
                </div>

                {/* Últimas Ordens de Serviço */}
                <div className="section-card">
                  <div className="section-header">
                    <h2>Últimas Ordens de Serviço</h2>
                    <button 
                      className="btn-link"
                      onClick={() => navigate('/ordens-servico')}
                    >
                      Ver todas →
                    </button>
                  </div>
                  {recentOS.length === 0 ? (
                    <div className="empty-state">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <p>Nenhuma ordem de serviço encontrada</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Nº OS</th>
                            <th>Cliente</th>
                            <th>Tipo</th>
                            <th>Data</th>
                            <th>Valor</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentOS.map(os => (
                            <tr 
                              key={os._id}
                              onClick={() => navigate(`/ordens-servico/${os._id}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td><strong>{os.numeroOrdemServico || os.codigo}</strong></td>
                              <td>{os.cliente?.razaoSocial || '-'}</td>
                              <td>{os.tipoServico?.nome || os.tipo?.nome || '-'}</td>
                              <td>{formatarData(os.createdAt)}</td>
                              <td><strong>{formatarValor(os.valorFinal || os.valorTotal)}</strong></td>
                              <td>
                                <span className={`status-badge ${getStatusClass(os.status)}`}>
                                  {os.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Últimas Faturas */}
                <div className="section-card">
                  <div className="section-header">
                    <h2>Últimas Faturas</h2>
                    <button 
                      className="btn-link"
                      onClick={() => navigate('/faturados')}
                    >
                      Ver todas →
                    </button>
                  </div>
                  {recentFaturas.length === 0 ? (
                    <div className="empty-state">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="5" width="20" height="14" rx="2"/>
                        <line x1="2" y1="10" x2="22" y2="10"/>
                      </svg>
                      <p>Nenhuma fatura encontrada</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Número</th>
                            <th>Período</th>
                            <th>Valor Total</th>
                            <th>Valor Pago</th>
                            <th>Valor Devido</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentFaturas.map(fatura => (
                            <tr 
                              key={fatura._id}
                              onClick={() => navigate(`/faturados/editar/${fatura._id}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td><strong>{fatura.numeroFatura}</strong></td>
                              <td>{formatarData(fatura.periodoInicio)} - {formatarData(fatura.periodoFim)}</td>
                              <td>{formatarValor(fatura.valorTotal)}</td>
                              <td>{formatarValor(fatura.valorPago)}</td>
                              <td><strong>{formatarValor(fatura.valorDevido)}</strong></td>
                              <td>
                                <span className={`status-badge ${getStatusClass(fatura.statusFatura)}`}>
                                  {fatura.statusFatura}
                                </span>
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
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default DashboardFornecedor;
