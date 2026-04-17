import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import api from '../services/api';
import authService from '../services/authService';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import './RelatorioGerencial.css';

function RelatorioGerencial() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);

  // Filtros de período
  const [periodo, setPeriodo] = useState('mes_atual');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!['super_admin', 'admin', 'gerente'].includes(currentUser.role)) {
      navigate('/dashboard');
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  const calcularPeriodo = () => {
    const hoje = new Date();
    let inicio, fim;

    switch (periodo) {
      case 'mes_atual':
        inicio = startOfMonth(hoje);
        fim = endOfMonth(hoje);
        break;
      case 'mes_anterior': {
        const mesAnterior = subMonths(hoje, 1);
        inicio = startOfMonth(mesAnterior);
        fim = endOfMonth(mesAnterior);
        break;
      }
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
      fim: format(fim, 'yyyy-MM-dd'),
      inicioFormatado: format(inicio, 'dd/MM/yyyy', { locale: ptBR }),
      fimFormatado: format(fim, 'dd/MM/yyyy', { locale: ptBR })
    };
  };

  const gerarRelatorio = async () => {
    try {
      setLoading(true);
      const { inicio, fim } = calcularPeriodo();
      const response = await api.get(`/relatorio-gerencial?dataInicio=${inicio}&dataFim=${fim}`);
      if (response.data.success) {
        setDados(response.data.dados);
        toast.success('Relatório gerado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error(error.response?.data?.message || 'Erro ao gerar relatório gerencial');
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

  const getPeriodoLabel = () => {
    const { inicioFormatado, fimFormatado } = calcularPeriodo();
    return `${inicioFormatado} a ${fimFormatado}`;
  };

  const getReportData = () => {
    if (!dados) return [];
    return [
      ['FORNECEDORES', '', ''],
      ['Total de Fornecedores Ativos', dados.fornecedores.totalAtivos, ''],
      ['Fornecedores Novos no Período', dados.fornecedores.novosNoPeriodo, ''],
      ['', '', ''],
      ['CLIENTES', '', ''],
      ['Total de Clientes Cadastrados', dados.clientes.totalCadastrados, ''],
      ['Clientes Ativos', dados.clientes.ativos, ''],
      ['Clientes Novos no Período', dados.clientes.novosNoPeriodo, ''],
      ['', '', ''],
      ['ORDENS DE SERVIÇO', '', ''],
      ['Total de OS Inseridas', dados.ordensServico.total, formatCurrency(dados.ordensServico.valorTotal)],
      ['', '', ''],
      ['ABASTECIMENTOS', '', ''],
      ['Total de Abastecimentos Criados', dados.abastecimentos.total, formatCurrency(dados.abastecimentos.valorTotal)],
      ['', '', ''],
      ['FATURAS', '', ''],
      ['Faturas Geradas', dados.faturas.geradas, formatCurrency(dados.faturas.valorTotal)],
      ['Faturas em Aberto', dados.faturas.emAberto, ''],
      ['Faturas Pagas', dados.faturas.pagas, ''],
      ['Faturas de Fornecedor', dados.faturas.porTipo.fornecedor, ''],
      ['Faturas de Cliente', dados.faturas.porTipo.cliente, ''],
      ['', '', ''],
      ['ORDENS DE PAGAMENTO', '', ''],
      ['Ordens Criadas', dados.ordensPagamento.criadas, formatCurrency(dados.ordensPagamento.valorTotal)],
      ['Ordens Pendentes', dados.ordensPagamento.pendentes, ''],
      ['Ordens Pagas', dados.ordensPagamento.pagas, ''],
      ['Ordens Canceladas', dados.ordensPagamento.canceladas, '']
    ];
  };

  const exportarExcel = () => {
    if (!dados) {
      toast.warning('Gere o relatório antes de exportar');
      return;
    }

    const periodoLabel = getPeriodoLabel();
    const reportData = getReportData();

    const wsData = [
      ['RELATÓRIO GERENCIAL'],
      [`Período: ${periodoLabel}`],
      [`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`],
      [],
      ['Indicador', 'Quantidade', 'Valor'],
      ...reportData
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Column widths
    ws['!cols'] = [
      { wch: 35 },
      { wch: 15 },
      { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Gerencial');
    XLSX.writeFile(wb, `relatorio_gerencial_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel exportado com sucesso!');
  };

  const exportarPDF = () => {
    if (!dados) {
      toast.warning('Gere o relatório antes de exportar');
      return;
    }

    const periodoLabel = getPeriodoLabel();
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(41, 65, 122);
    doc.text('Relatório Gerencial', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${periodoLabel}`, 14, 32);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 39);

    // Fornecedores
    doc.autoTable({
      startY: 48,
      head: [['Fornecedores', 'Quantidade']],
      body: [
        ['Total de Fornecedores Ativos', dados.fornecedores.totalAtivos],
        ['Fornecedores Novos no Período', dados.fornecedores.novosNoPeriodo]
      ],
      theme: 'grid',
      headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 }
    });

    // Clientes
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Clientes', 'Quantidade']],
      body: [
        ['Total de Clientes Cadastrados', dados.clientes.totalCadastrados],
        ['Clientes Ativos', dados.clientes.ativos],
        ['Clientes Novos no Período', dados.clientes.novosNoPeriodo]
      ],
      theme: 'grid',
      headStyles: { fillColor: [67, 233, 123], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 }
    });

    // Ordens de Serviço
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Ordens de Serviço', 'Quantidade', 'Valor Total']],
      body: [
        ['OS Inseridas no Período', dados.ordensServico.total, formatCurrency(dados.ordensServico.valorTotal)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [240, 147, 251], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 }
    });

    // Abastecimentos
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Abastecimentos', 'Quantidade', 'Valor Total']],
      body: [
        ['Abastecimentos Criados', dados.abastecimentos.total, formatCurrency(dados.abastecimentos.valorTotal)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 172, 254], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 }
    });

    // Faturas
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Faturas', 'Quantidade', 'Valor']],
      body: [
        ['Faturas Geradas', dados.faturas.geradas, formatCurrency(dados.faturas.valorTotal)],
        ['Faturas em Aberto', dados.faturas.emAberto, ''],
        ['Faturas Pagas', dados.faturas.pagas, ''],
        ['Faturas de Fornecedor', dados.faturas.porTipo.fornecedor, ''],
        ['Faturas de Cliente', dados.faturas.porTipo.cliente, '']
      ],
      theme: 'grid',
      headStyles: { fillColor: [250, 112, 154], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 }
    });

    // Ordens de Pagamento
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Ordens de Pagamento', 'Quantidade', 'Valor']],
      body: [
        ['Ordens Criadas', dados.ordensPagamento.criadas, formatCurrency(dados.ordensPagamento.valorTotal)],
        ['Ordens Pendentes', dados.ordensPagamento.pendentes, ''],
        ['Ordens Pagas', dados.ordensPagamento.pagas, ''],
        ['Ordens Canceladas', dados.ordensPagamento.canceladas, '']
      ],
      theme: 'grid',
      headStyles: { fillColor: [118, 75, 162], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 }
    });

    doc.save(`relatorio_gerencial_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="relatorio-gerencial-container">
            <div className="page-header">
              <div>
                <h1>📋 Relatório Gerencial</h1>
                <p className="page-subtitle">Visão geral do sistema para gerência</p>
              </div>
              <div className="header-actions">
                <button className="btn-export" onClick={exportarExcel} disabled={!dados}>
                  📊 Exportar Excel
                </button>
                <button className="btn-export" onClick={exportarPDF} disabled={!dados}>
                  📄 Exportar PDF
                </button>
              </div>
            </div>

            {/* Filtros de Período */}
            <div className="filtros-section">
              <h3>Período de Apuração</h3>
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

                <div className="form-group filtro-action">
                  <label>&nbsp;</label>
                  <button className="btn-gerar" onClick={gerarRelatorio} disabled={loading}>
                    {loading ? 'Gerando...' : '🔍 Gerar Relatório'}
                  </button>
                </div>
              </div>
            </div>

            {loading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Gerando relatório gerencial...</p>
              </div>
            )}

            {dados && !loading && (
              <>
                <div className="periodo-info">
                  <span>📅 Período: <strong>{getPeriodoLabel()}</strong></span>
                </div>

                {/* Cards de Resumo */}
                <div className="rg-cards-grid">
                  {/* Fornecedores */}
                  <div className="rg-card">
                    <div className="rg-card-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      <span className="rg-card-icon">🏢</span>
                      <h3>Fornecedores</h3>
                    </div>
                    <div className="rg-card-body">
                      <div className="rg-stat">
                        <span className="rg-stat-label">Total Ativos</span>
                        <span className="rg-stat-value">{dados.fornecedores.totalAtivos}</span>
                      </div>
                      <div className="rg-stat">
                        <span className="rg-stat-label">Novos no Período</span>
                        <span className="rg-stat-value rg-highlight">{dados.fornecedores.novosNoPeriodo}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clientes */}
                  <div className="rg-card">
                    <div className="rg-card-header" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                      <span className="rg-card-icon">👥</span>
                      <h3>Clientes</h3>
                    </div>
                    <div className="rg-card-body">
                      <div className="rg-stat">
                        <span className="rg-stat-label">Total Cadastrados</span>
                        <span className="rg-stat-value">{dados.clientes.totalCadastrados}</span>
                      </div>
                      <div className="rg-stat">
                        <span className="rg-stat-label">Ativos</span>
                        <span className="rg-stat-value">{dados.clientes.ativos}</span>
                      </div>
                      <div className="rg-stat">
                        <span className="rg-stat-label">Novos no Período</span>
                        <span className="rg-stat-value rg-highlight">{dados.clientes.novosNoPeriodo}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ordens de Serviço */}
                  <div className="rg-card">
                    <div className="rg-card-header" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                      <span className="rg-card-icon">🔧</span>
                      <h3>Ordens de Serviço</h3>
                    </div>
                    <div className="rg-card-body">
                      <div className="rg-stat">
                        <span className="rg-stat-label">OS Inseridas</span>
                        <span className="rg-stat-value">{dados.ordensServico.total}</span>
                      </div>
                      <div className="rg-stat">
                        <span className="rg-stat-label">Valor Total</span>
                        <span className="rg-stat-value rg-currency">{formatCurrency(dados.ordensServico.valorTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Abastecimentos */}
                  <div className="rg-card">
                    <div className="rg-card-header" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                      <span className="rg-card-icon">⛽</span>
                      <h3>Abastecimentos</h3>
                    </div>
                    <div className="rg-card-body">
                      <div className="rg-stat">
                        <span className="rg-stat-label">Total Criados</span>
                        <span className="rg-stat-value">{dados.abastecimentos.total}</span>
                      </div>
                      <div className="rg-stat">
                        <span className="rg-stat-label">Valor Total</span>
                        <span className="rg-stat-value rg-currency">{formatCurrency(dados.abastecimentos.valorTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Faturas */}
                  <div className="rg-card rg-card-wide">
                    <div className="rg-card-header" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                      <span className="rg-card-icon">📄</span>
                      <h3>Faturas</h3>
                    </div>
                    <div className="rg-card-body">
                      <div className="rg-stats-row">
                        <div className="rg-stat">
                          <span className="rg-stat-label">Geradas</span>
                          <span className="rg-stat-value">{dados.faturas.geradas}</span>
                        </div>
                        <div className="rg-stat">
                          <span className="rg-stat-label">Em Aberto</span>
                          <span className="rg-stat-value rg-warning">{dados.faturas.emAberto}</span>
                        </div>
                        <div className="rg-stat">
                          <span className="rg-stat-label">Pagas</span>
                          <span className="rg-stat-value rg-success">{dados.faturas.pagas}</span>
                        </div>
                        <div className="rg-stat">
                          <span className="rg-stat-label">Valor Total</span>
                          <span className="rg-stat-value rg-currency">{formatCurrency(dados.faturas.valorTotal)}</span>
                        </div>
                      </div>
                      <div className="rg-stats-row rg-stats-secondary">
                        <div className="rg-stat-small">
                          <span>Fornecedor: <strong>{dados.faturas.porTipo.fornecedor}</strong></span>
                        </div>
                        <div className="rg-stat-small">
                          <span>Cliente: <strong>{dados.faturas.porTipo.cliente}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ordens de Pagamento */}
                  <div className="rg-card rg-card-wide">
                    <div className="rg-card-header" style={{ background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)' }}>
                      <span className="rg-card-icon">💳</span>
                      <h3>Ordens de Pagamento</h3>
                    </div>
                    <div className="rg-card-body">
                      <div className="rg-stats-row">
                        <div className="rg-stat">
                          <span className="rg-stat-label">Criadas</span>
                          <span className="rg-stat-value">{dados.ordensPagamento.criadas}</span>
                        </div>
                        <div className="rg-stat">
                          <span className="rg-stat-label">Pendentes</span>
                          <span className="rg-stat-value rg-warning">{dados.ordensPagamento.pendentes}</span>
                        </div>
                        <div className="rg-stat">
                          <span className="rg-stat-label">Pagas</span>
                          <span className="rg-stat-value rg-success">{dados.ordensPagamento.pagas}</span>
                        </div>
                        <div className="rg-stat">
                          <span className="rg-stat-label">Canceladas</span>
                          <span className="rg-stat-value rg-danger">{dados.ordensPagamento.canceladas}</span>
                        </div>
                      </div>
                      <div className="rg-stats-row rg-stats-secondary">
                        <div className="rg-stat-small">
                          <span>Valor Total: <strong>{formatCurrency(dados.ordensPagamento.valorTotal)}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!dados && !loading && (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>Selecione o período e gere o relatório</h3>
                <p>Escolha o período de apuração acima e clique em "Gerar Relatório" para visualizar os dados gerenciais.</p>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default RelatorioGerencial;
