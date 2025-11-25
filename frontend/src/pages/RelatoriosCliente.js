import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import authService from '../services/authService';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import './Relatorios.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

function RelatoriosCliente() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dados
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [consumoPorCentro, setConsumoPorCentro] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [resumo, setResumo] = useState({
    totalDisponivel: 0,
    totalConsumido: 0,
    totalRestante: 0,
    centrosEmAlerta: 0
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'cliente') {
      navigate('/dashboard-cliente');
      return;
    }
    setUser(currentUser);
    loadDados();
  }, [navigate]);

  const loadDados = async () => {
    try {
      setLoading(true);
      
      // Buscar ordens de serviço do cliente
      const ordensRes = await api.get('/ordens-servico?limit=10000');
      const todasOrdens = ordensRes.data.ordensServico || [];
      
      // Filtrar apenas ordens do cliente logado
      const minhasOrdens = todasOrdens.filter(ordem => 
        ordem.cliente?._id === user?.clienteId || ordem.cliente === user?.clienteId
      );

      // Processar dados por centro de custo
      const centrosMap = new Map();
      
      minhasOrdens.forEach(ordem => {
        const centroCusto = ordem.centroCusto || 'Sem Centro de Custo';
        const subunidade = ordem.subunidade || '';
        const key = subunidade ? `${centroCusto} / ${subunidade}` : centroCusto;
        
        if (!centrosMap.has(key)) {
          centrosMap.set(key, {
            nome: key,
            centroCusto,
            subunidade,
            valorEmpenho: ordem.empenho ? parseFloat(ordem.empenho) || 0 : 0,
            consumoPecas: 0,
            consumoServicos: 0,
            consumoTotal: 0,
            ordens: []
          });
        }
        
        const centro = centrosMap.get(key);
        centro.consumoPecas += ordem.valorPecasComDesconto || 0;
        centro.consumoServicos += ordem.valorServicoComDesconto || 0;
        centro.consumoTotal += ordem.valorFinal || 0;
        centro.ordens.push(ordem);
      });

      // Converter para array e calcular disponível/restante
      const centrosArray = Array.from(centrosMap.values()).map(centro => ({
        ...centro,
        valorDisponivel: centro.valorEmpenho - centro.consumoTotal,
        percentualConsumido: centro.valorEmpenho > 0 
          ? ((centro.consumoTotal / centro.valorEmpenho) * 100).toFixed(1)
          : 0
      }));

      // Identificar centros em alerta (menos de R$ 1.000)
      const centrosAlerta = centrosArray.filter(c => c.valorDisponivel < 1000 && c.valorDisponivel > 0);
      
      // Calcular resumo
      const totalEmpenho = centrosArray.reduce((sum, c) => sum + c.valorEmpenho, 0);
      const totalConsumido = centrosArray.reduce((sum, c) => sum + c.consumoTotal, 0);
      const totalRestante = totalEmpenho - totalConsumido;

      setCentrosCusto(centrosArray);
      setConsumoPorCentro(centrosArray.map(c => ({
        nome: c.nome,
        Peças: c.consumoPecas,
        Serviços: c.consumoServicos,
        Total: c.consumoTotal
      })));
      
      setAlertas(centrosAlerta);
      setResumo({
        totalDisponivel: totalEmpenho,
        totalConsumido,
        totalRestante,
        centrosEmAlerta: centrosAlerta.length
      });

      // Mostrar notificações para centros em alerta
      if (centrosAlerta.length > 0) {
        centrosAlerta.forEach(centro => {
          toast.warning(
            `⚠️ Alerta: ${centro.nome} possui apenas ${formatCurrency(centro.valorDisponivel)} disponível!`,
            { autoClose: 8000 }
          );
        });
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar relatórios');
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

  if (loading) {
    return (
      <div className="page-container">
        <Header user={user} />
        <div className="content-wrapper">
          <Sidebar user={user} />
          <main className="main-content">
            <div className="relatorios-loading">
              <div className="spinner"></div>
              <p>Carregando relatórios...</p>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="relatorios-container">
            <div className="page-header">
              <div>
                <h1>📊 Relatórios - Centros de Custo</h1>
                <p>Visualize o consumo dos seus centros de custo e subunidades</p>
              </div>
              <button className="btn-atualizar" onClick={loadDados}>
                🔄 Atualizar
              </button>
            </div>

            {/* Cards de Resumo */}
            <div className="metricas-grid">
              <div className="metrica-card">
                <div className="metrica-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  💰
                </div>
                <div className="metrica-info">
                  <h3>Total Disponível</h3>
                  <p className="metrica-valor">{formatCurrency(resumo.totalDisponivel)}</p>
                  <span className="metrica-label">Valor de Empenho Total</span>
                </div>
              </div>

              <div className="metrica-card">
                <div className="metrica-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  📉
                </div>
                <div className="metrica-info">
                  <h3>Total Consumido</h3>
                  <p className="metrica-valor">{formatCurrency(resumo.totalConsumido)}</p>
                  <span className="metrica-label">Valor já utilizado</span>
                </div>
              </div>

              <div className="metrica-card">
                <div className="metrica-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                  💵
                </div>
                <div className="metrica-info">
                  <h3>Saldo Restante</h3>
                  <p className="metrica-valor">{formatCurrency(resumo.totalRestante)}</p>
                  <span className="metrica-label">Disponível para uso</span>
                </div>
              </div>

              <div className="metrica-card">
                <div className="metrica-icon" style={{ background: resumo.centrosEmAlerta > 0 ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' : 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                  {resumo.centrosEmAlerta > 0 ? '⚠️' : '✅'}
                </div>
                <div className="metrica-info">
                  <h3>Centros em Alerta</h3>
                  <p className="metrica-valor">{resumo.centrosEmAlerta}</p>
                  <span className="metrica-label">Saldo abaixo de R$ 1.000</span>
                </div>
              </div>
            </div>

            {/* Alertas */}
            {alertas.length > 0 && (
              <div className="alertas-section">
                <h2>⚠️ Centros de Custo em Alerta</h2>
                <div className="alertas-list">
                  {alertas.map((centro, index) => (
                    <div key={index} className="alerta-card">
                      <div className="alerta-icon">⚠️</div>
                      <div className="alerta-info">
                        <h3>{centro.nome}</h3>
                        <p>Saldo disponível: <strong>{formatCurrency(centro.valorDisponivel)}</strong></p>
                        <p>Consumido: {formatCurrency(centro.consumoTotal)} de {formatCurrency(centro.valorEmpenho)} ({centro.percentualConsumido}%)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gráfico de Consumo por Centro de Custo */}
            <div className="chart-section">
              <h2>Consumo por Centro de Custo / Subunidade</h2>
              <div className="chart-card">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={consumoPorCentro}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="Peças" fill="#667eea" />
                    <Bar dataKey="Serviços" fill="#764ba2" />
                    <Bar dataKey="Total" fill="#f093fb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabela Detalhada */}
            <div className="tabela-section">
              <h2>Detalhamento por Centro de Custo</h2>
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Centro de Custo / Subunidade</th>
                      <th>Valor Empenho</th>
                      <th>Consumo Peças</th>
                      <th>Consumo Serviços</th>
                      <th>Consumo Total</th>
                      <th>Disponível</th>
                      <th>% Consumido</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {centrosCusto.map((centro, index) => (
                      <tr key={index}>
                        <td><strong>{centro.nome}</strong></td>
                        <td>{formatCurrency(centro.valorEmpenho)}</td>
                        <td>{formatCurrency(centro.consumoPecas)}</td>
                        <td>{formatCurrency(centro.consumoServicos)}</td>
                        <td><strong>{formatCurrency(centro.consumoTotal)}</strong></td>
                        <td className={centro.valorDisponivel < 1000 ? 'valor-alerta' : ''}>
                          {formatCurrency(centro.valorDisponivel)}
                        </td>
                        <td>{centro.percentualConsumido}%</td>
                        <td>
                          {centro.valorDisponivel < 1000 && centro.valorDisponivel > 0 ? (
                            <span className="badge badge-warning">⚠️ Alerta</span>
                          ) : centro.valorDisponivel <= 0 ? (
                            <span className="badge badge-danger">❌ Esgotado</span>
                          ) : (
                            <span className="badge badge-success">✅ Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default RelatoriosCliente;
