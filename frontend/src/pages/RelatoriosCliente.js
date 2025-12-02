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
  const [clienteData, setClienteData] = useState(null);
  
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
  const [contratoMap, setContratoMap] = useState({});
  const [empenhoMap, setEmpenhoMap] = useState({});
  
  const [resumo, setResumo] = useState({
    valorContrato: 0,
    totalEmpenhado: 0,
    valorConsumido: 0,
    valorDisponivel: 0,
    empenhosAtivos: 0
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
      
      // Buscar dados do cliente com contratos e empenhos
      const clienteRes = await api.get(`/clientes/${user.clienteId}`);
      const cliente = clienteRes.data;
      setClienteData(cliente);
      
      // Criar mapeamento de IDs para números de contratos e empenhos
      const contratoMapping = {};
      const empenhoMapping = {};
      const contratosDisponiveis = [];
      const empenhosDisponiveis = [];
      
      if (cliente.contratos && cliente.contratos.length > 0) {
        cliente.contratos.forEach(contrato => {
          contratoMapping[contrato._id] = {
            numero: contrato.numeroContrato,
            valor: contrato.valor,
            dataInicial: contrato.dataInicial,
            dataFinal: contrato.dataFinal,
            ativo: contrato.ativo
          };
          contratosDisponiveis.push({
            id: contrato._id,
            numero: contrato.numeroContrato
          });
          
          if (contrato.empenhos && contrato.empenhos.length > 0) {
            contrato.empenhos.forEach(empenho => {
              empenhoMapping[empenho._id] = {
                numero: empenho.numeroEmpenho,
                valor: empenho.valor,
                valorUtilizado: empenho.valorUtilizado || 0,
                valorAnulado: empenho.valorAnulado || 0,
                tipo: empenho.tipo,
                centroCusto: empenho.centroCusto,
                subunidade: empenho.subunidade,
                contratoId: contrato._id,
                numeroContrato: contrato.numeroContrato,
                ativo: empenho.ativo
              };
              empenhosDisponiveis.push({
                id: empenho._id,
                numero: empenho.numeroEmpenho,
                contrato: contrato.numeroContrato
              });
            });
          }
        });
      }
      
      setContratoMap(contratoMapping);
      setEmpenhoMap(empenhoMapping);
      
      // Buscar ordens de serviço
      const ordensRes = await api.get('/ordens-servico', { params: { limit: 10000 } });
      const todasOrdens = ordensRes.data.ordensServico || [];
      const minhasOrdens = todasOrdens.filter(ordem => {
        const clienteId = ordem.cliente?._id || ordem.cliente;
        return String(clienteId) === String(user?.clienteId);
      });
      
      setOrdens(minhasOrdens);
      setCentrosCustoList([...new Set(minhasOrdens.map(o => o.centroCusto).filter(Boolean))]);
      setSubunidadesList([...new Set(minhasOrdens.map(o => o.subunidade).filter(Boolean))]);
      setContratos(contratosDisponiveis);
      setEmpenhos(empenhosDisponiveis);
      
      setLoading(false);
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao carregar dados');
      setLoading(false);
    }
  };

  const calcularResumo = () => {
    if (!clienteData || !clienteData.contratos) {
      return;
    }
    
    // Aplicar filtros nas ordens
    let ordensFiltradas = ordens;
    if (filtros.centroCusto) ordensFiltradas = ordensFiltradas.filter(o => o.centroCusto === filtros.centroCusto);
    if (filtros.subunidade) ordensFiltradas = ordensFiltradas.filter(o => o.subunidade === filtros.subunidade);
    if (filtros.contrato) ordensFiltradas = ordensFiltradas.filter(o => o.contratoEmpenhoPecas === filtros.contrato || o.contratoEmpenhoServicos === filtros.contrato);
    if (filtros.empenho) ordensFiltradas = ordensFiltradas.filter(o => o.empenhoPecas === filtros.empenho || o.empenhoServicos === filtros.empenho);
    if (filtros.tipoEmpenho === 'pecas') ordensFiltradas = ordensFiltradas.filter(o => o.empenhoPecas);
    if (filtros.tipoEmpenho === 'servicos') ordensFiltradas = ordensFiltradas.filter(o => o.empenhoServicos);
    
    // Calcular valor consumido das OS
    let valorConsumido = 0;
    ordensFiltradas.forEach(ordem => {
      if (['Autorizado', 'Aguardando pagamento', 'Pago'].includes(ordem.status)) {
        valorConsumido += ordem.valorFinal || 0;
      }
    });
    
    // Calcular valores dos contratos e empenhos
    let valorTotalContratos = 0;
    let valorTotalEmpenhado = 0;
    let empenhosAtivosCount = 0;
    
    clienteData.contratos.forEach(contrato => {
      // Se há filtro de contrato, considerar apenas o selecionado
      if (filtros.contrato && contrato._id !== filtros.contrato) {
        return;
      }
      
      if (contrato.ativo) {
        valorTotalContratos += contrato.valor || 0;
        
        if (contrato.empenhos && contrato.empenhos.length > 0) {
          contrato.empenhos.forEach(empenho => {
            // Se há filtro de empenho, considerar apenas o selecionado
            if (filtros.empenho && empenho._id !== filtros.empenho) {
              return;
            }
            
            // Aplicar filtro de tipo de empenho
            if (filtros.tipoEmpenho === 'pecas' && empenho.tipo !== 'pecas' && empenho.tipo !== 'pecas_servicos') {
              return;
            }
            if (filtros.tipoEmpenho === 'servicos' && empenho.tipo !== 'servicos' && empenho.tipo !== 'pecas_servicos') {
              return;
            }
            
            if (empenho.ativo) {
              valorTotalEmpenhado += empenho.valor || 0;
              empenhosAtivosCount++;
            }
          });
        }
      }
    });
    
    const valorDisponivel = valorTotalEmpenhado - valorConsumido;
    
    setResumo({
      valorContrato: valorTotalContratos,
      totalEmpenhado: valorTotalEmpenhado,
      valorConsumido,
      valorDisponivel,
      empenhosAtivos: empenhosAtivosCount
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
                {filtros.contrato && contratoMap[filtros.contrato] && (
                  <div className="info-contrato-selecionado">
                    <strong>Contrato Nº {contratoMap[filtros.contrato].numero}</strong> - 
                    Total Contrato: {formatCurrency(resumo.valorContrato)} | 
                    Total Empenhado: {formatCurrency(resumo.totalEmpenhado)} | 
                    Saldo: {formatCurrency(resumo.valorDisponivel)} | 
                    Empenhos Ativos: {resumo.empenhosAtivos}
                  </div>
                )}
              </div>
              <button className="btn-atualizar" onClick={loadDados}>🔄 Atualizar</button>
            </div>

            <div className="cards-resumo">
              <div className="card-resumo card-blue">
                <div className="card-icon">💼</div>
                <div className="card-info">
                  <span className="card-label">Total Contrato{filtros.contrato ? ' (Selecionado)' : 's'}</span>
                  <span className="card-value">{formatCurrency(resumo.valorContrato)}</span>
                </div>
              </div>
              <div className="card-resumo card-purple">
                <div className="card-icon">📄</div>
                <div className="card-info">
                  <span className="card-label">Total Empenhado</span>
                  <span className="card-value">{formatCurrency(resumo.totalEmpenhado)}</span>
                  {resumo.empenhosAtivos > 0 && (
                    <small style={{fontSize: '12px', color: '#718096'}}>{resumo.empenhosAtivos} empenho(s) ativo(s)</small>
                  )}
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
                    {contratos.map(c => <option key={c.id} value={c.id}>{c.numero}</option>)}
                  </select>
                </div>
                <div className="filtro-group">
                  <label>Empenho</label>
                  <select value={filtros.empenho} onChange={(e) => setFiltros({...filtros, empenho: e.target.value})}>
                    <option value="">Todos</option>
                    {empenhos.map(e => <option key={e.id} value={e.id}>{e.numero} ({e.contrato})</option>)}
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
                    {ordens.filter(filtrarOrdens).map(ordem => {
                      const contratoIdPecas = ordem.contratoEmpenhoPecas;
                      const contratoIdServicos = ordem.contratoEmpenhoServicos;
                      const empenhoIdPecas = ordem.empenhoPecas;
                      const empenhoIdServicos = ordem.empenhoServicos;
                      
                      const contratoNumero = contratoIdPecas && contratoMap[contratoIdPecas] 
                        ? contratoMap[contratoIdPecas].numero 
                        : contratoIdServicos && contratoMap[contratoIdServicos]
                        ? contratoMap[contratoIdServicos].numero
                        : contratoIdPecas || contratoIdServicos || '-';
                        
                      const empenhoNumero = empenhoIdPecas && empenhoMap[empenhoIdPecas]
                        ? empenhoMap[empenhoIdPecas].numero
                        : empenhoIdServicos && empenhoMap[empenhoIdServicos]
                        ? empenhoMap[empenhoIdServicos].numero
                        : empenhoIdPecas || empenhoIdServicos || '-';
                      
                      return (
                        <tr key={ordem._id}>
                          <td>{ordem.numeroOrdemServico || ordem.codigo}</td>
                          <td>{ordem.centroCusto || '-'}</td>
                          <td>{ordem.subunidade || '-'}</td>
                          <td>{contratoNumero}</td>
                          <td>{empenhoNumero}</td>
                          <td>{ordem.empenhoPecas && ordem.empenhoServicos ? 'Peças + Serviços' : ordem.empenhoPecas ? 'Peças' : ordem.empenhoServicos ? 'Serviços' : '-'}</td>
                          <td className="valor-destaque">{formatCurrency(ordem.valorFinal)}</td>
                          <td><span className={`badge badge-${getStatusColor(ordem.status)}`}>{ordem.status}</span></td>
                        </tr>
                      );
                    })}
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
