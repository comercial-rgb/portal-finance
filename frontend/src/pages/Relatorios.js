import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';
import authService from '../services/authService';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import RelatoriosCliente from './RelatoriosCliente';
import './Relatorios.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

function Relatorios() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [periodo, setPeriodo] = useState('mes_atual');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState('');
  
  // Dados
  const [clientes, setClientes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [analytics, setAnalytics] = useState({
    faturamentoMensal: [],
    topClientes: [],
    topFornecedores: [],
    ordensStatus: [],
    faturasStatus: [],
    resumo: {
      totalFaturamento: 0,
      totalOrdensServico: 0,
      totalClientes: 0,
      totalFornecedores: 0,
      ticketMedio: 0
    }
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Se for fornecedor, redireciona
    if (currentUser.role === 'fornecedor') {
      navigate('/dashboard-fornecedor');
      return;
    }
    
    setUser(currentUser);
    
    // Se não for cliente, carrega dados normais
    if (currentUser.role !== 'cliente') {
      loadInitialData();
    }
  }, [navigate]);

  useEffect(() => {
    if (user && user.role !== 'cliente') {
      loadAnalytics();
    }
  }, [periodo, dataInicio, dataFim, clienteSelecionado, fornecedorSelecionado, user]);
  
  // Se for cliente, renderiza o componente específico
  if (user?.role === 'cliente') {
    return <RelatoriosCliente />;
  }

  const loadInitialData = async () => {
    try {
      const [clientesRes, fornecedoresRes] = await Promise.all([
        api.get('/clientes?limit=1000'),
        api.get('/fornecedores?limit=1000')
      ]);
      
      setClientes(clientesRes.data.clientes || []);
      setFornecedores(fornecedoresRes.data.fornecedores || []);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      toast.error('Erro ao carregar dados');
    }
  };

  const calcularPeriodo = () => {
    const hoje = new Date();
    let inicio, fim;

    switch (periodo) {
      case 'mes_atual':
        inicio = startOfMonth(hoje);
        fim = endOfMonth(hoje);
        break;
      case 'mes_anterior':
        const mesAnterior = subMonths(hoje, 1);
        inicio = startOfMonth(mesAnterior);
        fim = endOfMonth(mesAnterior);
        break;
      case 'ultimos_3_meses':
        inicio = subMonths(startOfMonth(hoje), 2);
        fim = endOfMonth(hoje);
        break;
      case 'ultimos_6_meses':
        inicio = subMonths(startOfMonth(hoje), 5);
        fim = endOfMonth(hoje);
        break;
      case 'ano_atual':
        inicio = new Date(hoje.getFullYear(), 0, 1);
        fim = new Date(hoje.getFullYear(), 11, 31);
        break;
      case 'personalizado':
        inicio = dataInicio ? new Date(dataInicio) : subMonths(hoje, 1);
        fim = dataFim ? new Date(dataFim) : hoje;
        break;
      default:
        inicio = startOfMonth(hoje);
        fim = endOfMonth(hoje);
    }

    return {
      inicio: format(inicio, 'yyyy-MM-dd'),
      fim: format(fim, 'yyyy-MM-dd')
    };
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { inicio, fim } = calcularPeriodo();

      // Buscar dados
      const [ordensRes, faturasRes] = await Promise.all([
        api.get(`/ordens-servico?dataInicio=${inicio}&dataFim=${fim}&limit=10000`),
        api.get(`/faturas`)
      ]);

      let ordensData = ordensRes.data.ordensServico || [];
      let faturasData = Array.isArray(faturasRes.data) ? faturasRes.data : faturasRes.data.faturas || [];

      // Aplicar filtros
      if (clienteSelecionado) {
        ordensData = ordensData.filter(o => 
          (o.cliente?._id || o.cliente) === clienteSelecionado
        );
        faturasData = faturasData.filter(f => 
          (f.cliente?._id || f.cliente) === clienteSelecionado
        );
      }

      if (fornecedorSelecionado) {
        ordensData = ordensData.filter(o => 
          (o.fornecedor?._id || o.fornecedor) === fornecedorSelecionado
        );
      }

      // Processar dados para gráficos
      processarAnalytics(ordensData, faturasData);
      
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const processarAnalytics = (ordens, faturas) => {
    // Faturamento Mensal
    const faturamentoPorMes = {};
    faturas.forEach(fatura => {
      const mes = format(new Date(fatura.createdAt), 'MMM/yy', { locale: ptBR });
      faturamentoPorMes[mes] = (faturamentoPorMes[mes] || 0) + (fatura.valorTotal || 0);
    });

    const faturamentoMensal = Object.entries(faturamentoPorMes)
      .map(([mes, valor]) => ({ mes, valor }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // Top Clientes por Faturamento
    const faturamentoPorCliente = {};
    ordens.forEach(ordem => {
      const clienteNome = ordem.cliente?.razaoSocial || ordem.cliente?.nomeFantasia || 'Sem Cliente';
      faturamentoPorCliente[clienteNome] = (faturamentoPorCliente[clienteNome] || 0) + (ordem.valorFinal || 0);
    });

    const topClientes = Object.entries(faturamentoPorCliente)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    // Top Fornecedores
    const faturamentoPorFornecedor = {};
    ordens.forEach(ordem => {
      const fornecedorNome = ordem.fornecedor?.razaoSocial || ordem.fornecedor?.nomeFantasia || 'Sem Fornecedor';
      faturamentoPorFornecedor[fornecedorNome] = (faturamentoPorFornecedor[fornecedorNome] || 0) + (ordem.valorFinal || 0);
    });

    const topFornecedores = Object.entries(faturamentoPorFornecedor)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    // Status das Ordens
    const ordensStatusCount = ordens.reduce((acc, ordem) => {
      const status = ordem.status || 'Sem Status';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const ordensStatus = Object.entries(ordensStatusCount)
      .map(([status, quantidade]) => ({ status, quantidade }));

    // Status das Faturas
    const faturasStatusCount = faturas.reduce((acc, fatura) => {
      const status = fatura.status || 'Pendente';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const faturasStatus = Object.entries(faturasStatusCount)
      .map(([status, quantidade]) => ({ status, quantidade }));

    // Resumo
    const totalFaturamento = ordens.reduce((sum, o) => sum + (o.valorFinal || 0), 0);
    const clientesUnicos = new Set(ordens.map(o => o.cliente?._id || o.cliente)).size;
    const fornecedoresUnicos = new Set(ordens.map(o => o.fornecedor?._id || o.fornecedor)).size;
    const ticketMedio = ordens.length > 0 ? totalFaturamento / ordens.length : 0;

    setAnalytics({
      faturamentoMensal,
      topClientes,
      topFornecedores,
      ordensStatus,
      faturasStatus,
      resumo: {
        totalFaturamento,
        totalOrdensServico: ordens.length,
        totalClientes: clientesUnicos,
        totalFornecedores: fornecedoresUnicos,
        ticketMedio
      }
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const exportarExcel = () => {
    toast.info('Exportação Excel em desenvolvimento');
  };

  const exportarPDF = () => {
    toast.info('Exportação PDF em desenvolvimento');
  };

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="relatorios-container">
            <div className="page-header">
              <h1>📊 Relatórios e Analytics</h1>
              <div className="header-actions">
                <button className="btn-export" onClick={exportarExcel}>
                  📊 Exportar Excel
                </button>
                <button className="btn-export" onClick={exportarPDF}>
                  📄 Exportar PDF
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="filtros-section">
              <h3>Filtros</h3>
              <div className="filtros-grid">
                <div className="form-group">
                  <label>Período</label>
                  <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                    <option value="mes_atual">Mês Atual</option>
                    <option value="mes_anterior">Mês Anterior</option>
                    <option value="ultimos_3_meses">Últimos 3 Meses</option>
                    <option value="ultimos_6_meses">Últimos 6 Meses</option>
                    <option value="ano_atual">Ano Atual</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </div>

                {periodo === 'personalizado' && (
                  <>
                    <div className="form-group">
                      <label>Data Início</label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Data Fim</label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>Cliente</label>
                  <select value={clienteSelecionado} onChange={(e) => setClienteSelecionado(e.target.value)}>
                    <option value="">Todos</option>
                    {clientes.map(c => (
                      <option key={c._id} value={c._id}>{c.razaoSocial || c.nomeFantasia}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fornecedor</label>
                  <select value={fornecedorSelecionado} onChange={(e) => setFornecedorSelecionado(e.target.value)}>
                    <option value="">Todos</option>
                    {fornecedores.map(f => (
                      <option key={f._id} value={f._id}>{f.razaoSocial || f.nomeFantasia}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">Carregando relatórios...</div>
            ) : (
              <>
                {/* Cards de Resumo */}
                <div className="resumo-grid">
                  <div className="resumo-card">
                    <div className="resumo-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      💰
                    </div>
                    <div className="resumo-content">
                      <h4>Faturamento Total</h4>
                      <p className="resumo-valor">{formatCurrency(analytics.resumo.totalFaturamento)}</p>
                    </div>
                  </div>

                  <div className="resumo-card">
                    <div className="resumo-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                      🔧
                    </div>
                    <div className="resumo-content">
                      <h4>Ordens de Serviço</h4>
                      <p className="resumo-valor">{analytics.resumo.totalOrdensServico}</p>
                    </div>
                  </div>

                  <div className="resumo-card">
                    <div className="resumo-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                      👥
                    </div>
                    <div className="resumo-content">
                      <h4>Clientes Ativos</h4>
                      <p className="resumo-valor">{analytics.resumo.totalClientes}</p>
                    </div>
                  </div>

                  <div className="resumo-card">
                    <div className="resumo-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                      📊
                    </div>
                    <div className="resumo-content">
                      <h4>Ticket Médio</h4>
                      <p className="resumo-valor">{formatCurrency(analytics.resumo.ticketMedio)}</p>
                    </div>
                  </div>
                </div>

                {/* Gráficos */}
                <div className="graficos-grid">
                  {/* Faturamento Mensal */}
                  <div className="grafico-card">
                    <h3>📈 Faturamento Mensal</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics.faturamentoMensal}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="valor" stroke="#667eea" strokeWidth={3} name="Faturamento" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top Clientes */}
                  <div className="grafico-card">
                    <h3>🏆 Top 10 Clientes</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.topClientes} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="nome" type="category" width={120} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="valor" fill="#764ba2" name="Faturamento" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Status Ordens */}
                  <div className="grafico-card">
                    <h3>📋 Status das Ordens</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.ordensStatus}
                          dataKey="quantidade"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {analytics.ordensStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top Fornecedores */}
                  <div className="grafico-card">
                    <h3>🛠️ Top 10 Fornecedores</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.topFornecedores}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="valor" fill="#43e97b" name="Faturamento" />
                      </BarChart>
                    </ResponsiveContainer>
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

export default Relatorios;
