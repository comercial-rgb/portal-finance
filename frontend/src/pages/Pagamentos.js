import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './Pagamentos.css';

function Pagamentos() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState([]);
  const [antecipacoes, setAntecipacoes] = useState([]);
  const [resumo, setResumo] = useState({
    totalRecebido: 0,
    totalPendente: 0,
    osPagas: 0,
    osPendentes: 0,
    antecipacoes: { total: 0, pendentes: 0, aprovadas: 0, pagas: 0, valorTotal: 0 }
  });
  const [abaAtiva, setAbaAtiva] = useState('pagamentos');
  const [filtros, setFiltros] = useState({ busca: '' });

  // Modal de Comprovante
  const [showModalComprovante, setShowModalComprovante] = useState(false);
  const [comprovanteAtual, setComprovanteAtual] = useState(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pagamentosRes, antecipacoesRes, resumoRes] = await Promise.all([
        api.get('/pagamentos'),
        api.get('/pagamentos/antecipacoes'),
        api.get('/pagamentos/resumo')
      ]);
      
      setPagamentos(pagamentosRes.data);
      setAntecipacoes(antecipacoesRes.data);
      setResumo(resumoRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
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
    return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const handleFiltroChange = (e) => {
    setFiltros(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const pagamentosFiltrados = pagamentos.filter(p => {
    const matchBusca = !filtros.busca || 
      p.numeroFatura?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      p.ordemServico?.numeroOrdemServico?.toLowerCase().includes(filtros.busca.toLowerCase());
    return matchBusca;
  });

  const antecipacoesFiltradas = antecipacoes.filter(a => {
    const matchBusca = !filtros.busca ||
      a.fornecedor?.razaoSocial?.toLowerCase().includes(filtros.busca.toLowerCase());
    return matchBusca;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pendente': return 'status-badge status-pendente';
      case 'Aprovada': return 'status-badge status-aprovada';
      case 'Rejeitada': return 'status-badge status-rejeitada';
      case 'Paga': return 'status-badge status-paga';
      case 'Cancelada': return 'status-badge status-cancelada';
      default: return 'status-badge';
    }
  };

  const handleVerComprovante = (pagamento) => {
    setComprovanteAtual(pagamento);
    setShowModalComprovante(true);
  };

  const handleUploadComprovante = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    try {
      setUploadingComprovante(true);
      
      // Converter para base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        
        try {
          await api.put(
            `/pagamentos/${comprovanteAtual.faturaId}/os/${comprovanteAtual.ordemServico._id}/comprovante`,
            { comprovante: base64 }
          );
          
          toast.success('Comprovante anexado com sucesso!');
          setShowModalComprovante(false);
          loadData();
        } catch (error) {
          toast.error('Erro ao anexar comprovante');
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingComprovante(false);
    }
  };

  const isAdmin = ['super_admin', 'admin'].includes(user?.role);
  const isFornecedor = user?.role === 'fornecedor';

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="pagamentos-container">
            {/* Cabeçalho */}
            <div className="page-header">
              <div>
                <h1>💳 Pagamentos</h1>
                <p>Acompanhe os pagamentos realizados e antecipações</p>
              </div>
            </div>

            {loading ? (
              <div className="loading">Carregando...</div>
            ) : (
              <>
                {/* Cards de Resumo */}
                <div className="stats-grid">
                  <div className="stat-card stat-success">
                    <div className="stat-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <div className="stat-content">
                      <h3>Total Recebido</h3>
                      <p className="stat-value">{formatarValor(resumo.totalRecebido)}</p>
                      <span className="stat-label">{resumo.osPagas} OS pagas</span>
                    </div>
                  </div>

                  <div className="stat-card stat-warning">
                    <div className="stat-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div className="stat-content">
                      <h3>Pendente</h3>
                      <p className="stat-value">{formatarValor(resumo.totalPendente)}</p>
                      <span className="stat-label">{resumo.osPendentes} OS aguardando</span>
                    </div>
                  </div>

                  {isFornecedor && (
                    <div className="stat-card stat-info">
                      <div className="stat-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="1" x2="12" y2="23"/>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h3>Antecipado</h3>
                        <p className="stat-value">{formatarValor(resumo.antecipacoes.valorTotal)}</p>
                        <span className="stat-label">{resumo.antecipacoes.pagas} antecipações pagas</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Abas */}
                <div className="tabs-container">
                  <button
                    className={`tab-button ${abaAtiva === 'pagamentos' ? 'active' : ''}`}
                    onClick={() => setAbaAtiva('pagamentos')}
                  >
                    <span className="tab-icon">💰</span>
                    Pagamentos
                  </button>
                  {isFornecedor && (
                    <button
                      className={`tab-button ${abaAtiva === 'antecipacoes' ? 'active' : ''}`}
                      onClick={() => setAbaAtiva('antecipacoes')}
                    >
                      <span className="tab-icon">⚡</span>
                      Antecipações
                    </button>
                  )}
                </div>

                {/* Filtros */}
                <div className="filtros-card">
                  <input
                    type="text"
                    name="busca"
                    value={filtros.busca}
                    onChange={handleFiltroChange}
                    placeholder="Buscar por nº fatura ou OS..."
                    className="filtro-input"
                  />
                </div>

                {/* Conteúdo das Abas */}
                {abaAtiva === 'pagamentos' && (
                  <div className="section-card">
                    <div className="section-header">
                      <h2>📋 Ordens de Serviço Pagas</h2>
                      <span className="badge">{pagamentosFiltrados.length} registros</span>
                    </div>
                    
                    {pagamentosFiltrados.length === 0 ? (
                      <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="2" y="5" width="20" height="14" rx="2"/>
                          <line x1="2" y1="10" x2="22" y2="10"/>
                        </svg>
                        <p>Nenhum pagamento encontrado</p>
                        <span>Os pagamentos realizados aparecerão aqui</span>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Nº Fatura</th>
                              <th>Nº OS</th>
                              <th>{user?.role === 'cliente' ? 'Fornecedor' : 'Cliente/Fornecedor'}</th>
                              <th>Valor OS</th>
                              <th>Data Pagamento</th>
                              <th>Comprovante</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagamentosFiltrados.map(p => (
                              <tr key={p._id}>
                                <td><strong>{p.numeroFatura}</strong></td>
                                <td>{p.ordemServico?.numeroOrdemServico || p.ordemServico?.codigo || '-'}</td>
                                <td>
                                  {p.tipo === 'Fornecedor' 
                                    ? p.fornecedor?.razaoSocial 
                                    : p.cliente?.razaoSocial
                                  }
                                </td>
                                <td><strong className="valor-destaque">{formatarValor(p.valorOS)}</strong></td>
                                <td>{formatarData(p.dataPagamento)}</td>
                                <td>
                                  {p.comprovante ? (
                                    <button 
                                      className="btn-link"
                                      onClick={() => handleVerComprovante(p)}
                                    >
                                      📎 Ver
                                    </button>
                                  ) : isAdmin ? (
                                    <button 
                                      className="btn-link"
                                      onClick={() => handleVerComprovante(p)}
                                    >
                                      ➕ Anexar
                                    </button>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {abaAtiva === 'antecipacoes' && isFornecedor && (
                  <div className="section-card">
                    <div className="section-header">
                      <h2>⚡ Histórico de Antecipações</h2>
                      <span className="badge">{antecipacoesFiltradas.length} registros</span>
                    </div>
                    
                    {antecipacoesFiltradas.length === 0 ? (
                      <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <line x1="12" y1="1" x2="12" y2="23"/>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        <p>Nenhuma antecipação encontrada</p>
                        <span>Suas solicitações de antecipação aparecerão aqui</span>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Data Solicitação</th>
                              <th>Data Desejada</th>
                              <th>Valor Solicitado</th>
                              <th>Taxa</th>
                              <th>Desconto</th>
                              <th>Valor Recebido</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {antecipacoesFiltradas.map(a => (
                              <tr key={a._id}>
                                <td>{formatarData(a.dataSolicitacao)}</td>
                                <td>{formatarData(a.dataDesejadaRecebimento)}</td>
                                <td>{formatarValor(a.valorSolicitado)}</td>
                                <td>{a.taxaAplicada}%</td>
                                <td className="valor-negativo">-{formatarValor(a.valorDesconto)}</td>
                                <td><strong className="valor-destaque">{formatarValor(a.valorAReceber)}</strong></td>
                                <td>
                                  <span className={getStatusBadgeClass(a.status)}>
                                    {a.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
      <Footer />

      {/* Modal de Comprovante */}
      {showModalComprovante && (
        <div className="modal-overlay" onClick={() => setShowModalComprovante(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📎 Comprovante de Pagamento</h2>
              <button className="btn-close" onClick={() => setShowModalComprovante(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="comprovante-info">
                <p><strong>Fatura:</strong> {comprovanteAtual?.numeroFatura}</p>
                <p><strong>OS:</strong> {comprovanteAtual?.ordemServico?.numeroOrdemServico}</p>
                <p><strong>Valor:</strong> {formatarValor(comprovanteAtual?.valorOS)}</p>
              </div>

              {comprovanteAtual?.comprovante ? (
                <div className="comprovante-preview">
                  {comprovanteAtual.comprovante.startsWith('data:image') ? (
                    <img src={comprovanteAtual.comprovante} alt="Comprovante" />
                  ) : (
                    <a 
                      href={comprovanteAtual.comprovante} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      📥 Baixar Comprovante
                    </a>
                  )}
                </div>
              ) : isAdmin ? (
                <div className="upload-area">
                  <input
                    type="file"
                    id="comprovante-upload"
                    accept="image/*,.pdf"
                    onChange={handleUploadComprovante}
                    disabled={uploadingComprovante}
                  />
                  <label htmlFor="comprovante-upload" className="upload-label">
                    {uploadingComprovante ? (
                      'Enviando...'
                    ) : (
                      <>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <span>Clique para anexar comprovante</span>
                        <small>Imagem ou PDF até 5MB</small>
                      </>
                    )}
                  </label>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Comprovante não anexado</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModalComprovante(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pagamentos;
