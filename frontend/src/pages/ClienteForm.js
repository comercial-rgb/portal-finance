import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './ClienteForm.css';

function ClienteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    // Recuperar a aba ativa do sessionStorage ao inicializar
    const savedTab = sessionStorage.getItem(`clienteForm_activeTab_${id}`);
    return savedTab || 'dados';
  });
  
  const [formData, setFormData] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    nomesAlternativos: [],
    cnpj: '',
    inscricaoMunicipal: '',
    inscricaoEstadual: '',
    percentualDesconto: '',
    tipoImposto: [],
    tipoImpostoCombustivel: [],
    impostosSobreValorBruto: false,
    permitirAntecipacaoFornecedor: false,
    tiposServico: ['manutencao'],
    tipoTaxa: 'nenhum',
    taxaOperacao: 15,
    taxasAntecipacao: {
      aVista: 15,
      aposFechamento: 13,
      aprazado: 0,
      dias40: 0,
      dias50: 0,
      dias60: 0
    },
    endereco: {
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    },
    contatos: {
      nome: '',
      telefone: '',
      celular: '',
      email: ''
    }
  });

  const [centrosCusto, setCentrosCusto] = useState([]);
  const [showCentroCustoModal, setShowCentroCustoModal] = useState(false);
  const [showSubunidadeModal, setShowSubunidadeModal] = useState(false);
  const [centroCustoSelecionado, setCentroCustoSelecionado] = useState(null);
  
  const [novoCentroCusto, setNovoCentroCusto] = useState('');
  const [novaSubunidade, setNovaSubunidade] = useState('');

  // Estados para Contratos e Empenhos
  const [contratos, setContratos] = useState([]);
  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [showAditivoModal, setShowAditivoModal] = useState(false);
  const [showEmpenhoModal, setShowEmpenhoModal] = useState(false);
  const [editingContrato, setEditingContrato] = useState(null);
  const [editingAditivo, setEditingAditivo] = useState(null);
  const [editingEmpenho, setEditingEmpenho] = useState(null);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  
  const [novoContrato, setNovoContrato] = useState({
    numeroContrato: '',
    valor: '',
    dataInicial: '',
    dataFinal: ''
  });
  
  const [novoAditivo, setNovoAditivo] = useState({
    valor: '',
    dataInicial: '',
    dataFinal: ''
  });
  
  const [novoEmpenho, setNovoEmpenho] = useState({
    numeroEmpenho: '',
    centroCusto: '',
    subunidade: '',
    tipo: 'pecas',
    valor: '',
    valorAnulado: 0
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    if (id && id !== 'novo') {
      loadCliente();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Debug: Monitorar mudanças no formData
  useEffect(() => {
    console.log('🔍 formData mudou:', formData);
  }, [formData]);

  // Carrega centros de custo sempre que o ID mudar (incluindo após criação)
  useEffect(() => {
    if (id && id !== 'novo') {
      loadCentrosCusto();
      loadContratos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Salvar activeTab no sessionStorage quando mudar
  useEffect(() => {
    if (id && id !== 'novo') {
      sessionStorage.setItem(`clienteForm_activeTab_${id}`, activeTab);
    }
  }, [activeTab, id]);

  const loadCliente = async () => {
    try {
      console.log('🔍 Carregando cliente:', id);
      const response = await api.get(`/clientes/${id}`);
      const clienteData = response.data;
      
      console.log('📥 Dados recebidos do servidor:', clienteData);
      console.log('📋 tipoImposto:', clienteData.tipoImposto);
      console.log('📋 tipoTaxa:', clienteData.tipoTaxa);
      console.log('📋 taxaOperacao:', clienteData.taxaOperacao);
      console.log('📋 taxasAntecipacao:', clienteData.taxasAntecipacao);
      
      // Formatar CNPJ ao carregar (se existir)
      let cnpjFormatado = clienteData.cnpj || '';
      if (cnpjFormatado) {
        cnpjFormatado = cnpjFormatado
          .replace(/\D/g, '')
          .replace(/(\d{2})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2')
          .replace(/(-\d{2})\d+?$/, '$1');
      }
      
      // Garantir que os objetos aninhados existam
      setFormData({
        ...clienteData,
        cnpj: cnpjFormatado,
        nomesAlternativos: clienteData.nomesAlternativos || [],
        tipoImposto: clienteData.tipoImposto || [],
        tipoImpostoCombustivel: clienteData.tipoImpostoCombustivel || [],
        tiposServico: clienteData.tiposServico || ['manutencao'],
        impostosSobreValorBruto: clienteData.impostosSobreValorBruto || false,
        permitirAntecipacaoFornecedor: clienteData.permitirAntecipacaoFornecedor || false,
        tipoTaxa: clienteData.tipoTaxa || 'nenhum',
        taxaOperacao: clienteData.taxaOperacao !== undefined ? clienteData.taxaOperacao : 15,
        taxasAntecipacao: {
          aVista: clienteData.taxasAntecipacao?.aVista !== undefined ? clienteData.taxasAntecipacao.aVista : 15,
          aposFechamento: clienteData.taxasAntecipacao?.aposFechamento !== undefined ? clienteData.taxasAntecipacao.aposFechamento : 13,
          aprazado: clienteData.taxasAntecipacao?.aprazado !== undefined ? clienteData.taxasAntecipacao.aprazado : 0,
          dias40: clienteData.taxasAntecipacao?.dias40 !== undefined ? clienteData.taxasAntecipacao.dias40 : 0,
          dias50: clienteData.taxasAntecipacao?.dias50 !== undefined ? clienteData.taxasAntecipacao.dias50 : 0,
          dias60: clienteData.taxasAntecipacao?.dias60 !== undefined ? clienteData.taxasAntecipacao.dias60 : 0
        },
        endereco: clienteData.endereco || {
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          cep: ''
        },
        contatos: clienteData.contatos || {
          nome: '',
          telefone: '',
          celular: '',
          email: ''
        }
      });
      
      console.log('✅ FormData atualizado');
    } catch (error) {
      toast.error('Erro ao carregar cliente');
      console.error(error);
    }
  };

  const loadCentrosCusto = async () => {
    try {
      console.log('🔍 Carregando centros de custo para cliente:', id);
      const response = await api.get(`/clientes/${id}/centros-custo`);
      console.log('✅ Centros de custo recebidos:', response.data);
      setCentrosCusto(response.data);
    } catch (error) {
      console.error('❌ Erro ao carregar centros de custo:', error);
      console.error('Detalhes:', error.response?.data);
    }
  };

  const loadContratos = async () => {
    try {
      console.log('🔍 Carregando contratos para cliente:', id);
      const response = await api.get(`/clientes/${id}/contratos`);
      console.log('✅ Contratos recebidos:', response.data);
      
      // Log detalhado dos empenhos
      response.data.forEach(contrato => {
        console.log(`📄 Contrato ${contrato.numeroContrato}:`, {
          valor: contrato.valor,
          empenhos: contrato.empenhos?.map(e => ({
            numero: e.numeroEmpenho,
            valor: e.valor,
            anulado: e.valorAnulado,
            utilizado: e.valorUtilizado,
            ativo: e.ativo
          }))
        });
      });
      
      setContratos(response.data);
    } catch (error) {
      console.error('❌ Erro ao carregar contratos:', error);
      console.error('Detalhes:', error.response?.data);
    }
  };

  const handleTipoImpostoToggle = (tipo) => {
    const currentTipos = formData.tipoImposto || [];
    if (currentTipos.includes(tipo)) {
      setFormData({
        ...formData,
        tipoImposto: currentTipos.filter(t => t !== tipo)
      });
    } else {
      setFormData({
        ...formData,
        tipoImposto: [...currentTipos, tipo]
      });
    }
  };

  const handleTipoImpostoCombustivelToggle = (tipo) => {
    const currentTipos = formData.tipoImpostoCombustivel || [];
    if (currentTipos.includes(tipo)) {
      setFormData({
        ...formData,
        tipoImpostoCombustivel: currentTipos.filter(t => t !== tipo)
      });
    } else {
      setFormData({
        ...formData,
        tipoImpostoCombustivel: [...currentTipos, tipo]
      });
    }
  };

  const handleTiposServicoToggle = (tipo) => {
    const current = formData.tiposServico || [];
    if (current.includes(tipo)) {
      if (current.length === 1) {
        toast.warning('Selecione pelo menos um tipo de serviço');
        return;
      }
      setFormData({ ...formData, tiposServico: current.filter(t => t !== tipo) });
    } else {
      setFormData({ ...formData, tiposServico: [...current, tipo] });
    }
  };

  const handleTipoTaxaChange = (tipo) => {
    setFormData({
      ...formData,
      tipoTaxa: tipo
    });
  };

  const handleTaxaChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'taxaOperacao') {
      setFormData({
        ...formData,
        taxaOperacao: parseFloat(value) || 0
      });
    } else if (name.startsWith('taxasAntecipacao.')) {
      const campo = name.split('.')[1];
      setFormData({
        ...formData,
        taxasAntecipacao: {
          ...formData.taxasAntecipacao,
          [campo]: parseFloat(value) || 0
        }
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Verificar se é um campo de endereço
    if (name.startsWith('endereco.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        endereco: {
          ...formData.endereco,
          [field]: value
        }
      });
    }
    // Verificar se é um campo de contatos
    else if (name.startsWith('contatos.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        contatos: {
          ...formData.contatos,
          [field]: value
        }
      });
    }
    // Campo normal
    else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const formatCNPJ = (value) => {
    if (!value) return '';
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const buscarCNPJ = async () => {
    const cnpjLimpo = (formData.cnpj || '').replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      toast.warn('Digite um CNPJ válido com 14 dígitos');
      return;
    }
    setBuscandoCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!response.ok) throw new Error('CNPJ não encontrado');
      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        razaoSocial: data.razao_social || prev.razaoSocial,
        nomeFantasia: data.nome_fantasia || prev.nomeFantasia,
        endereco: {
          ...prev.endereco,
          logradouro: data.logradouro ? `${data.logradouro}${data.numero ? ', ' + data.numero : ''}` : prev.endereco.logradouro,
          complemento: data.complemento || prev.endereco.complemento,
          bairro: data.bairro || prev.endereco.bairro,
          cidade: data.municipio || prev.endereco.cidade,
          estado: data.uf || prev.endereco.estado,
          cep: data.cep ? data.cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') : prev.endereco.cep
        }
      }));
      toast.success('Dados do CNPJ preenchidos!');
    } catch (error) {
      toast.error('Não foi possível buscar o CNPJ. Verifique e tente novamente.');
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const buscarCEP = async (cepValue) => {
    const cepLimpo = (cepValue || formData.endereco?.cep || '').replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cepLimpo}`);
      if (!response.ok) throw new Error('CEP não encontrado');
      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        endereco: {
          ...prev.endereco,
          logradouro: data.street || prev.endereco.logradouro,
          bairro: data.neighborhood || prev.endereco.bairro,
          cidade: data.city || prev.endereco.cidade,
          estado: data.state || prev.endereco.estado
        }
      }));
      toast.success('Endereço preenchido pelo CEP!');
    } catch (error) {
      toast.error('CEP não encontrado.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('📤 Dados sendo enviados:', formData);
    
    try {
      if (id && id !== 'novo') {
        const response = await api.put(`/clientes/${id}`, formData);
        console.log('✅ Resposta do servidor:', response.data);
        
        toast.success('Cliente atualizado com sucesso!');
        
        // Forçar reload completo da página para garantir dados atualizados
        // Isso evita problemas de cache e garante que os dados estejam sincronizados
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        const response = await api.post('/clientes', formData);
        const novoId = response.data._id || response.data.id;
        console.log('✅ Cliente criado com ID:', novoId);
        toast.success('Cliente cadastrado com sucesso! Redirecionando...');
        
        // Redirecionar para a página de edição do cliente recém-criado
        // Usar window.location para forçar reload completo e carregar todos os dados
        setTimeout(() => {
          window.location.href = `/clientes/${novoId}`;
        }, 1000);
        return;
      }
    } catch (error) {
      console.error('❌ Erro ao salvar cliente:', error);
      toast.error(error.response?.data?.mensagem || 'Erro ao salvar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCentroCusto = async () => {
    if (!novoCentroCusto.trim()) {
      toast.error('Digite o nome do centro de custo');
      return;
    }

    if (!id || id === 'novo') {
      toast.error('Salve o cliente antes de adicionar centros de custo');
      return;
    }

    try {
      console.log('➕ Adicionando centro de custo:', novoCentroCusto, 'para cliente:', id);
      const response = await api.post(`/clientes/${id}/centros-custo`, { nome: novoCentroCusto });
      console.log('✅ Centro de custo criado:', response.data);
      toast.success('Centro de custo adicionado com sucesso!');
      setNovoCentroCusto('');
      setShowCentroCustoModal(false);
      await loadCentrosCusto();
    } catch (error) {
      console.error('❌ Erro ao adicionar centro de custo:', error);
      console.error('Detalhes:', error.response?.data);
      toast.error(error.response?.data?.mensagem || 'Erro ao adicionar centro de custo');
    }
  };

  const handleAddSubunidade = async () => {
    if (!novaSubunidade.trim()) {
      toast.error('Digite o nome da subunidade');
      return;
    }

    try {
      await api.post(`/clientes/${id}/centros-custo/${centroCustoSelecionado}/subunidades`, {
        nome: novaSubunidade
      });
      toast.success('Subunidade adicionada com sucesso!');
      setNovaSubunidade('');
      setShowSubunidadeModal(false);
      setCentroCustoSelecionado(null);
      loadCentrosCusto();
    } catch (error) {
      toast.error('Erro ao adicionar subunidade');
    }
  };

  const handleDeleteCentroCusto = async (centroCustoId) => {
    if (window.confirm('Tem certeza que deseja excluir este centro de custo e todas as suas subunidades?')) {
      try {
        await api.delete(`/clientes/${id}/centros-custo/${centroCustoId}`);
        toast.success('Centro de custo excluído com sucesso!');
        loadCentrosCusto();
      } catch (error) {
        toast.error('Erro ao excluir centro de custo');
      }
    }
  };

  const handleDeleteSubunidade = async (centroCustoId, subunidadeId) => {
    if (window.confirm('Tem certeza que deseja excluir esta subunidade?')) {
      try {
        await api.delete(`/clientes/${id}/centros-custo/${centroCustoId}/subunidades/${subunidadeId}`);
        toast.success('Subunidade excluída com sucesso!');
        loadCentrosCusto();
      } catch (error) {
        toast.error('Erro ao excluir subunidade');
      }
    }
  };

  // Funções de Contratos
  const handleAddContrato = async () => {
    if (!novoContrato.numeroContrato || !novoContrato.valor || !novoContrato.dataInicial || !novoContrato.dataFinal) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const dadosContrato = {
        ...novoContrato,
        valor: parseValorBrasileiro(novoContrato.valor)
      };

      if (editingContrato) {
        const response = await api.put(`/clientes/${id}/contratos/${editingContrato._id}`, dadosContrato);
        setContratos(contratos.map(c => c._id === editingContrato._id ? response.data : c));
        toast.success('Contrato atualizado com sucesso!');
      } else {
        const response = await api.post(`/clientes/${id}/contratos`, dadosContrato);
        setContratos([...contratos, response.data]);
        toast.success('Contrato adicionado com sucesso!');
      }
      setNovoContrato({ numeroContrato: '', valor: '', dataInicial: '', dataFinal: '' });
      setShowContratoModal(false);
      setEditingContrato(null);
      await loadContratos();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar contrato');
    }
  };

  const handleEditContrato = (contrato) => {
    setEditingContrato(contrato);
    setNovoContrato({
      numeroContrato: contrato.numeroContrato,
      valor: formatarValor(contrato.valor),
      dataInicial: contrato.dataInicial.split('T')[0],
      dataFinal: contrato.dataFinal.split('T')[0]
    });
    setShowContratoModal(true);
  };

  const handleDeleteContrato = async (contratoId) => {
    if (window.confirm('Tem certeza que deseja excluir este contrato e todos os seus aditivos e empenhos?')) {
      try {
        // Atualizar estado local imediatamente (UI otimista)
        setContratos(prevContratos => prevContratos.filter(c => c._id !== contratoId));
        
        // Executar exclusão no servidor
        await api.delete(`/clientes/${id}/contratos/${contratoId}`);
        toast.success('Contrato excluído com sucesso!');
        
        // Recarregar do servidor para garantir sincronização
        await loadContratos();
      } catch (error) {
        console.error('Erro ao excluir contrato:', error);
        toast.error(error.response?.data?.message || 'Erro ao excluir contrato');
        // Recarregar em caso de erro para restaurar estado correto
        await loadContratos();
      }
    }
  };

  const handleToggleContratoStatus = async (contratoId) => {
    try {
      // Atualizar estado local imediatamente (UI otimista)
      setContratos(prevContratos => prevContratos.map(c => {
        if (c._id === contratoId) {
          return { ...c, ativo: !c.ativo };
        }
        return c;
      }));
      
      // Executar alteração no servidor
      await api.patch(`/clientes/${id}/contratos/${contratoId}/status`);
      toast.success('Status do contrato alterado!');
      
      // Recarregar do servidor para garantir sincronização
      await loadContratos();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error(error.response?.data?.message || 'Erro ao alterar status do contrato');
      await loadContratos();
    }
  };

  // Funções de Aditivos
  const handleAddAditivo = async () => {
    if (!novoAditivo.valor || !novoAditivo.dataInicial || !novoAditivo.dataFinal) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const dadosAditivo = {
        ...novoAditivo,
        valor: parseValorBrasileiro(novoAditivo.valor)
      };

      if (editingAditivo) {
        const response = await api.put(`/clientes/${id}/contratos/${contratoSelecionado._id}/aditivos/${editingAditivo._id}`, dadosAditivo);
        // Atualizar estado local imediatamente
        setContratos(prevContratos => prevContratos.map(c => {
          if (c._id === contratoSelecionado._id) {
            return {
              ...c,
              aditivos: c.aditivos.map(a => a._id === editingAditivo._id ? response.data : a)
            };
          }
          return c;
        }));
        toast.success('Aditivo atualizado com sucesso!');
      } else {
        const response = await api.post(`/clientes/${id}/contratos/${contratoSelecionado._id}/aditivos`, dadosAditivo);
        // Atualizar estado local imediatamente
        setContratos(prevContratos => prevContratos.map(c => {
          if (c._id === contratoSelecionado._id) {
            return {
              ...c,
              aditivos: [...(c.aditivos || []), response.data]
            };
          }
          return c;
        }));
        toast.success('Aditivo adicionado com sucesso!');
      }
      setNovoAditivo({ valor: '', dataInicial: '', dataFinal: '' });
      setShowAditivoModal(false);
      setEditingAditivo(null);
      await loadContratos();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar aditivo');
    }
  };

  const handleEditAditivo = (aditivo) => {
    setEditingAditivo(aditivo);
    setNovoAditivo({
      valor: formatarValor(aditivo.valor),
      dataInicial: aditivo.dataInicial.split('T')[0],
      dataFinal: aditivo.dataFinal.split('T')[0]
    });
    setShowAditivoModal(true);
  };

  const handleDeleteAditivo = async (aditivoId) => {
    if (window.confirm('Tem certeza que deseja excluir este aditivo?')) {
      try {
        // Atualizar estado local imediatamente (UI otimista)
        setContratos(prevContratos => prevContratos.map(c => {
          if (c._id === contratoSelecionado._id) {
            return {
              ...c,
              aditivos: c.aditivos.filter(a => a._id !== aditivoId)
            };
          }
          return c;
        }));
        
        // Executar exclusão no servidor
        await api.delete(`/clientes/${id}/contratos/${contratoSelecionado._id}/aditivos/${aditivoId}`);
        toast.success('Aditivo excluído com sucesso!');
        
        // Recarregar do servidor para garantir sincronização
        await loadContratos();
      } catch (error) {
        console.error('Erro ao excluir aditivo:', error);
        toast.error(error.response?.data?.message || 'Erro ao excluir aditivo');
        await loadContratos();
      }
    }
  };

  const handleToggleAditivoStatus = async (aditivoId) => {
    try {
      // Atualizar estado local imediatamente (UI otimista)
      setContratos(prevContratos => prevContratos.map(c => {
        if (c._id === contratoSelecionado._id) {
          return {
            ...c,
            aditivos: c.aditivos.map(a => {
              if (a._id === aditivoId) {
                return { ...a, ativo: !a.ativo };
              }
              return a;
            })
          };
        }
        return c;
      }));
      
      // Executar alteração no servidor
      await api.patch(`/clientes/${id}/contratos/${contratoSelecionado._id}/aditivos/${aditivoId}/status`);
      toast.success('Status do aditivo alterado!');
      
      // Recarregar do servidor para garantir sincronização
      await loadContratos();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error(error.response?.data?.message || 'Erro ao alterar status do aditivo');
      await loadContratos();
    }
  };

  // Funções de Empenhos
  const handleAddEmpenho = async () => {
    if (!novoEmpenho.numeroEmpenho || !novoEmpenho.tipo || !novoEmpenho.valor) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validar se há saldo disponível no contrato
    const saldos = calcularSaldoContrato(contratoSelecionado);
    const valorEmpenho = parseValorBrasileiro(novoEmpenho.valor);
    
    console.log('🔍 Validação Empenho:', {
      valorDigitado: novoEmpenho.valor,
      valorParsed: valorEmpenho,
      saldoDisponivel: saldos.saldo,
      editingEmpenho: !!editingEmpenho,
      comparacao: `${valorEmpenho} > ${saldos.saldo} = ${valorEmpenho > saldos.saldo}`
    });
    
    if (!editingEmpenho && valorEmpenho > saldos.saldo) {
      toast.error(`Saldo insuficiente! Saldo disponível no contrato: R$ ${formatarValor(saldos.saldo)}`);
      return;
    }

    if (editingEmpenho) {
      // Recalcular saldo considerando que estamos editando
      const empenhoAtual = contratoSelecionado.empenhos.find(e => e._id === editingEmpenho._id);
      const valorAtualEmpenho = (empenhoAtual?.valor || 0) - (empenhoAtual?.valorAnulado || 0) - (empenhoAtual?.valorUtilizado || 0);
      const saldoComEmpenhoAtual = saldos.saldo + valorAtualEmpenho;
      
      console.log('🔍 Validação Edição:', {
        valorAnterior: empenhoAtual?.valor,
        valorAtualEmpenho,
        saldoComEmpenhoAtual,
        comparacao: `${valorEmpenho} > ${saldoComEmpenhoAtual} = ${valorEmpenho > saldoComEmpenhoAtual}`
      });
      
      if (valorEmpenho > saldoComEmpenhoAtual) {
        toast.error(`Saldo insuficiente! Saldo disponível: R$ ${formatarValor(saldoComEmpenhoAtual)}`);
        return;
      }
    }

    try {
      const dadosEmpenho = {
        ...novoEmpenho,
        valor: parseValorBrasileiro(novoEmpenho.valor),
        valorAnulado: novoEmpenho.valorAnulado ? parseValorBrasileiro(novoEmpenho.valorAnulado) : 0
      };

      console.log('💾 Salvando empenho:', dadosEmpenho);

      if (editingEmpenho) {
        const response = await api.put(`/clientes/${id}/contratos/${contratoSelecionado._id}/empenhos/${editingEmpenho._id}`, dadosEmpenho);
        console.log('✅ Empenho atualizado:', response.data);
        // Atualizar estado local imediatamente
        setContratos(prevContratos => prevContratos.map(c => {
          if (c._id === contratoSelecionado._id) {
            return {
              ...c,
              empenhos: c.empenhos.map(e => e._id === editingEmpenho._id ? response.data : e)
            };
          }
          return c;
        }));
        toast.success('Empenho atualizado com sucesso!');
      } else {
        console.log(`📤 POST /clientes/${id}/contratos/${contratoSelecionado._id}/empenhos`);
        const response = await api.post(`/clientes/${id}/contratos/${contratoSelecionado._id}/empenhos`, dadosEmpenho);
        console.log('✅ Empenho criado:', response.data);
        
        // Atualizar estado local imediatamente
        setContratos(prevContratos => {
          const novosContratos = prevContratos.map(c => {
            if (c._id === contratoSelecionado._id) {
              const contratoAtualizado = {
                ...c,
                empenhos: [...(c.empenhos || []), response.data]
              };
              console.log('📊 Contrato atualizado localmente:', contratoAtualizado);
              return contratoAtualizado;
            }
            return c;
          });
          console.log('📋 Novos contratos:', novosContratos);
          return novosContratos;
        });
        
        toast.success('Empenho adicionado com sucesso!');
      }
      setNovoEmpenho({ numeroEmpenho: '', centroCusto: '', subunidade: '', tipo: 'pecas', valor: '', valorAnulado: 0 });
      setShowEmpenhoModal(false);
      setEditingEmpenho(null);
      
      console.log('🔄 Recarregando contratos do servidor...');
      await loadContratos();
      console.log('✅ Contratos recarregados!');
    } catch (error) {
      console.error('❌ Erro ao salvar empenho:', error);
      console.error('Detalhes:', error.response?.data);
      toast.error(error.response?.data?.message || 'Erro ao salvar empenho');
    }
  };

  const handleEditEmpenho = (empenho) => {
    setEditingEmpenho(empenho);
    setNovoEmpenho({
      numeroEmpenho: empenho.numeroEmpenho,
      centroCusto: empenho.centroCusto || '',
      subunidade: empenho.subunidade || '',
      tipo: empenho.tipo,
      valor: formatarValor(empenho.valor),
      valorAnulado: formatarValor(empenho.valorAnulado || 0)
    });
    setShowEmpenhoModal(true);
  };

  const handleDeleteEmpenho = async (empenhoId) => {
    if (window.confirm('Tem certeza que deseja excluir este empenho?')) {
      try {
        // Atualizar estado local imediatamente (UI otimista)
        setContratos(prevContratos => prevContratos.map(c => {
          if (c._id === contratoSelecionado._id) {
            return {
              ...c,
              empenhos: c.empenhos.filter(e => e._id !== empenhoId)
            };
          }
          return c;
        }));
        
        // Executar exclusão no servidor
        await api.delete(`/clientes/${id}/contratos/${contratoSelecionado._id}/empenhos/${empenhoId}`);
        toast.success('Empenho excluído com sucesso!');
        
        // Recarregar do servidor para garantir sincronização
        await loadContratos();
      } catch (error) {
        console.error('Erro ao excluir empenho:', error);
        toast.error(error.response?.data?.message || 'Erro ao excluir empenho');
        await loadContratos();
      }
    }
  };

  const handleToggleEmpenhoStatus = async (contratoId, empenhoId) => {
    try {
      // Buscar o contrato e empenho atualizados do estado
      const contratoAtual = contratos.find(c => c._id === contratoId);
      const empenhoAtual = contratoAtual?.empenhos.find(e => e._id === empenhoId);
      
      if (!contratoAtual || !empenhoAtual) {
        toast.error('Empenho não encontrado');
        return;
      }
      
      const novoStatus = !empenhoAtual.ativo;
      
      console.log('🔄 Toggle Status Empenho:', {
        contratoId,
        empenhoId,
        statusAtual: empenhoAtual.ativo,
        novoStatus
      });

      // Executar alteração no servidor
      const response = await api.patch(`/clientes/${id}/contratos/${contratoId}/empenhos/${empenhoId}/status`);
      
      console.log('✅ Resposta do servidor:', response.data);

      // Atualizar estado local com a resposta do servidor
      setContratos(prevContratos => prevContratos.map(c => {
        if (c._id === contratoId) {
          return {
            ...c,
            empenhos: c.empenhos.map(e => {
              if (e._id === empenhoId) {
                return { ...e, ativo: response.data.ativo };
              }
              return e;
            })
          };
        }
        return c;
      }));

      // Se este contrato está selecionado, atualizar também
      if (contratoSelecionado?._id === contratoId) {
        setContratoSelecionado(prev => ({
          ...prev,
          empenhos: prev.empenhos.map(e => {
            if (e._id === empenhoId) {
              return { ...e, ativo: response.data.ativo };
            }
            return e;
          })
        }));
      }

      toast.success(`Empenho ${novoStatus ? 'ativado' : 'inativado'} com sucesso!`);
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      toast.error(error.response?.data?.message || 'Erro ao alterar status do empenho');
      // Recarregar apenas em caso de erro
      await loadContratos();
    }
  };

  const calcularSaldoContrato = (contrato) => {
    const valorContrato = contrato.valor || 0;
    const valorAditivos = (contrato.aditivos || [])
      .filter(a => a.ativo)
      .reduce((sum, a) => sum + (a.valor || 0), 0);
    
    // Calcular total de empenhos - apenas o VALOR CRIADO, ignorando anulado e utilizado
    // valorAnulado libera saldo para o contrato
    // valorUtilizado NÃO afeta o saldo do contrato, apenas do empenho individual
    // Empenhos INATIVOS não consomem saldo do contrato
    const valorEmpenhos = (contrato.empenhos || [])
      .filter(e => e.ativo !== false)
      .reduce((sum, e) => {
        const valorEmpenho = (e.valor || 0);
        const valorAnulado = (e.valorAnulado || 0);
        // Valor empenhado = valor - valorAnulado
        // valorUtilizado é deduzido do empenho, não do contrato
        const valorLiquido = valorEmpenho - valorAnulado;
        
        console.log(`📊 Empenho ${e.numeroEmpenho}:`, {
          valor: valorEmpenho,
          anulado: valorAnulado,
          utilizado: e.valorUtilizado || 0,
          liquido: valorLiquido,
          ativo: e.ativo,
          saldoEmpenho: valorEmpenho - valorAnulado - (e.valorUtilizado || 0)
        });
        
        return sum + valorLiquido;
      }, 0);
    
    const resultado = {
      valorContrato,
      valorAditivos,
      valorTotal: valorContrato + valorAditivos,
      valorEmpenhos,
      saldo: valorContrato + valorAditivos - valorEmpenhos
    };
    
    console.log('💰 Cálculo Saldo Contrato:', resultado);
    
    return resultado;
  };

  const formatarValor = (valor) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatarInputValor = (valor) => {
    // Remove tudo que não é número
    const numeros = valor.replace(/\D/g, '');
    // Converte para número dividindo por 100 (para ter as casas decimais)
    const numero = parseFloat(numeros) / 100;
    // Retorna formatado
    if (isNaN(numero)) return '';
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseValorBrasileiro = (valorFormatado) => {
    // Remove pontos de milhar e substitui vírgula por ponto
    const valor = valorFormatado.replace(/\./g, '').replace(',', '.');
    return parseFloat(valor) || 0;
  };

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="cliente-form-container">
            <div className="page-header">
              <div>
                <h1>{id && id !== 'novo' ? 'Editar Cliente' : 'Novo Cliente'}</h1>
                <p>Preencha os dados do cliente</p>
              </div>
            </div>

            <div className="tabs-container">
              <button 
                className={`tab ${activeTab === 'dados' ? 'active' : ''}`}
                onClick={() => setActiveTab('dados')}
              >
                Dados do Cliente
              </button>
              {id && id !== 'novo' && (
                <button 
                  className={`tab ${activeTab === 'centros' ? 'active' : ''}`}
                  onClick={() => setActiveTab('centros')}
                >
                  Centros de Custo e Subunidades
                </button>
              )}
              {id && id !== 'novo' && (
                <button
                  type="button"
                  className={`tab ${activeTab === 'contratos' ? 'active' : ''}`}
                  onClick={() => {
                    console.log('🔄 Mudando para aba Contratos. Estado atual:', contratos.length, 'contratos');
                    setActiveTab('contratos');
                  }}
                >
                  Contratos e Empenhos
                </button>
              )}
              {id && id !== 'novo' && (
                <button
                  type="button"
                  className={`tab ${activeTab === 'empenhos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('empenhos')}
                >
                  Visualizar Empenhos
                </button>
              )}
            </div>

            {activeTab === 'dados' && (
              <form onSubmit={handleSubmit} className="cliente-form">
                <div className="form-section">
                  <h3>Informações Básicas</h3>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Razão Social *</label>
                      <input
                        type="text"
                        name="razaoSocial"
                        value={formData.razaoSocial}
                        onChange={handleInputChange}
                        required
                        placeholder="Razão social do cliente"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Nome Fantasia *</label>
                      <input
                        type="text"
                        name="nomeFantasia"
                        value={formData.nomeFantasia}
                        onChange={handleInputChange}
                        required
                        placeholder="Nome fantasia"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Nomes Alternativos (Frotas)</label>
                      <small style={{display:'block',marginBottom:'6px',color:'#666'}}>Nomes enviados pelo sistema de Frotas que devem ser mapeados para este cliente</small>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'6px'}}>
                        {(formData.nomesAlternativos || []).map((nome, idx) => (
                          <span key={idx} style={{background:'#e8f4fd',border:'1px solid #bee3f8',borderRadius:'4px',padding:'2px 8px',display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'13px'}}>
                            {nome}
                            <button type="button" onClick={() => setFormData({...formData, nomesAlternativos: formData.nomesAlternativos.filter((_,i) => i !== idx)})} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:'14px',lineHeight:1,padding:'0 2px'}}>&times;</button>
                          </span>
                        ))}
                      </div>
                      <div style={{display:'flex',gap:'8px'}}>
                        <input
                          type="text"
                          id="novoNomeAlternativo"
                          placeholder="Ex: Prefeitura Municipal de Ibiraçu"
                          style={{flex:1}}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = e.target.value.trim();
                              if (val && !formData.nomesAlternativos.includes(val)) {
                                setFormData({...formData, nomesAlternativos: [...(formData.nomesAlternativos||[]), val]});
                                e.target.value = '';
                              }
                            }
                          }}
                        />
                        <button type="button" onClick={() => {
                          const input = document.getElementById('novoNomeAlternativo');
                          const val = input.value.trim();
                          if (val && !formData.nomesAlternativos.includes(val)) {
                            setFormData({...formData, nomesAlternativos: [...(formData.nomesAlternativos||[]), val]});
                            input.value = '';
                          }
                        }} style={{padding:'0 12px',background:'#3182ce',color:'#fff',border:'none',borderRadius:'4px',cursor:'pointer'}}>Adicionar</button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>CNPJ *</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          name="cnpj"
                          value={formData.cnpj}
                          onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                          required
                          placeholder="00.000.000/0000-00"
                          maxLength="18"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={buscarCNPJ}
                          disabled={buscandoCnpj}
                          style={{ padding: '0 14px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                        >
                          {buscandoCnpj ? '...' : '🔍 Buscar CNPJ'}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Inscrição Municipal</label>
                      <input
                        type="text"
                        name="inscricaoMunicipal"
                        value={formData.inscricaoMunicipal}
                        onChange={handleInputChange}
                        placeholder="Inscrição municipal"
                      />
                    </div>

                    <div className="form-group">
                      <label>Inscrição Estadual</label>
                      <input
                        type="text"
                        name="inscricaoEstadual"
                        value={formData.inscricaoEstadual}
                        onChange={handleInputChange}
                        placeholder="Inscrição estadual"
                      />
                    </div>

                    <div className="form-group">
                      <label>% de Desconto</label>
                      <input
                        type="number"
                        name="percentualDesconto"
                        value={formData.percentualDesconto}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Tipos de Serviço</h3>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>Defina se o cliente utiliza manutenção, combustível ou ambos</p>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleTiposServicoToggle('manutencao')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '12px 20px', border: '2px solid',
                            borderColor: (formData.tiposServico || []).includes('manutencao') ? '#251C59' : '#ddd',
                            borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem',
                            backgroundColor: (formData.tiposServico || []).includes('manutencao') ? '#e8e5f5' : 'white',
                            color: (formData.tiposServico || []).includes('manutencao') ? '#251C59' : '#666',
                            transition: 'all 0.2s'
                          }}
                        >
                          🔧 Manutenção
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTiposServicoToggle('combustivel')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '12px 20px', border: '2px solid',
                            borderColor: (formData.tiposServico || []).includes('combustivel') ? '#d97706' : '#ddd',
                            borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem',
                            backgroundColor: (formData.tiposServico || []).includes('combustivel') ? '#fef3c7' : 'white',
                            color: (formData.tiposServico || []).includes('combustivel') ? '#92400e' : '#666',
                            transition: 'all 0.2s'
                          }}
                        >
                          ⛽ Combustível
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Taxa da Plataforma - visível apenas quando combustível está selecionado */}
                  {(formData.tiposServico || []).includes('combustivel') && (
                    <div className="form-grid" style={{ marginTop: '15px' }}>
                      <div className="form-group">
                        <label>⛽ Taxa da Plataforma por Litro (R$)</label>
                        <input
                          type="number"
                          name="taxaPlataformaPorLitro"
                          value={formData.taxaPlataformaPorLitro ?? 0.08}
                          onChange={handleInputChange}
                          min="0"
                          max="1"
                          step="0.01"
                          placeholder="0.08"
                        />
                        <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                          Varia de R$ 0,08 a R$ 0,15 conforme contrato
                        </small>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-section">
                  <h3>🔧 Impostos & Retenções — Manutenção de Frotas</h3>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                    Impostos aplicados sobre faturas de manutenção (peças e serviços)
                  </p>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { key: 'municipais', label: 'Impostos Fora do Simples - Órgãos Municipais' },
                          { key: 'estaduais', label: 'Impostos Fora do Simples - Órgãos Estaduais' },
                          { key: 'federais', label: 'Impostos Fora do Simples - Órgãos Federais' },
                          { key: 'retencoes', label: 'Retenções Órgão' }
                        ].map(({ key, label }) => (
                          <label key={key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: (formData.tipoImposto || []).includes(key) ? '#e8e5f5' : 'white', transition: 'background-color 0.2s' }}>
                            <input
                              type="checkbox"
                              checked={(formData.tipoImposto || []).includes(key)}
                              onChange={() => handleTipoImpostoToggle(key)}
                              style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                            />
                            <span style={{ flex: 1 }}>🔧 {label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Checkbox para impostos sobre valor bruto */}
                  <div className="form-grid" style={{ marginTop: '1.5rem' }}>
                    <div className="form-group full-width">
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        cursor: 'pointer', 
                        padding: '15px', 
                        border: formData.impostosSobreValorBruto ? '2px solid #f59e0b' : '1px solid #ddd', 
                        borderRadius: '8px', 
                        backgroundColor: formData.impostosSobreValorBruto ? '#fef3c7' : 'white', 
                        transition: 'all 0.2s' 
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.impostosSobreValorBruto || false}
                          onChange={(e) => setFormData({ ...formData, impostosSobreValorBruto: e.target.checked })}
                          style={{ marginRight: '12px', width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: '600', color: '#92400e', display: 'block', marginBottom: '4px' }}>
                            ⚠️ Impostos sobre valor bruto
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#78716c', lineHeight: '1.4' }}>
                            Quando marcado, os Impostos Fora do Simples (Órgãos Federais) serão calculados sobre o Valor de Peças e Valor de Serviços 
                            <strong> antes do desconto</strong>, ao invés do valor com desconto. 
                            Útil para clientes que exigem base de cálculo sobre valores brutos.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Impostos Combustível — aparece apenas quando combustível está nos tipos de serviço */}
                {(formData.tiposServico || []).includes('combustivel') && (
                  <div className="form-section">
                    <h3>⛽ Retenções — Combustível</h3>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                      Retenções aplicadas sobre faturas de abastecimento (IN RFB nº 1.234/2012) — independente da manutenção
                    </p>
                    <div className="form-grid">
                      <div className="form-group full-width">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {[
                            { key: 'municipais', label: 'Retenções Combustível - Órgãos Municipais' },
                            { key: 'estaduais', label: 'Retenções Combustível - Órgãos Estaduais' },
                            { key: 'federais', label: 'Retenções Combustível - Órgãos Federais' }
                          ].map(({ key, label }) => (
                            <label key={key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', border: '1px solid', borderColor: (formData.tipoImpostoCombustivel || []).includes(key) ? '#d97706' : '#ddd', borderRadius: '4px', backgroundColor: (formData.tipoImpostoCombustivel || []).includes(key) ? '#fef3c7' : 'white', transition: 'all 0.2s' }}>
                              <input
                                type="checkbox"
                                checked={(formData.tipoImpostoCombustivel || []).includes(key)}
                                onChange={() => handleTipoImpostoCombustivelToggle(key)}
                                style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                              />
                              <span style={{ flex: 1 }}>⛽ {label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-section">
                  <h3>🔄 Antecipação de Fornecedores</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Configure se fornecedores podem solicitar antecipação de faturas vinculadas a este cliente
                  </p>
                  
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        cursor: 'pointer', 
                        padding: '15px', 
                        border: formData.permitirAntecipacaoFornecedor ? '2px solid #10b981' : '1px solid #ddd', 
                        borderRadius: '8px', 
                        backgroundColor: formData.permitirAntecipacaoFornecedor ? '#d1fae5' : 'white', 
                        transition: 'all 0.2s' 
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.permitirAntecipacaoFornecedor || false}
                          onChange={(e) => setFormData({ ...formData, permitirAntecipacaoFornecedor: e.target.checked })}
                          style={{ marginRight: '12px', width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: '600', color: formData.permitirAntecipacaoFornecedor ? '#047857' : '#374151', display: 'block', marginBottom: '4px' }}>
                            {formData.permitirAntecipacaoFornecedor ? '✅ Antecipação Permitida' : '❌ Antecipação Bloqueada'}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#78716c', lineHeight: '1.4' }}>
                            Quando marcado, os fornecedores poderão solicitar antecipação de valores das faturas de ordens de serviço 
                            vinculadas a este cliente. <strong>Se não marcado</strong>, as faturas deste cliente ficarão bloqueadas 
                            para antecipação no painel do fornecedor.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Taxas de Operações</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Configure o tipo de taxa que será aplicado nas faturas de fornecedores
                  </p>
                  
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: formData.tipoTaxa === 'nenhum' ? '#e3f2fd' : 'white', transition: 'background-color 0.2s' }}>
                          <input
                            type="radio"
                            name="tipoTaxa"
                            checked={formData.tipoTaxa === 'nenhum'}
                            onChange={() => handleTipoTaxaChange('nenhum')}
                            style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                          />
                          <span style={{ flex: 1 }}>Nenhuma Taxa</span>
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: formData.tipoTaxa === 'operacao' ? '#e3f2fd' : 'white', transition: 'background-color 0.2s' }}>
                          <input
                            type="radio"
                            name="tipoTaxa"
                            checked={formData.tipoTaxa === 'operacao'}
                            onChange={() => handleTipoTaxaChange('operacao')}
                            style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                          />
                          <span style={{ flex: 1 }}>Taxas de Operação (Taxa fixa sempre)</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: formData.tipoTaxa === 'antecipacao_variavel' ? '#e3f2fd' : 'white', transition: 'background-color 0.2s' }}>
                          <input
                            type="radio"
                            name="tipoTaxa"
                            checked={formData.tipoTaxa === 'antecipacao_variavel'}
                            onChange={() => handleTipoTaxaChange('antecipacao_variavel')}
                            style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                          />
                          <span style={{ flex: 1 }}>Taxas Antecipação & Variáveis (Fornecedor escolhe na hora)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {formData.tipoTaxa === 'operacao' && (
                    <div className="form-grid" style={{ marginTop: '1rem' }}>
                      <div className="form-group">
                        <label>Taxa de Operação (%) *</label>
                        <input
                          type="number"
                          name="taxaOperacao"
                          value={formData.taxaOperacao}
                          onChange={handleTaxaChange}
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="15"
                        />
                      </div>
                    </div>
                  )}

                  {formData.tipoTaxa === 'antecipacao_variavel' && (
                    <div className="form-grid" style={{ marginTop: '1rem' }}>
                      <div className="form-group">
                        <label>À Vista (%) *</label>
                        <input
                          type="number"
                          name="taxasAntecipacao.aVista"
                          value={formData.taxasAntecipacao.aVista}
                          onChange={handleTaxaChange}
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="15"
                        />
                      </div>
                      <div className="form-group">
                        <label>Receber Após Fechamento (%) *</label>
                        <input
                          type="number"
                          name="taxasAntecipacao.aposFechamento"
                          value={formData.taxasAntecipacao.aposFechamento}
                          onChange={handleTaxaChange}
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="13"
                        />
                      </div>
                      <div className="form-group">
                        <label>30 Dias Após Fatura (%)</label>
                        <input
                          type="number"
                          name="taxasAntecipacao.aprazado"
                          value={formData.taxasAntecipacao.aprazado}
                          onChange={handleTaxaChange}
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                        />
                      </div>
                      <div className="form-group">
                        <label>40 Dias Após Fatura (%)</label>
                        <input
                          type="number"
                          name="taxasAntecipacao.dias40"
                          value={formData.taxasAntecipacao.dias40}
                          onChange={handleTaxaChange}
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                        />
                      </div>
                      <div className="form-group">
                        <label>50 Dias Após Fatura (%)</label>
                        <input
                          type="number"
                          name="taxasAntecipacao.dias50"
                          value={formData.taxasAntecipacao.dias50}
                          onChange={handleTaxaChange}
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                        />
                      </div>
                      <div className="form-group">
                        <label>60 Dias Após Fatura (%)</label>
                        <input
                          type="number"
                          name="taxasAntecipacao.dias60"
                          value={formData.taxasAntecipacao.dias60}
                          onChange={handleTaxaChange}
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-section">
                  <h3>Endereço</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Logradouro *</label>
                      <input
                        type="text"
                        name="endereco.logradouro"
                        value={formData.endereco.logradouro}
                        onChange={handleInputChange}
                        required
                        placeholder="Rua, Avenida, etc."
                      />
                    </div>

                    <div className="form-group">
                      <label>Número *</label>
                      <input
                        type="text"
                        name="endereco.numero"
                        value={formData.endereco.numero}
                        onChange={handleInputChange}
                        required
                        placeholder="Número"
                      />
                    </div>

                    <div className="form-group">
                      <label>Complemento</label>
                      <input
                        type="text"
                        name="endereco.complemento"
                        value={formData.endereco.complemento}
                        onChange={handleInputChange}
                        placeholder="Apto, Sala, etc."
                      />
                    </div>

                    <div className="form-group">
                      <label>Bairro *</label>
                      <input
                        type="text"
                        name="endereco.bairro"
                        value={formData.endereco.bairro}
                        onChange={handleInputChange}
                        required
                        placeholder="Bairro"
                      />
                    </div>

                    <div className="form-group">
                      <label>Cidade *</label>
                      <input
                        type="text"
                        name="endereco.cidade"
                        value={formData.endereco.cidade}
                        onChange={handleInputChange}
                        required
                        placeholder="Cidade"
                      />
                    </div>

                    <div className="form-group">
                      <label>Estado *</label>
                      <input
                        type="text"
                        name="endereco.estado"
                        value={formData.endereco.estado}
                        onChange={handleInputChange}
                        required
                        placeholder="UF"
                        maxLength="2"
                      />
                    </div>

                    <div className="form-group">
                      <label>CEP</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          name="endereco.cep"
                          value={formData.endereco.cep}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
                            setFormData(prev => ({ ...prev, endereco: { ...prev.endereco, cep: v } }));
                            if (v.replace(/\D/g, '').length === 8) buscarCEP(v);
                          }}
                          placeholder="00000-000"
                          maxLength="9"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => buscarCEP()}
                          disabled={buscandoCep}
                          style={{ padding: '0 12px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                        >
                          {buscandoCep ? '...' : '🔍'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Contatos</h3>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Nome do Contato</label>
                      <input
                        type="text"
                        name="contatos.nome"
                        value={formData.contatos.nome}
                        onChange={handleInputChange}
                        placeholder="Nome completo do contato"
                      />
                    </div>

                    <div className="form-group">
                      <label>Telefone</label>
                      <input
                        type="tel"
                        name="contatos.telefone"
                        value={formData.contatos.telefone}
                        onChange={handleInputChange}
                        placeholder="(00) 0000-0000"
                      />
                    </div>

                    <div className="form-group">
                      <label>Celular</label>
                      <input
                        type="tel"
                        name="contatos.celular"
                        value={formData.contatos.celular}
                        onChange={handleInputChange}
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>E-mail</label>
                      <input
                        type="email"
                        name="contatos.email"
                        value={formData.contatos.email}
                        onChange={handleInputChange}
                        placeholder="contato@email.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => navigate('/clientes')}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar Cliente'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'centros' && id && id !== 'novo' && (
              <div className="centros-custo-section">
                <div className="section-header">
                  <h3>Centros de Custo</h3>
                  <button
                    className="btn-primary"
                    onClick={() => setShowCentroCustoModal(true)}
                  >
                    + Adicionar Centro de Custo
                  </button>
                </div>

                <div className="centros-custo-list">
                  {centrosCusto.length === 0 ? (
                    <p className="empty-message">Nenhum centro de custo cadastrado</p>
                  ) : (
                    centrosCusto.map(centro => (
                      <div key={centro._id} className="centro-custo-card">
                        <div className="centro-custo-header">
                          <h4>{centro.nome}</h4>
                          <div className="card-actions">
                            <button
                              className="btn-icon btn-success btn-add-sub"
                              onClick={() => {
                                setCentroCustoSelecionado(centro._id);
                                setShowSubunidadeModal(true);
                              }}
                              title="Adicionar Subunidade"
                            >
                              + Sub
                            </button>
                            <button
                              className="btn-icon btn-delete"
                              onClick={() => handleDeleteCentroCusto(centro._id)}
                              title="Excluir"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {centro.subunidades && centro.subunidades.length > 0 && (
                          <div className="subunidades-list">
                            <h5>Subunidades:</h5>
                            <ul>
                              {centro.subunidades.map(sub => (
                                <li key={sub._id}>
                                  <span>{sub.nome}</span>
                                  <button
                                    className="btn-icon-small btn-delete"
                                    onClick={() => handleDeleteSubunidade(centro._id, sub._id)}
                                    title="Excluir"
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'contratos' && id && id !== 'novo' && (
              <div className="contratos-section">
                <div className="section-header">
                  <h3>Contratos</h3>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setEditingContrato(null);
                      setNovoContrato({ numeroContrato: '', valor: '', dataInicial: '', dataFinal: '' });
                      setShowContratoModal(true);
                    }}
                  >
                    + Adicionar Contrato
                  </button>
                </div>

                <div className="contratos-list">
                  {(() => {
                    console.log('📊 Renderizando contratos. Total:', contratos.length);
                    console.log('📋 Contratos:', contratos);
                    return null;
                  })()}
                  {contratos.length === 0 ? (
                    <p className="empty-message">Nenhum contrato cadastrado</p>
                  ) : (
                    contratos.map(contrato => {
                      const saldos = calcularSaldoContrato(contrato);
                      return (
                        <div key={contrato._id} className="contrato-card">
                          <div className="contrato-header">
                            <div>
                              <h4>
                                Contrato Nº {contrato.numeroContrato} - {new Date(contrato.dataInicial).toLocaleDateString()} a {new Date(contrato.dataFinal).toLocaleDateString()}
                                {!contrato.ativo && <span className="badge-inactive"> (Inativo)</span>}
                              </h4>
                              <div className="contrato-valores">
                                <span><strong>Valor Inicial:</strong> R$ {formatarValor(saldos.valorContrato)}</span>
                                {saldos.valorAditivos > 0 && <span> | <strong>Aditivos:</strong> R$ {formatarValor(saldos.valorAditivos)}</span>}
                                <span> | <strong>Total:</strong> R$ {formatarValor(saldos.valorTotal)}</span>
                                <span> | <strong>Empenhado:</strong> R$ {formatarValor(saldos.valorEmpenhos)}</span>
                                <span> | <strong>Saldo:</strong> <span style={{color: saldos.saldo < 0 ? '#dc3545' : '#28a745', fontWeight: 'bold'}}>R$ {formatarValor(saldos.saldo)}</span></span>
                              </div>
                            </div>
                            <div className="card-actions">
                              <div className="btn-group">
                                <button
                                  className="btn-icon btn-info btn-aditivo"
                                  onClick={() => {
                                    setContratoSelecionado(contrato);
                                    setEditingAditivo(null);
                                    setNovoAditivo({ valor: '', dataInicial: '', dataFinal: '' });
                                    setShowAditivoModal(true);
                                  }}
                                  title="Adicionar Aditivo"
                                >
                                  + Aditivo
                                </button>
                                <button
                                  className="btn-icon btn-success btn-empenho"
                                  onClick={() => {
                                    const saldos = calcularSaldoContrato(contrato);
                                    if (saldos.saldo <= 0) {
                                      toast.error('Não há saldo disponível neste contrato para criar empenho!');
                                      return;
                                    }
                                    setContratoSelecionado(contrato);
                                    setEditingEmpenho(null);
                                    setNovoEmpenho({ numeroEmpenho: '', centroCusto: '', subunidade: '', tipo: 'pecas', valor: '', valorAnulado: 0 });
                                    setShowEmpenhoModal(true);
                                  }}
                                  title="Adicionar Empenho"
                                  disabled={calcularSaldoContrato(contrato).saldo <= 0}
                                >
                                  + Empenho
                                </button>
                              </div>
                              <div className="btn-group">
                                <button
                                  className="action-button edit"
                                  onClick={() => handleEditContrato(contrato)}
                                  title="Editar Contrato"
                                >
                                  <span className="icon" role="img" aria-label="Editar">✏️</span>
                                  Editar
                                </button>
                                <button
                                  className="action-button status"
                                  onClick={() => handleToggleContratoStatus(contrato._id)}
                                  title={contrato.ativo ? 'Inativar' : 'Ativar'}
                                >
                                  <span className="icon" role="img" aria-label={contrato.ativo ? 'Inativar' : 'Ativar'}>
                                    {contrato.ativo ? '🔓' : '🔒'}
                                  </span>
                                  {contrato.ativo ? 'Inativar' : 'Ativar'}
                                </button>
                                <button
                                  className="action-button delete"
                                  onClick={() => handleDeleteContrato(contrato._id)}
                                  title="Excluir"
                                >
                                  <span className="icon" role="img" aria-label="Excluir">🗑️</span>
                                  Excluir
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Aditivos */}
                          {contrato.aditivos && contrato.aditivos.length > 0 && (
                            <div className="aditivos-list">
                              <h5>Aditivos:</h5>
                              <table className="mini-table">
                                <thead>
                                  <tr>
                                    <th>Valor</th>
                                    <th>Data Inicial</th>
                                    <th>Data Final</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {contrato.aditivos.map(aditivo => (
                                    <tr key={aditivo._id} className={!aditivo.ativo ? 'inactive-row' : ''}>
                                      <td>R$ {formatarValor(aditivo.valor || 0)}</td>
                                      <td>{new Date(aditivo.dataInicial).toLocaleDateString()}</td>
                                      <td>{new Date(aditivo.dataFinal).toLocaleDateString()}</td>
                                      <td>{aditivo.ativo ? '✅ Ativo' : '❌ Inativo'}</td>
                                      <td>
                                        <div className="table-action-group">
                                          <button
                                            className="action-button edit"
                                            onClick={() => {
                                              setContratoSelecionado(contrato);
                                              handleEditAditivo(aditivo);
                                            }}
                                            title="Editar"
                                          >
                                            <span className="icon" role="img" aria-label="Editar">✏️</span>
                                            Editar
                                          </button>
                                          <button
                                            className="action-button status"
                                            onClick={() => {
                                              setContratoSelecionado(contrato);
                                              handleToggleAditivoStatus(aditivo._id);
                                            }}
                                            title={aditivo.ativo ? 'Inativar' : 'Ativar'}
                                          >
                                            <span className="icon" role="img" aria-label={aditivo.ativo ? 'Inativar' : 'Ativar'}>
                                              {aditivo.ativo ? '🔓' : '🔒'}
                                            </span>
                                            {aditivo.ativo ? 'Inativar' : 'Ativar'}
                                          </button>
                                          <button
                                            className="action-button delete"
                                            onClick={() => {
                                              setContratoSelecionado(contrato);
                                              handleDeleteAditivo(aditivo._id);
                                            }}
                                            title="Excluir"
                                          >
                                            <span className="icon" role="img" aria-label="Excluir">🗑️</span>
                                            Excluir
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Empenhos */}
                          {contrato.empenhos && contrato.empenhos.length > 0 && (
                            <div className="empenhos-list">
                              <h5>Empenhos:</h5>
                              <table className="mini-table">
                                <thead>
                                  <tr>
                                    <th>Nº Empenho</th>
                                    <th>Centro Custo/Subunidade</th>
                                    <th>Tipo</th>
                                    <th>Valor</th>
                                    <th>Anulado</th>
                                    <th>Líquido</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {contrato.empenhos.map(empenho => (
                                    <tr key={empenho._id} className={!empenho.ativo ? 'inactive-row' : ''}>
                                      <td>{empenho.numeroEmpenho}</td>
                                      <td>
                                        {empenho.centroCusto || '-'}
                                        {empenho.subunidade && ` / ${empenho.subunidade}`}
                                      </td>
                                      <td>
                                        {empenho.tipo === 'pecas' && 'Peças'}
                                        {empenho.tipo === 'servicos' && 'Serviços'}
                                        {empenho.tipo === 'pecas_servicos' && 'Peças/Serviços'}
                                      </td>
                                      <td>R$ {formatarValor(empenho.valor || 0)}</td>
                                      <td>R$ {formatarValor(empenho.valorAnulado || 0)}</td>
                                      <td>R$ {formatarValor((empenho.valor || 0) - (empenho.valorAnulado || 0))}</td>
                                      <td>{empenho.ativo ? '✅ Ativo' : '❌ Inativo'}</td>
                                      <td>
                                        <div className="table-action-group">
                                          <button
                                            className="action-button edit"
                                            onClick={() => {
                                              setContratoSelecionado(contrato);
                                              handleEditEmpenho(empenho);
                                            }}
                                            title="Editar"
                                          >
                                            <span className="icon" role="img" aria-label="Editar">✏️</span>
                                            Editar
                                          </button>
                                          <button
                                            className="action-button status"
                                            onClick={() => handleToggleEmpenhoStatus(contrato._id, empenho._id)}
                                            title={empenho.ativo ? 'Inativar' : 'Ativar'}
                                          >
                                            <span className="icon" role="img" aria-label={empenho.ativo ? 'Inativar' : 'Ativar'}>
                                              {empenho.ativo ? '🔓' : '🔒'}
                                            </span>
                                            {empenho.ativo ? 'Inativar' : 'Ativar'}
                                          </button>
                                          <button
                                            className="action-button delete"
                                            onClick={() => {
                                              setContratoSelecionado(contrato);
                                              handleDeleteEmpenho(empenho._id);
                                            }}
                                            title="Excluir"
                                          >
                                            <span className="icon" role="img" aria-label="Excluir">🗑️</span>
                                            Excluir
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'empenhos' && id && id !== 'novo' && (
              <div className="empenhos-view-section">
                <div className="section-header">
                  <h3>Todos os Empenhos</h3>
                </div>

                {contratos.length === 0 ? (
                  <p className="empty-message">Nenhum contrato cadastrado</p>
                ) : (
                  <div className="empenhos-summary">
                    {contratos.map(contrato => {
                      const saldos = calcularSaldoContrato(contrato);
                      const totalEmpenhos = contrato.empenhos?.filter(e => e.ativo).length || 0;
                      
                      if (!contrato.empenhos || contrato.empenhos.length === 0) return null;

                      return (
                        <div key={contrato._id} className="empenho-contrato-group">
                          <div className="empenho-contrato-header">
                            <h4>
                              Contrato Nº {contrato.numeroContrato}
                              {!contrato.ativo && <span className="badge-inactive"> (Inativo)</span>}
                            </h4>
                            <div className="empenho-contrato-info">
                              <span><strong>Total Contrato:</strong> R$ {formatarValor(saldos.valorTotal)}</span>
                              <span> | <strong>Total Empenhado:</strong> R$ {formatarValor(saldos.valorEmpenhos)}</span>
                              <span> | <strong>Saldo:</strong> <span style={{color: saldos.saldo < 0 ? '#dc3545' : '#28a745', fontWeight: 'bold'}}>R$ {formatarValor(saldos.saldo)}</span></span>
                              <span> | <strong>Empenhos Ativos:</strong> {totalEmpenhos}</span>
                            </div>
                          </div>

                          <table className="empenhos-full-table">
                            <thead>
                              <tr>
                                <th>Nº Empenho</th>
                                <th>Centro de Custo</th>
                                <th>Subunidade</th>
                                <th>Tipo</th>
                                <th>Valor</th>
                                <th>Anulado</th>
                                <th>Utilizado (OS)</th>
                                <th>Saldo</th>
                                <th>Status</th>
                                <th>Data</th>
                              </tr>
                            </thead>
                            <tbody>
                              {contrato.empenhos.map(empenho => {
                                const valorEmpenho = empenho.valor || 0;
                                const valorAnulado = empenho.valorAnulado || 0;
                                const valorUtilizado = empenho.valorUtilizado || 0;
                                const saldoEmpenho = valorEmpenho - valorAnulado - valorUtilizado;
                                
                                return (
                                <tr key={empenho._id} className={!empenho.ativo ? 'inactive-row' : ''}>
                                  <td><strong>{empenho.numeroEmpenho}</strong></td>
                                  <td>{empenho.centroCusto || '-'}</td>
                                  <td>{empenho.subunidade || '-'}</td>
                                  <td>
                                    {empenho.tipo === 'pecas' && '🔧 Peças'}
                                    {empenho.tipo === 'servicos' && '⚙️ Serviços'}
                                    {empenho.tipo === 'pecas_servicos' && '🔧⚙️ Peças/Serviços'}
                                  </td>
                                  <td className="valor-column">R$ {formatarValor(valorEmpenho)}</td>
                                  <td className="valor-anulado-column" title="Valor cancelado manualmente">R$ {formatarValor(valorAnulado)}</td>
                                  <td className="valor-utilizado-column" title="Valor consumido por ordens de serviço">R$ {formatarValor(valorUtilizado)}</td>
                                  <td className="valor-liquido-column"><strong>R$ {formatarValor(saldoEmpenho)}</strong></td>
                                  <td>
                                    <span className={`status-badge ${empenho.ativo ? 'status-active' : 'status-inactive'}`}>
                                      {empenho.ativo ? '✅ Ativo' : '❌ Inativo'}
                                    </span>
                                  </td>
                                  <td>{new Date(empenho.createdAt || Date.now()).toLocaleDateString()}</td>
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    }).filter(Boolean)}

                    {contratos.every(c => !c.empenhos || c.empenhos.length === 0) && (
                      <p className="empty-message">Nenhum empenho cadastrado</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />

      {/* Modal Centro de Custo */}
      {showCentroCustoModal && (
        <div className="modal-overlay cliente-modal-overlay" onClick={() => setShowCentroCustoModal(false)}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Adicionar Centro de Custo</h3>
              <button className="modal-close" onClick={() => setShowCentroCustoModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="modal-label">Nome do Centro de Custo *</label>
                <input
                  type="text"
                  value={novoCentroCusto}
                  onChange={(e) => setNovoCentroCusto(e.target.value)}
                  placeholder="Digite o nome"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCentroCustoModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleAddCentroCusto}>
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Subunidade */}
      {showSubunidadeModal && (
        <div className="modal-overlay cliente-modal-overlay" onClick={() => setShowSubunidadeModal(false)}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Adicionar Subunidade</h3>
              <button className="modal-close" onClick={() => setShowSubunidadeModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="modal-label">Nome da Subunidade *</label>
                <input
                  type="text"
                  value={novaSubunidade}
                  onChange={(e) => setNovaSubunidade(e.target.value)}
                  placeholder="Digite o nome"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSubunidadeModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleAddSubunidade}>
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Contrato */}
      {showContratoModal && (
        <div className="modal-overlay cliente-modal-overlay" onClick={() => setShowContratoModal(false)}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingContrato ? 'Editar Contrato' : 'Adicionar Contrato'}</h3>
              <button className="modal-close" onClick={() => setShowContratoModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="modal-label">N° do Contrato *</label>
                <input
                  type="text"
                  value={novoContrato.numeroContrato}
                  onChange={(e) => setNovoContrato({ ...novoContrato, numeroContrato: e.target.value })}
                  placeholder="Digite o número do contrato"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="modal-label">Valor *</label>
                <input
                  type="text"
                  value={novoContrato.valor}
                  onChange={(e) => {
                    const formatted = formatarInputValor(e.target.value);
                    setNovoContrato({ ...novoContrato, valor: formatted });
                  }}
                  placeholder="0,00"
                />
              </div>
              <div className="form-group">
                <label className="modal-label">Data Inicial *</label>
                <input
                  type="date"
                  value={novoContrato.dataInicial}
                  onChange={(e) => setNovoContrato({ ...novoContrato, dataInicial: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="modal-label">Data Final *</label>
                <input
                  type="date"
                  value={novoContrato.dataFinal}
                  onChange={(e) => setNovoContrato({ ...novoContrato, dataFinal: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowContratoModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleAddContrato}>
                {editingContrato ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aditivo */}
      {showAditivoModal && (
        <div className="modal-overlay cliente-modal-overlay" onClick={() => setShowAditivoModal(false)}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAditivo ? 'Editar Aditivo' : 'Adicionar Aditivo'}</h3>
              <button className="modal-close" onClick={() => setShowAditivoModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="modal-label">Valor *</label>
                <input
                  type="text"
                  value={novoAditivo.valor}
                  onChange={(e) => {
                    const formatted = formatarInputValor(e.target.value);
                    setNovoAditivo({ ...novoAditivo, valor: formatted });
                  }}
                  placeholder="0,00"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="modal-label">Data Inicial *</label>
                <input
                  type="date"
                  value={novoAditivo.dataInicial}
                  onChange={(e) => setNovoAditivo({ ...novoAditivo, dataInicial: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="modal-label">Data Final *</label>
                <input
                  type="date"
                  value={novoAditivo.dataFinal}
                  onChange={(e) => setNovoAditivo({ ...novoAditivo, dataFinal: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAditivoModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleAddAditivo}>
                {editingAditivo ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Empenho */}
      {showEmpenhoModal && contratoSelecionado && (
        <div className="modal-overlay cliente-modal-overlay" onClick={() => setShowEmpenhoModal(false)}>
          <div className="modal-content-medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEmpenho ? 'Editar Empenho' : 'Adicionar Empenho'}</h3>
              <button className="modal-close" onClick={() => setShowEmpenhoModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="contract-info">
                <strong>Valor do Contrato:</strong> R$ {formatarValor(calcularSaldoContrato(contratoSelecionado).valorTotal)} | 
                <strong> Saldo Disponível:</strong> <span style={{color: calcularSaldoContrato(contratoSelecionado).saldo < 0 ? '#dc3545' : '#28a745', fontWeight: 'bold'}}>R$ {formatarValor(calcularSaldoContrato(contratoSelecionado).saldo)}</span>
              </div>
              <div className="form-group">
                <label className="modal-label">Nº Empenho *</label>
                <input
                  type="text"
                  value={novoEmpenho.numeroEmpenho}
                  onChange={(e) => setNovoEmpenho({ ...novoEmpenho, numeroEmpenho: e.target.value })}
                  placeholder="Digite o número do empenho"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="modal-label">Centro de Custo</label>
                <select
                  value={novoEmpenho.centroCusto}
                  onChange={(e) => {
                    setNovoEmpenho({ ...novoEmpenho, centroCusto: e.target.value, subunidade: '' });
                  }}
                >
                  <option value="">Selecione...</option>
                  {centrosCusto.map(cc => (
                    <option key={cc._id} value={cc.nome}>{cc.nome}</option>
                  ))}
                </select>
              </div>
              {novoEmpenho.centroCusto && (
                <div className="form-group">
                  <label className="modal-label">Subunidade</label>
                  <select
                    value={novoEmpenho.subunidade}
                    onChange={(e) => setNovoEmpenho({ ...novoEmpenho, subunidade: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {centrosCusto
                      .find(cc => cc.nome === novoEmpenho.centroCusto)
                      ?.subunidades?.map(sub => (
                        <option key={sub._id} value={sub.nome}>{sub.nome}</option>
                      ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="modal-label">Tipo *</label>
                <select
                  value={novoEmpenho.tipo}
                  onChange={(e) => setNovoEmpenho({ ...novoEmpenho, tipo: e.target.value })}
                >
                  <option value="pecas">Peças</option>
                  <option value="servicos">Serviços</option>
                  <option value="pecas_servicos">Peças/Serviços</option>
                </select>
              </div>
              <div className="form-group">
                <label className="modal-label">Valor *</label>
                <input
                  type="text"
                  value={novoEmpenho.valor}
                  onChange={(e) => {
                    const formatted = formatarInputValor(e.target.value);
                    setNovoEmpenho({ ...novoEmpenho, valor: formatted });
                  }}
                  placeholder="0,00"
                />
              </div>
              <div className="form-group">
                <label className="modal-label">Valor Anulado</label>
                <input
                  type="text"
                  value={novoEmpenho.valorAnulado}
                  onChange={(e) => {
                    const formatted = formatarInputValor(e.target.value);
                    setNovoEmpenho({ ...novoEmpenho, valorAnulado: formatted });
                  }}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEmpenhoModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleAddEmpenho}>
                {editingEmpenho ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClienteForm;
