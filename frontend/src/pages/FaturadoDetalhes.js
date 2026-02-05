import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './FaturadoDetalhes.css';

function FaturadoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fatura, setFatura] = useState(null);
  const [ordensServico, setOrdensServico] = useState([]);
  const [selecionadas, setSelecionadas] = useState([]);
  const [impostos, setImpostos] = useState(null);
  const [previsaoRecebimento, setPrevisaoRecebimento] = useState('');
  const [editandoPrevisao, setEditandoPrevisao] = useState(false);
  const [dataVencimento, setDataVencimento] = useState('');
  const [editandoVencimento, setEditandoVencimento] = useState(false);
  const [filtros, setFiltros] = useState({
    busca: '',
    status: ''
  });

  const percentualTaxaOperacao = useMemo(() => {
    if (!fatura) return null;
    const valorTaxas = fatura.valorTaxasOperacao || 0;
    if (valorTaxas <= 0) return null;

    const base = fatura.valorComDesconto || 0;
    if (base > 0) {
      const perc = (valorTaxas / base) * 100;
      if (Number.isFinite(perc)) {
        return perc;
      }
    }

    const osComTaxa = ordensServico.find(item => {
      const taxa = item?.ordemServico?.taxaAplicada;
      return typeof taxa === 'number' && taxa > 0;
    });
    if (osComTaxa) {
      return osComTaxa.ordemServico.taxaAplicada;
    }

    const taxaCliente = fatura.cliente?.taxaOperacao;
    if (typeof taxaCliente === 'number' && taxaCliente > 0) {
      return taxaCliente;
    }

    const taxasAntecipacao = fatura.cliente?.taxasAntecipacao;
    if (taxasAntecipacao) {
      const { aVista, aposFechamento, aprazado } = taxasAntecipacao;
      const candidatos = [aVista, aposFechamento, aprazado].filter(valor => typeof valor === 'number' && valor > 0);
      if (candidatos.length > 0) {
        return candidatos[0];
      }
    }

    return null;
  }, [fatura, ordensServico]);

  // Calcular fator de proporção para valor líquido
  const fatorLiquido = useMemo(() => {
    if (!fatura) return 1;
    const valorComDesconto = fatura.valorComDesconto || 0;
    const valorDevido = fatura.valorDevido || 0;
    if (valorComDesconto > 0) {
      return valorDevido / valorComDesconto;
    }
    return 1;
  }, [fatura]);

  // Calcular valores líquidos proporcionais de cada OS
  const ordensComValorLiquido = useMemo(() => {
    return ordensServico.map(item => ({
      ...item,
      valorLiquido: Math.round((item.valorOS || 0) * fatorLiquido * 100) / 100
    }));
  }, [ordensServico, fatorLiquido]);

  // Resumo das OS selecionadas
  const resumoSelecionadas = useMemo(() => {
    if (selecionadas.length === 0 || !fatura) {
      return null;
    }
    
    const osSelecionadas = ordensComValorLiquido.filter(
      item => selecionadas.includes(item.ordemServico._id) && item.statusPagamento === 'Aguardando pagamento'
    );
    
    const valorBruto = osSelecionadas.reduce((acc, item) => acc + (item.valorOS || 0), 0);
    const valorLiquido = osSelecionadas.reduce((acc, item) => acc + (item.valorLiquido || 0), 0);
    const taxasProporcional = valorBruto - valorLiquido;
    
    return {
      quantidade: osSelecionadas.length,
      valorBruto: Math.round(valorBruto * 100) / 100,
      valorLiquido: Math.round(valorLiquido * 100) / 100,
      taxasProporcional: Math.round(taxasProporcional * 100) / 100
    };
  }, [selecionadas, ordensComValorLiquido, fatura]);

  // Verificar se há OS pendentes
  const osPendentes = useMemo(() => {
    return ordensServico.filter(item => item.statusPagamento === 'Aguardando pagamento');
  }, [ordensServico]);

  // Verificar se é fornecedor ou cliente (somente leitura)
  const isFornecedor = user?.role === 'fornecedor';
  const isCliente = user?.role === 'cliente';
  const isReadOnly = isFornecedor || isCliente;

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadFatura();
    loadImpostos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadImpostos = async () => {
    try {
      const response = await api.get('/impostos-retencoes');
      
      // Verifica se response.data é um array ou um objeto único
      if (Array.isArray(response.data) && response.data.length > 0) {
        const impostosAtivos = response.data.find(i => i.ativo) || response.data[0];
        setImpostos(impostosAtivos);
      } else if (response.data && typeof response.data === 'object') {
        // Se retornar um objeto único
        setImpostos(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar impostos:', error);
    }
  };

  const loadFatura = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/faturas/${id}`);
      console.log('📊 Fatura carregada:', response.data);
      console.log('📅 Previsão recebida:', response.data.previsaoRecebimento);
      setFatura(response.data);
      setOrdensServico(response.data.ordensServico || []);
      
      // Carregar previsão de recebimento se existir
      if (response.data.previsaoRecebimento) {
        const data = new Date(response.data.previsaoRecebimento);
        // Usar UTC para garantir que a data não mude
        const ano = data.getUTCFullYear();
        const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
        const dia = String(data.getUTCDate()).padStart(2, '0');
        const dataFormatada = `${ano}-${mes}-${dia}`;
        console.log('✅ Previsão setada:', dataFormatada);
        setPrevisaoRecebimento(dataFormatada);
      } else {
        console.log('⚠️ Nenhuma previsão encontrada');
        setPrevisaoRecebimento('');
      }
      
      // Carregar data de vencimento se existir
      if (response.data.dataVencimento) {
        const data = new Date(response.data.dataVencimento);
        const ano = data.getUTCFullYear();
        const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
        const dia = String(data.getUTCDate()).padStart(2, '0');
        const dataFormatada = `${ano}-${mes}-${dia}`;
        console.log('✅ Vencimento setado:', dataFormatada);
        setDataVencimento(dataFormatada);
      } else {
        console.log('⚠️ Nenhum vencimento encontrado');
        setDataVencimento('');
      }
    } catch (error) {
      toast.error('Erro ao carregar fatura');
      console.error(error);
      navigate('/faturados');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const handleSelecionar = (osId) => {
    const os = ordensServico.find(item => item.ordemServico._id === osId);
    
    // Não permitir selecionar OS já pagas
    if (os && os.statusPagamento === 'Paga') {
      return;
    }

    setSelecionadas(prev => {
      if (prev.includes(osId)) {
        return prev.filter(id => id !== osId);
      } else {
        return [...prev, osId];
      }
    });
  };

  const handleSelecionarTodas = () => {
    const osPendentes = ordensServico
      .filter(item => item.statusPagamento === 'Aguardando pagamento')
      .map(item => item.ordemServico._id);
    
    if (selecionadas.length === osPendentes.length) {
      setSelecionadas([]);
    } else {
      setSelecionadas(osPendentes);
    }
  };

  const handleMarcarComoPagas = async () => {
    if (selecionadas.length === 0) {
      toast.warning('Selecione pelo menos uma ordem de serviço');
      return;
    }

    try {
      const promises = selecionadas.map(osId =>
        api.patch(`/faturas/${id}/ordem-servico/${osId}/pagar`, {
          dataPagamento: new Date()
        })
      );

      await Promise.all(promises);
      toast.success('Ordens de serviço marcadas como pagas');
      setSelecionadas([]);
      loadFatura();
    } catch (error) {
      toast.error('Erro ao marcar como pagas');
      console.error(error);
    }
  };

  // Pagar fatura inteira (todas as OS pendentes)
  const handlePagarFaturaInteira = async () => {
    if (osPendentes.length === 0) {
      toast.info('Todas as ordens de serviço já foram pagas');
      return;
    }

    const valorRestante = fatura?.valorRestante || 0;
    if (!window.confirm(`Deseja marcar TODAS as ${osPendentes.length} ordens de serviço como pagas?\n\nValor total a pagar: ${formatarValor(valorRestante)}`)) {
      return;
    }

    try {
      const promises = osPendentes.map(item =>
        api.patch(`/faturas/${id}/ordem-servico/${item.ordemServico._id}/pagar`, {
          dataPagamento: new Date()
        })
      );

      await Promise.all(promises);
      toast.success('Fatura paga integralmente!');
      setSelecionadas([]);
      loadFatura();
    } catch (error) {
      toast.error('Erro ao pagar fatura');
      console.error(error);
    }
  };

  const handleRemoverOS = async (osId) => {
    if (!window.confirm('Deseja realmente remover esta ordem de serviço da fatura?')) {
      return;
    }

    try {
      await api.delete(`/faturas/${id}/ordem-servico/${osId}`);
      toast.success('Ordem de serviço removida da fatura');
      loadFatura();
    } catch (error) {
      toast.error('Erro ao remover ordem de serviço');
      console.error(error);
    }
  };

  const handleExcluirFatura = async () => {
    if (!window.confirm('Deseja realmente excluir esta fatura? As ordens de serviço voltarão ao status "Autorizada".')) {
      return;
    }

    try {
      await api.delete(`/faturas/${id}`);
      toast.success('Fatura excluída com sucesso');
      navigate('/faturados');
    } catch (error) {
      toast.error('Erro ao excluir fatura');
      console.error(error);
    }
  };

  const handleSalvarPrevisao = async () => {
    try {
      console.log('💾 Salvando previsão:', previsaoRecebimento);
      
      let dataParaEnviar = null;
      if (previsaoRecebimento) {
        // Criar data no timezone local para evitar conversão UTC
        const [ano, mes, dia] = previsaoRecebimento.split('-');
        dataParaEnviar = new Date(ano, mes - 1, dia, 12, 0, 0); // Meio-dia para evitar problemas de timezone
      }
      
      const payload = {
        previsaoRecebimento: dataParaEnviar
      };
      console.log('📦 Payload enviado:', payload);
      
      const response = await api.put(`/faturas/${id}`, payload);
      console.log('✅ Resposta do servidor:', response.data);
      
      toast.success('Previsão de recebimento atualizada');
      setEditandoPrevisao(false);
      await loadFatura();
    } catch (error) {
      toast.error('Erro ao atualizar previsão');
      console.error('❌ Erro ao salvar:', error.response?.data || error);
    }
  };

  const handleCancelarPrevisao = () => {
    if (fatura.previsaoRecebimento) {
      const data = new Date(fatura.previsaoRecebimento);
      const ano = data.getUTCFullYear();
      const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
      const dia = String(data.getUTCDate()).padStart(2, '0');
      setPrevisaoRecebimento(`${ano}-${mes}-${dia}`);
    } else {
      setPrevisaoRecebimento('');
    }
    setEditandoPrevisao(false);
  };

  const handleSalvarVencimento = async () => {
    try {
      console.log('💾 Salvando vencimento:', dataVencimento);
      
      let dataParaEnviar = null;
      if (dataVencimento) {
        const [ano, mes, dia] = dataVencimento.split('-');
        dataParaEnviar = new Date(ano, mes - 1, dia, 12, 0, 0);
      }
      
      const payload = {
        dataVencimento: dataParaEnviar
      };
      console.log('📦 Payload enviado:', payload);
      
      const response = await api.put(`/faturas/${id}`, payload);
      console.log('✅ Resposta do servidor:', response.data);
      
      toast.success('Data de vencimento atualizada');
      setEditandoVencimento(false);
      await loadFatura();
    } catch (error) {
      toast.error('Erro ao atualizar vencimento');
      console.error('❌ Erro ao salvar:', error.response?.data || error);
    }
  };

  const handleCancelarVencimento = () => {
    if (fatura.dataVencimento) {
      const data = new Date(fatura.dataVencimento);
      const ano = data.getUTCFullYear();
      const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
      const dia = String(data.getUTCDate()).padStart(2, '0');
      setDataVencimento(`${ano}-${mes}-${dia}`);
    } else {
      setDataVencimento('');
    }
    setEditandoVencimento(false);
  };

  const ordemFiltradas = ordensServico.filter(item => {
    const os = item.ordemServico;
    const matchBusca = !filtros.busca ||
      os.numeroOrdemServico?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      os.codigo?.toLowerCase().includes(filtros.busca.toLowerCase());
    
    const matchStatus = !filtros.status || item.statusPagamento === filtros.status;
    
    return matchBusca && matchStatus;
  });

  const formatarData = (data) => {
    if (!data) return '-';
    const date = new Date(data);
    // Usar UTC para evitar problemas de timezone
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const formatarValor = (valor) => {
    if (!valor && valor !== 0) return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarPercentual = (valor) => {
    if (!valor && valor !== 0) return '0,00';
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTextoTaxaOperacao = () => {
    if (percentualTaxaOperacao === null) {
      return '(-) Taxa de Operação';
    }
    return `(-) Taxa de Operação (${formatarPercentual(percentualTaxaOperacao)}%)`;
  };

  const calcularDetalhamentoImpostos = () => {
    if (!impostos || !fatura) {
      return { total: 0, detalhamento: [] };
    }

    // Primeiro, agregar todos os valores de peças e serviços
    let totalValorPecas = 0;
    let totalValorServico = 0;
    let temFornecedorNaoOptante = false;
    let tiposImposto = new Set();

    ordensServico.forEach(item => {
      const ordem = item.ordemServico;
      const cliente = ordem.cliente;
      const fornecedor = ordem.fornecedor;

      // Só calcular se fornecedor é Não Optante
      if (fornecedor?.naoOptanteSimples) {
        temFornecedorNaoOptante = true;
        totalValorPecas += ordem.valorPecasComDesconto || 0;
        totalValorServico += ordem.valorServicoComDesconto || 0;
        
        // Coletar tipos de imposto do cliente
        if (cliente?.tipoImposto && Array.isArray(cliente.tipoImposto)) {
          cliente.tipoImposto.forEach(tipo => tiposImposto.add(tipo));
        }
      }
    });

    if (!temFornecedorNaoOptante || tiposImposto.size === 0) {
      return { total: 0, detalhamento: [] };
    }

    const detalhamento = [];
    let total = 0;

    // Agora calcular impostos sobre os totais agregados
    tiposImposto.forEach(tipo => {
      try {
        switch (tipo) {
          case 'municipais':
            if (impostos.impostosMunicipais) {
              const percIRPecas = impostos.impostosMunicipais.pecas?.ir || 0;
              const percIRServicos = impostos.impostosMunicipais.servicos?.ir || 0;
              const irMunPecas = Math.round(totalValorPecas * percIRPecas) / 100;
              const irMunServicos = Math.round(totalValorServico * percIRServicos) / 100;
              const totalIR = irMunPecas + irMunServicos;
              
              if (totalIR > 0) {
                total += totalIR;
                const subitens = [];
                if (irMunPecas > 0) {
                  subitens.push({ texto: `Peças: ${formatarValor(totalValorPecas)} × ${formatarPercentual(percIRPecas)}% = ${formatarValor(irMunPecas)}`, valor: irMunPecas });
                }
                if (irMunServicos > 0) {
                  subitens.push({ texto: `Serviços: ${formatarValor(totalValorServico)} × ${formatarPercentual(percIRServicos)}% = ${formatarValor(irMunServicos)}`, valor: irMunServicos });
                }
                if (subitens.length > 0) {
                  const tituloPartes = [];
                  if (irMunPecas > 0) tituloPartes.push(`${formatarPercentual(percIRPecas)}% Peças`);
                  if (irMunServicos > 0) tituloPartes.push(`${formatarPercentual(percIRServicos)}% Serviços`);
                  detalhamento.push({
                    titulo: `IR Municipal (${tituloPartes.join(' + ')})`,
                    valor: totalIR,
                    subitens
                  });
                }
              }
            }
            break;
          case 'estaduais':
            if (impostos.impostosEstaduais) {
              const estaduaisPecas = impostos.impostosEstaduais.pecas || {};
              const estaduaisServicos = impostos.impostosEstaduais.servicos || {};
              const percTotalPecas = (estaduaisPecas.ir || 0) + (estaduaisPecas.pis || 0) + (estaduaisPecas.cofins || 0) + (estaduaisPecas.csll || 0);
              const percTotalServicos = (estaduaisServicos.ir || 0) + (estaduaisServicos.pis || 0) + (estaduaisServicos.cofins || 0) + (estaduaisServicos.csll || 0);
              const totalEstPecas = Math.round(totalValorPecas * percTotalPecas) / 100;
              const totalEstServicos = Math.round(totalValorServico * percTotalServicos) / 100;
              const totalEst = totalEstPecas + totalEstServicos;
              
              if (totalEst > 0) {
                total += totalEst;
                const subitens = [];
                if (totalEstPecas > 0) {
                  subitens.push({ texto: `Peças: ${formatarValor(totalValorPecas)} × ${formatarPercentual(percTotalPecas)}% = ${formatarValor(totalEstPecas)}`, valor: totalEstPecas });
                }
                if (totalEstServicos > 0) {
                  subitens.push({ texto: `Serviços: ${formatarValor(totalValorServico)} × ${formatarPercentual(percTotalServicos)}% = ${formatarValor(totalEstServicos)}`, valor: totalEstServicos });
                }
                if (subitens.length > 0) {
                  const tituloPartes = [];
                  if (totalEstPecas > 0) tituloPartes.push(`${formatarPercentual(percTotalPecas)}% Peças`);
                  if (totalEstServicos > 0) tituloPartes.push(`${formatarPercentual(percTotalServicos)}% Serviços`);
                  detalhamento.push({
                    titulo: `Impostos Estaduais (${tituloPartes.join(' + ')})`,
                    valor: totalEst,
                    subitens
                  });
                }
              }
            }
            break;
          case 'federais':
            if (impostos.impostosFederais) {
              const federaisPecas = impostos.impostosFederais.pecas || {};
              const federaisServicos = impostos.impostosFederais.servicos || {};
              const percTotalPecas = (federaisPecas.ir || 0) + (federaisPecas.pis || 0) + (federaisPecas.cofins || 0) + (federaisPecas.csll || 0);
              const percTotalServicos = (federaisServicos.ir || 0) + (federaisServicos.pis || 0) + (federaisServicos.cofins || 0) + (federaisServicos.csll || 0);
              const totalFedPecas = Math.round(totalValorPecas * percTotalPecas) / 100;
              const totalFedServicos = Math.round(totalValorServico * percTotalServicos) / 100;
              const totalFed = totalFedPecas + totalFedServicos;
              
              if (totalFed > 0) {
                total += totalFed;
                const subitens = [];
                if (totalFedPecas > 0) {
                  subitens.push({ texto: `Peças: ${formatarValor(totalValorPecas)} × ${formatarPercentual(percTotalPecas)}% = ${formatarValor(totalFedPecas)}`, valor: totalFedPecas });
                }
                if (totalFedServicos > 0) {
                  subitens.push({ texto: `Serviços: ${formatarValor(totalValorServico)} × ${formatarPercentual(percTotalServicos)}% = ${formatarValor(totalFedServicos)}`, valor: totalFedServicos });
                }
                if (subitens.length > 0) {
                  const tituloPartes = [];
                  if (totalFedPecas > 0) tituloPartes.push(`${formatarPercentual(percTotalPecas)}% Peças`);
                  if (totalFedServicos > 0) tituloPartes.push(`${formatarPercentual(percTotalServicos)}% Serviços`);
                  detalhamento.push({
                    titulo: `Impostos Federais (${tituloPartes.join(' + ')})`,
                    valor: totalFed,
                    subitens
                  });
                }
              }
            }
            break;
          case 'retencoes':
            if (impostos.retencoesOrgao) {
              const percRetencoes = impostos.retencoesOrgao.percentual || 0;
              const retencoes = Math.round((totalValorPecas + totalValorServico) * percRetencoes) / 100;
              
              if (retencoes > 0) {
                total += retencoes;
                detalhamento.push({
                  titulo: `Retenções Órgão (${percRetencoes}%)`,
                  valor: retencoes,
                  subitens: [
                    { texto: `Total (Peças + Serviços): ${formatarValor(totalValorPecas + totalValorServico)} × ${percRetencoes}% = ${formatarValor(retencoes)}`, valor: retencoes }
                  ]
                });
              }
            }
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(`Erro ao calcular imposto ${tipo}:`, error);
      }
    });

    return { total, detalhamento };
  };

  const getStatusBadgeClass = (status) => {
    return status === 'Paga' ? 'status-badge status-paga' : 'status-badge status-aguardando';
  };

  const calcularDetalhamentoImpostosPecas = () => {
    if (!impostos || !fatura) return { total: 0, detalhamento: [] };

    // Primeiro, agregar todos os valores de peças
    let totalValorPecas = 0;
    let temFornecedorNaoOptante = false;
    let tiposImposto = new Set();

    ordensServico.forEach(item => {
      const ordem = item.ordemServico;
      const cliente = ordem.cliente;
      const fornecedor = ordem.fornecedor;

      if (fornecedor?.naoOptanteSimples) {
        temFornecedorNaoOptante = true;
        totalValorPecas += ordem.valorPecasComDesconto || 0;
        
        if (cliente?.tipoImposto && Array.isArray(cliente.tipoImposto)) {
          cliente.tipoImposto.forEach(tipo => tiposImposto.add(tipo));
        }
      }
    });

    if (!temFornecedorNaoOptante || tiposImposto.size === 0) {
      return { total: 0, detalhamento: [] };
    }

    const detalhamento = [];
    let total = 0;

    // Agora calcular impostos sobre os totais agregados
    tiposImposto.forEach(tipo => {
      try {
        switch (tipo) {
          case 'municipais':
            if (impostos.impostosMunicipais) {
              const percIRPecas = impostos.impostosMunicipais.pecas?.ir || 0;
              const irMunPecas = Math.round(totalValorPecas * percIRPecas) / 100;
              
              if (irMunPecas > 0) {
                total += irMunPecas;
                detalhamento.push({
                  titulo: `IR Municipal (${percIRPecas}% Peças)`,
                  valor: irMunPecas,
                  subitens: [
                    { texto: `Peças: ${formatarValor(totalValorPecas)} × ${percIRPecas}% = ${formatarValor(irMunPecas)}`, valor: irMunPecas }
                  ]
                });
              }
            }
            break;
          case 'estaduais':
            if (impostos.impostosEstaduais) {
              const estaduaisPecas = impostos.impostosEstaduais.pecas || {};
              const percTotalPecas = (estaduaisPecas.ir || 0) + (estaduaisPecas.pis || 0) + (estaduaisPecas.cofins || 0) + (estaduaisPecas.csll || 0);
              const totalEstPecas = Math.round(totalValorPecas * percTotalPecas) / 100;
              
              if (totalEstPecas > 0) {
                total += totalEstPecas;
                detalhamento.push({
                  titulo: `Impostos Estaduais (${formatarPercentual(percTotalPecas)}% Peças)`,
                  valor: totalEstPecas,
                  subitens: [
                    { texto: `Peças: ${formatarValor(totalValorPecas)} × ${formatarPercentual(percTotalPecas)}% = ${formatarValor(totalEstPecas)}`, valor: totalEstPecas }
                  ]
                });
              }
            }
            break;
          case 'federais':
            if (impostos.impostosFederais) {
              const federaisPecas = impostos.impostosFederais.pecas || {};
              const percTotalPecas = (federaisPecas.ir || 0) + (federaisPecas.pis || 0) + (federaisPecas.cofins || 0) + (federaisPecas.csll || 0);
              const totalFedPecas = Math.round(totalValorPecas * percTotalPecas) / 100;
              
              if (totalFedPecas > 0) {
                total += totalFedPecas;
                detalhamento.push({
                  titulo: `Impostos Federais (${formatarPercentual(percTotalPecas)}% Peças)`,
                  valor: totalFedPecas,
                  subitens: [
                    { texto: `Peças: ${formatarValor(totalValorPecas)} × ${formatarPercentual(percTotalPecas)}% = ${formatarValor(totalFedPecas)}`, valor: totalFedPecas }
                  ]
                });
              }
            }
            break;
          case 'retencoes':
            if (impostos.retencoesOrgao) {
              const percRetencoes = impostos.retencoesOrgao.percentual || 0;
              const retencoes = Math.round(totalValorPecas * percRetencoes) / 100;
              
              if (retencoes > 0) {
                total += retencoes;
                detalhamento.push({
                  titulo: `Retenções Órgão (${percRetencoes}%)`,
                  valor: retencoes,
                  subitens: [
                    { texto: `Peças: ${formatarValor(totalValorPecas)} × ${percRetencoes}% = ${formatarValor(retencoes)}`, valor: retencoes }
                  ]
                });
              }
            }
            break;
            default:
              break;
          }
        } catch (error) {
          console.error(`Erro ao calcular imposto ${tipo}:`, error);
        }
      });

    return { total, detalhamento };
  };

  const calcularDetalhamentoImpostosServicos = () => {
    if (!impostos || !fatura) return { total: 0, detalhamento: [] };

    // Primeiro, agregar todos os valores de serviços
    let totalValorServico = 0;
    let temFornecedorNaoOptante = false;
    let tiposImposto = new Set();

    ordensServico.forEach(item => {
      const ordem = item.ordemServico;
      const cliente = ordem.cliente;
      const fornecedor = ordem.fornecedor;

      if (fornecedor?.naoOptanteSimples) {
        temFornecedorNaoOptante = true;
        totalValorServico += ordem.valorServicoComDesconto || 0;
        
        if (cliente?.tipoImposto && Array.isArray(cliente.tipoImposto)) {
          cliente.tipoImposto.forEach(tipo => tiposImposto.add(tipo));
        }
      }
    });

    if (!temFornecedorNaoOptante || tiposImposto.size === 0) {
      return { total: 0, detalhamento: [] };
    }

    const detalhamento = [];
    let total = 0;

    // Agora calcular impostos sobre os totais agregados
    tiposImposto.forEach(tipo => {
      try {
        switch (tipo) {
          case 'municipais':
            if (impostos.impostosMunicipais) {
              const percIRServico = impostos.impostosMunicipais.servicos?.ir || 0;
              const irMunServico = Math.round(totalValorServico * percIRServico) / 100;
              
              if (irMunServico > 0) {
                total += irMunServico;
                detalhamento.push({
                  titulo: `IR Municipal (${percIRServico}% Serviços)`,
                  valor: irMunServico,
                  subitens: [
                    { texto: `Serviços: ${formatarValor(totalValorServico)} × ${percIRServico}% = ${formatarValor(irMunServico)}`, valor: irMunServico }
                  ]
                });
              }
            }
            break;
          case 'estaduais':
            if (impostos.impostosEstaduais) {
              const estaduaisServico = impostos.impostosEstaduais.servicos || {};
              const percTotalServico = (estaduaisServico.ir || 0) + (estaduaisServico.pis || 0) + (estaduaisServico.cofins || 0) + (estaduaisServico.csll || 0);
              const totalEstServico = Math.round(totalValorServico * percTotalServico) / 100;
              
              if (totalEstServico > 0) {
                total += totalEstServico;
                detalhamento.push({
                  titulo: `Impostos Estaduais (${formatarPercentual(percTotalServico)}% Serviços)`,
                  valor: totalEstServico,
                  subitens: [
                    { texto: `Serviços: ${formatarValor(totalValorServico)} × ${formatarPercentual(percTotalServico)}% = ${formatarValor(totalEstServico)}`, valor: totalEstServico }
                  ]
                });
              }
            }
            break;
          case 'federais':
            if (impostos.impostosFederais) {
              const federaisServico = impostos.impostosFederais.servicos || {};
              const percTotalServico = (federaisServico.ir || 0) + (federaisServico.pis || 0) + (federaisServico.cofins || 0) + (federaisServico.csll || 0);
              const totalFedServico = Math.round(totalValorServico * percTotalServico) / 100;
              
              if (totalFedServico > 0) {
                total += totalFedServico;
                detalhamento.push({
                  titulo: `Impostos Federais (${formatarPercentual(percTotalServico)}% Serviços)`,
                  valor: totalFedServico,
                  subitens: [
                    { texto: `Serviços: ${formatarValor(totalValorServico)} × ${formatarPercentual(percTotalServico)}% = ${formatarValor(totalFedServico)}`, valor: totalFedServico }
                  ]
                });
              }
            }
            break;
          case 'retencoes':
            if (impostos.retencoesOrgao) {
              const percRetencoes = impostos.retencoesOrgao.percentual || 0;
              const retencoes = Math.round(totalValorServico * percRetencoes) / 100;
              
              if (retencoes > 0) {
                total += retencoes;
                detalhamento.push({
                  titulo: `Retenções Órgão (${percRetencoes}%)`,
                  valor: retencoes,
                  subitens: [
                    { texto: `Serviços: ${formatarValor(totalValorServico)} × ${percRetencoes}% = ${formatarValor(retencoes)}`, valor: retencoes }
                  ]
                });
              }
            }
            break;
            default:
              break;
          }
        } catch (error) {
          console.error(`Erro ao calcular imposto ${tipo}:`, error);
        }
      });

    const entidade = fatura.tipo === 'Fornecedor' ? fatura.fornecedor : fatura.cliente;

    // Cabeçalho - InstaSolutions
    doc.setFontSize(16);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('InstaSolutions Produtos e Gestão Empresarial LTDA', 105, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    doc.text('CNPJ: 47.611.398/0001-66', 105, 21, { align: 'center' });
    doc.text('Telefone: (11) 5118-3784 | WhatsApp: (67) 98218-2448', 105, 26, { align: 'center' });
    doc.text('Alameda Rio Negro, N° 1030, Escritório 2304 - Alphaville Industrial, Barueri - SP', 105, 31, { align: 'center' });
    
    // Linha separadora
    doc.setDrawColor(37, 28, 89);
    doc.setLineWidth(0.5);
    doc.line(20, 34, 190, 34);

    // Título
    doc.setFontSize(14);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('FATURA DE SERVIÇOS - COMPLETA', 105, 42, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    doc.text(`Fatura Nº: ${fatura.numeroFatura}`, 20, 49);
    doc.text(`Data: ${formatarData(fatura.createdAt)}`, 190, 49, { align: 'right' });

    // Dados do Cliente/Fornecedor - COMPLETOS
    doc.setFontSize(11);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text(`Dados do ${fatura.tipo === 'Fornecedor' ? 'Fornecedor' : 'Cliente'}`, 20, 57);
    
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    let yPos = 63;
    doc.text(`Razão Social: ${entidade?.razaoSocial || '-'}`, 20, yPos);
    yPos += 4;
    doc.text(`Nome Fantasia: ${entidade?.nomeFantasia || '-'}`, 20, yPos);
    yPos += 4;
    doc.text(`CNPJ: ${entidade?.cnpj || '-'}`, 20, yPos);
    yPos += 4;
    
    const inscMunicipal = entidade?.inscricoes?.inscricaoMunicipal || entidade?.inscricaoMunicipal || '-';
    const inscEstadual = entidade?.inscricoes?.inscricaoEstadual || entidade?.inscricaoEstadual || '-';
    doc.text(`Insc. Municipal: ${inscMunicipal}  |  Insc. Estadual: ${inscEstadual}`, 20, yPos);
    yPos += 4;
    
    const logradouro = entidade?.endereco?.logradouro || '-';
    const numero = entidade?.endereco?.numero || '-';
    const complemento = entidade?.endereco?.complemento ? `, ${entidade.endereco.complemento}` : '';
    doc.text(`Endereço: ${logradouro}, ${numero}${complemento}`, 20, yPos);
    yPos += 4;
    
    const bairro = entidade?.endereco?.bairro || '-';
    doc.text(`Bairro: ${bairro}`, 20, yPos);
    yPos += 4;
    
    const cidade = entidade?.endereco?.cidade || '-';
    const estado = entidade?.endereco?.estado || '-';
    const cep = entidade?.endereco?.cep || '-';
    doc.text(`Cidade/UF: ${cidade}/${estado}  -  CEP: ${cep}`, 20, yPos);
    yPos += 4;
    
    const telefone = entidade?.contatos?.telefone || entidade?.telefone || '-';
    const email = entidade?.contatos?.email || entidade?.email || '-';
    doc.text(`Telefone: ${telefone}  |  E-mail: ${email}`, 20, yPos);
    yPos += 6;

    // Dados dos Centros de Custo (apenas nomes únicos)
    const centrosCustoData = ordensServico
      .map(item => {
        const os = item.ordemServico;
        return os.centroCusto || null;
      })
      .filter(Boolean);
    
    const centrosCustoUnicos = [...new Set(centrosCustoData)];
    
    if (centrosCustoUnicos.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(0, 91, 237);
      doc.setFont(undefined, 'bold');
      doc.text('Centros de Custo', 20, yPos);
      doc.setFont(undefined, 'normal');
      
      doc.setFontSize(9);
      doc.setTextColor(0);
      yPos += 5;
      centrosCustoUnicos.forEach((cc) => {
        doc.text(cc, 20, yPos);
        yPos += 4;
      });
      yPos += 2;
    }

    // Tabela de Ordens - Completa com Notas Fiscais
    const tableData = ordensServico.map(item => {
      const os = item.ordemServico;
      const entityName = fatura.tipo === 'Fornecedor' 
        ? (os.cliente?.razaoSocial || os.cliente?.nomeFantasia || '-')
        : (os.fornecedor?.razaoSocial || os.fornecedor?.nomeFantasia || '-');
      
      const nfPeca = os.notaFiscalPeca || '-';
      const nfServico = os.notaFiscalServico || '-';
      const nfs = nfPeca !== '-' && nfServico !== '-' && nfPeca !== nfServico 
        ? `P:${nfPeca} S:${nfServico}` 
        : (nfPeca !== '-' ? nfPeca : nfServico);
      
      return [
        os.numeroOrdemServico || '-',
        entityName,
        os.placa || '-',
        nfs,
        formatarValor(os.valorPecas || 0),
        `${formatarPercentual(os.descontoPecasPerc || 0)}%`,
        formatarValor(os.valorPecasComDesconto || 0),
        formatarValor(os.valorServico || 0),
        `${formatarPercentual(os.descontoServicoPerc || 0)}%`,
        formatarValor(os.valorServicoComDesconto || 0),
        formatarValor(os.valorFinal || 0)
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [[
        'Nº OS', 
        fatura.tipo === 'Fornecedor' ? 'Cliente' : 'Fornecedor', 
        'Placa',
        'NF',
        'Vlr Peças', 
        'Desc%', 
        'Vlr c/Desc', 
        'Vlr Serv.', 
        'Desc%', 
        'Vlr c/Desc', 
        'Total'
      ]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 28, 89], fontSize: 7, fontStyle: 'bold' },
      styles: { fontSize: 6.5, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 17 }, 1: { cellWidth: 32 }, 2: { cellWidth: 13 }, 3: { cellWidth: 15 },
        4: { cellWidth: 17 }, 5: { cellWidth: 11 }, 6: { cellWidth: 17 },
        7: { cellWidth: 17 }, 8: { cellWidth: 11 }, 9: { cellWidth: 17 }, 10: { cellWidth: 17 }
      }
    });

    // Resumo Financeiro com fórmula corrigida
    const afterTableY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO FINANCEIRO', 20, afterTableY);
    
    // Para Faturas Fornecedor: sempre considerar impostos se houver
    // Para Faturas Cliente: apenas se houver fornecedor não optante
    let valorImpostosExibir = 0;
    
    if (fatura.tipo === 'Fornecedor') {
      valorImpostosExibir = fatura.valorImpostos || 0;
    } else if (fatura.tipo === 'Cliente') {
      const temNaoOptante = ordensServico.some(item => 
        item.ordemServico.fornecedor?.naoOptanteSimples === true
      );
      valorImpostosExibir = temNaoOptante ? (fatura.valorImpostos || 0) : 0;
    }
    
    // Calcular valores separados por peças e serviços
    let valorTotalPecas = 0;
    let valorTotalServicos = 0;
    
    ordensServico.forEach(item => {
      valorTotalPecas += item.ordemServico.valorPecas || 0;
      valorTotalServicos += item.ordemServico.valorServico || 0;
    });
    
    // Calcular detalhamento de impostos para determinar altura do box
    const detalhamentoPreCalculo = calcularDetalhamentoImpostos();
    const totalLinhasDetalhamento = detalhamentoPreCalculo.detalhamento.reduce((acc, item) => {
      return acc + 1 + item.subitens.length; // título + subitens
    }, 0);
    
    // Altura do box: dinâmica baseada no detalhamento
    let alturaBox = 65; // Base
    if (detalhamentoPreCalculo.total > 0) {
      alturaBox = 85 + (totalLinhasDetalhamento * 3.5); // Adiciona espaço para cada linha
    }
    
    let finalY = afterTableY + 5;
    doc.setFillColor(248, 249, 250);
    doc.rect(20, finalY, 170, alturaBox, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.rect(20, finalY, 170, alturaBox);
    
    finalY += 6;
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    
    // Valor Total Peças
    doc.text('Valor Total Peças:', 25, finalY);
    doc.text(formatarValor(valorTotalPecas), 185, finalY, { align: 'right' });
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 7;
    
    // Valor Total Serviços
    doc.text('Valor Total Serviços:', 25, finalY);
    doc.text(formatarValor(valorTotalServicos), 185, finalY, { align: 'right' });
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 7;
    
    // Desconto Contrato
    doc.text('(-) Desconto Contrato:', 25, finalY);
    doc.text(formatarValor(fatura.valorDesconto || 0), 185, finalY, { align: 'right' });
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 7;
    
    // Valor com Desconto - Destacado
    doc.setFillColor(227, 242, 253);
    doc.rect(20, finalY - 4, 170, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Valor com Desconto:', 25, finalY);
    doc.text(formatarValor(fatura.valorComDesconto || 0), 185, finalY, { align: 'right' });
    doc.setDrawColor(0, 91, 237);
    doc.setLineWidth(1);
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 10;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    
    // Calcular detalhamento de impostos
    const detalhamentoImpostos = calcularDetalhamentoImpostos();
    const valorImpostosCalculado = detalhamentoImpostos.total || valorImpostosExibir;
    
    // Impostos & Retenções com detalhamento
    const valorAposImpostos = (fatura.valorComDesconto || 0) - valorImpostosCalculado;
    
    if (valorImpostosCalculado > 0) {
      doc.text('(-) Impostos & Retenções:', 25, finalY);
      doc.text(formatarValor(valorImpostosCalculado), 185, finalY, { align: 'right' });
      doc.line(20, finalY + 2, 190, finalY + 2);
      finalY += 7;
      
      // Detalhamento dos impostos
      if (detalhamentoImpostos.detalhamento.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        detalhamentoImpostos.detalhamento.forEach(item => {
          doc.text(`  ${item.titulo}: ${formatarValor(item.valor)}`, 30, finalY);
          finalY += 4;
          
          item.subitens.forEach(sub => {
            doc.text(`    • ${sub.texto}`, 35, finalY);
            finalY += 3.5;
          });
          finalY += 1;
        });
        doc.setFontSize(9);
        doc.setTextColor(0);
        finalY += 2;
      }
      
      // Valor após Impostos & Retenções
      doc.setFont(undefined, 'bold');
      doc.text('Valor após Impostos & Retenções:', 25, finalY);
      doc.text(formatarValor(valorAposImpostos), 185, finalY, { align: 'right' });
      doc.line(20, finalY + 2, 190, finalY + 2);
      finalY += 7;
      doc.setFont(undefined, 'normal');
    }
    
    // Taxa de Operação
    doc.text(`${getTextoTaxaOperacao()}:`, 25, finalY);
    doc.text(formatarValor(fatura.valorTaxasOperacao || 0), 185, finalY, { align: 'right' });
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 10;
    
    // Valor Devido - Final destacado (fórmula: Valor após Impostos - Taxa Operação)
    const valorDevidoCorreto = valorAposImpostos - (fatura.valorTaxasOperacao || 0);
    doc.setFillColor(0, 91, 237);
    doc.rect(20, finalY, 170, 10, 'F');
    doc.setDrawColor(0, 91, 237);
    doc.setLineWidth(1);
    doc.rect(20, finalY, 170, 10);
    
    finalY += 7;
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('VALOR DEVIDO:', 25, finalY);
    doc.text(formatarValor(valorDevidoCorreto), 185, finalY, { align: 'right' });

    doc.save(`${fatura.numeroFatura}_completa.pdf`);
    toast.success('PDF completo gerado com sucesso!');
  };

  const imprimirPecas = () => {
    if (!fatura) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const entidade = fatura.tipo === 'Fornecedor' ? fatura.fornecedor : fatura.cliente;

    // Cabeçalho - InstaSolutions
    doc.setFontSize(16);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('InstaSolutions Produtos e Gestão Empresarial LTDA', 105, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    doc.text('CNPJ: 47.611.398/0001-66', 105, 21, { align: 'center' });
    doc.text('Telefone: (11) 5118-3784 | WhatsApp: (67) 98218-2448', 105, 26, { align: 'center' });
    doc.text('Alameda Rio Negro, N° 1030, Escritório 2304 - Alphaville Industrial, Barueri - SP', 105, 31, { align: 'center' });
    
    // Linha separadora
    doc.setDrawColor(37, 28, 89);
    doc.setLineWidth(0.5);
    doc.line(20, 34, 190, 34);

    // Título
    doc.setFontSize(14);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('FATURA DE SERVIÇOS - SOMENTE PEÇAS', 105, 42, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    doc.text(`Fatura Nº: ${fatura.numeroFatura}`, 20, 49);
    doc.text(`Data: ${formatarData(fatura.createdAt)}`, 190, 49, { align: 'right' });

    // Dados do Cliente/Fornecedor - COMPLETOS
    doc.setFontSize(11);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text(`Dados do ${fatura.tipo === 'Fornecedor' ? 'Fornecedor' : 'Cliente'}`, 20, 57);
    
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    let yPos = 63;
    doc.text(`Razão Social: ${entidade?.razaoSocial || '-'}`, 20, yPos);
    yPos += 4;
    doc.text(`Nome Fantasia: ${entidade?.nomeFantasia || '-'}`, 20, yPos);
    yPos += 4;
    doc.text(`CNPJ: ${entidade?.cnpj || '-'}`, 20, yPos);
    yPos += 4;
    
    const inscMunicipal = entidade?.inscricoes?.inscricaoMunicipal || entidade?.inscricaoMunicipal || '-';
    const inscEstadual = entidade?.inscricoes?.inscricaoEstadual || entidade?.inscricaoEstadual || '-';
    doc.text(`Insc. Municipal: ${inscMunicipal}  |  Insc. Estadual: ${inscEstadual}`, 20, yPos);
    yPos += 4;
    
    const logradouro = entidade?.endereco?.logradouro || '-';
    const numero = entidade?.endereco?.numero || '-';
    const complemento = entidade?.endereco?.complemento ? `, ${entidade.endereco.complemento}` : '';
    doc.text(`Endereço: ${logradouro}, ${numero}${complemento}`, 20, yPos);
    yPos += 4;
    
    const bairro = entidade?.endereco?.bairro || '-';
    doc.text(`Bairro: ${bairro}`, 20, yPos);
    yPos += 4;
    
    const cidade = entidade?.endereco?.cidade || '-';
    const estado = entidade?.endereco?.estado || '-';
    const cep = entidade?.endereco?.cep || '-';
    doc.text(`Cidade/UF: ${cidade}/${estado}  -  CEP: ${cep}`, 20, yPos);
    yPos += 4;
    
    const telefone = entidade?.contatos?.telefone || entidade?.telefone || '-';
    const email = entidade?.contatos?.email || entidade?.email || '-';
    doc.text(`Telefone: ${telefone}  |  E-mail: ${email}`, 20, yPos);
    yPos += 6;

    // Dados dos Centros de Custo (apenas nomes únicos)
    const centrosCustoData = ordensServico
      .filter(item => (item.ordemServico.valorPecasComDesconto || 0) > 0)
      .map(item => {
        const os = item.ordemServico;
        return os.centroCusto || null;
      })
      .filter(Boolean);
    
    const centrosCustoUnicos = [...new Set(centrosCustoData)];
    
    if (centrosCustoUnicos.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(0, 91, 237);
      doc.setFont(undefined, 'bold');
      doc.text('Centros de Custo', 20, yPos);
      doc.setFont(undefined, 'normal');
      
      doc.setFontSize(9);
      doc.setTextColor(0);
      yPos += 5;
      centrosCustoUnicos.forEach((cc) => {
        doc.text(cc, 20, yPos);
        yPos += 4;
      });
      yPos += 2;
    }

    // Tabela de Ordens - Somente Peças (filtra OS com valor zerado)
    const tableData = ordensServico
      .filter(item => (item.ordemServico.valorPecasComDesconto || 0) > 0)
      .map(item => {
        const os = item.ordemServico;
        const entityName = fatura.tipo === 'Fornecedor' 
          ? (os.cliente?.razaoSocial || os.cliente?.nomeFantasia || '-')
          : (os.fornecedor?.razaoSocial || os.fornecedor?.nomeFantasia || '-');
        
        return [
          os.numeroOrdemServico || '-',
          entityName,
          os.placa || '-',
          os.notaFiscalPeca || '-',
          formatarValor(os.valorPecas || 0),
          `${formatarPercentual(os.descontoPecasPerc || 0)}%`,
          formatarValor(os.valorPecasComDesconto || 0)
        ];
      });

    autoTable(doc, {
      startY: yPos,
      head: [[
        'Nº OS', 
        fatura.tipo === 'Fornecedor' ? 'Cliente' : 'Fornecedor', 
        'Placa',
        'Nota Fiscal',
        'Valor Peças', 
        'Desconto %', 
        'Valor c/ Desconto'
      ]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 28, 89], fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 22 }, 1: { cellWidth: 50 }, 2: { cellWidth: 18 },
        3: { cellWidth: 25 }, 4: { cellWidth: 20 }, 5: { cellWidth: 15 }, 6: { cellWidth: 24 }
      }
    });

    // Resumo Financeiro com cálculos proporcionais para PEÇAS
    const afterTableY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO FINANCEIRO', 20, afterTableY);
    
    let finalY = afterTableY + 5;
    
    const valorPecasTotal = ordensServico.reduce((sum, item) => sum + (item.ordemServico.valorPecas || 0), 0);
    const valorPecasDesconto = ordensServico.reduce((sum, item) => sum + (item.ordemServico.valorPecasComDesconto || 0), 0);
    const descontoTotal = valorPecasTotal - valorPecasDesconto;
    
    // Calcular proporção de peças em relação ao total
    const valorTotalFatura = fatura.valorComDesconto || 1;
    const proporcaoPecas = valorPecasDesconto / valorTotalFatura;
    
    // Calcular impostos detalhados apenas para peças
    const detalhamentoImpostosPecas = calcularDetalhamentoImpostosPecas();
    const impostosPecas = detalhamentoImpostosPecas.total;
    
    const valorAposImpostos = valorPecasDesconto - impostosPecas;
    const taxaOperacaoPecas = (fatura.valorTaxasOperacao || 0) * proporcaoPecas;
    const valorDevidoPecas = valorAposImpostos - taxaOperacaoPecas;
    
    // Calcular altura do box dinamicamente
    const totalLinhasDetalhamento = detalhamentoImpostosPecas.detalhamento.reduce((acc, item) => {
      return acc + 1 + item.subitens.length;
    }, 0);
    const alturaBox = impostosPecas > 0 ? (65 + (totalLinhasDetalhamento * 3.5)) : 45;
    doc.setFillColor(248, 249, 250);
    doc.rect(20, finalY, 170, alturaBox, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.rect(20, finalY, 170, alturaBox);
    
    finalY += 6;
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    
    doc.text('Valor Total Peças:', 25, finalY);
    doc.text(formatarValor(valorPecasTotal), 185, finalY, { align: 'right' });
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 7;
    
    doc.text('(-) Desconto Contrato:', 25, finalY);
    doc.text(formatarValor(descontoTotal), 185, finalY, { align: 'right' });
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 7;
    
    doc.setFillColor(227, 242, 253);
    doc.rect(20, finalY - 4, 170, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.text('Valor com Desconto:', 25, finalY);
    doc.text(formatarValor(valorPecasDesconto), 185, finalY, { align: 'right' });
    doc.setDrawColor(0, 91, 237);
    doc.setLineWidth(1);
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 10;
    
    doc.setFont(undefined, 'normal');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    
    if (impostosPecas > 0) {
      doc.text('(-) Impostos & Retenções:', 25, finalY);
      doc.text(formatarValor(impostosPecas), 185, finalY, { align: 'right' });
      doc.line(20, finalY + 2, 190, finalY + 2);
      finalY += 7;
      
      // Detalhamento dos impostos
      if (detalhamentoImpostosPecas.detalhamento.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        detalhamentoImpostosPecas.detalhamento.forEach(item => {
          doc.text(`  ${item.titulo}: ${formatarValor(item.valor)}`, 30, finalY);
          finalY += 4;
          
          item.subitens.forEach(sub => {
            doc.text(`    • ${sub.texto}`, 35, finalY);
            finalY += 3.5;
          });
          finalY += 1;
        });
        doc.setFontSize(9);
        doc.setTextColor(0);
        finalY += 2;
      }
      
      // Valor após Impostos & Retenções
      doc.setFont(undefined, 'bold');
      doc.text('Valor após Impostos & Retenções:', 25, finalY);
      doc.text(formatarValor(valorAposImpostos), 185, finalY, { align: 'right' });
      doc.line(20, finalY + 2, 190, finalY + 2);
      finalY += 7;
      doc.setFont(undefined, 'normal');
    }
    
    doc.text(`${getTextoTaxaOperacao()}:`, 25, finalY);
    doc.text(formatarValor(taxaOperacaoPecas), 185, finalY, { align: 'right' });
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 10;
    
    doc.setFillColor(0, 91, 237);
    doc.rect(20, finalY, 170, 10, 'F');
    finalY += 7;
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('VALOR DEVIDO:', 25, finalY);
    doc.text(formatarValor(valorDevidoPecas), 185, finalY, { align: 'right' });

    doc.save(`${fatura.numeroFatura}_pecas.pdf`);
    toast.success('PDF de peças gerado com sucesso!');
  };

  const imprimirServicos = () => {
    if (!fatura) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const entidade = fatura.tipo === 'Fornecedor' ? fatura.fornecedor : fatura.cliente;

    // Cabeçalho - InstaSolutions
    doc.setFontSize(16);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('InstaSolutions Produtos e Gestão Empresarial LTDA', 105, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    doc.text('CNPJ: 47.611.398/0001-66', 105, 21, { align: 'center' });
    doc.text('Telefone: (11) 5118-3784 | WhatsApp: (67) 98218-2448', 105, 26, { align: 'center' });
    doc.text('Alameda Rio Negro, N° 1030, Escritório 2304 - Alphaville Industrial, Barueri - SP', 105, 31, { align: 'center' });
    
    // Linha separadora
    doc.setDrawColor(37, 28, 89);
    doc.setLineWidth(0.5);
    doc.line(20, 34, 190, 34);

    // Título
    doc.setFontSize(14);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('FATURA DE SERVIÇOS - SOMENTE SERVIÇOS', 105, 42, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    doc.text(`Fatura Nº: ${fatura.numeroFatura}`, 20, 49);
    doc.text(`Data: ${formatarData(fatura.createdAt)}`, 190, 49, { align: 'right' });

    // Dados do Cliente/Fornecedor - COMPLETOS
    doc.setFontSize(11);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text(`Dados do ${fatura.tipo === 'Fornecedor' ? 'Fornecedor' : 'Cliente'}`, 20, 57);
    
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    let yPos = 63;
    doc.text(`Razão Social: ${entidade?.razaoSocial || '-'}`, 20, yPos);
    yPos += 4;
    doc.text(`Nome Fantasia: ${entidade?.nomeFantasia || '-'}`, 20, yPos);
    yPos += 4;
    doc.text(`CNPJ: ${entidade?.cnpj || '-'}`, 20, yPos);
    yPos += 4;
    
    const inscMunicipal = entidade?.inscricoes?.inscricaoMunicipal || entidade?.inscricaoMunicipal || '-';
    const inscEstadual = entidade?.inscricoes?.inscricaoEstadual || entidade?.inscricaoEstadual || '-';
    doc.text(`Insc. Municipal: ${inscMunicipal}  |  Insc. Estadual: ${inscEstadual}`, 20, yPos);
    yPos += 4;
    
    const logradouro = entidade?.endereco?.logradouro || '-';
    const numero = entidade?.endereco?.numero || '-';
    const complemento = entidade?.endereco?.complemento ? `, ${entidade.endereco.complemento}` : '';
    doc.text(`Endereço: ${logradouro}, ${numero}${complemento}`, 20, yPos);
    yPos += 4;
    
    const bairro = entidade?.endereco?.bairro || '-';
    doc.text(`Bairro: ${bairro}`, 20, yPos);
    yPos += 4;
    
    const cidade = entidade?.endereco?.cidade || '-';
    const estado = entidade?.endereco?.estado || '-';
    const cep = entidade?.endereco?.cep || '-';
    doc.text(`Cidade/UF: ${cidade}/${estado}  -  CEP: ${cep}`, 20, yPos);
    yPos += 4;
    
    const telefone = entidade?.contatos?.telefone || entidade?.telefone || '-';
    const email = entidade?.contatos?.email || entidade?.email || '-';
    doc.text(`Telefone: ${telefone}  |  E-mail: ${email}`, 20, yPos);
    yPos += 6;

    // Dados dos Centros de Custo (apenas nomes únicos)
    const centrosCustoData = ordensServico
      .filter(item => (item.ordemServico.valorServicoComDesconto || 0) > 0)
      .map(item => {
        const os = item.ordemServico;
        return os.centroCusto || null;
      })
      .filter(Boolean);
    
    const centrosCustoUnicos = [...new Set(centrosCustoData)];
    
    if (centrosCustoUnicos.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(0, 91, 237);
      doc.setFont(undefined, 'bold');
      doc.text('Centros de Custo', 20, yPos);
      doc.setFont(undefined, 'normal');
      
      doc.setFontSize(9);
      doc.setTextColor(0);
      yPos += 5;
      centrosCustoUnicos.forEach((cc) => {
        doc.text(cc, 20, yPos);
        yPos += 4;
      });
      yPos += 2;
    }

    // Tabela de Ordens - Somente Serviços (filtra OS com valor zerado)
    const tableData = ordensServico
      .filter(item => (item.ordemServico.valorServicoComDesconto || 0) > 0)
      .map(item => {
        const os = item.ordemServico;
        const entityName = fatura.tipo === 'Fornecedor' 
          ? (os.cliente?.razaoSocial || os.cliente?.nomeFantasia || '-')
          : (os.fornecedor?.razaoSocial || os.fornecedor?.nomeFantasia || '-');
        
        return [
          os.numeroOrdemServico || '-',
          entityName,
          os.placa || '-',
          os.notaFiscalServico || '-',
          formatarValor(os.valorServico || 0),
          `${formatarPercentual(os.descontoServicoPerc || 0)}%`,
          formatarValor(os.valorServicoComDesconto || 0)
        ];
      });

    autoTable(doc, {
      startY: yPos,
      head: [[
        'Nº OS', 
        fatura.tipo === 'Fornecedor' ? 'Cliente' : 'Fornecedor', 
        'Placa',
        'Nota Fiscal',
        'Valor Serviços', 
        'Desconto %', 
        'Valor c/ Desconto'
      ]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 28, 89], fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 22 }, 1: { cellWidth: 50 }, 2: { cellWidth: 18 },
        3: { cellWidth: 25 }, 4: { cellWidth: 20 }, 5: { cellWidth: 15 }, 6: { cellWidth: 24 }
      }
    });

    // Resumo Financeiro com cálculos proporcionais para SERVIÇOS
    const afterTableY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setTextColor(37, 28, 89);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO FINANCEIRO', 20, afterTableY);
    
    let finalY = afterTableY + 5;
    
    const valorServicosTotal = ordensServico.reduce((sum, item) => sum + (item.ordemServico.valorServico || 0), 0);
    const valorServicosDesconto = ordensServico.reduce((sum, item) => sum + (item.ordemServico.valorServicoComDesconto || 0), 0);
    const descontoTotal = valorServicosTotal - valorServicosDesconto;
    
    // Calcular proporção de serviços em relação ao total
    const valorTotalFatura = fatura.valorComDesconto || 1;
    const proporcaoServicos = valorServicosDesconto / valorTotalFatura;
    
    // Calcular impostos detalhados apenas para serviços
    const detalhamentoImpostosServicos = calcularDetalhamentoImpostosServicos();
    const impostosServicos = detalhamentoImpostosServicos.total;
    
    const valorAposImpostos = valorServicosDesconto - impostosServicos;
    const taxaOperacaoServicos = (fatura.valorTaxasOperacao || 0) * proporcaoServicos;
    const valorDevidoServicos = valorAposImpostos - taxaOperacaoServicos;
    
    // Calcular altura do box dinamicamente
    const totalLinhasDetalhamento = detalhamentoImpostosServicos.detalhamento.reduce((acc, item) => {
      return acc + 1 + item.subitens.length;
    }, 0);
    const alturaBox = impostosServicos > 0 ? (65 + (totalLinhasDetalhamento * 3.5)) : 45;
    doc.setFillColor(248, 249, 250);
    doc.rect(20, finalY, 170, alturaBox, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.rect(20, finalY, 170, alturaBox);
    
    finalY += 6;
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
    
    doc.text('Valor Total Serviços:', 25, finalY);
    doc.text(formatarValor(valorServicosTotal), 185, finalY, { align: 'right' });
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 7;
    
    doc.text('(-) Desconto Contrato:', 25, finalY);
    doc.text(formatarValor(descontoTotal), 185, finalY, { align: 'right' });
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 7;
    
    doc.setFillColor(227, 242, 253);
    doc.rect(20, finalY - 4, 170, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.text('Valor com Desconto:', 25, finalY);
    doc.text(formatarValor(valorServicosDesconto), 185, finalY, { align: 'right' });
    doc.setDrawColor(0, 91, 237);
    doc.setLineWidth(1);
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 10;
    
    doc.setFont(undefined, 'normal');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    
    if (impostosServicos > 0) {
      doc.text('(-) Impostos & Retenções:', 25, finalY);
      doc.text(formatarValor(impostosServicos), 185, finalY, { align: 'right' });
      doc.line(20, finalY + 2, 190, finalY + 2);
      finalY += 7;
      
      // Detalhamento dos impostos
      if (detalhamentoImpostosServicos.detalhamento.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        detalhamentoImpostosServicos.detalhamento.forEach(item => {
          doc.text(`  ${item.titulo}: ${formatarValor(item.valor)}`, 30, finalY);
          finalY += 4;
          
          item.subitens.forEach(sub => {
            doc.text(`    • ${sub.texto}`, 35, finalY);
            finalY += 3.5;
          });
          finalY += 1;
        });
        doc.setFontSize(9);
        doc.setTextColor(0);
        finalY += 2;
      }
      
      // Valor após Impostos & Retenções
      doc.setFont(undefined, 'bold');
      doc.text('Valor após Impostos & Retenções:', 25, finalY);
      doc.text(formatarValor(valorAposImpostos), 185, finalY, { align: 'right' });
      doc.line(20, finalY + 2, 190, finalY + 2);
      finalY += 7;
      doc.setFont(undefined, 'normal');
    }
    
    doc.text(`${getTextoTaxaOperacao()}:`, 25, finalY);
    doc.text(formatarValor(taxaOperacaoServicos), 185, finalY, { align: 'right' });
    doc.line(20, finalY + 2, 190, finalY + 2);
    finalY += 10;
    
    doc.setFillColor(0, 91, 237);
    doc.rect(20, finalY, 170, 10, 'F');
    finalY += 7;
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('VALOR DEVIDO:', 25, finalY);
    doc.text(formatarValor(valorDevidoServicos), 185, finalY, { align: 'right' });

    doc.save(`${fatura.numeroFatura}_servicos.pdf`);
    toast.success('PDF de serviços gerado com sucesso!');
  };

  if (loading) {
    return (
      <div className="page-container">
        <Header user={user} />
        <div className="content-wrapper">
          <Sidebar user={user} />
          <main className="main-content">
            <div className="loading">Carregando fatura...</div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  if (!fatura) {
    return null;
  }

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="faturado-detalhes-container">
            {/* Cabeçalho */}
            <div className="page-header">
              <button className="btn-voltar" onClick={() => navigate('/faturados')}>
                ← Voltar
              </button>
              <div>
                <h1>Fatura {fatura.numeroFatura}</h1>
                <p>
                  {fatura.tipo === 'Fornecedor' 
                    ? fatura.fornecedor?.razaoSocial || fatura.fornecedor?.nomeFantasia
                    : fatura.cliente?.razaoSocial || fatura.cliente?.nomeFantasia
                  }
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span className={getStatusBadgeClass(fatura.statusFatura)}>
                  {fatura.statusFatura}
                </span>
                {!isReadOnly && (
                  <button 
                    className="btn-excluir-fatura" 
                    onClick={handleExcluirFatura}
                    title="Excluir fatura"
                  >
                    🗑️ Excluir
                  </button>
                )}
              </div>
            </div>

            {/* Informações da fatura */}
            <div className="fatura-info-card">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Período Apurado:</span>
                  <span className="info-value">
                    {formatarData(fatura.periodoInicio)} - {formatarData(fatura.periodoFim)}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Data de Criação:</span>
                  <span className="info-value">{formatarData(fatura.createdAt)}</span>
                </div>
                
                {/* Campo de Previsão de Recebimento - apenas para faturas de fornecedor */}
                {fatura.tipo === 'Fornecedor' && (
                  <div className="info-item info-item-full">
                    <span className="info-label">Previsão de Recebimento:</span>
                    {editandoPrevisao && !isReadOnly ? (
                      <div className="previsao-edit-group">
                        <input
                          type="date"
                          value={previsaoRecebimento}
                          onChange={(e) => setPrevisaoRecebimento(e.target.value)}
                          className="input-previsao"
                        />
                        <button onClick={handleSalvarPrevisao} className="btn-salvar-mini">
                          ✓
                        </button>
                        <button onClick={handleCancelarPrevisao} className="btn-cancelar-mini">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="previsao-display-group">
                        <span className="info-value">
                          {previsaoRecebimento ? formatarData(previsaoRecebimento) : 'Não definida'}
                        </span>
                        {!isReadOnly && (
                          <button 
                            onClick={() => setEditandoPrevisao(true)} 
                            className="btn-editar-mini"
                            title="Editar previsão"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Campo de Data de Vencimento - apenas para faturas de cliente */}
                {fatura.tipo === 'Cliente' && (
                  <div className="info-item info-item-full">
                    <span className="info-label">Data de Vencimento:</span>
                    {editandoVencimento && !isReadOnly ? (
                      <div className="previsao-edit-group">
                        <input
                          type="date"
                          value={dataVencimento}
                          onChange={(e) => setDataVencimento(e.target.value)}
                          className="input-previsao"
                        />
                        <button onClick={handleSalvarVencimento} className="btn-salvar-mini">
                          ✓
                        </button>
                        <button onClick={handleCancelarVencimento} className="btn-cancelar-mini">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="previsao-display-group">
                        <span className="info-value">
                          {dataVencimento ? formatarData(dataVencimento) : 'Não definida'}
                        </span>
                        {!isReadOnly && (
                          <button 
                            onClick={() => setEditandoVencimento(true)} 
                            className="btn-editar-mini"
                            title="Editar vencimento"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Filtros */}
            <div className="filtros-card">
              <h3>Ordens de Serviço da Fatura</h3>
              <div className="filtros-grid">
                <div className="filtro-group">
                  <input
                    type="text"
                    name="busca"
                    value={filtros.busca}
                    onChange={handleFiltroChange}
                    placeholder="Buscar por nº ordem ou código..."
                  />
                </div>
                <div className="filtro-group">
                  <select
                    name="status"
                    value={filtros.status}
                    onChange={handleFiltroChange}
                  >
                    <option value="">Todos os status</option>
                    <option value="Aguardando pagamento">Aguardando pagamento</option>
                    <option value="Paga">Paga</option>
                  </select>
                </div>
                {!isReadOnly && (
                  <div className="filtro-group">
                    <button
                      className="btn-selecionar-todas"
                      onClick={handleSelecionarTodas}
                    >
                      {selecionadas.length === ordensServico.filter(os => os.statusPagamento === 'Aguardando pagamento').length
                        ? 'Desmarcar Todas'
                        : 'Selecionar Todas Pendentes'
                      }
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tabela de ordens de serviço */}
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}></th>
                    <th>Código</th>
                    <th>Nº OS</th>
                    <th>{fatura.tipo === 'Fornecedor' ? 'Cliente' : 'Fornecedor'}</th>
                    <th>Tipo</th>
                    <th>Valor Bruto</th>
                    <th>Valor Líquido</th>
                    <th>Status</th>
                    <th>Data Pagamento</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ordemFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>
                        Nenhuma ordem de serviço encontrada
                      </td>
                    </tr>
                  ) : (
                    ordemFiltradas.map(item => {
                      const os = item.ordemServico;
                      const isPaga = item.statusPagamento === 'Paga';
                      // Calcular valor líquido proporcional para esta OS
                      const valorLiquidoOS = Math.round((item.valorOS || 0) * fatorLiquido * 100) / 100;
                      
                      return (
                        <tr key={os._id} className={isPaga ? 'row-paga' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selecionadas.includes(os._id)}
                              onChange={() => handleSelecionar(os._id)}
                              disabled={isPaga || isReadOnly}
                            />
                          </td>
                          <td><strong>{os.codigo}</strong></td>
                          <td>{os.numeroOrdemServico}</td>
                          <td>
                            {fatura.tipo === 'Fornecedor' 
                              ? (os.cliente?.razaoSocial || os.cliente?.nomeFantasia)
                              : (os.fornecedor?.razaoSocial || os.fornecedor?.nomeFantasia)
                            }
                          </td>
                          <td>{os.tipo?.nome}</td>
                          <td>{formatarValor(item.valorOS || 0)}</td>
                          <td>
                            <span className="valor-liquido" title="Valor após descontar impostos e taxas proporcionais">
                              {formatarValor(valorLiquidoOS)}
                            </span>
                          </td>
                          <td>
                            <span className={getStatusBadgeClass(item.statusPagamento)}>
                              {item.statusPagamento}
                            </span>
                          </td>
                          <td>{formatarData(item.dataPagamento)}</td>
                          <td>
                            {!isPaga && !isReadOnly && (
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleRemoverOS(os._id)}
                                title="Remover da fatura"
                              >
                                🗑️
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumo das OS Selecionadas */}
            {resumoSelecionadas && resumoSelecionadas.quantidade > 0 && (
              <div className="resumo-selecionadas">
                <h4>📋 Resumo das {resumoSelecionadas.quantidade} OS Selecionada{resumoSelecionadas.quantidade > 1 ? 's' : ''}</h4>
                <div className="resumo-selecionadas-grid">
                  <div className="resumo-item">
                    <span>Valor Bruto:</span>
                    <strong>{formatarValor(resumoSelecionadas.valorBruto)}</strong>
                  </div>
                  <div className="resumo-item negativo">
                    <span>(-) Taxas Proporcionais:</span>
                    <span>{formatarValor(resumoSelecionadas.taxasProporcional)}</span>
                  </div>
                  <div className="resumo-item destaque">
                    <span>Valor Líquido a Pagar:</span>
                    <strong>{formatarValor(resumoSelecionadas.valorLiquido)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo Financeiro */}
            <div className="resumo-financeiro">
              <h3>Resumo Financeiro</h3>
              <div className="resumo-grid">
                {(() => {
                  // Calcular valores separados por peças e serviços
                  let valorTotalPecas = 0;
                  let valorTotalServicos = 0;
                  
                  ordensServico.forEach(item => {
                    valorTotalPecas += item.ordemServico.valorPecas || 0;
                    valorTotalServicos += item.ordemServico.valorServico || 0;
                  });
                  
                  // Calcular detalhamento de impostos primeiro
                  const detalhamentoImpostos = calcularDetalhamentoImpostos();
                  
                  // Usar o valor calculado dinamicamente em vez do salvo no banco
                  // Isso permite ver o detalhamento mesmo em faturas antigas
                  const valorImpostosExibir = detalhamentoImpostos.total || (fatura.valorImpostos || 0);
                  
                  const valorAposImpostos = (fatura.valorComDesconto || 0) - valorImpostosExibir;
                  
                  return (
                    <>
                      <div className="resumo-linha">
                        <span>Valor Total Peças:</span>
                        <strong>{formatarValor(valorTotalPecas)}</strong>
                      </div>
                      <div className="resumo-linha">
                        <span>Valor Total Serviços:</span>
                        <strong>{formatarValor(valorTotalServicos)}</strong>
                      </div>
                      <div className="resumo-linha">
                        <span>(-) Desconto Contrato:</span>
                        <span className="valor-negativo">{formatarValor(fatura.valorDesconto || 0)}</span>
                      </div>
                      <div className="resumo-linha destaque">
                        <span>Valor com Desconto:</span>
                        <strong>{formatarValor(fatura.valorComDesconto || 0)}</strong>
                      </div>
                      {valorImpostosExibir > 0 && (
                        <>
                          <div className="resumo-linha">
                            <span>(-) Impostos & Retenções:</span>
                            <span className="valor-negativo">{formatarValor(valorImpostosExibir)}</span>
                          </div>
                          {detalhamentoImpostos.detalhamento.map((item, idx) => (
                            <div key={idx} style={{ marginLeft: '20px', fontSize: '0.9em', color: '#666' }}>
                              <div style={{ marginTop: '8px', fontWeight: '500' }}>
                                {item.titulo}: {formatarValor(item.valor)}
                              </div>
                              {item.subitens.map((sub, subIdx) => (
                                <div key={subIdx} style={{ marginLeft: '15px', fontSize: '0.85em', color: '#888', marginTop: '3px' }}>
                                  • {sub.texto}
                                </div>
                              ))}
                            </div>
                          ))}
                          <div className="resumo-linha destaque">
                            <span>Valor após Impostos & Retenções:</span>
                            <strong>{formatarValor(valorAposImpostos)}</strong>
                          </div>
                        </>
                      )}
                      {(fatura.valorTaxasOperacao || 0) > 0 && (
                        <div className="resumo-linha">
                          <span>{getTextoTaxaOperacao()}:</span>
                          <span className="valor-negativo">{formatarValor(fatura.valorTaxasOperacao || 0)}</span>
                        </div>
                      )}
                      <div className="resumo-linha destaque-total">
                        <span>VALOR DEVIDO:</span>
                        <strong>{formatarValor(fatura.valorDevido || 0)}</strong>
                      </div>
                      <div className="resumo-linha pago">
                        <span>Valor Pago:</span>
                        <strong>{formatarValor(fatura.valorPago || 0)}</strong>
                      </div>
                      <div className="resumo-linha restante">
                        <span>Valor Restante:</span>
                        <strong>{formatarValor(fatura.valorRestante || 0)}</strong>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Botões de ação */}
            <div className="acoes-footer">
              <button
                className="btn-secondary"
                onClick={() => navigate('/faturados')}
              >
                Fechar
              </button>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {fatura.tipo === 'Cliente' ? (
                  // Fatura de Cliente: mostrar os 3 botões
                  <>
                    <button
                      className="btn-info"
                      onClick={imprimirCompleta}
                      title="Imprimir fatura completa"
                    >
                      🖨️ Fatura Completa
                    </button>
                    <button
                      className="btn-info"
                      onClick={imprimirPecas}
                      title="Imprimir somente peças"
                    >
                      🖨️ Somente Peças
                    </button>
                    <button
                      className="btn-info"
                      onClick={imprimirServicos}
                      title="Imprimir somente serviços"
                    >
                      🖨️ Somente Serviços
                    </button>
                  </>
                ) : (
                  // Fatura de Fornecedor: apenas botão completo
                  <button
                    className="btn-info"
                    onClick={imprimirCompleta}
                    title="Imprimir fatura completa"
                  >
                    🖨️ Fatura Completa
                  </button>
                )}
                {!isReadOnly && (
                  <>
                    {osPendentes.length > 0 && (
                      <button
                        className="btn-success"
                        onClick={handlePagarFaturaInteira}
                        title={`Pagar todas as ${osPendentes.length} OS pendentes`}
                      >
                        💰 Pagar Fatura Inteira ({formatarValor(fatura.valorRestante || 0)})
                      </button>
                    )}
                    <button
                      className="btn-primary"
                      onClick={handleMarcarComoPagas}
                      disabled={selecionadas.length === 0}
                    >
                      Marcar como Paga{selecionadas.length > 1 ? 's' : ''} ({selecionadas.length})
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default FaturadoDetalhes;
