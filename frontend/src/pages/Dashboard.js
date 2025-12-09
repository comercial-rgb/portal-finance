import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import authService from '../services/authService';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import FaturasVencidasAlert from '../components/FaturasVencidasAlert';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    fornecedores: 0,
    clientes: 0,
    faturas: 0,
    ordensServico: 0
  });
  const [atividades, setAtividades] = useState([]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    // Redirecionar fornecedor para dashboard específico
    if (currentUser?.role === 'fornecedor') {
      navigate('/dashboard-fornecedor', { replace: true });
      return;
    }

    // Verificar se é a primeira vez após login
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    if (justLoggedIn === 'true') {
      setShowWelcome(true);
      sessionStorage.removeItem('justLoggedIn');
      
      // Esconder mensagem de boas-vindas após 3 segundos
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [navigate]);

  useEffect(() => {
    if (user && user.role !== 'fornecedor') {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar dados em paralelo
      const [fornecedoresRes, clientesRes, faturasRes, ordensRes] = await Promise.all([
        api.get('/fornecedores?limit=1').catch(() => ({ data: { fornecedores: [], total: 0 } })),
        api.get('/clientes?limit=1').catch(() => ({ data: { clientes: [], total: 0 } })),
        api.get('/faturas').catch(() => ({ data: [] })),
        api.get('/ordens-servico?limit=1').catch(() => ({ data: { ordensServico: [], total: 0 } }))
      ]);

      // Extrair totais corretamente (a API retorna { fornecedores, total, totalPages, currentPage })
      const totalFornecedores = fornecedoresRes.data.total || (fornecedoresRes.data.fornecedores || fornecedoresRes.data || []).length;
      const totalClientes = clientesRes.data.total || (clientesRes.data.clientes || clientesRes.data || []).length;
      const faturasData = Array.isArray(faturasRes.data) ? faturasRes.data : faturasRes.data.faturas || [];
      const totalOrdens = ordensRes.data.total || (ordensRes.data.ordensServico || ordensRes.data || []).length;

      setStats({
        fornecedores: totalFornecedores,
        clientes: totalClientes,
        faturas: Array.isArray(faturasData) ? faturasData.length : 0,
        ordensServico: totalOrdens
      });

      // Carregar atividades recentes separadamente
      const [ordensRecentesRes] = await Promise.all([
        api.get('/ordens-servico?limit=5').catch(() => ({ data: { ordensServico: [] } }))
      ]);
      
      const ordensData = ordensRecentesRes.data.ordensServico || ordensRecentesRes.data || [];

      // Preparar atividades recentes (últimas 5)
      const atividadesRecentes = [];

      // Adicionar ordens de serviço recentes
      if (Array.isArray(ordensData)) {
        ordensData
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3)
          .forEach(os => {
            atividadesRecentes.push({
              tipo: 'ordem_servico',
              descricao: `OS #${os.numeroOrdemServico || os.codigo} criada`,
              cliente: os.cliente?.razaoSocial || os.cliente?.nomeFantasia || 'Cliente',
              data: os.createdAt,
              id: os._id
            });
          });
      }

      // Adicionar faturas recentes
      if (Array.isArray(faturasData)) {
        faturasData
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3)
          .forEach(fatura => {
            atividadesRecentes.push({
              tipo: 'fatura',
              descricao: `Fatura #${fatura.numeroFatura} emitida`,
              cliente: fatura.cliente?.razaoSocial || fatura.cliente?.nomeFantasia || 'Cliente',
              data: fatura.createdAt,
              id: fatura._id
            });
          });
      }

      // Ordenar por data e pegar as 5 mais recentes
      atividadesRecentes.sort((a, b) => new Date(b.data) - new Date(a.data));
      setAtividades(atividadesRecentes.slice(0, 5));

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm) => {
    console.log('Buscar:', searchTerm);
    // Implementar lógica de busca
  };

  const getRoleDisplay = (role) => {
    const roles = {
      super_admin: 'Super Administrador',
      admin: 'Administrador',
      gerente: 'Gerente',
      funcionario: 'Funcionário',
      fornecedor: 'Fornecedor'
    };
    return roles[role] || role;
  };

  return (
    <div className="dashboard-layout">
      <Header user={user} onSearch={handleSearch} />
      
      {/* Alerta de faturas vencidas apenas para admin e super_admin */}
      {user && ['admin', 'super_admin'].includes(user.role) && (
        <FaturasVencidasAlert />
      )}
      
      <div className="dashboard-body">
        <Sidebar user={user} />
        
        <main className="dashboard-main">
          {showWelcome && (
            <div className="welcome-banner">
              <div className="welcome-icon">✓</div>
              <div className="welcome-content">
                <h3>Login realizado com sucesso!</h3>
                <p>Bem-vindo ao Sistema Financeiro - InstaSolutions</p>
              </div>
            </div>
          )}

          <div className="page-header">
            <h1>Dashboard</h1>
            <p className="page-subtitle">
              Bem-vindo(a), <strong>{user?.nome}</strong> • 
              Você está logado como <strong>{getRoleDisplay(user?.role)}</strong>
            </p>
          </div>

          <div className="dashboard-grid">
            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <polyline points="17 11 19 13 23 9"/>
                </svg>
              </div>
              <div className="stats-content">
                <h3>Fornecedores</h3>
                <p className="stats-number">{loading ? '...' : stats.fornecedores}</p>
                <p className="stats-label">Total cadastrados</p>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="stats-content">
                <h3>Clientes</h3>
                <p className="stats-number">{loading ? '...' : stats.clientes}</p>
                <p className="stats-label">Total cadastrados</p>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div className="stats-content">
                <h3>Faturas</h3>
                <p className="stats-number">{loading ? '...' : stats.faturas}</p>
                <p className="stats-label">Total emitidas</p>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              </div>
              <div className="stats-content">
                <h3>Ordens de Serviço</h3>
                <p className="stats-number">{loading ? '...' : stats.ordensServico}</p>
                <p className="stats-label">Total registradas</p>
              </div>
            </div>
          </div>

          <div className="content-grid">
            <div className="content-card">
              <h3>Atividades Recentes</h3>
              {loading ? (
                <div className="loading" style={{ padding: '20px', textAlign: 'center' }}>Carregando...</div>
              ) : atividades.length === 0 ? (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p>Nenhuma atividade recente</p>
                </div>
              ) : (
                <div className="atividades-list">
                  {atividades.map((atividade, index) => (
                    <div key={`${atividade.tipo}-${atividade.id}-${index}`} className="atividade-item">
                      <div className="atividade-icon" style={{
                        background: atividade.tipo === 'ordem_servico' 
                          ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                          : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                      }}>
                        {atividade.tipo === 'ordem_servico' ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                        )}
                      </div>
                      <div className="atividade-content">
                        <p className="atividade-descricao">{atividade.descricao}</p>
                        <p className="atividade-cliente">{atividade.cliente}</p>
                        <p className="atividade-data">
                          {new Date(atividade.data).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="content-card">
              <h3>Acesso Rápido</h3>
              <div className="quick-actions">
                <button className="quick-action-btn" onClick={() => navigate('/fornecedores')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  <span>Novo Fornecedor</span>
                </button>
                <button className="quick-action-btn" onClick={() => navigate('/clientes')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  <span>Novo Cliente</span>
                </button>
                <button className="quick-action-btn" onClick={() => navigate('/faturas-fornecedores')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  <span>Nova Fatura</span>
                </button>
                <button className="quick-action-btn" onClick={() => navigate('/ordens-servico')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                  <span>Nova OS</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
