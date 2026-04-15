import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './ImpostosRetencoes.css';

function ImpostosRetencoes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('manutencao');
  const [formData, setFormData] = useState({
    impostosMunicipais: {
      pecas: { ir: 1.20 },
      servicos: { ir: 4.80 }
    },
    impostosEstaduais: {
      pecas: { ir: 1.20, pis: 0.65, cofins: 3.00, csll: 1.00 },
      servicos: { ir: 4.80, pis: 0.65, cofins: 3.00, csll: 1.00 }
    },
    impostosFederais: {
      pecas: { ir: 1.20, pis: 0.65, cofins: 3.00, csll: 1.00 },
      servicos: { ir: 4.80, pis: 0.65, cofins: 3.00, csll: 1.00 }
    },
    combustivelMunicipais: { irrf: 0.24, csll: 0, pis: 0, cofins: 0 },
    combustivelEstaduais: { irrf: 0.24, csll: 0, pis: 0, cofins: 0 },
    combustivelFederais: { irrf: 0.24, csll: 1.00, pis: 0, cofins: 0 },
    retencoesOrgao: { percentual: 0 },
    taxasOperacao: { taxaFixa: 0 },
    taxasAntecipacao: { aVista: 0, aposFechamento: 0, dias30: 0, dias40: 0, dias50: 0, dias60: 0 },
    taxasAntecipacaoFaixas: {
      faixa30a25: 10,
      faixa24a19: 8,
      faixa18a12: 6,
      faixa11a06: 4,
      faixa05a01: 2.5
    }
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadImpostos();
  }, []);

  const loadImpostos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/impostos-retencoes');
      if (response.data) {
        // Garantir estrutura completa com valores padrão
        setFormData({
          impostosMunicipais: {
            pecas: { ir: response.data.impostosMunicipais?.pecas?.ir || 1.20 },
            servicos: { ir: response.data.impostosMunicipais?.servicos?.ir || 4.80 }
          },
          impostosEstaduais: {
            pecas: {
              ir: response.data.impostosEstaduais?.pecas?.ir || 1.20,
              pis: response.data.impostosEstaduais?.pecas?.pis || 0.65,
              cofins: response.data.impostosEstaduais?.pecas?.cofins || 3.00,
              csll: response.data.impostosEstaduais?.pecas?.csll || 1.00
            },
            servicos: {
              ir: response.data.impostosEstaduais?.servicos?.ir || 4.80,
              pis: response.data.impostosEstaduais?.servicos?.pis || 0.65,
              cofins: response.data.impostosEstaduais?.servicos?.cofins || 3.00,
              csll: response.data.impostosEstaduais?.servicos?.csll || 1.00
            }
          },
          impostosFederais: {
            pecas: {
              ir: response.data.impostosFederais?.pecas?.ir || 1.20,
              pis: response.data.impostosFederais?.pecas?.pis || 0.65,
              cofins: response.data.impostosFederais?.pecas?.cofins || 3.00,
              csll: response.data.impostosFederais?.pecas?.csll || 1.00
            },
            servicos: {
              ir: response.data.impostosFederais?.servicos?.ir || 4.80,
              pis: response.data.impostosFederais?.servicos?.pis || 0.65,
              cofins: response.data.impostosFederais?.servicos?.cofins || 3.00,
              csll: response.data.impostosFederais?.servicos?.csll || 1.00
            }
          },
          retencoesOrgao: {
            percentual: response.data.retencoesOrgao?.percentual || 0
          },
          combustivelMunicipais: {
            irrf: response.data.combustivelMunicipais?.irrf ?? 0.24,
            csll: response.data.combustivelMunicipais?.csll ?? 0,
            pis: response.data.combustivelMunicipais?.pis ?? 0,
            cofins: response.data.combustivelMunicipais?.cofins ?? 0
          },
          combustivelEstaduais: {
            irrf: response.data.combustivelEstaduais?.irrf ?? 0.24,
            csll: response.data.combustivelEstaduais?.csll ?? 0,
            pis: response.data.combustivelEstaduais?.pis ?? 0,
            cofins: response.data.combustivelEstaduais?.cofins ?? 0
          },
          combustivelFederais: {
            irrf: response.data.combustivelFederais?.irrf ?? 0.24,
            csll: response.data.combustivelFederais?.csll ?? 1.00,
            pis: response.data.combustivelFederais?.pis ?? 0,
            cofins: response.data.combustivelFederais?.cofins ?? 0
          },
          taxasOperacao: {
            taxaFixa: response.data.taxasOperacao?.taxaFixa || 0
          },
          taxasAntecipacao: {
            aVista: response.data.taxasAntecipacao?.aVista || 0,
            aposFechamento: response.data.taxasAntecipacao?.aposFechamento || 0,
            dias30: response.data.taxasAntecipacao?.dias30 || 0,
            dias40: response.data.taxasAntecipacao?.dias40 || 0,
            dias50: response.data.taxasAntecipacao?.dias50 || 0,
            dias60: response.data.taxasAntecipacao?.dias60 || 0
          },
          taxasAntecipacaoFaixas: {
            faixa30a25: response.data.taxasAntecipacaoFaixas?.faixa30a25 || 10,
            faixa24a19: response.data.taxasAntecipacaoFaixas?.faixa24a19 || 8,
            faixa18a12: response.data.taxasAntecipacaoFaixas?.faixa18a12 || 6,
            faixa11a06: response.data.taxasAntecipacaoFaixas?.faixa11a06 || 4,
            faixa05a01: response.data.taxasAntecipacaoFaixas?.faixa05a01 || 2.5
          }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar impostos:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section, subsection, field, value) => {
    const numValue = parseFloat(value) || 0;
    
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: field ? {
          ...prev[section][subsection],
          [field]: numValue
        } : numValue
      }
    }));
  };

  const handleSimpleChange = (section, field, value) => {
    const numValue = parseFloat(value) || 0;
    
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: numValue
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await api.put('/impostos-retencoes', formData);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Verificação de segurança para garantir estrutura do formData
  if (!formData?.impostosMunicipais?.pecas || !formData?.impostosMunicipais?.servicos) {
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
          <div className="impostos-container">
            <div className="page-header">
              <div>
                <h1>Impostos & Retenções</h1>
                <p>Configure os impostos e retenções do sistema</p>
              </div>
            </div>

            {/* Tabs de navegação */}
            <div className="impostos-tabs">
              <button
                type="button"
                className={`impostos-tab ${activeTab === 'manutencao' ? 'active' : ''}`}
                onClick={() => setActiveTab('manutencao')}
              >
                🔧 Manutenção de Frotas
              </button>
              <button
                type="button"
                className={`impostos-tab ${activeTab === 'combustivel' ? 'active' : ''}`}
                onClick={() => setActiveTab('combustivel')}
              >
                ⛽ Combustível
              </button>
              <button
                type="button"
                className={`impostos-tab ${activeTab === 'taxas' ? 'active' : ''}`}
                onClick={() => setActiveTab('taxas')}
              >
                💰 Taxas & Antecipação
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="impostos-sections">

                {/* ════════════════════════════════════════ */}
                {/* ABA: MANUTENÇÃO DE FROTAS               */}
                {/* ════════════════════════════════════════ */}
                {activeTab === 'manutencao' && (
                  <>
                    <div className="impostos-tab-header">
                      <h2>🔧 Impostos — Manutenção de Frotas</h2>
                      <p>Retenções aplicadas sobre ordens de serviço (peças e serviços) de manutenção</p>
                    </div>

                    {/* Impostos Municipais */}
                    <div className="imposto-section">
                      <h3>Órgãos Municipais</h3>
                      <div className="imposto-grid">
                        <div className="imposto-column">
                          <h4>Peças</h4>
                          <div className="imposto-field">
                            <label>IR</label>
                            <input type="number" step="0.01" min="0" max="100"
                              value={formData.impostosMunicipais.pecas.ir}
                              onChange={(e) => handleChange('impostosMunicipais', 'pecas', 'ir', e.target.value)} />
                            <span>%</span>
                          </div>
                        </div>
                        <div className="imposto-column">
                          <h4>Serviços</h4>
                          <div className="imposto-field">
                            <label>IR</label>
                            <input type="number" step="0.01" min="0" max="100"
                              value={formData.impostosMunicipais.servicos.ir}
                              onChange={(e) => handleChange('impostosMunicipais', 'servicos', 'ir', e.target.value)} />
                            <span>%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Impostos Estaduais */}
                    <div className="imposto-section">
                      <h3>Órgãos Estaduais</h3>
                      <div className="imposto-grid">
                        <div className="imposto-column">
                          <h4>Peças</h4>
                          {['ir', 'pis', 'cofins', 'csll'].map(field => (
                            <div className="imposto-field" key={field}>
                              <label>{field.toUpperCase()}</label>
                              <input type="number" step="0.01" min="0" max="100"
                                value={formData.impostosEstaduais.pecas[field]}
                                onChange={(e) => handleChange('impostosEstaduais', 'pecas', field, e.target.value)} />
                              <span>%</span>
                            </div>
                          ))}
                        </div>
                        <div className="imposto-column">
                          <h4>Serviços</h4>
                          {['ir', 'pis', 'cofins', 'csll'].map(field => (
                            <div className="imposto-field" key={field}>
                              <label>{field.toUpperCase()}</label>
                              <input type="number" step="0.01" min="0" max="100"
                                value={formData.impostosEstaduais.servicos[field]}
                                onChange={(e) => handleChange('impostosEstaduais', 'servicos', field, e.target.value)} />
                              <span>%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Impostos Federais */}
                    <div className="imposto-section">
                      <h3>Órgãos Federais</h3>
                      <div className="imposto-grid">
                        <div className="imposto-column">
                          <h4>Peças</h4>
                          {['ir', 'pis', 'cofins', 'csll'].map(field => (
                            <div className="imposto-field" key={field}>
                              <label>{field.toUpperCase()}</label>
                              <input type="number" step="0.01" min="0" max="100"
                                value={formData.impostosFederais.pecas[field]}
                                onChange={(e) => handleChange('impostosFederais', 'pecas', field, e.target.value)} />
                              <span>%</span>
                            </div>
                          ))}
                        </div>
                        <div className="imposto-column">
                          <h4>Serviços</h4>
                          {['ir', 'pis', 'cofins', 'csll'].map(field => (
                            <div className="imposto-field" key={field}>
                              <label>{field.toUpperCase()}</label>
                              <input type="number" step="0.01" min="0" max="100"
                                value={formData.impostosFederais.servicos[field]}
                                onChange={(e) => handleChange('impostosFederais', 'servicos', field, e.target.value)} />
                              <span>%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Retenções Órgão */}
                    <div className="imposto-section retencoes-section">
                      <h3>Retenções Órgão</h3>
                      <div className="form-group">
                        <label>Percentual</label>
                        <input type="number" step="0.01" min="0" max="100"
                          value={formData.retencoesOrgao.percentual}
                          onChange={(e) => handleSimpleChange('retencoesOrgao', 'percentual', e.target.value)} />
                      </div>
                    </div>

                    {/* Taxa Fixa de Operação */}
                    <div className="imposto-section retencoes-section">
                      <h3>Taxa de Operação (Manutenção)</h3>
                      <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.85rem' }}>
                        Taxa fixa aplicada sobre faturas de manutenção de frotas
                      </p>
                      <div className="form-group">
                        <label>Taxa Fixa (%)</label>
                        <input type="number" step="0.01" min="0" max="100"
                          value={formData.taxasOperacao.taxaFixa}
                          onChange={(e) => handleSimpleChange('taxasOperacao', 'taxaFixa', e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                {/* ════════════════════════════════════════ */}
                {/* ABA: COMBUSTÍVEL                         */}
                {/* ════════════════════════════════════════ */}
                {activeTab === 'combustivel' && (
                  <>
                    <div className="impostos-tab-header">
                      <h2>⛽ Retenções — Combustível</h2>
                      <p>IN RFB nº 1.234/2012 (art. 18) e IN RFB nº 2.145/2023 — Alíquotas diferenciadas para combustível</p>
                    </div>

                    {/* Combustível Municipais */}
                    <div className="imposto-section imposto-section-combustivel">
                      <h3>Órgãos Municipais</h3>
                      <div className="imposto-grid">
                        <div className="imposto-column">
                          <h4>Combustível</h4>
                          {['irrf', 'csll', 'pis', 'cofins'].map(field => (
                            <div className="imposto-field" key={field}>
                              <label>{field.toUpperCase()}</label>
                              <input type="number" step="0.01" min="0" max="100"
                                value={formData.combustivelMunicipais[field]}
                                onChange={(e) => handleSimpleChange('combustivelMunicipais', field, e.target.value)} />
                              <span>%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Combustível Estaduais */}
                    <div className="imposto-section imposto-section-combustivel">
                      <h3>Órgãos Estaduais</h3>
                      <div className="imposto-grid">
                        <div className="imposto-column">
                          <h4>Combustível</h4>
                          {['irrf', 'csll', 'pis', 'cofins'].map(field => (
                            <div className="imposto-field" key={field}>
                              <label>{field.toUpperCase()}</label>
                              <input type="number" step="0.01" min="0" max="100"
                                value={formData.combustivelEstaduais[field]}
                                onChange={(e) => handleSimpleChange('combustivelEstaduais', field, e.target.value)} />
                              <span>%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Combustível Federais */}
                    <div className="imposto-section imposto-section-combustivel">
                      <h3>Órgãos Federais</h3>
                      <div className="imposto-grid">
                        <div className="imposto-column">
                          <h4>Combustível</h4>
                          {['irrf', 'csll', 'pis', 'cofins'].map(field => (
                            <div className="imposto-field" key={field}>
                              <label>{field.toUpperCase()}</label>
                              <input type="number" step="0.01" min="0" max="100"
                                value={formData.combustivelFederais[field]}
                                onChange={(e) => handleSimpleChange('combustivelFederais', field, e.target.value)} />
                              <span>%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Info sobre Taxa da Plataforma */}
                    <div className="imposto-section imposto-section-combustivel">
                      <h3>⚙️ Taxa da Plataforma (Gerenciadora)</h3>
                      <div className="info-box">
                        <p>💡 A taxa da plataforma por litro (R$/litro) é configurada <strong>individualmente por cliente</strong> no cadastro do cliente, pois varia de R$ 0,08 a R$ 0,15 conforme o contrato.</p>
                        <p style={{ marginTop: '8px' }}>Para configurar, acesse <strong>Clientes → Editar Cliente → Combustível → Taxa da Plataforma</strong>.</p>
                      </div>
                    </div>
                  </>
                )}

                {/* ════════════════════════════════════════ */}
                {/* ABA: TAXAS & ANTECIPAÇÃO                 */}
                {/* ════════════════════════════════════════ */}
                {activeTab === 'taxas' && (
                  <>
                    <div className="impostos-tab-header">
                      <h2>💰 Taxas & Antecipação</h2>
                      <p>Configurações gerais de taxas de antecipação aplicáveis ao sistema</p>
                    </div>

                    {/* Taxas Antecipação & Variáveis */}
                    <div className="imposto-section retencoes-section">
                      <h3>Taxas Antecipação & Variáveis</h3>
                      <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        Apenas alguns clientes trabalham com estas taxas
                      </p>
                      {[
                        { key: 'aVista', label: 'À Vista (%)' },
                        { key: 'aposFechamento', label: 'Receber Após Fechamento (%)' },
                        { key: 'dias30', label: '30 Dias Após Fechar a Fatura (%)' },
                        { key: 'dias40', label: '40 Dias Após Fechar a Fatura (%)' },
                        { key: 'dias50', label: '50 Dias Após Fechar a Fatura (%)' },
                        { key: 'dias60', label: '60 Dias Após Fechar a Fatura (%)' }
                      ].map(({ key, label }) => (
                        <div className="form-group" key={key}>
                          <label>{label}</label>
                          <input type="number" step="0.01" min="0" max="100"
                            value={formData.taxasAntecipacao[key]}
                            onChange={(e) => handleSimpleChange('taxasAntecipacao', key, e.target.value)} />
                        </div>
                      ))}
                    </div>

                    {/* Taxas de Antecipação por Faixa de Dias */}
                    <div className="imposto-section retencoes-section">
                      <h3>💰 Taxas de Antecipação por Faixa de Dias</h3>
                      <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        Taxas aplicadas quando o fornecedor solicita antecipação de valores. 
                        Quanto mais próximo da data de recebimento, menor a taxa.
                      </p>
                      {[
                        { key: 'faixa05a01', label: '01 a 05 dias antes (%) - Menor taxa', fallback: 2.5 },
                        { key: 'faixa11a06', label: '06 a 11 dias antes (%)', fallback: 4 },
                        { key: 'faixa18a12', label: '12 a 18 dias antes (%)', fallback: 6 },
                        { key: 'faixa24a19', label: '19 a 24 dias antes (%)', fallback: 8 },
                        { key: 'faixa30a25', label: '25 a 30 dias antes (%) - Maior taxa', fallback: 10 }
                      ].map(({ key, label, fallback }) => (
                        <div className="form-group" key={key}>
                          <label>{label}</label>
                          <input type="number" step="0.01" min="0" max="100"
                            value={formData.taxasAntecipacaoFaixas?.[key] || fallback}
                            onChange={(e) => handleSimpleChange('taxasAntecipacaoFaixas', key, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="actions-footer">
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default ImpostosRetencoes;
