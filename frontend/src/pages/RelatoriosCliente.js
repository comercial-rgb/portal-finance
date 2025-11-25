import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import authService from '../services/authService';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import './Relatorios.css';

function RelatoriosCliente() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState([]);
  
  const [filtros, setFiltros] = useState({
    centroCusto: '',
    subunidade: '',
    contrato: '',
    empenho: '',
    tipoEmpenho: ''
  });
  
  const [centrosCustoList, setCentrosCustoList] = useState([]);
  const [subunidadesList, setSubunidadesList] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [empenhos, setEmpenhos] = useState([]);
  
  const [resumo, setResumo] = useState({
    valorContrato: 0,
    valorEmpenhosGerados: 0,
    valorConsumido: 0,
    valorDisponivel: 0
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'cliente') {
      navigate('/dashboard-cliente');
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadDados();
    }
    // eslint-disable-next-line
  }, [user]);

  useEffect(() => {
    if (ordens.length > 0) {
      calcularResumo();
    }
    // eslint-disable-next-line
  }, [ordens, filtros]);

  const loadDados = async () => {
    try {
      setLoading(true);
      const ordensRes = await api.get('/ordens-servico', { params: { limit: 10000 } });
      const todasOrdens = ordensRes.data.ordensServico || [];
      const minhasOrdens = todasOrdens.filter(ordem => {
        const clienteId = ordem.cliente?._id || ordem.cliente;
        return String(clienteId) === String(user?.clienteId);
      });
      setOrdens(minhasOrdens);
      setCentrosCustoList([...new Set(minhasOrdens.map(o => o.centroCusto).filter(Boolean))]);
      setSubunidadesList([...new Set(minhasOrdens.map(o => o.subunidade).filter(Boolean))]);
      setContratos([...new Set(minhasOrdens.map(o => o.contratoEmpenhoPecas || o.contratoEmpenhoServicos).filter(Boolean))]);
      setEmpenhos([...new Set([...minhasOrdens.map(o => o.empenhoPecas).filter(Boolean), ...minhasOrdens.map(o => o.empenhoServicos).filter(Boolean)])]);
      setLoading(false);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar dados');
      setLoading(false);
    }
  };

  const calcularResumo = () => {
    let ordensFiltradas = ordens;
    if (filtros.centroCusto) ordensFiltradas = ordensFiltradas.filter(o => o.centroCusto === filtros.centroCusto);
    if (filtros.subunidade) ordensFiltradas = ordensFiltradas.filter(o => o.subunidade === filtros.subunidade);
    if (filtros.contrato) ordensFiltradas = ordensFiltradas.filter(o => o.contratoEmpenhoPecas === filtros.contrato || o.contratoEmpenhoServicos === filtros.contrato);
    if (filtros.empenho) ordensFiltradas = ordensFiltradas.filter(o => o.empenhoPecas === filtros.empenho || o.empenhoServicos === filtros.empenho);
    if (filtros.tipoEmpenho === 'pecas') ordensFiltradas = ordensFiltradas.filter(o => o.empenhoPecas);
    if (filtros.tipoEmpenho === 'servicos') ordensFiltradas = ordensFiltradas.filter(o => o.empenhoServicos);
    
    let valorConsumido = 0, valorEmpenhoPecas = 0, valorEmpenhoServicos = 0;
    ordensFiltradas.forEach(ordem => {
      if (['Autorizado', 'Aguardando pagamento', 'Pago'].includes(ordem.status)) {
        valorConsumido += ordem.valorFinal || 0;
      }
      if (filtros.tipoEmpenho === '' || filtros.tipoEmpenho === 'pecas') {
        valorEmpenhoPecas += ordem.valorPecasComDesconto || ordem.valorPecas || 0;
      }
      if (filtros.tipoEmpenho === '' || filtros.tipoEmpenho === 'servicos') {
        valorEmpenhoServicos += ordem.valorServicoComDesconto || ordem.valorServico || 0;
      }
    });
    
    const valorEmpenhosGerados = valorEmpenhoPecas + valorEmpenhoServicos;
    setResumo({
      valorContrato: valorEmpenhosGerados * 1.2,
      valorEmpenhosGerados,
      valorConsumido,
      valorDisponivel: valorEmpenhosGerados - valorConsumido
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Aguardando autorização': 'warning',
      'Autorizado': 'success',
      'Aguardando pagamento': 'info',
      'Pago': 'success',
      'Cancelado': 'danger'
    };
    return colors[status] || 'secondary';
  };

  const filtrarOrdens = (ordem) => {
    if (filtros.centroCusto && ordem.centroCusto !== filtros.centroCusto) return false;
    if (filtros.subunidade && ordem.subunidade !== filtros.subunidade) return false;
    if (filtros.contrato && ordem.contratoEmpenhoPecas !== filtros.contrato && ordem.contratoEmpenhoServicos !== filtros.contrato) return false;
    if (filtros.empenho && ordem.empenhoPecas !== filtros.empenho && ordem.empenhoServicos !== filtros.empenho) return false;
    if (filtros.tipoEmpenho === 'pecas' && !ordem.empenhoPecas) return false;
    if (filtros.tipoEmpenho === 'servicos' && !ordem.empenhoServicos) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="app-container">
        <Header user={user} />
        <div className="main-wrapper">
          <Sidebar user={user} />
          <main className="main-content">
            <div className="relatorios-loading">
              <div className="spinner"></div>
              <p>Carregando...</p>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header user={user} />
      <div className="main-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="relatorios-container">
            <div className="page-header">
              <div>
                <h1>📊 Relatórios Financeiros</h1>
                <p>Acompanhe contratos, empenhos e consumo</p>
              </div>
              <button className="btn-atualizar" onClick={loadDados}>🔄 Atualizar</button>
            </div>

            <div className="cards-resumo">
              <div className="card-resumo card-blue">
                <div className="card-icon">💼</div>
                <div className="card-info">
                  <span className="card-label">Valor do Contrato</span>
                  <span className="card-value">{formatCurrency(resumo.valorContrato)}</span>
                </div>
              </div>
              <div className="card-resumo card-purple">
                <div className="card-icon">📄</div>
                <div className="card-info">
                  <span className="card-label">Empenhos Gerados</span>
                  <span className="card-value">{formatCurrency(resumo.valorEmpenhosGerados)}</span>
                </div>
              </div>
              <div className="card-resumo card-orange">
                <div className="card-icon">📊</div>
                <div className="card-info">
                  <span className="card-label">Valor Consumido (OS)</span>
                  <span className="card-value">{formatCurrency(resumo.valorConsumido)}</span>
                </div>
              </div>
              <div className={`card-resumo ${resumo.valorDisponivel < 1000 ? 'card-red' : 'card-green'}`}>
                <div className="card-icon">💰</div>
                <div className="card-info">
                  <span className="card-label">Valor Disponível</span>
                  <span className="card-value">{formatCurrency(resumo.valorDisponivel)}</span>
                </div>
              </div>
            </div>

            <div className="filtros-section">
              <h3>🔍 Filtros</h3>
              <div className="filtros-grid">
                <div className="filtro-group">
                  <label>Centro de Custo</label>
                  <select value={filtros.centroCusto} onChange={(e) => setFiltros({...filtros, centroCusto: e.target.value})}>
                    <option value="">Todos</option>
                    {centrosCustoList.map(cc => <option key={cc} value={cc}>{cc}</option>)}
                  </select>
                </div>
                <div className="filtro-group">
                  <label>Subunidade</label>
                  <select value={filtros.subunidade} onChange={(e) => setFiltros({...filtros, subunidade: e.target.value})}>
                    <option value="">Todas</option>
                    {subunidadesList.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
                <div className="filtro-group">
                  <label>Contrato</label>
                  <select value={filtros.contrato} onChange={(e) => setFiltros({...filtros, contrato: e.target.value})}>
                    <option value="">Todos</option>
                    {contratos.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="filtro-group">
                  <label>Empenho</label>
                  <select value={filtros.empenho} onChange={(e) => setFiltros({...filtros, empenho: e.target.value})}>
                    <option value="">Todos</option>
                    {empenhos.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="filtro-group">
                  <label>Tipo de Empenho</label>
                  <select value={filtros.tipoEmpenho} onChange={(e) => setFiltros({...filtros, tipoEmpenho: e.target.value})}>
                    <option value="">Peças e Serviços</option>
                    <option value="pecas">Apenas Peças</option>
                    <option value="servicos">Apenas Serviços</option>
                  </select>
                </div>
                <div className="filtro-group filtro-actions">
                  <button className="btn-limpar" onClick={() => setFiltros({centroCusto:'',subunidade:'',contrato:'',empenho:'',tipoEmpenho:''})}>🗑️ Limpar</button>
                </div>
              </div>
            </div>

            <div className="tabela-section">
              <h3>📋 Consumo por Centro de Custo / Subunidade</h3>
              {ordens.filter(filtrarOrdens).length === 0 ? (
                <p className="sem-dados">Nenhuma ordem encontrada.</p>
              ) : (
                <table className="tabela-relatorios">
                  <thead>
                    <tr>
                      <th>OS</th>
                      <th>Centro de Custo</th>
                      <th>Subunidade</th>
                      <th>Contrato</th>
                      <th>Empenho</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordens.filter(filtrarOrdens).map(ordem => (
                      <tr key={ordem._id}>
                        <td>{ordem.numeroOrdemServico || ordem.codigo}</td>
                        <td>{ordem.centroCusto || '-'}</td>
                        <td>{ordem.subunidade || '-'}</td>
                        <td>{ordem.contratoEmpenhoPecas || ordem.contratoEmpenhoServicos || '-'}</td>
                        <td>{ordem.empenhoPecas || ordem.empenhoServicos || '-'}</td>
                        <td>{ordem.empenhoPecas && ordem.empenhoServicos ? 'Peças + Serviços' : ordem.empenhoPecas ? 'Peças' : ordem.empenhoServicos ? 'Serviços' : '-'}</td>
                        <td className="valor-destaque">{formatCurrency(ordem.valorFinal)}</td>
                        <td><span className={`badge badge-${getStatusColor(ordem.status)}`}>{ordem.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default RelatoriosCliente;
