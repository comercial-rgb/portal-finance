import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './DashboardCliente.css';

function DashboardCliente() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFaturas: 0,
    totalAPagar: 0,
    totalPago: 0,
    ordensServico: 0
  });
  const [faturas, setFaturas] = useState([]);
  const [ordensServico, setOrdensServico] = useState([]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar faturas do cliente
      const faturasRes = await api.get('/faturas?tipo=Cliente');
      const faturasData = faturasRes.data;
      
      // Carregar ordens de serviço
      const osRes = await api.get('/ordens-servico');
      const osData = osRes.data.ordensServico || osRes.data;
      
      // Calcular estatísticas
      const totalAPagar = faturasData
        .filter(f => f.statusFatura !== 'Paga')
        .reduce((sum, f) => sum + (f.valorRestante || 0), 0);
      
      const totalPago = faturasData.reduce((sum, f) => sum + (f.valorPago || 0), 0);
      
      setStats({
        totalFaturas: faturasData.length,
        totalAPagar,
        totalPago,
        ordensServico: Array.isArray(osData) ? osData.length : 0
      });
      
      setFaturas(faturasData.slice(0, 5)); // Últimas 5 faturas
      setOrdensServico(Array.isArray(osData) ? osData.slice(0, 5) : []); // Últimas 5 OS
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarValor = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarData = (data) => {
    if (!data) return '-';
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Aguardando pagamento':
        return 'status-pendente';
      case 'Parcialmente paga':
        return 'status-parcial';
      case 'Paga':
        return 'status-paga';
      case 'Autorizada':
        return 'status-autorizada';
      default:
        return '';
    }
  };

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="dashboard-cliente-container">
            <div className="dashboard-header">
              <div>
                <h1>Dashboard Cliente</h1>
                <p>Bem-vindo! Aqui você pode acompanhar suas faturas e ordens de serviço</p>
              </div>
            </div>

            {loading ? (
              <div className="loading">Carregando dados...</div>
            ) : (
              <>
                {/* Cards de Estatísticas */}
                <div className="stats-grid">
                  <div className="stat-card stat-faturas">
                    <div className="stat-icon">📄</div>
                    <div className="stat-content">
                      <h3>Total de Faturas</h3>
                      <p className="stat-value">{stats.totalFaturas}</p>
                      <span className="stat-label">Faturas emitidas</span>
                    </div>
                  </div>

                  <div className="stat-card stat-apagar">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                      <h3>Total a Pagar</h3>
                      <p className="stat-value">{formatarValor(stats.totalAPagar)}</p>
                      <span className="stat-label">Valores pendentes</span>
                    </div>
                  </div>

                  <div className="stat-card stat-pago">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                      <h3>Total Pago</h3>
                      <p className="stat-value">{formatarValor(stats.totalPago)}</p>
                      <span className="stat-label">Valores quitados</span>
                    </div>
                  </div>

                  <div className="stat-card stat-os">
                    <div className="stat-icon">🔧</div>
                    <div className="stat-content">
                      <h3>Ordens de Serviço</h3>
                      <p className="stat-value">{stats.ordensServico}</p>
                      <span className="stat-label">Serviços solicitados</span>
                    </div>
                  </div>
                </div>

                {/* Últimas Faturas */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h2>Últimas Faturas</h2>
                    <button 
                      className="btn-ver-todas"
                      onClick={() => navigate('/faturados')}
                    >
                      Ver todas →
                    </button>
                  </div>
                  
                  {faturas.length === 0 ? (
                    <div className="empty-state">
                      <p>📋 Nenhuma fatura encontrada</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>Nº Fatura</th>
                            <th>Fornecedor</th>
                            <th>Período</th>
                            <th>Valor Total</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {faturas.map(fatura => (
                            <tr 
                              key={fatura._id}
                              onClick={() => navigate(`/faturados/editar/${fatura._id}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td><strong>{fatura.numeroFatura}</strong></td>
                              <td>{fatura.fornecedor?.razaoSocial || fatura.fornecedor?.nomeFantasia}</td>
                              <td>{formatarData(fatura.periodoInicio)} - {formatarData(fatura.periodoFim)}</td>
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

                {/* Últimas Ordens de Serviço */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h2>Últimas Ordens de Serviço</h2>
                    <button 
                      className="btn-ver-todas"
                      onClick={() => navigate('/ordens-servico')}
                    >
                      Ver todas →
                    </button>
                  </div>
                  
                  {ordensServico.length === 0 ? (
                    <div className="empty-state">
                      <p>🔧 Nenhuma ordem de serviço encontrada</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>Nº OS</th>
                            <th>Fornecedor</th>
                            <th>Tipo</th>
                            <th>Valor Final</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ordensServico.map(os => (
                            <tr 
                              key={os._id}
                              onClick={() => navigate(`/ordens-servico/editar/${os._id}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td><strong>{os.numeroOrdemServico}</strong></td>
                              <td>{os.fornecedor?.razaoSocial || os.fornecedor?.nomeFantasia}</td>
                              <td>{os.tipoServicoSolicitado?.nome || '-'}</td>
                              <td><strong>{formatarValor(os.valorFinal)}</strong></td>
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
              </>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default DashboardCliente;
