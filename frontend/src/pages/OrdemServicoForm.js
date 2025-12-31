import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './OrdemServicoForm.css';

function OrdemServicoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const isFornecedor = user?.role === 'fornecedor';
  const isCliente = user?.role === 'cliente';
  const isReadOnly = isFornecedor || isCliente;
  const [clientes, setClientes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [tiposServico, setTiposServico] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [subunidades, setSubunidades] = useState([]);
  const [contratosPecas, setContratosPecas] = useState([]);
  const [contratosServicos, setContratosServicos] = useState([]);
  const [empenhosPecas, setEmpenhosPecas] = useState([]);
  const [empenhosServicos, setEmpenhosServicos] = useState([]);
  const [searchCliente, setSearchCliente] = useState('');
  const [searchFornecedor, setSearchFornecedor] = useState('');
  
  const [formData, setFormData] = useState({
    numeroOrdemServico: '',
    dataReferencia: new Date().toISOString().split('T')[0],
    cliente: '',
    fornecedor: '',
    tipoServicoSolicitado: '',
    tipo: '',
    centroCusto: '',
    subunidade: '',
    contratoEmpenhoPecas: '',
    empenhoPecas: '',
    contratoEmpenhoServicos: '',
    empenhoServicos: '',
    placa: '',
    veiculo: '',
    valorPecas: 0,
    valorPecasDisplay: '',
    valorServico: 0,
    valorServicoDisplay: '',
    descontoPecasPerc: 0,
    descontoServicoPerc: 0,
    valorPecasComDesconto: 0,
    valorServicoComDesconto: 0,
    valorFinal: 0,
    notaFiscalPeca: '',
    notaFiscalServico: '',
    status: 'Autorizada'
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadData();
    if (id) {
      loadOrdemServico();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    calcularValorFinal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.valorPecas, formData.valorServico, formData.descontoPecasPerc, formData.descontoServicoPerc]);

  useEffect(() => {
    if (formData.cliente) {
      loadCentrosCusto(formData.cliente);
      loadDescontoCliente(formData.cliente);
      loadContratosPecas(formData.cliente);
      loadContratosServicos(formData.cliente);
    } else {
      setCentrosCusto([]);
      setSubunidades([]);
      setContratosPecas([]);
      setContratosServicos([]);
      setEmpenhosPecas([]);
      setEmpenhosServicos([]);
      setFormData(prev => ({ 
        ...prev, 
        centroCusto: '', 
        subunidade: '', 
        contratoEmpenhoPecas: '', 
        empenhoPecas: '', 
        contratoEmpenhoServicos: '', 
        empenhoServicos: '' 
      }));
    }
  }, [formData.cliente]);

  useEffect(() => {
    if (formData.centroCusto) {
      loadSubunidades(formData.centroCusto);
    } else {
      setSubunidades([]);
      setFormData(prev => ({ ...prev, subunidade: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.centroCusto]);

  useEffect(() => {
    if (formData.contratoEmpenhoPecas) {
      loadEmpenhosPecas(formData.contratoEmpenhoPecas);
    } else {
      setEmpenhosPecas([]);
      setFormData(prev => ({ ...prev, empenhoPecas: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.contratoEmpenhoPecas, formData.centroCusto, formData.subunidade]);

  useEffect(() => {
    if (formData.contratoEmpenhoServicos) {
      loadEmpenhosServicos(formData.contratoEmpenhoServicos);
    } else {
      setEmpenhosServicos([]);
      setFormData(prev => ({ ...prev, empenhoServicos: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.contratoEmpenhoServicos, formData.centroCusto, formData.subunidade]);

  const loadDescontoCliente = async (clienteId) => {
    try {
      const response = await api.get(`/clientes/${clienteId}`);
      const percentualDesconto = response.data.percentualDesconto || 0;
      setFormData(prev => ({ 
        ...prev, 
        descontoPecasPerc: percentualDesconto,
        descontoServicoPerc: percentualDesconto
      }));
    } catch (error) {
      console.error('Erro ao carregar desconto do cliente');
    }
  };

  const loadData = async () => {
    try {
      console.log('🔄 Carregando dados do formulário...');
      
      const [clientesRes, fornecedoresRes, tiposRes, tiposServicoRes] = await Promise.all([
        api.get('/clientes?limit=1000'),
        api.get('/fornecedores?limit=1000'),
        api.get('/tipo-servicos/tipos'),
        api.get('/tipo-servicos/tipos-servico-solicitado')
      ]);
      
      console.log('📦 Resposta clientes:', clientesRes.data);
      console.log('📦 Resposta fornecedores:', fornecedoresRes.data);
      
      // Garantir que clientes seja sempre um array
      const clientesData = clientesRes.data.clientes || clientesRes.data;
      const clientesArray = Array.isArray(clientesData) ? clientesData : [];
      console.log(`✅ ${clientesArray.length} clientes carregados`);
      setClientes(clientesArray);
      
      // Garantir que fornecedores seja sempre um array
      const fornecedoresData = fornecedoresRes.data.fornecedores || fornecedoresRes.data;
      const fornecedoresArray = Array.isArray(fornecedoresData) ? fornecedoresData : [];
      console.log(`✅ ${fornecedoresArray.length} fornecedores carregados`);
      setFornecedores(fornecedoresArray);
      
      setTipos(Array.isArray(tiposRes.data) ? tiposRes.data : []);
      setTiposServico(Array.isArray(tiposServicoRes.data) ? tiposServicoRes.data : []);
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error('❌ Erro ao carregar dados:', error);
      console.error('Response:', error.response?.data);
    }
  };

  const loadCentrosCusto = async (clienteId) => {
    try {
      const response = await api.get(`/clientes/${clienteId}`);
      setCentrosCusto(response.data.centrosCusto || []);
    } catch (error) {
      console.error('Erro ao carregar centros de custo');
    }
  };

  const loadSubunidades = (centroCustoNome) => {
    const centro = centrosCusto.find(c => c.nome === centroCustoNome);
    if (centro && centro.subunidades) {
      setSubunidades(centro.subunidades);
    } else {
      setSubunidades([]);
    }
  };

  const loadContratosPecas = async (clienteId) => {
    try {
      const response = await api.get(`/clientes/${clienteId}/contratos`);
      // Filtrar contratos ativos que tenham empenhos do tipo 'pecas' ou 'pecas_servicos'
      const contratosAtivos = response.data.filter(c => 
        c.ativo && c.empenhos && c.empenhos.some(e => 
          e.ativo && (e.tipo === 'pecas' || e.tipo === 'pecas_servicos')
        )
      );
      setContratosPecas(contratosAtivos);
    } catch (error) {
      console.error('Erro ao carregar contratos de peças:', error);
      setContratosPecas([]);
    }
  };

  const loadContratosServicos = async (clienteId) => {
    try {
      const response = await api.get(`/clientes/${clienteId}/contratos`);
      // Filtrar contratos ativos que tenham empenhos do tipo 'servicos' ou 'pecas_servicos'
      const contratosAtivos = response.data.filter(c => 
        c.ativo && c.empenhos && c.empenhos.some(e => 
          e.ativo && (e.tipo === 'servicos' || e.tipo === 'pecas_servicos')
        )
      );
      setContratosServicos(contratosAtivos);
    } catch (error) {
      console.error('Erro ao carregar contratos de serviços:', error);
      setContratosServicos([]);
    }
  };

  const loadEmpenhosPecas = (contratoId) => {
    const contrato = contratosPecas.find(c => c._id === contratoId);
    if (contrato && contrato.empenhos) {
      // Filtrar empenhos ativos do tipo 'pecas' ou 'pecas_servicos'
      let empenhosAtivos = contrato.empenhos.filter(e => 
        e.ativo && (e.tipo === 'pecas' || e.tipo === 'pecas_servicos')
      );
      
      // Filtrar por centro de custo e subunidade se selecionados
      if (formData.centroCusto) {
        empenhosAtivos = empenhosAtivos.filter(e => 
          e.centroCusto === formData.centroCusto
        );
      }
      if (formData.subunidade) {
        empenhosAtivos = empenhosAtivos.filter(e => 
          e.subunidade === formData.subunidade
        );
      }
      
      setEmpenhosPecas(empenhosAtivos);
    } else {
      setEmpenhosPecas([]);
    }
  };

  const loadEmpenhosServicos = (contratoId) => {
    const contrato = contratosServicos.find(c => c._id === contratoId);
    if (contrato && contrato.empenhos) {
      // Filtrar empenhos ativos do tipo 'servicos' ou 'pecas_servicos'
      let empenhosAtivos = contrato.empenhos.filter(e => 
        e.ativo && (e.tipo === 'servicos' || e.tipo === 'pecas_servicos')
      );
      
      // Filtrar por centro de custo e subunidade se selecionados
      if (formData.centroCusto) {
        empenhosAtivos = empenhosAtivos.filter(e => 
          e.centroCusto === formData.centroCusto
        );
      }
      if (formData.subunidade) {
        empenhosAtivos = empenhosAtivos.filter(e => 
          e.subunidade === formData.subunidade
        );
      }
      
      setEmpenhosServicos(empenhosAtivos);
    } else {
      setEmpenhosServicos([]);
    }
  };

  const loadOrdemServico = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/ordens-servico/${id}`);
      const ordem = response.data;
      setFormData({
        numeroOrdemServico: ordem.numeroOrdemServico || '',
        dataReferencia: ordem.dataReferencia ? new Date(ordem.dataReferencia).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        cliente: ordem.cliente?._id || '',
        fornecedor: ordem.fornecedor?._id || '',
        tipoServicoSolicitado: ordem.tipoServicoSolicitado?._id || '',
        tipo: ordem.tipo?._id || '',
        centroCusto: ordem.centroCusto || '',
        subunidade: ordem.subunidade || '',
        contratoEmpenhoPecas: ordem.contratoEmpenhoPecas || '',
        empenhoPecas: ordem.empenhoPecas || '',
        contratoEmpenhoServicos: ordem.contratoEmpenhoServicos || '',
        empenhoServicos: ordem.empenhoServicos || '',
        placa: ordem.placa || '',
        veiculo: ordem.veiculo || '',
        valorPecas: ordem.valorPecas || 0,
        valorPecasDisplay: formatarValor(ordem.valorPecas || 0),
        valorServico: ordem.valorServico || 0,
        valorServicoDisplay: formatarValor(ordem.valorServico || 0),
        descontoPecasPerc: ordem.descontoPecasPerc || 0,
        descontoServicoPerc: ordem.descontoServicoPerc || 0,
        valorPecasComDesconto: ordem.valorPecasComDesconto || 0,
        valorServicoComDesconto: ordem.valorServicoComDesconto || 0,
        valorFinal: ordem.valorFinal || 0,
        notaFiscalPeca: ordem.notaFiscalPeca || '',
        notaFiscalServico: ordem.notaFiscalServico || '',
        status: ordem.status || 'Autorizada'
      });
    } catch (error) {
      toast.error('Erro ao carregar ordem de serviço');
    } finally {
      setLoading(false);
    }
  };

  const calcularValorFinal = () => {
    const pecas = parseFloat(formData.valorPecas) || 0;
    const servico = parseFloat(formData.valorServico) || 0;
    const descPecasPerc = parseFloat(formData.descontoPecasPerc) || 0;
    const descServicoPerc = parseFloat(formData.descontoServicoPerc) || 0;
    
    const valorPecasComDesc = pecas - (pecas * descPecasPerc / 100);
    const valorServicoComDesc = servico - (servico * descServicoPerc / 100);
    const final = valorPecasComDesc + valorServicoComDesc;
    
    setFormData(prev => ({ 
      ...prev, 
      valorPecasComDesconto: valorPecasComDesc,
      valorServicoComDesconto: valorServicoComDesc,
      valorFinal: final 
    }));
  };

  // Funções de formatação brasileira
  const formatarValor = (valor) => {
    if (typeof valor === 'string' && valor.includes(',')) {
      return valor; // Já está formatado
    }
    const numero = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatarInputValor = (valor) => {
    if (!valor) return '';
    
    // Remove tudo exceto números e vírgula
    let valorLimpo = valor.toString().replace(/[^\d,]/g, '');
    
    // Se não tem nada, retorna vazio
    if (!valorLimpo) return '';
    
    // Remove vírgulas extras, mantendo apenas a última
    const partes = valorLimpo.split(',');
    if (partes.length > 2) {
      valorLimpo = partes.slice(0, -1).join('') + ',' + partes[partes.length - 1];
    }
    
    // Limita casas decimais a 2
    if (valorLimpo.includes(',')) {
      const [inteiro, decimal] = valorLimpo.split(',');
      valorLimpo = inteiro + ',' + (decimal || '').slice(0, 2);
      
      // Adiciona separador de milhar apenas na parte inteira
      const inteiroFormatado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return inteiroFormatado + ',' + (decimal || '');
    } else {
      // Se não tem vírgula ainda, adiciona separador de milhar
      return valorLimpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
  };

  const parseValorBrasileiro = (valorFormatado) => {
    if (!valorFormatado) return 0;
    // Remove pontos de milhar e substitui vírgula por ponto
    const valor = valorFormatado.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(valor) || 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleValorChange = (e, fieldName) => {
    const inputValue = e.target.value;
    
    // Se campo vazio, limpa tudo
    if (!inputValue || inputValue === '') {
      setFormData(prev => ({
        ...prev,
        [fieldName]: 0,
        [`${fieldName}Display`]: ''
      }));
      return;
    }
    
    const valorFormatado = formatarInputValor(inputValue);
    const valorNumerico = parseValorBrasileiro(valorFormatado);
    
    setFormData(prev => ({
      ...prev,
      [fieldName]: valorNumerico,
      [`${fieldName}Display`]: valorFormatado
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Bloquear fornecedores e clientes de editar
    if (isReadOnly) {
      toast.warning('Você não tem permissão para editar ordens de serviço');
      return;
    }
    
    try {
      setLoading(true);
      
      // Validação de saldo dos empenhos
      if (formData.empenhoPecas && formData.valorPecasComDesconto > 0) {
        const empenhoPecas = empenhosPecas.find(e => e._id === formData.empenhoPecas);
        if (empenhoPecas) {
          const saldoEmpenho = (empenhoPecas.valor || 0) - (empenhoPecas.valorAnulado || 0) - (empenhoPecas.valorUtilizado || 0);
          if (formData.valorPecasComDesconto > saldoEmpenho) {
            toast.error(`Saldo insuficiente no empenho de peças! Saldo disponível: R$ ${saldoEmpenho.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            setLoading(false);
            return;
          }
        }
      }
      
      if (formData.empenhoServicos && formData.valorServicoComDesconto > 0) {
        const empenhoServicos = empenhosServicos.find(e => e._id === formData.empenhoServicos);
        if (empenhoServicos) {
          const saldoEmpenho = (empenhoServicos.valor || 0) - (empenhoServicos.valorAnulado || 0) - (empenhoServicos.valorUtilizado || 0);
          if (formData.valorServicoComDesconto > saldoEmpenho) {
            toast.error(`Saldo insuficiente no empenho de serviços! Saldo disponível: R$ ${saldoEmpenho.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            setLoading(false);
            return;
          }
        }
      }
      
      if (id) {
        await api.put(`/ordens-servico/${id}`, formData);
        toast.success('Ordem de serviço atualizada com sucesso!');
      } else {
        await api.post('/ordens-servico', formData);
        toast.success('Ordem de serviço criada com sucesso!');
      }
      navigate('/ordens-servico');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar ordem de serviço');
    } finally {
      setLoading(false);
    }
  };

  const clientesFiltrados = Array.isArray(clientes) ? clientes.filter(c => 
    (c.razaoSocial?.toLowerCase().includes(searchCliente.toLowerCase()) ||
     c.nomeFantasia?.toLowerCase().includes(searchCliente.toLowerCase()))
  ) : [];

  const fornecedoresFiltrados = Array.isArray(fornecedores) ? fornecedores.filter(f => 
    (f.razaoSocial?.toLowerCase().includes(searchFornecedor.toLowerCase()) ||
     f.nomeFantasia?.toLowerCase().includes(searchFornecedor.toLowerCase()))
  ) : [];

  console.log('🔍 Debug - clientes:', clientes.length, 'filtrados:', clientesFiltrados.length);
  console.log('🔍 Debug - fornecedores:', fornecedores.length, 'filtrados:', fornecedoresFiltrados.length);

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="ordem-servico-form-container">
            <div className="page-header">
              <div>
                <h1>{id ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h1>
                <p>Preencha os dados da ordem de serviço</p>
              </div>
              <button 
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/ordens-servico')}
              >
                ← Voltar
              </button>
            </div>

            {isReadOnly && (
              <div className="readonly-banner">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>Você está visualizando esta ordem de serviço em modo somente leitura</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={`ordem-form-card ${isReadOnly ? 'readonly-form' : ''}`}>
              <div className="form-section">
                <h3>Dados Principais</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>N° Ordem de Serviço *</label>
                    <input
                      type="text"
                      name="numeroOrdemServico"
                      value={formData.numeroOrdemServico}
                      onChange={handleChange}
                      placeholder="Digite o número da ordem de serviço"
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="form-group">
                    <label>Data de Referência *</label>
                    <input
                      type="date"
                      name="dataReferencia"
                      value={formData.dataReferencia}
                      onChange={handleChange}
                      required
                      disabled={isReadOnly}
                    />
                    <small className="form-hint">Data de referência para qual mês esta OS pertence</small>
                  </div>

                  <div className="form-group">
                    <label>Cliente *</label>
                    <input
                      type="text"
                      placeholder="Pesquisar e pressione Enter para selecionar..."
                      value={searchCliente}
                      onChange={(e) => setSearchCliente(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const filtered = clientesFiltrados;
                          if (filtered.length === 1) {
                            setFormData(prev => ({ ...prev, cliente: filtered[0]._id }));
                            setSearchCliente(filtered[0].razaoSocial || filtered[0].nomeFantasia);
                          }
                        }
                      }}
                      className="search-input"
                      required={!formData.cliente}
                      disabled={isReadOnly}
                    />
                    {searchCliente && clientesFiltrados.length > 0 && !formData.cliente && (
                      <div className="dropdown-list">
                        {clientesFiltrados.map(cliente => (
                          <div 
                            key={cliente._id} 
                            className="dropdown-item"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, cliente: cliente._id }));
                              setSearchCliente(cliente.razaoSocial || cliente.nomeFantasia);
                            }}
                          >
                            {cliente.razaoSocial || cliente.nomeFantasia}
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.cliente && (
                      <div className="selected-value">
                        {clientes.find(c => c._id === formData.cliente)?.razaoSocial || clientes.find(c => c._id === formData.cliente)?.nomeFantasia}
                        {!isReadOnly && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setFormData(prev => ({ ...prev, cliente: '' }));
                              setSearchCliente('');
                            }}
                            className="clear-selection"
                          >×</button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Fornecedor *</label>
                    <input
                      type="text"
                      placeholder="Pesquisar e pressione Enter para selecionar..."
                      value={searchFornecedor}
                      onChange={(e) => setSearchFornecedor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const filtered = fornecedoresFiltrados;
                          if (filtered.length === 1) {
                            setFormData(prev => ({ ...prev, fornecedor: filtered[0]._id }));
                            setSearchFornecedor(filtered[0].razaoSocial || filtered[0].nomeFantasia);
                          }
                        }
                      }}
                      className="search-input"
                      required={!formData.fornecedor}
                    />
                    {searchFornecedor && fornecedoresFiltrados.length > 0 && !formData.fornecedor && (
                      <div className="dropdown-list">
                        {fornecedoresFiltrados.map(fornecedor => (
                          <div 
                            key={fornecedor._id} 
                            className="dropdown-item"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, fornecedor: fornecedor._id }));
                              setSearchFornecedor(fornecedor.razaoSocial || fornecedor.nomeFantasia);
                            }}
                          >
                            {fornecedor.razaoSocial || fornecedor.nomeFantasia}
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.fornecedor && (
                      <div className="selected-value">
                        {fornecedores.find(f => f._id === formData.fornecedor)?.razaoSocial || fornecedores.find(f => f._id === formData.fornecedor)?.nomeFantasia}
                        {!isReadOnly && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setFormData(prev => ({ ...prev, fornecedor: '' }));
                              setSearchFornecedor('');
                            }}
                            className="clear-selection"
                          >×</button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Tipo de Serviço Solicitado *</label>
                    <select
                      name="tipoServicoSolicitado"
                      value={formData.tipoServicoSolicitado}
                      onChange={handleChange}
                      required
                      disabled={isReadOnly}
                    >
                      <option value="">Selecione</option>
                      {tiposServico.map(tipo => (
                        <option key={tipo._id} value={tipo._id}>{tipo.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Tipo *</label>
                    <select
                      name="tipo"
                      value={formData.tipo}
                      onChange={handleChange}
                      required
                      disabled={isReadOnly}
                    >
                      <option value="">Selecione</option>
                      {tipos.map(tipo => (
                        <option key={tipo._id} value={tipo._id}>{tipo.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Centro de Custo *</label>
                    <select
                      name="centroCusto"
                      value={formData.centroCusto}
                      onChange={handleChange}
                      required
                      disabled={!formData.cliente}
                    >
                      <option value="">Selecione um centro de custo</option>
                      {centrosCusto.map((centro, idx) => (
                        <option key={idx} value={centro.nome}>{centro.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Subunidade</label>
                    <select
                      name="subunidade"
                      value={formData.subunidade}
                      onChange={handleChange}
                      disabled={!formData.centroCusto}
                    >
                      <option value="">Selecione uma subunidade</option>
                      {subunidades.map((sub, idx) => (
                        <option key={idx} value={sub.nome}>{sub.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Informações Complementares - Empenhos</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Contrato para Peças</label>
                    <select
                      name="contratoEmpenhoPecas"
                      value={formData.contratoEmpenhoPecas}
                      onChange={handleChange}
                      disabled={!formData.cliente}
                    >
                      <option value="">Selecione um contrato</option>
                      {contratosPecas.map(contrato => (
                        <option key={contrato._id} value={contrato._id}>
                          Nº {contrato.numeroContrato} - {new Date(contrato.dataInicial).toLocaleDateString()} a {new Date(contrato.dataFinal).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Empenho para Peças</label>
                    <select
                      name="empenhoPecas"
                      value={formData.empenhoPecas}
                      onChange={handleChange}
                      disabled={!formData.contratoEmpenhoPecas || !formData.centroCusto}
                    >
                      <option value="">
                        {!formData.centroCusto 
                          ? 'Selecione o centro de custo primeiro' 
                          : empenhosPecas.length === 0 && formData.contratoEmpenhoPecas
                          ? 'Nenhum empenho disponível para este centro de custo'
                          : 'Selecione um empenho'}
                      </option>
                      {empenhosPecas.map(empenho => {
                        const saldo = empenho.valor - (empenho.valorAnulado || 0) - (empenho.valorUtilizado || 0);
                        return (
                        <option key={empenho._id} value={empenho._id}>
                          Nº {empenho.numeroEmpenho} - {empenho.centroCusto || 'Sem centro'} - Saldo: R$ {saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Contrato para Serviços</label>
                    <select
                      name="contratoEmpenhoServicos"
                      value={formData.contratoEmpenhoServicos}
                      onChange={handleChange}
                      disabled={!formData.cliente}
                    >
                      <option value="">Selecione um contrato</option>
                      {contratosServicos.map(contrato => (
                        <option key={contrato._id} value={contrato._id}>
                          Nº {contrato.numeroContrato} - {new Date(contrato.dataInicial).toLocaleDateString()} a {new Date(contrato.dataFinal).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Empenho para Serviços</label>
                    <select
                      name="empenhoServicos"
                      value={formData.empenhoServicos}
                      onChange={handleChange}
                      disabled={!formData.contratoEmpenhoServicos || !formData.centroCusto}
                    >
                      <option value="">
                        {!formData.centroCusto 
                          ? 'Selecione o centro de custo primeiro' 
                          : empenhosServicos.length === 0 && formData.contratoEmpenhoServicos
                          ? 'Nenhum empenho disponível para este centro de custo'
                          : 'Selecione um empenho'}
                      </option>
                      {empenhosServicos.map(empenho => {
                        const saldo = empenho.valor - (empenho.valorAnulado || 0) - (empenho.valorUtilizado || 0);
                        return (
                        <option key={empenho._id} value={empenho._id}>
                          Nº {empenho.numeroEmpenho} - {empenho.centroCusto || 'Sem centro'} - Saldo: R$ {saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Placa</label>
                    <input
                      type="text"
                      name="placa"
                      value={formData.placa}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Veículo</label>
                    <input
                      type="text"
                      name="veiculo"
                      value={formData.veiculo}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Valores</h3>
                <div className="form-grid-valores">
                  <div className="valores-row">
                    <div className="form-group">
                      <label>Valor Peças (R$)</label>
                      <input
                        type="text"
                        name="valorPecas"
                        value={formData.valorPecasDisplay !== undefined ? formData.valorPecasDisplay : (formData.valorPecas > 0 ? formatarValor(formData.valorPecas) : '')}
                        onChange={(e) => handleValorChange(e, 'valorPecas')}
                        placeholder="0,00"
                      />
                    </div>

                    <div className="form-group">
                      <label>Valor Serviço (R$)</label>
                      <input
                        type="text"
                        name="valorServico"
                        value={formData.valorServicoDisplay !== undefined ? formData.valorServicoDisplay : (formData.valorServico > 0 ? formatarValor(formData.valorServico) : '')}
                        onChange={(e) => handleValorChange(e, 'valorServico')}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="valores-row">
                    <div className="form-group">
                      <label>Desconto (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        name="descontoPecasPerc"
                        value={formData.descontoPecasPerc}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Desconto (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        name="descontoServicoPerc"
                        value={formData.descontoServicoPerc}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="valores-row">
                    <div className="form-group">
                      <label>Valor com desconto (R$)</label>
                      <input
                        type="text"
                        value={formatarValor(formData.valorPecasComDesconto || 0)}
                        readOnly
                        className="readonly-field"
                      />
                    </div>

                    <div className="form-group">
                      <label>Valor com desconto (R$)</label>
                      <input
                        type="text"
                        value={formatarValor(formData.valorServicoComDesconto || 0)}
                        readOnly
                        className="readonly-field"
                      />
                    </div>
                  </div>

                  <div className="valores-total">
                    <div className="form-group">
                      <label>Valor Total Final (R$)</label>
                      <input
                        type="text"
                        name="valorFinal"
                        value={formatarValor(formData.valorFinal || 0)}
                        readOnly
                        className="readonly-field valor-total"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Notas Fiscais</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>N° Nota Fiscal Peça</label>
                    <input
                      type="text"
                      name="notaFiscalPeca"
                      value={formData.notaFiscalPeca}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>N° Nota Fiscal Serviço</label>
                    <input
                      type="text"
                      name="notaFiscalServico"
                      value={formData.notaFiscalServico}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      <option value="Autorizada">Autorizada</option>
                      <option value="Aguardando pagamento">Aguardando pagamento</option>
                      <option value="Paga">Paga</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => navigate('/ordens-servico')}
                >
                  {isReadOnly ? 'Voltar' : 'Cancelar'}
                </button>
                {!isReadOnly && (
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : (id ? 'Atualizar' : 'Criar Ordem de Serviço')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default OrdemServicoForm;
