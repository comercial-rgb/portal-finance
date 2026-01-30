import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './NotasFiscaisClientes.css';

function NotasFiscaisClientes() {
  const [user, setUser] = useState(null);
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    numeroNotaFiscal: '',
    tipo: 'Geral',
    dataEmissao: '',
    dataVencimento: '',
    clienteId: '',
    centroCusto: '',
    subunidade: '',
    faturaId: '',
    valorDevido: '',
    observacoes: '',
    status: 'pendente'
  });

  const [filtros, setFiltros] = useState({
    clienteId: '',
    status: '',
    dataInicio: '',
    dataFim: ''
  });

  const notasPorPagina = 15;

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadNotasFiscais();
    loadClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadNotasFiscais = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notas-fiscais-clientes', {
        params: {
          page: currentPage,
          limit: notasPorPagina,
          ...filtros
        }
      });
      setNotasFiscais(response.data.notasFiscais || []);
      setTotalPages(response.data.totalPaginas || 1);
    } catch (error) {
      toast.error('Erro ao carregar notas fiscais');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    try {
      const response = await api.get('/clientes', {
        params: { limit: 1000 }
      });
      setClientes(response.data.clientes || response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadFaturasPorCliente = async (clienteId) => {
    if (!clienteId) {
      setFaturas([]);
      return;
    }
    try {
      const response = await api.get('/faturas', {
        params: { clienteId, limit: 500 }
      });
      setFaturas(response.data.faturas || response.data);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
      setFaturas([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Quando seleciona um cliente, carrega as faturas dele
    if (name === 'clienteId') {
      loadFaturasPorCliente(value);
      setFormData(prev => ({
        ...prev,
        faturaId: '',
        valorDevido: ''
      }));
    }

    // Quando seleciona uma fatura, preenche o valor automaticamente
    if (name === 'faturaId' && value) {
      const faturaSelecionada = faturas.find(f => f._id === value);
      if (faturaSelecionada) {
        setFormData(prev => ({
          ...prev,
          valorDevido: faturaSelecionada.valorTotal || ''
        }));
      }
    }

    // Calcular vencimento automático (30 dias após emissão)
    if (name === 'dataEmissao' && value) {
      const dataEmissaoObj = new Date(value);
      const dataVencimento = new Date(dataEmissaoObj);
      dataVencimento.setDate(dataVencimento.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        dataVencimento: dataVencimento.toISOString().split('T')[0]
      }));
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros({
      ...filtros,
      [name]: value
    });
  };

  const handleFiltrar = () => {
    setCurrentPage(1);
    loadNotasFiscais();
  };

  const handleLimparFiltros = () => {
    setFiltros({
      clienteId: '',
      status: '',
      dataInicio: '',
      dataFim: ''
    });
    setCurrentPage(1);
    setTimeout(() => loadNotasFiscais(), 100);
  };

  const handleOpenModal = (notaFiscal = null) => {
    if (notaFiscal) {
      setEditingId(notaFiscal._id);
      setFormData({
        numeroNotaFiscal: notaFiscal.numeroNotaFiscal || '',
        tipo: notaFiscal.tipo || 'Geral',
        dataEmissao: notaFiscal.dataEmissao ? notaFiscal.dataEmissao.split('T')[0] : '',
        dataVencimento: notaFiscal.dataVencimento ? notaFiscal.dataVencimento.split('T')[0] : '',
        clienteId: notaFiscal.clienteId?._id || '',
        centroCusto: notaFiscal.centroCusto || '',
        subunidade: notaFiscal.subunidade || '',
        faturaId: notaFiscal.faturaId?._id || '',
        valorDevido: notaFiscal.valorDevido || '',
        observacoes: notaFiscal.observacoes || '',
        status: notaFiscal.status || 'pendente'
      });
      if (notaFiscal.clienteId?._id) {
        loadFaturasPorCliente(notaFiscal.clienteId._id);
      }
    } else {
      setEditingId(null);
      setFormData({
        numeroNotaFiscal: '',
        tipo: 'Geral',
        dataEmissao: '',
        dataVencimento: '',
        clienteId: '',
        centroCusto: '',
        subunidade: '',
        faturaId: '',
        valorDevido: '',
        observacoes: '',
        status: 'pendente'
      });
      setFaturas([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      numeroNotaFiscal: '',
      tipo: 'Geral',
      dataEmissao: '',
      dataVencimento: '',
      clienteId: '',
      centroCusto: '',
      subunidade: '',
      faturaId: '',
      valorDevido: '',
      observacoes: '',
      status: 'pendente'
    });
    setFaturas([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações
    if (!formData.numeroNotaFiscal || !formData.clienteId || !formData.dataEmissao || !formData.valorDevido) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/notas-fiscais-clientes/${editingId}`, formData);
        toast.success('Nota fiscal atualizada com sucesso!');
      } else {
        await api.post('/notas-fiscais-clientes', formData);
        toast.success('Nota fiscal criada com sucesso!');
      }
      handleCloseModal();
      loadNotasFiscais();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar nota fiscal');
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta nota fiscal?')) {
      try {
        await api.delete(`/notas-fiscais-clientes/${id}`);
        toast.success('Nota fiscal excluída com sucesso!');
        loadNotasFiscais();
      } catch (error) {
        toast.error('Erro ao excluir nota fiscal');
      }
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pendente':
        return 'status-badge status-pendente';
      case 'pago':
        return 'status-badge status-pago';
      case 'vencido':
        return 'status-badge status-vencido';
      case 'cancelado':
        return 'status-badge status-cancelado';
      default:
        return 'status-badge';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'pago':
        return 'Pago';
      case 'vencido':
        return 'Vencido';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <div className="app-container">
      <Header user={user} />
      <div className="main-content">
        <Sidebar user={user} />
        <main className="content-area">
          <div className="page-header">
            <h1>Notas Fiscais Clientes</h1>
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              + Nova Nota Fiscal
            </button>
          </div>

          {/* Filtros */}
          <div className="filtros-container">
            <div className="filtros-grid">
              <div className="form-group">
                <label>Cliente</label>
                <select
                  name="clienteId"
                  value={filtros.clienteId}
                  onChange={handleFiltroChange}
                  className="form-control"
                >
                  <option value="">Todos os clientes</option>
                  {clientes.map(cliente => (
                    <option key={cliente._id} value={cliente._id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={filtros.status}
                  onChange={handleFiltroChange}
                  className="form-control"
                >
                  <option value="">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="vencido">Vencido</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="form-group">
                <label>Data Início</label>
                <input
                  type="date"
                  name="dataInicio"
                  value={filtros.dataInicio}
                  onChange={handleFiltroChange}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Data Fim</label>
                <input
                  type="date"
                  name="dataFim"
                  value={filtros.dataFim}
                  onChange={handleFiltroChange}
                  className="form-control"
                />
              </div>
            </div>

            <div className="filtros-actions">
              <button className="btn-secondary" onClick={handleFiltrar}>
                Filtrar
              </button>
              <button className="btn-outline" onClick={handleLimparFiltros}>
                Limpar
              </button>
            </div>
          </div>

          {/* Tabela */}
          <div className="table-container">
            {loading ? (
              <div className="loading">Carregando...</div>
            ) : notasFiscais.length === 0 ? (
              <div className="empty-state">
                <p>Nenhuma nota fiscal encontrada</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N° Nota</th>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Centro Custo</th>
                    <th>Subunidade</th>
                    <th>Data Emissão</th>
                    <th>Vencimento</th>
                    <th>Valor Devido</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {notasFiscais.map(nota => (
                    <tr key={nota._id}>
                      <td>{nota.numeroNotaFiscal}</td>
                      <td>{nota.clienteId?.nome || '-'}</td>
                      <td>{nota.tipo}</td>
                      <td>{nota.centroCusto || '-'}</td>
                      <td>{nota.subunidade || '-'}</td>
                      <td>{formatDate(nota.dataEmissao)}</td>
                      <td>{formatDate(nota.dataVencimento)}</td>
                      <td>{formatCurrency(nota.valorDevido)}</td>
                      <td>
                        <span className={getStatusBadgeClass(nota.status)}>
                          {getStatusLabel(nota.status)}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleOpenModal(nota)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(nota._id)}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-pagination"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <span className="pagination-info">
                Página {currentPage} de {totalPages}
              </span>
              <button
                className="btn-pagination"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>N° Nota Fiscal *</label>
                  <input
                    type="text"
                    name="numeroNotaFiscal"
                    value={formData.numeroNotaFiscal}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  >
                    <option value="Geral">Geral</option>
                    <option value="Peças">Peças</option>
                    <option value="Serviços">Serviços</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Cliente *</label>
                  <select
                    name="clienteId"
                    value={formData.clienteId}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map(cliente => (
                      <option key={cliente._id} value={cliente._id}>
                        {cliente.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Centro de Custo</label>
                  <input
                    type="text"
                    name="centroCusto"
                    value={formData.centroCusto}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Subunidade</label>
                  <input
                    type="text"
                    name="subunidade"
                    value={formData.subunidade}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Data Emissão *</label>
                  <input
                    type="date"
                    name="dataEmissao"
                    value={formData.dataEmissao}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Data Vencimento *</label>
                  <input
                    type="date"
                    name="dataVencimento"
                    value={formData.dataVencimento}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                  <small className="form-help">Calculado automaticamente (30 dias)</small>
                </div>

                <div className="form-group">
                  <label>Fatura (opcional)</label>
                  <select
                    name="faturaId"
                    value={formData.faturaId}
                    onChange={handleInputChange}
                    className="form-control"
                    disabled={!formData.clienteId}
                  >
                    <option value="">Selecione uma fatura (opcional)</option>
                    {faturas.map(fatura => (
                      <option key={fatura._id} value={fatura._id}>
                        {fatura.numeroFatura} - {formatCurrency(fatura.valorTotal)}
                      </option>
                    ))}
                  </select>
                  <small className="form-help">
                    {formData.clienteId ? 'Selecione para preencher o valor automaticamente' : 'Selecione um cliente primeiro'}
                  </small>
                </div>

                <div className="form-group">
                  <label>Valor Devido *</label>
                  <input
                    type="number"
                    name="valorDevido"
                    value={formData.valorDevido}
                    onChange={handleInputChange}
                    className="form-control"
                    step="0.01"
                    min="0"
                    required
                  />
                  <small className="form-help">
                    Preenchido automaticamente ao vincular fatura
                  </small>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="form-control"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="vencido">Vencido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="form-group form-group-full">
                  <label>Observações</label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleInputChange}
                    className="form-control"
                    rows="3"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default NotasFiscaisClientes;
