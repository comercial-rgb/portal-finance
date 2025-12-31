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

            <form onSubmit={handleSubmit}>
              <div className="impostos-sections">
                {/* Impostos Municipais */}
                <div className="imposto-section">
                  <h3>Impostos Fora do Simples - Órgãos Municipais</h3>
                  <div className="imposto-grid">
                    <div className="imposto-column">
                      <h4>Impostos - Peças</h4>
                      <div className="imposto-field">
                        <label>IR</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosMunicipais.pecas.ir}
                          onChange={(e) => handleChange('impostosMunicipais', 'pecas', 'ir', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                    </div>
                    <div className="imposto-column">
                      <h4>Impostos - Serviços</h4>
                      <div className="imposto-field">
                        <label>IR</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosMunicipais.servicos.ir}
                          onChange={(e) => handleChange('impostosMunicipais', 'servicos', 'ir', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Impostos Estaduais */}
                <div className="imposto-section">
                  <h3>Impostos Fora do Simples - Órgãos Estaduais</h3>
                  <div className="imposto-grid">
                    <div className="imposto-column">
                      <h4>Impostos - Peças</h4>
                      <div className="imposto-field">
                        <label>IR</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosEstaduais.pecas.ir}
                          onChange={(e) => handleChange('impostosEstaduais', 'pecas', 'ir', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                      <div className="imposto-field">
                        <label>PIS</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosEstaduais.pecas.pis}
                          onChange={(e) => handleChange('impostosEstaduais', 'pecas', 'pis', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                      <div className="imposto-field">
                        <label>COFINS</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosEstaduais.pecas.cofins}
                          onChange={(e) => handleChange('impostosEstaduais', 'pecas', 'cofins', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                      <div className="imposto-field">
                        <label>CSLL</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosEstaduais.pecas.csll}
                          onChange={(e) => handleChange('impostosEstaduais', 'pecas', 'csll', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                    </div>
                    <div className="imposto-column">
                      <h4>Impostos - Serviços</h4>
                      <div className="imposto-field">
                        <label>IR</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosEstaduais.servicos.ir}
                          onChange={(e) => handleChange('impostosEstaduais', 'servicos', 'ir', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                      <div className="imposto-field">
                        <label>PIS</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosEstaduais.servicos.pis}
                          onChange={(e) => handleChange('impostosEstaduais', 'servicos', 'pis', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                      <div className="imposto-field">
                        <label>COFINS</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosEstaduais.servicos.cofins}
                          onChange={(e) => handleChange('impostosEstaduais', 'servicos', 'cofins', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                      <div className="imposto-field">
                        <label>CSLL</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosEstaduais.servicos.csll}
                          onChange={(e) => handleChange('impostosEstaduais', 'servicos', 'csll', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Impostos Federais */}
                <div className="imposto-section">
                  <h3>Impostos Fora do Simples - Órgãos Federais</h3>
                  <div className="imposto-grid">
                    <div className="imposto-column">
                      <h4>Impostos - Peças</h4>
                      <div className="imposto-field">
                        <label>IR</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosFederais.pecas.ir}
                          onChange={(e) => handleChange('impostosFederais', 'pecas', 'ir', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                      <div className="imposto-field">
                        <label>PIS</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosFederais.pecas.pis}
                          onChange={(e) => handleChange('impostosFederais', 'pecas', 'pis', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                      <div className="imposto-field">
                        <label>COFINS</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosFederais.pecas.cofins}
                          onChange={(e) => handleChange('impostosFederais', 'pecas', 'cofins', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                      <div className="imposto-field">
                        <label>CSLL</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosFederais.pecas.csll}
                          onChange={(e) => handleChange('impostosFederais', 'pecas', 'csll', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                    </div>
                    <div className="imposto-column">
                      <h4>Impostos - Serviços</h4>
                      <div className="imposto-field">
                        <label>IR</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosFederais.servicos.ir}
                          onChange={(e) => handleChange('impostosFederais', 'servicos', 'ir', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                      <div className="imposto-field">
                        <label>PIS</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosFederais.servicos.pis}
                          onChange={(e) => handleChange('impostosFederais', 'servicos', 'pis', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                      <div className="imposto-field">
                        <label>COFINS</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosFederais.servicos.cofins}
                          onChange={(e) => handleChange('impostosFederais', 'servicos', 'cofins', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                      <div className="imposto-field">
                        <label>CSLL</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.impostosFederais.servicos.csll}
                          onChange={(e) => handleChange('impostosFederais', 'servicos', 'csll', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Retenções Órgão */}
                <div className="imposto-section retencoes-section">
                  <h3>Retenções Órgão</h3>
                  <div className="form-group">
                    <label>Percentual</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.retencoesOrgao.percentual}
                      onChange={(e) => handleSimpleChange('retencoesOrgao', 'percentual', e.target.value)}
                    />
                  </div>
                </div>

                {/* Taxas de Operação */}
                <div className="imposto-section retencoes-section">
                  <h3>Taxas de Operação</h3>
                  <div className="form-group">
                    <label>Taxa Fixa (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxasOperacao.taxaFixa}
                      onChange={(e) => handleSimpleChange('taxasOperacao', 'taxaFixa', e.target.value)}
                    />
                  </div>
                </div>

                {/* Taxas Antecipação & Variáveis */}
                <div className="imposto-section retencoes-section">
                  <h3>Taxas Antecipação & Variáveis</h3>
                  <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    Apenas alguns clientes trabalham com estas taxas
                  </p>
                  <div className="form-group">
                    <label>À Vista (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxasAntecipacao.aVista}
                      onChange={(e) => handleSimpleChange('taxasAntecipacao', 'aVista', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Receber Após Fechamento (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxasAntecipacao.aposFechamento}
                      onChange={(e) => handleSimpleChange('taxasAntecipacao', 'aposFechamento', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>30 Dias Após Fechar a Fatura (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxasAntecipacao.dias30}
                      onChange={(e) => handleSimpleChange('taxasAntecipacao', 'dias30', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>40 Dias Após Fechar a Fatura (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxasAntecipacao.dias40}
                      onChange={(e) => handleSimpleChange('taxasAntecipacao', 'dias40', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>50 Dias Após Fechar a Fatura (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxasAntecipacao.dias50}
                      onChange={(e) => handleSimpleChange('taxasAntecipacao', 'dias50', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>60 Dias Após Fechar a Fatura (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxasAntecipacao.dias60}
                      onChange={(e) => handleSimpleChange('taxasAntecipacao', 'dias60', e.target.value)}
                    />
                  </div>
                </div>

                {/* Taxas de Antecipação por Faixa de Dias */}
                <div className="imposto-section retencoes-section">
                  <h3>💰 Taxas de Antecipação por Faixa de Dias</h3>
                  <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    Taxas aplicadas quando o fornecedor solicita antecipação de valores. 
                    Quanto mais próximo da data de recebimento, menor a taxa.
                  </p>
                  <div className="form-group">
                    <label>01 a 05 dias antes (%) - Menor taxa</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxasAntecipacaoFaixas?.faixa05a01 || 2.5}
                      onChange={(e) => handleSimpleChange('taxasAntecipacaoFaixas', 'faixa05a01', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>06 a 11 dias antes (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxasAntecipacaoFaixas?.faixa11a06 || 4}
                      onChange={(e) => handleSimpleChange('taxasAntecipacaoFaixas', 'faixa11a06', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>12 a 18 dias antes (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxasAntecipacaoFaixas?.faixa18a12 || 6}
                      onChange={(e) => handleSimpleChange('taxasAntecipacaoFaixas', 'faixa18a12', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>19 a 24 dias antes (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxasAntecipacaoFaixas?.faixa24a19 || 8}
                      onChange={(e) => handleSimpleChange('taxasAntecipacaoFaixas', 'faixa24a19', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>25 a 30 dias antes (%) - Maior taxa</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxasAntecipacaoFaixas?.faixa30a25 || 10}
                      onChange={(e) => handleSimpleChange('taxasAntecipacaoFaixas', 'faixa30a25', e.target.value)}
                    />
                  </div>
                </div>
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
