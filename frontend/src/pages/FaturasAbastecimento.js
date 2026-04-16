import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './FaturasAbastecimento.css';

const TIPOS_COMBUSTIVEL = {
  alcool: 'Álcool',
  gasolina_comum: 'Gasolina Comum',
  gasolina_aditivada: 'Gasolina Aditivada',
  gnv: 'GNV',
  diesel: 'Diesel',
  diesel_500: 'Diesel S-500',
  diesel_s10: 'Diesel S-10',
  arla: 'ARLA',
  querosene: 'Querosene',
  glp: 'GLP'
};

function FaturasAbastecimento() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [abastecimentos, setAbastecimentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [impostos, setImpostos] = useState(null);

  // Filtros
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useState('');
  const [filtroPeriodoFim, setFiltroPeriodoFim] = useState('');

  // Seleção / Modal
  const [selectedIds, setSelectedIds] = useState([]);
  const [showFaturaModal, setShowFaturaModal] = useState(false);
  const [aplicarRetencao, setAplicarRetencao] = useState(true);

  // Campos da fatura
  const [prazoRecebimentoDias, setPrazoRecebimentoDias] = useState(30);
  const [dataVencimento, setDataVencimento] = useState('');
  const [numeroNF, setNumeroNF] = useState('');
  const [serieNF, setSerieNF] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const isFornecedor = user?.role === 'fornecedor';

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [abastRes, clientesRes, impostosRes] = await Promise.all([
        api.get('/abastecimentos/nao-faturados?tipo=Fornecedor'),
        api.get('/clientes?limit=1000'),
        api.get('/impostos-retencoes')
      ]);

      const abData = abastRes.data.abastecimentos || abastRes.data || [];
      setAbastecimentos(Array.isArray(abData) ? abData : []);

      const cliData = clientesRes.data.clientes || clientesRes.data;
      setClientes(Array.isArray(cliData) ? cliData : []);

      const impData = impostosRes.data;
      if (Array.isArray(impData) && impData.length > 0) {
        setImpostos(impData[0]);
      } else if (impData && typeof impData === 'object' && !Array.isArray(impData)) {
        setImpostos(impData);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar abastecimentos por cliente
  const getAbastecimentosFiltrados = useCallback(() => {
    let filtered = [...abastecimentos];
    if (filtroCliente) {
      filtered = filtered.filter(ab => {
        const cId = ab.cliente?._id || ab.cliente;
        return cId === filtroCliente;
      });
    }
    if (filtroPeriodoInicio) {
      filtered = filtered.filter(ab => new Date(ab.createdAt) >= new Date(filtroPeriodoInicio));
    }
    if (filtroPeriodoFim) {
      filtered = filtered.filter(ab => new Date(ab.createdAt) <= new Date(filtroPeriodoFim + 'T23:59:59'));
    }
    return filtered;
  }, [abastecimentos, filtroCliente, filtroPeriodoInicio, filtroPeriodoFim]);

  const abastecimentosFiltrados = getAbastecimentosFiltrados();

  // Agrupar por cliente
  const agrupadosPorCliente = abastecimentosFiltrados.reduce((acc, ab) => {
    const clienteId = ab.cliente?._id || ab.cliente;
    const clienteNome = ab.cliente?.razaoSocial || ab.cliente?.nomeFantasia || 'Sem Cliente';
    if (!acc[clienteId]) {
      acc[clienteId] = { clienteId, clienteNome, cliente: ab.cliente, abastecimentos: [] };
    }
    acc[clienteId].abastecimentos.push(ab);
    return acc;
  }, {});

  // Seleção
  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelecionarTodos = () => {
    if (selectedIds.length === abastecimentosFiltrados.length && abastecimentosFiltrados.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(abastecimentosFiltrados.map(ab => ab._id));
    }
  };

  // Cálculos fiscais para combustível
  const calcularResumoFiscal = useCallback(() => {
    const selecionados = abastecimentos.filter(ab => selectedIds.includes(ab._id));
    if (selecionados.length === 0) return null;

    let totalLitros = 0;
    let valorBruto = 0;
    let valorDesconto = 0;
    let retencaoIRRF = 0;
    let retencaoCSLL = 0;
    let retencaoPIS = 0;
    let retencaoCOFINS = 0;

    const clienteId = selecionados[0]?.cliente?._id || selecionados[0]?.cliente;
    const clienteInfo = clientes.find(c => c._id === clienteId) || selecionados[0]?.cliente;
    const tipoImposto = clienteInfo?.tipoImposto || [];
    const taxaPlataformaPorLitro = impostos?.taxaPlataformaPorLitro ?? 0.08;

    selecionados.forEach(ab => {
      const litros = ab.litrosAbastecidos || 0;
      const valor = ab.valor || 0;
      const descPerc = ab.descontoPercentual || 0;
      const desc = Math.round((valor * descPerc / 100) * 100) / 100;
      const valorLiq = Math.round((valor - desc) * 100) / 100;

      totalLitros += litros;
      valorBruto += valor;
      valorDesconto += desc;

      if (aplicarRetencao && impostos) {
        tipoImposto.forEach(tipo => {
          let tabela = null;
          if (tipo === 'municipais') tabela = impostos.combustivelMunicipais;
          if (tipo === 'estaduais') tabela = impostos.combustivelEstaduais;
          if (tipo === 'federais') tabela = impostos.combustivelFederais;

          if (tabela) {
            retencaoIRRF += Math.round(valorLiq * (tabela.irrf || 0) / 100 * 100) / 100;
            retencaoCSLL += Math.round(valorLiq * (tabela.csll || 0) / 100 * 100) / 100;
            retencaoPIS += Math.round(valorLiq * (tabela.pis || 0) / 100 * 100) / 100;
            retencaoCOFINS += Math.round(valorLiq * (tabela.cofins || 0) / 100 * 100) / 100;
          }

          if (tipo === 'retencoes' && impostos.retencoesOrgao) {
            retencaoIRRF += Math.round(valorLiq * (impostos.retencoesOrgao.percentual || 0) / 100 * 100) / 100;
          }
        });
      }
    });

    const valorComDesconto = Math.round((valorBruto - valorDesconto) * 100) / 100;
    const totalRetencoes = Math.round((retencaoIRRF + retencaoCSLL + retencaoPIS + retencaoCOFINS) * 100) / 100;
    const taxaPlataforma = Math.round(totalLitros * taxaPlataformaPorLitro * 100) / 100;
    const valorNF = valorBruto; // NF é sempre sobre o valor bruto
    const valorAReceber = Math.round((valorComDesconto - totalRetencoes - taxaPlataforma) * 100) / 100;

    // Percentuais para exibição
    const percRetencaoTotal = valorComDesconto > 0
      ? Math.round(totalRetencoes / valorComDesconto * 10000) / 100
      : 0;

    return {
      totalAbastecimentos: selecionados.length,
      totalLitros,
      valorBruto,
      valorDesconto,
      valorComDesconto,
      valorNF,
      retencaoIRRF,
      retencaoCSLL,
      retencaoPIS,
      retencaoCOFINS,
      totalRetencoes,
      percRetencaoTotal,
      taxaPlataformaPorLitro,
      taxaPlataforma,
      valorAReceber,
      clienteInfo,
      tipoImposto
    };
  }, [selectedIds, abastecimentos, clientes, impostos, aplicarRetencao]);

  const resumo = calcularResumoFiscal();

  const handleVisualizarFatura = () => {
    if (selectedIds.length === 0) {
      toast.warning('Selecione pelo menos um abastecimento');
      return;
    }
    // Calcular data de vencimento automática
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + prazoRecebimentoDias);
    setDataVencimento(hoje.toISOString().split('T')[0]);
    setShowFaturaModal(true);
  };

  const handleGerarFaturaDirecta = () => {
    if (selectedIds.length === 0) {
      toast.warning('Selecione pelo menos um abastecimento');
      return;
    }
    if (!window.confirm(`Deseja gerar a fatura com ${selectedIds.length} abastecimento(s) selecionado(s)?`)) {
      return;
    }
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + prazoRecebimentoDias);
    setDataVencimento(hoje.toISOString().split('T')[0]);
    handleGerarFatura();
  };

  const handleGerarFatura = async () => {
    if (selectedIds.length === 0) return;

    const selecionados = abastecimentos.filter(ab => selectedIds.includes(ab._id));
    const fornecedorId = selecionados[0]?.fornecedor?._id || selecionados[0]?.fornecedor;
    const clienteId = selecionados[0]?.cliente?._id || selecionados[0]?.cliente;

    const datas = selecionados
      .map(ab => ab.createdAt)
      .filter(Boolean)
      .map(d => new Date(d));

    const periodoInicio = datas.length > 0
      ? new Date(Math.min(...datas)).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const periodoFim = datas.length > 0
      ? new Date(Math.max(...datas)).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const payload = {
      tipo: 'Fornecedor',
      fornecedor: fornecedorId,
      cliente: clienteId,
      abastecimentoIds: selectedIds,
      periodoInicio,
      periodoFim,
      aplicarRetencao,
      observacoes: observacoes || undefined
    };

    try {
      const response = await api.post('/faturas/abastecimento', payload);
      toast.success(`Fatura ${response.data.numeroFatura} gerada com sucesso!`);
      setShowFaturaModal(false);
      setSelectedIds([]);
      setObservacoes('');
      setNumeroNF('');
      setSerieNF('');
      await loadData();
      navigate(`/faturados/editar/${response.data._id}`);
    } catch (error) {
      console.error('Erro ao gerar fatura:', error);
      toast.error(error.response?.data?.message || 'Erro ao gerar fatura');
    }
  };

  const formatCurrency = (v) =>
    (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatNumber = (v, decimals = 2) =>
    (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const getEsferaBadge = (tipoImposto) => {
    if (!tipoImposto || tipoImposto.length === 0) return null;
    const labels = { municipais: 'Municipal', estaduais: 'Estadual', federais: 'Federal', retencoes: 'Retenções' };
    const colors = { municipais: '#2563eb', estaduais: '#059669', federais: '#dc2626', retencoes: '#7c3aed' };
    return tipoImposto.map(t => (
      <span key={t} className="esfera-badge" style={{ backgroundColor: colors[t] || '#6b7280' }}>
        {labels[t] || t}
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="faturas-abast-container">
            <div className="page-header">
              <div>
                <h1>⛽ Faturamento de Abastecimentos</h1>
                <p>Selecione abastecimentos não faturados para gerar faturas de fornecedor</p>
              </div>
            </div>

            {isFornecedor && (
              <div className="readonly-banner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Você está no modo somente leitura
              </div>
            )}

            {/* Filtros */}
            <div className="filtros-section">
              <h3>Filtros</h3>
              <div className="filtros-grid">
                <div className="form-group">
                  <label>Cliente</label>
                  <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
                    <option value="">Todos os Clientes</option>
                    {clientes.filter(c => (c.tiposServico || ['manutencao']).includes('combustivel')).map(c => (
                      <option key={c._id} value={c._id}>{c.nomeFantasia || c.razaoSocial}</option>
                    ))}
                    {/* Show all clients that have abastecimentos even if not tagged */}
                    {clientes.filter(c => !(c.tiposServico || []).includes('combustivel')).map(c => {
                      const hasAb = abastecimentos.some(ab => (ab.cliente?._id || ab.cliente) === c._id);
                      return hasAb ? <option key={c._id} value={c._id}>{c.nomeFantasia || c.razaoSocial}</option> : null;
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label>Período Início</label>
                  <input type="date" value={filtroPeriodoInicio} onChange={e => setFiltroPeriodoInicio(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Período Fim</label>
                  <input type="date" value={filtroPeriodoFim} onChange={e => setFiltroPeriodoFim(e.target.value)} />
                </div>
              </div>
              <div className="filtros-actions">
                <button className="btn-secondary" onClick={() => { setFiltroCliente(''); setFiltroPeriodoInicio(''); setFiltroPeriodoFim(''); }}>
                  Limpar
                </button>
              </div>
            </div>

            {/* Resumo Cards (se há selecionados) */}
            {resumo && (
              <div className="resumo-cards">
                <div className="resumo-card">
                  <span className="resumo-label">ABAST.</span>
                  <span className="resumo-valor">{resumo.totalAbastecimentos}</span>
                </div>
                <div className="resumo-card">
                  <span className="resumo-label">LITROS</span>
                  <span className="resumo-valor">{formatNumber(resumo.totalLitros, 2)}</span>
                </div>
                <div className="resumo-card">
                  <span className="resumo-label">VALOR DA NF</span>
                  <span className="resumo-valor">{formatCurrency(resumo.valorNF)}</span>
                </div>
                <div className="resumo-card card-danger">
                  <span className="resumo-label">RETENÇÕES</span>
                  <span className="resumo-valor">- {formatCurrency(resumo.totalRetencoes)}</span>
                </div>
                <div className="resumo-card card-warning">
                  <span className="resumo-label">TAXA PLATAFORMA</span>
                  <span className="resumo-valor">- {formatCurrency(resumo.taxaPlataforma)}</span>
                </div>
                <div className="resumo-card card-success">
                  <span className="resumo-label">VALOR A RECEBER</span>
                  <span className="resumo-valor">{formatCurrency(resumo.valorAReceber)}</span>
                </div>
              </div>
            )}

            {/* Tabela de abastecimentos */}
            <div className="tabela-section">
              <div className="tabela-header">
                <h3>Abastecimentos Não Faturados ({abastecimentosFiltrados.length})</h3>
                <div className="tabela-actions">
                  <button className="btn-secondary" onClick={toggleSelecionarTodos}>
                    {selectedIds.length === abastecimentosFiltrados.length && abastecimentosFiltrados.length > 0
                      ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  {!isFornecedor && (
                    <button className="btn-primary" onClick={handleVisualizarFatura} disabled={selectedIds.length === 0}>
                      ⛽ Gerar Fatura ({selectedIds.length})
                    </button>
                  )}
                </div>
              </div>

              {Object.values(agrupadosPorCliente).map(grupo => (
                <div key={grupo.clienteId} className="grupo-cliente">
                  <div className="grupo-cliente-header">
                    <div className="grupo-cliente-info">
                      <h4>{grupo.clienteNome}</h4>
                      <span className="grupo-cnpj">{grupo.cliente?.cnpj || ''}</span>
                      {getEsferaBadge(grupo.cliente?.tipoImposto)}
                    </div>
                    <span className="grupo-count">{grupo.abastecimentos.length} abastecimentos</span>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}></th>
                        <th>Data</th>
                        <th>Veículo</th>
                        <th>Motorista</th>
                        <th>Combustível</th>
                        <th>Litros</th>
                        <th>Valor Bruto</th>
                        <th>Valor c/ Desc.</th>
                        <th>CC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.abastecimentos.map(ab => (
                        <tr key={ab._id} className={selectedIds.includes(ab._id) ? 'row-selected' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(ab._id)}
                              onChange={() => toggleSelection(ab._id)}
                            />
                          </td>
                          <td>{new Date(ab.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td>{ab.placa || '-'}</td>
                          <td>{ab.motorista || '-'}</td>
                          <td>{TIPOS_COMBUSTIVEL[ab.tipoCombustivel] || ab.tipoCombustivel}</td>
                          <td>{formatNumber(ab.litrosAbastecidos, 2)}</td>
                          <td>{formatCurrency(ab.valor)}</td>
                          <td>{formatCurrency(ab.valorComDesconto || ab.valor)}</td>
                          <td>{ab.centroCusto || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {abastecimentosFiltrados.length === 0 && (
                <div className="empty-state">
                  <p>Nenhum abastecimento não faturado encontrado</p>
                </div>
              )}
            </div>

            {/* Modal de Faturamento */}
            {showFaturaModal && resumo && (
              <div className="modal-overlay" onClick={() => setShowFaturaModal(false)}>
                <div className="modal-fatura" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <h2>Prévia do Faturamento de Abastecimentos</h2>
                    <button className="close-btn" onClick={() => setShowFaturaModal(false)}>×</button>
                  </div>

                  <div className="modal-body">
                    {/* Orientação sobre emissão da NF */}
                    <div className="orientacao-nf-box">
                      <h4>📋 Orientação para Emissão da Nota Fiscal</h4>
                      <p>O fornecedor pode emitir a NF de duas formas:</p>
                      <ul>
                        <li><strong>Opção 1 — Valor Líquido:</strong> Emitir a NF pelo valor líquido (já com o desconto do contrato aplicado), informando no corpo da NF: Valor Bruto, Desconto do Contrato e Valor Líquido.</li>
                        <li><strong>Opção 2 — Valor Bruto com Desconto:</strong> Emitir a NF pelo valor bruto e lançar o desconto do contrato no campo de desconto da NF.</li>
                      </ul>
                      <p className="orientacao-nota">Ambas as formas são válidas. O importante é que o valor líquido final seja consistente com o desconto contratual.</p>
                    </div>

                    {/* Cabeçalho do Cliente */}
                    <div className="fatura-cliente-info">
                      <div>
                        <strong>{resumo.clienteInfo?.razaoSocial || resumo.clienteInfo?.nomeFantasia || 'Cliente'}</strong>
                        <span className="cnpj-text">{resumo.clienteInfo?.cnpj || ''}</span>
                      </div>
                      <div className="badges-row">
                        {getEsferaBadge(resumo.tipoImposto)}
                      </div>
                    </div>

                    {/* Cards Resumo */}
                    <div className="modal-resumo-cards">
                      <div className="mr-card">
                        <span className="mr-label">ABAST.</span>
                        <span className="mr-valor">{resumo.totalAbastecimentos}</span>
                      </div>
                      <div className="mr-card">
                        <span className="mr-label">LITROS</span>
                        <span className="mr-valor">{formatNumber(resumo.totalLitros, 2)}</span>
                      </div>
                      <div className="mr-card">
                        <span className="mr-label">VALOR DA NF</span>
                        <span className="mr-valor">{formatCurrency(resumo.valorNF)}</span>
                      </div>
                      <div className="mr-card card-red">
                        <span className="mr-label">RETENÇÕES</span>
                        <span className="mr-valor">- {formatCurrency(resumo.totalRetencoes)}</span>
                      </div>
                      <div className="mr-card card-orange">
                        <span className="mr-label">TAXA PLATAFORMA</span>
                        <span className="mr-valor">- {formatCurrency(resumo.taxaPlataforma)}</span>
                      </div>
                      <div className="mr-card card-green">
                        <span className="mr-label">VALOR A RECEBER</span>
                        <span className="mr-valor">{formatCurrency(resumo.valorAReceber)}</span>
                      </div>
                    </div>

                    {/* Resumo Financeiro Detalhado */}
                    <div className="resumo-financeiro">
                      <h3>Resumo Financeiro</h3>

                      <div className="rf-line">
                        <span>Valor Bruto</span>
                        <span className="rf-val">{formatCurrency(resumo.valorBruto)}</span>
                      </div>

                      {resumo.valorDesconto > 0 && (
                        <div className="rf-line rf-desconto">
                          <span>(-) Desconto Contrato</span>
                          <span className="rf-val">- {formatCurrency(resumo.valorDesconto)}</span>
                        </div>
                      )}

                      <div className="rf-separator"></div>

                      {/* Checkbox de aplicar retenção */}
                      <div className="rf-toggle">
                        <label>
                          <input
                            type="checkbox"
                            checked={aplicarRetencao}
                            onChange={e => setAplicarRetencao(e.target.checked)}
                          />
                          <span>Aplicar Retenção Fiscal (IN RFB 1.234/2012)</span>
                        </label>
                      </div>

                      {aplicarRetencao && resumo.totalRetencoes > 0 && (
                        <div className="rf-retencoes">
                          {resumo.retencaoIRRF > 0 && (
                            <div className="rf-line rf-sub">
                              <span>(-) IRRF</span>
                              <span className="rf-val">- {formatCurrency(resumo.retencaoIRRF)}</span>
                            </div>
                          )}
                          {resumo.retencaoCSLL > 0 && (
                            <div className="rf-line rf-sub">
                              <span>(-) CSLL</span>
                              <span className="rf-val">- {formatCurrency(resumo.retencaoCSLL)}</span>
                            </div>
                          )}
                          {resumo.retencaoPIS > 0 && (
                            <div className="rf-line rf-sub">
                              <span>(-) PIS</span>
                              <span className="rf-val">- {formatCurrency(resumo.retencaoPIS)}</span>
                            </div>
                          )}
                          {resumo.retencaoCOFINS > 0 && (
                            <div className="rf-line rf-sub">
                              <span>(-) COFINS</span>
                              <span className="rf-val">- {formatCurrency(resumo.retencaoCOFINS)}</span>
                            </div>
                          )}
                          <div className="rf-line rf-total-ret">
                            <span>Total Retenções ({resumo.percRetencaoTotal}%)</span>
                            <span className="rf-val">- {formatCurrency(resumo.totalRetencoes)}</span>
                          </div>
                        </div>
                      )}

                      <div className="rf-separator"></div>

                      <div className="rf-line rf-nf">
                        <span>VALOR DA NOTA FISCAL</span>
                        <span className="rf-val-nf">{formatCurrency(resumo.valorNF)}</span>
                      </div>
                      <p className="rf-nota">NF = valor bruto (sempre)</p>

                      <div className="rf-separator"></div>

                      <h4>Decomposição do Repasse</h4>
                      <div className="rf-line rf-sub">
                        <span>(-) Taxa da Plataforma (R$ {formatNumber(resumo.taxaPlataformaPorLitro, 2)}/L × {formatNumber(resumo.totalLitros, 2)} L)</span>
                        <span className="rf-val">- {formatCurrency(resumo.taxaPlataforma)}</span>
                      </div>
                      {aplicarRetencao && resumo.totalRetencoes > 0 && (
                        <div className="rf-line rf-sub">
                          <span>(-) Retenções Tributárias</span>
                          <span className="rf-val">- {formatCurrency(resumo.totalRetencoes)}</span>
                        </div>
                      )}

                      <div className="rf-separator"></div>

                      <div className="rf-line rf-final">
                        <span>VALOR A RECEBER</span>
                        <span className="rf-val-final">{formatCurrency(resumo.valorAReceber)}</span>
                      </div>
                    </div>

                    {/* Campos adicionais */}
                    <div className="fatura-campos">
                      <div className="campos-grid">
                        <div className="form-group">
                          <label>Prazo Receb. (dias)</label>
                          <input
                            type="number"
                            min="0"
                            value={prazoRecebimentoDias}
                            onChange={e => {
                              const dias = parseInt(e.target.value) || 0;
                              setPrazoRecebimentoDias(dias);
                              const d = new Date();
                              d.setDate(d.getDate() + dias);
                              setDataVencimento(d.toISOString().split('T')[0]);
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <label>Data de Vencimento</label>
                          <input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Nº NF</label>
                          <input type="text" value={numeroNF} onChange={e => setNumeroNF(e.target.value)} placeholder="Número da NF" />
                        </div>
                        <div className="form-group">
                          <label>Série NF</label>
                          <input type="text" value={serieNF} onChange={e => setSerieNF(e.target.value)} placeholder="Série" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Observações</label>
                        <textarea
                          value={observacoes}
                          onChange={e => setObservacoes(e.target.value)}
                          rows="3"
                          placeholder="Observações adicionais..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button className="btn-secondary" onClick={() => setShowFaturaModal(false)}>
                      Cancelar
                    </button>
                    <button className="btn-primary btn-confirmar" onClick={handleGerarFatura}>
                      ✓ Confirmar e Gerar Fatura
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default FaturasAbastecimento;
