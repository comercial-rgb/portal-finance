import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './ValoresPendentes.css';

function ValoresPendentes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState({
    valorTotalPendente: 0,
    valorEmAntecipacao: 0,
    valorDisponivelParaAntecipacao: 0,
    faturas: []
  });
  const [showModalAntecipacao, setShowModalAntecipacao] = useState(false);
  const [formAntecipacao, setFormAntecipacao] = useState({
    valor: '',
    dataDesejada: '',
    faturasSelecionadas: []
  });
  const [calculoAntecipacao, setCalculoAntecipacao] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [antecipacoes, setAntecipacoes] = useState([]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    if (currentUser?.role !== 'fornecedor') {
      toast.error('Acesso restrito a fornecedores');
      navigate('/dashboard');
      return;
    }
    
    loadDados();
    loadAntecipacoes();
  }, [navigate]);

  const loadDados = async () => {
    try {
      setLoading(true);
      const response = await api.get('/antecipacoes/valores-pendentes');
      setDados(response.data);
    } catch (error) {
      toast.error('Erro ao carregar valores pendentes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAntecipacoes = async () => {
    try {
      const response = await api.get('/antecipacoes');
      setAntecipacoes(response.data);
    } catch (error) {
      console.error('Erro ao carregar antecipações:', error);
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

  const handleOpenModalAntecipacao = () => {
    // Selecionar todas as faturas por padrão
    const faturasIds = dados.faturas
      .filter(f => f.previsaoRecebimento)
      .map(f => f._id);
    
    setFormAntecipacao({
      valor: '',
      dataDesejada: '',
      faturasSelecionadas: faturasIds
    });
    setCalculoAntecipacao(null);
    setShowModalAntecipacao(true);
  };

  const handleCloseModalAntecipacao = () => {
    setShowModalAntecipacao(false);
    setFormAntecipacao({
      valor: '',
      dataDesejada: '',
      faturasSelecionadas: []
    });
    setCalculoAntecipacao(null);
  };

  const handleFaturaToggle = (faturaId) => {
    setFormAntecipacao(prev => {
      const selecionadas = prev.faturasSelecionadas.includes(faturaId)
        ? prev.faturasSelecionadas.filter(id => id !== faturaId)
        : [...prev.faturasSelecionadas, faturaId];
      return { ...prev, faturasSelecionadas: selecionadas };
    });
    setCalculoAntecipacao(null);
  };

  const handleCalcular = async () => {
    const valor = parseFloat(formAntecipacao.valor.replace(/\./g, '').replace(',', '.'));
    
    if (!valor || valor <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    
    if (valor > dados.valorDisponivelParaAntecipacao) {
      toast.error('Valor maior que o disponível para antecipação');
      return;
    }
    
    if (!formAntecipacao.dataDesejada) {
      toast.error('Informe a data desejada de recebimento');
      return;
    }
    
    if (formAntecipacao.faturasSelecionadas.length === 0) {
      toast.error('Selecione pelo menos uma fatura');
      return;
    }

    // Pegar a menor previsão de recebimento das faturas selecionadas
    const faturasSelecionadas = dados.faturas.filter(
      f => formAntecipacao.faturasSelecionadas.includes(f._id)
    );
    const previsaoRecebimento = faturasSelecionadas
      .filter(f => f.previsaoRecebimento)
      .sort((a, b) => new Date(a.previsaoRecebimento) - new Date(b.previsaoRecebimento))[0]?.previsaoRecebimento;

    if (!previsaoRecebimento) {
      toast.error('Faturas selecionadas não possuem previsão de recebimento');
      return;
    }

    try {
      setCalculando(true);
      const response = await api.post('/antecipacoes/calcular', {
        valorSolicitado: valor,
        dataDesejadaRecebimento: formAntecipacao.dataDesejada,
        previsaoRecebimento
      });
      setCalculoAntecipacao(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao calcular antecipação');
    } finally {
      setCalculando(false);
    }
  };

  const handleSolicitarAntecipacao = async () => {
    if (!calculoAntecipacao) {
      toast.error('Calcule a antecipação primeiro');
      return;
    }

    try {
      setEnviando(true);
      await api.post('/antecipacoes', {
        valorSolicitado: calculoAntecipacao.valorSolicitado,
        dataDesejadaRecebimento: formAntecipacao.dataDesejada,
        faturasSelecionadas: formAntecipacao.faturasSelecionadas
      });
      
      toast.success('Solicitação de antecipação enviada com sucesso!');
      handleCloseModalAntecipacao();
      loadDados();
      loadAntecipacoes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao solicitar antecipação');
    } finally {
      setEnviando(false);
    }
  };

  const handleCancelarAntecipacao = async (id) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta solicitação?')) {
      return;
    }

    try {
      await api.put(`/antecipacoes/${id}/cancelar`);
      toast.success('Antecipação cancelada');
      loadDados();
      loadAntecipacoes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar antecipação');
    }
  };

  const handleValorChange = (e) => {
    let valor = e.target.value.replace(/\D/g, '');
    if (valor) {
      valor = (parseInt(valor) / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    setFormAntecipacao(prev => ({ ...prev, valor }));
    setCalculoAntecipacao(null);
  };

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

  const getMinDataAntecipacao = () => {
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 1);
    return hoje.toISOString().split('T')[0];
  };

  const getMaxDataAntecipacao = () => {
    // Pegar a menor previsão de recebimento - 1 dia
    const faturasSelecionadas = dados.faturas.filter(
      f => formAntecipacao.faturasSelecionadas.includes(f._id) && f.previsaoRecebimento
    );
    
    if (faturasSelecionadas.length === 0) return '';
    
    const menorPrevisao = faturasSelecionadas
      .sort((a, b) => new Date(a.previsaoRecebimento) - new Date(b.previsaoRecebimento))[0];
    
    const data = new Date(menorPrevisao.previsaoRecebimento);
    data.setDate(data.getDate() - 1);
    return data.toISOString().split('T')[0];
  };

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="valores-pendentes-container">
            {/* Cabeçalho */}
            <div className="page-header">
              <div>
                <h1>💰 Valores Pendentes</h1>
                <p>Acompanhe seus valores a receber e solicite antecipações</p>
              </div>
              <button 
                className="btn-primary"
                onClick={handleOpenModalAntecipacao}
                disabled={dados.valorDisponivelParaAntecipacao <= 0}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                Antecipação de Valores
              </button>
            </div>

            {loading ? (
              <div className="loading">Carregando...</div>
            ) : (
              <>
                {/* Cards de Resumo */}
                <div className="stats-grid">
                  <div className="stat-card stat-info">
                    <div className="stat-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                    </div>
                    <div className="stat-content">
                      <h3>Valor Total Pendente</h3>
                      <p className="stat-value">{formatarValor(dados.valorTotalPendente)}</p>
                      <span className="stat-label">Total a receber</span>
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
                      <h3>Em Antecipação</h3>
                      <p className="stat-value">{formatarValor(dados.valorEmAntecipacao)}</p>
                      <span className="stat-label">Solicitado/Aprovado</span>
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
                      <h3>Disponível para Antecipar</h3>
                      <p className="stat-value">{formatarValor(dados.valorDisponivelParaAntecipacao)}</p>
                      <span className="stat-label">Valor livre</span>
                    </div>
                  </div>
                </div>

                {/* Lista de Faturas Pendentes */}
                <div className="section-card">
                  <div className="section-header">
                    <h2>📋 Faturas Pendentes</h2>
                    <span className="badge">{dados.faturas.length} faturas</span>
                  </div>
                  
                  {dados.faturas.length === 0 ? (
                    <div className="empty-state">
                      <p>Nenhuma fatura pendente encontrada</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Nº Fatura</th>
                            <th>Período</th>
                            <th>Previsão Receb.</th>
                            <th>Valor Devido</th>
                            <th>Valor Pago</th>
                            <th>Valor Pendente</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dados.faturas.map(fatura => (
                            <tr key={fatura._id}>
                              <td><strong>{fatura.numeroFatura}</strong></td>
                              <td>{formatarData(fatura.periodoInicio)} - {formatarData(fatura.periodoFim)}</td>
                              <td>{formatarData(fatura.previsaoRecebimento)}</td>
                              <td>{formatarValor(fatura.valorDevido)}</td>
                              <td>{formatarValor(fatura.valorPago)}</td>
                              <td><strong className="valor-destaque">{formatarValor(fatura.valorPendente)}</strong></td>
                              <td>
                                <span className={`status-badge ${fatura.statusFatura === 'Aguardando pagamento' ? 'status-aguardando' : 'status-parcial'}`}>
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

                {/* Histórico de Antecipações */}
                <div className="section-card">
                  <div className="section-header">
                    <h2>📊 Histórico de Antecipações</h2>
                    <span className="badge">{antecipacoes.length} solicitações</span>
                  </div>
                  
                  {antecipacoes.length === 0 ? (
                    <div className="empty-state">
                      <p>Nenhuma antecipação solicitada</p>
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
                            <th>Valor a Receber</th>
                            <th>Status</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {antecipacoes.map(ant => (
                            <tr key={ant._id}>
                              <td>{formatarData(ant.dataSolicitacao)}</td>
                              <td>{formatarData(ant.dataDesejadaRecebimento)}</td>
                              <td>{formatarValor(ant.valorSolicitado)}</td>
                              <td>{ant.taxaAplicada}%</td>
                              <td className="valor-negativo">-{formatarValor(ant.valorDesconto)}</td>
                              <td><strong className="valor-destaque">{formatarValor(ant.valorAReceber)}</strong></td>
                              <td>
                                <span className={getStatusBadgeClass(ant.status)}>
                                  {ant.status}
                                </span>
                              </td>
                              <td>
                                {ant.status === 'Pendente' && (
                                  <button 
                                    className="btn-icon btn-danger"
                                    onClick={() => handleCancelarAntecipacao(ant._id)}
                                    title="Cancelar"
                                  >
                                    ✕
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

      {/* Modal de Antecipação */}
      {showModalAntecipacao && (
        <div className="modal-overlay" onClick={handleCloseModalAntecipacao}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💰 Solicitar Antecipação de Valores</h2>
              <button className="btn-close" onClick={handleCloseModalAntecipacao}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Taxas de Referência */}
              <div className="info-box">
                <h4>📋 Taxas de Antecipação por Período</h4>
                <div className="taxas-grid">
                  <span>30-25 dias: <strong>10%</strong></span>
                  <span>24-19 dias: <strong>8%</strong></span>
                  <span>18-12 dias: <strong>6%</strong></span>
                  <span>11-06 dias: <strong>4%</strong></span>
                  <span>05-01 dias: <strong>2,5%</strong></span>
                </div>
              </div>

              {/* Selecionar Faturas */}
              <div className="form-section">
                <h4>Selecione as Faturas</h4>
                <div className="faturas-check-list">
                  {dados.faturas.filter(f => f.previsaoRecebimento).map(fatura => (
                    <label key={fatura._id} className="fatura-check-item">
                      <input
                        type="checkbox"
                        checked={formAntecipacao.faturasSelecionadas.includes(fatura._id)}
                        onChange={() => handleFaturaToggle(fatura._id)}
                      />
                      <span className="fatura-info">
                        <strong>{fatura.numeroFatura}</strong>
                        <span>Previsão: {formatarData(fatura.previsaoRecebimento)}</span>
                        <span>Valor: {formatarValor(fatura.valorPendente)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Formulário */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="modal-label">Valor a Antecipar (R$)</label>
                  <input
                    type="text"
                    value={formAntecipacao.valor}
                    onChange={handleValorChange}
                    placeholder="0,00"
                    className="form-input"
                  />
                  <small className="form-help">
                    Máximo disponível: {formatarValor(dados.valorDisponivelParaAntecipacao)}
                  </small>
                </div>
                
                <div className="form-group">
                  <label className="modal-label">Data Desejada de Recebimento</label>
                  <input
                    type="date"
                    value={formAntecipacao.dataDesejada}
                    onChange={(e) => {
                      setFormAntecipacao(prev => ({ ...prev, dataDesejada: e.target.value }));
                      setCalculoAntecipacao(null);
                    }}
                    min={getMinDataAntecipacao()}
                    max={getMaxDataAntecipacao()}
                    className="form-input"
                  />
                </div>
              </div>

              <button 
                className="btn-secondary btn-block"
                onClick={handleCalcular}
                disabled={calculando}
              >
                {calculando ? 'Calculando...' : '🔢 Calcular Antecipação'}
              </button>

              {/* Resultado do Cálculo */}
              {calculoAntecipacao && (
                <div className="calculo-resultado">
                  <h4>📊 Resultado do Cálculo</h4>
                  <div className="calculo-grid">
                    <div className="calculo-item">
                      <span>Valor Solicitado:</span>
                      <strong>{formatarValor(calculoAntecipacao.valorSolicitado)}</strong>
                    </div>
                    <div className="calculo-item">
                      <span>Dias Antecipados:</span>
                      <strong>{calculoAntecipacao.diasAntecipados} dias</strong>
                    </div>
                    <div className="calculo-item">
                      <span>Taxa Aplicada:</span>
                      <strong>{calculoAntecipacao.taxaAplicada}%</strong>
                    </div>
                    <div className="calculo-item negativo">
                      <span>Desconto:</span>
                      <strong>-{formatarValor(calculoAntecipacao.valorDesconto)}</strong>
                    </div>
                    <div className="calculo-item destaque">
                      <span>Valor a Receber:</span>
                      <strong>{formatarValor(calculoAntecipacao.valorAReceber)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseModalAntecipacao}>
                Cancelar
              </button>
              <button 
                className="btn-primary"
                onClick={handleSolicitarAntecipacao}
                disabled={!calculoAntecipacao || enviando}
              >
                {enviando ? 'Enviando...' : '✓ Confirmar Solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ValoresPendentes;
