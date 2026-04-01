import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './OrdensPagamento.css';

function OrdensPagamento() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState([]);
  const [resumo, setResumo] = useState({ totalOrdens: 0, pendentes: 0, pagas: 0, valorTotalPendente: 0, valorTotalPago: 0 });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [faturasAbertasFornecedor, setFaturasAbertasFornecedor] = useState([]);
  const [loadingFaturas, setLoadingFaturas] = useState(false);
  const [formData, setFormData] = useState({
    cliente: '',
    fornecedor: '',
    fatura: '',
    faturaNumeroManual: '',
    valor: '',
    dataGeracao: new Date().toISOString().split('T')[0],
    observacoes: ''
  });
  const [usarFaturaManual, setUsarFaturaManual] = useState(false);

  // Modal pagar
  const [showModalPagar, setShowModalPagar] = useState(false);
  const [ordemPagar, setOrdemPagar] = useState(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);

  // Modal vincular fatura
  const [showModalVincular, setShowModalVincular] = useState(false);
  const [ordemVincular, setOrdemVincular] = useState(null);
  const [faturasVincular, setFaturasVincular] = useState([]);
  const [faturaVinculadaSelecionada, setFaturaVinculadaSelecionada] = useState('');
  const [loadingVincular, setLoadingVincular] = useState(false);

  // Modal comprovante view
  const [showModalComprovante, setShowModalComprovante] = useState(false);
  const [comprovanteView, setComprovanteView] = useState(null);

  // Bank info popup
  const [bankInfoId, setBankInfoId] = useState(null);

  // Filtros
  const [filtros, setFiltros] = useState({ busca: '', status: '' });

  const isAdmin = ['super_admin', 'admin', 'gerente'].includes(user?.role);
  const isFornecedor = user?.role === 'fornecedor';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ordensRes, resumoRes] = await Promise.all([
        api.get('/ordens-pagamento'),
        api.get('/ordens-pagamento/resumo')
      ]);
      setOrdens(ordensRes.data.data || []);
      setResumo(resumoRes.data.data || { totalOrdens: 0, pendentes: 0, pagas: 0, valorTotalPendente: 0, valorTotalPago: 0 });
    } catch (error) {
      toast.error('Erro ao carregar ordens de pagamento');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClientesFornecedores = useCallback(async () => {
    try {
      const [clientesRes, fornecedoresRes] = await Promise.all([
        api.get('/clientes?limit=1000'),
        api.get('/fornecedores?limit=1000')
      ]);
      setClientes(clientesRes.data.data || clientesRes.data || []);
      setFornecedores(fornecedoresRes.data.data || fornecedoresRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes/fornecedores:', error);
    }
  }, []);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isAdmin && showForm) {
      loadClientesFornecedores();
    }
  }, [isAdmin, showForm, loadClientesFornecedores]);

  // Click outside bank info
  useEffect(() => {
    const handleClickOutside = () => setBankInfoId(null);
    if (bankInfoId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [bankInfoId]);

  const carregarFaturasFornecedor = async (fornecedorId) => {
    if (!fornecedorId) {
      setFaturasAbertasFornecedor([]);
      return;
    }
    try {
      setLoadingFaturas(true);
      const res = await api.get(`/ordens-pagamento/faturas-fornecedor/${fornecedorId}`);
      setFaturasAbertasFornecedor(res.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
      setFaturasAbertasFornecedor([]);
    } finally {
      setLoadingFaturas(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'fornecedor') {
      setFormData(prev => ({ ...prev, fatura: '', faturaNumeroManual: '' }));
      setUsarFaturaManual(false);
      if (value) {
        carregarFaturasFornecedor(value);
      } else {
        setFaturasAbertasFornecedor([]);
      }
    }
  };

  const handleCriarOrdem = async (e) => {
    e.preventDefault();

    if (!formData.cliente || !formData.fornecedor || !formData.valor || !formData.dataGeracao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const valor = parseFloat(formData.valor);
    if (isNaN(valor) || valor <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    try {
      setFormLoading(true);
      const payload = {
        cliente: formData.cliente,
        fornecedor: formData.fornecedor,
        fatura: usarFaturaManual ? null : (formData.fatura || null),
        faturaNumeroManual: usarFaturaManual ? formData.faturaNumeroManual : null,
        valor,
        dataGeracao: formData.dataGeracao,
        observacoes: formData.observacoes
      };

      await api.post('/ordens-pagamento', payload);
      toast.success('Ordem de pagamento criada com sucesso!');
      setFormData({
        cliente: '',
        fornecedor: '',
        fatura: '',
        faturaNumeroManual: '',
        valor: '',
        dataGeracao: new Date().toISOString().split('T')[0],
        observacoes: ''
      });
      setUsarFaturaManual(false);
      setFaturasAbertasFornecedor([]);
      setShowForm(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao criar ordem de pagamento');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAbrirPagar = (ordem) => {
    setOrdemPagar(ordem);
    setShowModalPagar(true);
  };

  const handleUploadComprovante = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!tiposPermitidos.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.');
      return;
    }

    setUploadingComprovante(true);

    const reader = new FileReader();
    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo');
      setUploadingComprovante(false);
    };
    reader.onload = async () => {
      try {
        await api.put(`/ordens-pagamento/${ordemPagar._id}/pagar`, {
          comprovante: reader.result
        });
        toast.success('Pagamento registrado com sucesso!');
        setShowModalPagar(false);
        setOrdemPagar(null);
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Erro ao registrar pagamento');
      } finally {
        setUploadingComprovante(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAbrirVincular = async (ordem) => {
    setOrdemVincular(ordem);
    setFaturaVinculadaSelecionada('');
    setShowModalVincular(true);

    try {
      setLoadingVincular(true);
      const res = await api.get(`/ordens-pagamento/faturas-fornecedor/${ordem.fornecedor._id}`);
      // Incluir todas as faturas (abertas)
      setFaturasVincular(res.data.data || []);
    } catch (error) {
      toast.error('Erro ao carregar faturas');
    } finally {
      setLoadingVincular(false);
    }
  };

  const handleVincularFatura = async () => {
    if (!faturaVinculadaSelecionada) {
      toast.error('Selecione uma fatura para vincular');
      return;
    }

    try {
      setLoadingVincular(true);
      await api.put(`/ordens-pagamento/${ordemVincular._id}/vincular-fatura`, {
        faturaId: faturaVinculadaSelecionada
      });
      toast.success('Pagamento vinculado à fatura com sucesso!');
      setShowModalVincular(false);
      setOrdemVincular(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao vincular fatura');
    } finally {
      setLoadingVincular(false);
    }
  };

  const handleVerComprovante = (ordem) => {
    setComprovanteView(ordem);
    setShowModalComprovante(true);
  };

  // Formatters
  const formatarValor = (valor) => {
    if (!valor && valor !== 0) return 'R$ 0,00';
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  // Filter
  const ordensFiltradas = ordens.filter(o => {
    const matchBusca = !filtros.busca ||
      o.numero?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      o.fornecedor?.razaoSocial?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      o.fornecedor?.cnpjCpf?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      o.cliente?.razaoSocial?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      o.fatura?.numeroFatura?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      o.faturaNumeroManual?.toLowerCase().includes(filtros.busca.toLowerCase());
    const matchStatus = !filtros.status || o.status === filtros.status;
    return matchBusca && matchStatus;
  });

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="ordens-pagamento-container">
            {/* Header */}
            <div className="page-header">
              <div>
                <h1>📋 Ordens de Pagamento</h1>
                <p>{isFornecedor ? 'Acompanhe seus pagamentos' : 'Gerencie ordens de pagamento para fornecedores'}</p>
              </div>
              {isAdmin && (
                <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                  {showForm ? '✕ Fechar' : '+ Criar Ordem de Pagamento'}
                </button>
              )}
            </div>

            {loading ? (
              <div className="loading">Carregando...</div>
            ) : (
              <>
                {/* Cards Resumo */}
                <div className="stats-grid">
                  <div className="stat-card stat-info">
                    <div className="stat-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div className="stat-content">
                      <h3>Total de Ordens</h3>
                      <p className="stat-value">{resumo.totalOrdens}</p>
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
                      <h3>Pendentes</h3>
                      <p className="stat-value">{formatarValor(resumo.valorTotalPendente)}</p>
                      <span className="stat-label">{resumo.pendentes} ordens</span>
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
                      <h3>Pagas</h3>
                      <p className="stat-value">{formatarValor(resumo.valorTotalPago)}</p>
                      <span className="stat-label">{resumo.pagas} ordens</span>
                    </div>
                  </div>
                </div>

                {/* Form criar ordem */}
                {isAdmin && showForm && (
                  <div className="section-card form-card">
                    <div className="section-header">
                      <h2>➕ Nova Ordem de Pagamento</h2>
                    </div>
                    <form onSubmit={handleCriarOrdem} className="form-grid">
                      <div className="form-group">
                        <label htmlFor="cliente">Cliente *</label>
                        <select
                          id="cliente"
                          name="cliente"
                          value={formData.cliente}
                          onChange={handleFormChange}
                          required
                          className="form-input"
                        >
                          <option value="">Selecione o cliente...</option>
                          {clientes.map(c => (
                            <option key={c._id} value={c._id}>
                              {c.razaoSocial} {c.cnpj ? `(${c.cnpj})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="fornecedor">Fornecedor *</label>
                        <select
                          id="fornecedor"
                          name="fornecedor"
                          value={formData.fornecedor}
                          onChange={handleFormChange}
                          required
                          className="form-input"
                        >
                          <option value="">Selecione o fornecedor...</option>
                          {fornecedores.map(f => (
                            <option key={f._id} value={f._id}>
                              {f.razaoSocial} ({f.cnpjCpf})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Fatura</label>
                        <div className="fatura-toggle">
                          <label className="toggle-label">
                            <input
                              type="checkbox"
                              checked={usarFaturaManual}
                              onChange={(e) => {
                                setUsarFaturaManual(e.target.checked);
                                setFormData(prev => ({ ...prev, fatura: '', faturaNumeroManual: '' }));
                              }}
                            />
                            <span>Preencher manualmente</span>
                          </label>
                        </div>
                        {usarFaturaManual ? (
                          <input
                            type="text"
                            name="faturaNumeroManual"
                            value={formData.faturaNumeroManual}
                            onChange={handleFormChange}
                            placeholder="Número da fatura manual..."
                            className="form-input"
                          />
                        ) : (
                          <select
                            name="fatura"
                            value={formData.fatura}
                            onChange={handleFormChange}
                            className="form-input"
                            disabled={!formData.fornecedor || loadingFaturas}
                          >
                            <option value="">
                              {!formData.fornecedor
                                ? 'Selecione um fornecedor primeiro...'
                                : loadingFaturas
                                  ? 'Carregando faturas...'
                                  : faturasAbertasFornecedor.length === 0
                                    ? 'Nenhuma fatura em aberto'
                                    : 'Selecione a fatura...'
                              }
                            </option>
                            {faturasAbertasFornecedor.map(f => (
                              <option key={f._id} value={f._id}>
                                {f.numeroFatura} - {formatarValor(f.valorRestante || f.valorDevido)} ({f.statusFatura})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="valor">Valor *</label>
                        <input
                          type="number"
                          id="valor"
                          name="valor"
                          value={formData.valor}
                          onChange={handleFormChange}
                          placeholder="0,00"
                          step="0.01"
                          min="0.01"
                          required
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="dataGeracao">Data Gerada *</label>
                        <input
                          type="date"
                          id="dataGeracao"
                          name="dataGeracao"
                          value={formData.dataGeracao}
                          onChange={handleFormChange}
                          required
                          className="form-input"
                        />
                      </div>

                      <div className="form-group form-group-full">
                        <label htmlFor="observacoes">Observações</label>
                        <textarea
                          id="observacoes"
                          name="observacoes"
                          value={formData.observacoes}
                          onChange={handleFormChange}
                          placeholder="Observações opcionais..."
                          className="form-input form-textarea"
                          rows="2"
                        />
                      </div>

                      <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                          Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={formLoading}>
                          {formLoading ? 'Criando...' : '✓ Criar Ordem de Pagamento'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Filtros */}
                <div className="filtros-card">
                  <input
                    type="text"
                    name="busca"
                    value={filtros.busca}
                    onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                    placeholder="Buscar por nº ordem, fornecedor, CNPJ, cliente, fatura..."
                    className="filtro-input"
                  />
                  <select
                    value={filtros.status}
                    onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
                    className="filtro-select"
                  >
                    <option value="">Todos os status</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Paga">Paga</option>
                  </select>
                </div>

                {/* Tabela de ordens */}
                <div className="section-card">
                  <div className="section-header">
                    <h2>📋 Ordens de Pagamento</h2>
                    <span className="badge">{ordensFiltradas.length} registros</span>
                  </div>

                  {ordensFiltradas.length === 0 ? (
                    <div className="empty-state">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <p>Nenhuma ordem de pagamento encontrada</p>
                      <span>{isAdmin ? 'Clique em "Criar Ordem de Pagamento" para começar' : 'Suas ordens de pagamento aparecerão aqui'}</span>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Nº Ordem</th>
                            <th>Cliente</th>
                            <th>Fornecedor / CNPJ</th>
                            <th>Fatura</th>
                            <th>Valor</th>
                            <th>Data Gerada</th>
                            <th>Data Pagamento</th>
                            <th>Status</th>
                            <th>Vinculada a</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ordensFiltradas.map(ordem => (
                            <tr key={ordem._id}>
                              <td><strong>{ordem.numero}</strong></td>
                              <td>{ordem.cliente?.razaoSocial || '-'}</td>
                              <td>
                                <div className="cnpj-cell">
                                  <div>
                                    <span className="fornecedor-nome">{ordem.fornecedor?.razaoSocial || '-'}</span>
                                    <br />
                                    <small className="cnpj-text">{ordem.fornecedor?.cnpjCpf || ''}</small>
                                  </div>
                                  {ordem.fornecedor && (
                                    <button
                                      className="btn-bank-info"
                                      title="Ver Dados Bancários"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBankInfoId(bankInfoId === ordem._id ? null : ordem._id);
                                      }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                        <line x1="1" y1="10" x2="23" y2="10"></line>
                                      </svg>
                                    </button>
                                  )}
                                  {bankInfoId === ordem._id && ordem.fornecedor && (
                                    <div className="bank-info-overlay" onClick={() => setBankInfoId(null)}>
                                      <div className="bank-info-popup" onClick={(e) => e.stopPropagation()}>
                                        <div className="bank-info-header">
                                          <strong>Dados Bancários</strong>
                                          <button className="bank-info-close" onClick={() => setBankInfoId(null)}>×</button>
                                        </div>
                                        <div className="bank-info-body">
                                          <div className="bank-info-row">
                                            <span className="bank-info-label">Banco:</span>
                                            <span className="bank-info-value">{ordem.fornecedor.banco || '—'}</span>
                                          </div>
                                          <div className="bank-info-row">
                                            <span className="bank-info-label">Tipo Conta:</span>
                                            <span className="bank-info-value">
                                              {ordem.fornecedor.tipoConta
                                                ? ordem.fornecedor.tipoConta.charAt(0).toUpperCase() + ordem.fornecedor.tipoConta.slice(1)
                                                : '—'}
                                            </span>
                                          </div>
                                          <div className="bank-info-row">
                                            <span className="bank-info-label">Agência:</span>
                                            <span className="bank-info-value">{ordem.fornecedor.agencia || '—'}</span>
                                          </div>
                                          <div className="bank-info-row">
                                            <span className="bank-info-label">Conta:</span>
                                            <span className="bank-info-value">{ordem.fornecedor.conta || '—'}</span>
                                          </div>
                                          {ordem.fornecedor.chavePix && (
                                            <div className="bank-info-row bank-info-pix">
                                              <span className="bank-info-label">Chave PIX:</span>
                                              <span className="bank-info-value">{ordem.fornecedor.chavePix}</span>
                                            </div>
                                          )}
                                          {ordem.fornecedor.tipoChavePix && (
                                            <div className="bank-info-row">
                                              <span className="bank-info-label">Tipo Chave:</span>
                                              <span className="bank-info-value">{ordem.fornecedor.tipoChavePix.toUpperCase()}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>{ordem.fatura?.numeroFatura || ordem.faturaNumeroManual || '-'}</td>
                              <td><strong className="valor-destaque">{formatarValor(ordem.valor)}</strong></td>
                              <td>{formatarData(ordem.dataGeracao)}</td>
                              <td>{formatarData(ordem.dataPagamento)}</td>
                              <td>
                                <span className={`status-badge ${ordem.status === 'Paga' ? 'status-paga' : 'status-pendente'}`}>
                                  {ordem.status}
                                </span>
                              </td>
                              <td>
                                {ordem.faturaVinculada
                                  ? <span className="fatura-vinculada">{ordem.faturaVinculada.numeroFatura}</span>
                                  : <span className="text-muted">-</span>
                                }
                              </td>
                              <td className="acoes-cell">
                                {isAdmin && ordem.status === 'Pendente' && (
                                  <button
                                    className="btn-pagar"
                                    title="Registrar Pagamento"
                                    onClick={() => handleAbrirPagar(ordem)}
                                  >
                                    💰 Pagar
                                  </button>
                                )}
                                {ordem.status === 'Paga' && ordem.comprovante && (
                                  <button
                                    className="btn-link"
                                    title="Ver Comprovante"
                                    onClick={() => handleVerComprovante(ordem)}
                                  >
                                    📎 Comprovante
                                  </button>
                                )}
                                {isAdmin && ordem.status === 'Paga' && !ordem.faturaVinculada && (
                                  <button
                                    className="btn-vincular"
                                    title="Vincular a Fatura"
                                    onClick={() => handleAbrirVincular(ordem)}
                                  >
                                    🔗 Vincular
                                  </button>
                                )}
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

      {/* Modal Pagar */}
      {showModalPagar && ordemPagar && (
        <div className="modal-overlay" onClick={() => !uploadingComprovante && setShowModalPagar(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💰 Registrar Pagamento</h2>
              <button className="btn-close" onClick={() => !uploadingComprovante && setShowModalPagar(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="comprovante-info">
                <p><strong>Ordem:</strong> {ordemPagar.numero}</p>
                <p><strong>Fornecedor:</strong> {ordemPagar.fornecedor?.razaoSocial}</p>
                <p><strong>CNPJ:</strong> {ordemPagar.fornecedor?.cnpjCpf}</p>
                <p><strong>Valor:</strong> {formatarValor(ordemPagar.valor)}</p>
              </div>

              <div className="upload-area">
                <input
                  type="file"
                  id="comprovante-pagar"
                  accept="image/*,.pdf"
                  onChange={handleUploadComprovante}
                  disabled={uploadingComprovante}
                />
                <label htmlFor="comprovante-pagar" className="upload-label">
                  {uploadingComprovante ? (
                    'Enviando comprovante e registrando pagamento...'
                  ) : (
                    <>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <span>Anexe o comprovante para registrar o pagamento</span>
                      <small>PDF, JPG ou PNG até 5MB</small>
                    </>
                  )}
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => !uploadingComprovante && setShowModalPagar(false)} disabled={uploadingComprovante}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vincular Fatura */}
      {showModalVincular && ordemVincular && (
        <div className="modal-overlay" onClick={() => !loadingVincular && setShowModalVincular(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔗 Vincular Pagamento a Fatura</h2>
              <button className="btn-close" onClick={() => !loadingVincular && setShowModalVincular(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="comprovante-info">
                <p><strong>Ordem:</strong> {ordemVincular.numero}</p>
                <p><strong>Fornecedor:</strong> {ordemVincular.fornecedor?.razaoSocial}</p>
                <p><strong>Valor Pago:</strong> {formatarValor(ordemVincular.valor)}</p>
                <p><strong>Data Pagamento:</strong> {formatarData(ordemVincular.dataPagamento)}</p>
              </div>

              <div className="form-group">
                <label>Selecione a fatura para vincular:</label>
                {loadingVincular ? (
                  <p>Carregando faturas...</p>
                ) : faturasVincular.length === 0 ? (
                  <p className="text-muted">Nenhuma fatura em aberto para este fornecedor</p>
                ) : (
                  <select
                    value={faturaVinculadaSelecionada}
                    onChange={(e) => setFaturaVinculadaSelecionada(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Selecione a fatura...</option>
                    {faturasVincular.map(f => (
                      <option key={f._id} value={f._id}>
                        {f.numeroFatura} - {formatarValor(f.valorRestante || f.valorDevido)} ({f.statusFatura})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModalVincular(false)} disabled={loadingVincular}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleVincularFatura}
                disabled={loadingVincular || !faturaVinculadaSelecionada}
              >
                {loadingVincular ? 'Vinculando...' : '✓ Vincular Fatura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Comprovante */}
      {showModalComprovante && comprovanteView && (
        <div className="modal-overlay" onClick={() => setShowModalComprovante(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📎 Comprovante de Pagamento</h2>
              <button className="btn-close" onClick={() => setShowModalComprovante(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="comprovante-info">
                <p><strong>Ordem:</strong> {comprovanteView.numero}</p>
                <p><strong>Fornecedor:</strong> {comprovanteView.fornecedor?.razaoSocial}</p>
                <p><strong>Valor:</strong> {formatarValor(comprovanteView.valor)}</p>
                <p><strong>Data Pagamento:</strong> {formatarData(comprovanteView.dataPagamento)}</p>
              </div>

              {comprovanteView.comprovante && (
                <div className="comprovante-preview">
                  {comprovanteView.comprovante.startsWith('data:image') ? (
                    <img src={comprovanteView.comprovante} alt="Comprovante" />
                  ) : comprovanteView.comprovante.startsWith('data:application/pdf') ? (
                    <div className="pdf-preview">
                      <a
                        href={comprovanteView.comprovante}
                        download={`comprovante-${comprovanteView.numero}.pdf`}
                        className="btn-secondary"
                      >
                        📥 Baixar Comprovante PDF
                      </a>
                    </div>
                  ) : (
                    <a
                      href={comprovanteView.comprovante}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      📥 Baixar Comprovante
                    </a>
                  )}
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

export default OrdensPagamento;
