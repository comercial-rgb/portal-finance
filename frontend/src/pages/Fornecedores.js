import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './Fornecedores.css';

function Fornecedores() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const itensPorPagina = 50;
  
  const [filtros, setFiltros] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpjCpf: '',
    cidade: '',
    estado: ''
  });
  const [formData, setFormData] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpjCpf: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    email: '',
    telefone: '',
    banco: '',
    tipoConta: '',
    agencia: '',
    conta: '',
    chavePix: '',
    senha: '',
    naoOptanteSimples: false
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadFornecedores();
  }, []);

  useEffect(() => {
    loadFornecedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaAtual]);

  const loadFornecedores = async () => {
    try {
      setLoading(true);
      const response = await api.get('/fornecedores', {
        params: {
          ...filtros,
          page: paginaAtual,
          limit: itensPorPagina
        }
      });
      // A API retorna { fornecedores, totalPages, currentPage, total }
      const data = response.data;
      setFornecedores(Array.isArray(data) ? data : (data.fornecedores || []));
      setTotalPaginas(data.totalPages || 1);
      setTotalRegistros(data.total || 0);
    } catch (error) {
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
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
    setPaginaAtual(1);
    loadFornecedores();
  };

  const handleLimpar = () => {
    setFiltros({
      razaoSocial: '',
      nomeFantasia: '',
      cnpjCpf: '',
      cidade: '',
      estado: ''
    });
    setPaginaAtual(1);
    setTimeout(() => loadFornecedores(), 100);
  };

  const handleRelatorio = () => {
    toast.info('Funcionalidade de relatório em desenvolvimento');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      razaoSocial: '',
      nomeFantasia: '',
      cnpjCpf: '',
      endereco: '',
      bairro: '',
      cidade: '',
      estado: '',
      email: '',
      telefone: '',
      banco: '',
      tipoConta: '',
      agencia: '',
      conta: '',
      chavePix: '',
      senha: '',
      naoOptanteSimples: false
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await api.put(`/fornecedores/${editingId}`, formData);
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await api.post('/fornecedores', formData);
        toast.success('Fornecedor cadastrado com sucesso!');
      }
      
      setShowModal(false);
      resetForm();
      loadFornecedores();
    } catch (error) {
      toast.error(error.response?.data?.mensagem || 'Erro ao salvar fornecedor');
    }
  };

  const handleEdit = (fornecedor) => {
    setFormData({
      razaoSocial: fornecedor.razaoSocial || '',
      nomeFantasia: fornecedor.nomeFantasia || '',
      cnpjCpf: fornecedor.cnpjCpf || '',
      endereco: fornecedor.endereco || '',
      bairro: fornecedor.bairro || '',
      cidade: fornecedor.cidade || '',
      estado: fornecedor.estado || '',
      email: fornecedor.email || '',
      telefone: fornecedor.telefone || '',
      banco: fornecedor.banco || '',
      tipoConta: fornecedor.tipoConta || '',
      agencia: fornecedor.agencia || '',
      conta: fornecedor.conta || '',
      chavePix: fornecedor.chavePix || '',
      senha: '',
      naoOptanteSimples: fornecedor.naoOptanteSimples || false
    });
    setEditingId(fornecedor._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este fornecedor?')) {
      try {
        await api.delete(`/fornecedores/${id}`);
        toast.success('Fornecedor excluído com sucesso!');
        loadFornecedores();
      } catch (error) {
        toast.error('Erro ao excluir fornecedor');
      }
    }
  };

  const formatCNPJ = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatTelefone = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4,5})(\d{4})/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleCNPJCPFChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value.length <= 11 ? formatCPF(e.target.value) : formatCNPJ(e.target.value);
    setFormData({ ...formData, cnpjCpf: formatted });
  };

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="fornecedores-container">
            <div className="page-header">
              <div>
                <h1>Fornecedores</h1>
                <p>Gerencie os fornecedores do sistema</p>
              </div>
              <button 
                className="btn-primary"
                onClick={openModal}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Novo Fornecedor
              </button>
            </div>

            <div className="filtros-card">
              <h3>Filtros</h3>
              <div className="filtros-grid">
                <div className="form-group">
                  <label>Razão Social</label>
                  <input
                    type="text"
                    name="razaoSocial"
                    value={filtros.razaoSocial}
                    onChange={handleFiltroChange}
                    placeholder="Buscar por razão social"
                  />
                </div>
                <div className="form-group">
                  <label>Nome Fantasia</label>
                  <input
                    type="text"
                    name="nomeFantasia"
                    value={filtros.nomeFantasia}
                    onChange={handleFiltroChange}
                    placeholder="Buscar por nome fantasia"
                  />
                </div>
                <div className="form-group">
                  <label>CNPJ/CPF</label>
                  <input
                    type="text"
                    name="cnpjCpf"
                    value={filtros.cnpjCpf}
                    onChange={handleFiltroChange}
                    placeholder="Buscar por CNPJ/CPF"
                  />
                </div>
                <div className="form-group">
                  <label>Cidade</label>
                  <input
                    type="text"
                    name="cidade"
                    value={filtros.cidade}
                    onChange={handleFiltroChange}
                    placeholder="Buscar por cidade"
                  />
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select
                    name="estado"
                    value={filtros.estado}
                    onChange={handleFiltroChange}
                  >
                    <option value="">Todos</option>
                    {estados.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="filtros-actions">
                <button className="btn-secondary" onClick={handleLimpar}>
                  🗑️ Limpar
                </button>
                <button className="btn-primary" onClick={handleFiltrar}>
                  🔍 Filtrar
                </button>
              </div>
            </div>

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Razão Social</th>
                <th>Nome Fantasia</th>
                <th>CNPJ/CPF</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Cidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {fornecedores.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum fornecedor cadastrado
                  </td>
                </tr>
              ) : (
                fornecedores.map(fornecedor => (
                  <tr key={fornecedor._id}>
                    <td>{fornecedor.razaoSocial}</td>
                    <td>{fornecedor.nomeFantasia}</td>
                    <td>{fornecedor.cnpjCpf}</td>
                    <td>{fornecedor.email}</td>
                    <td>{fornecedor.telefone}</td>
                    <td>{fornecedor.cidade}/{fornecedor.estado}</td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn-edit"
                          onClick={() => handleEdit(fornecedor)}
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => handleDelete(fornecedor._id)}
                          title="Excluir"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="paginacao">
            <div className="paginacao-info">
              Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, totalRegistros)} de {totalRegistros} fornecedores
            </div>
            <div className="paginacao-botoes">
              <button 
                className="btn-paginacao"
                onClick={() => setPaginaAtual(1)}
                disabled={paginaAtual === 1}
              >
                ⏮️ Primeira
              </button>
              <button 
                className="btn-paginacao"
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
              >
                ◀️ Anterior
              </button>
              <span className="paginacao-atual">
                Página {paginaAtual} de {totalPaginas}
              </span>
              <button 
                className="btn-paginacao"
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
              >
                Próxima ▶️
              </button>
              <button 
                className="btn-paginacao"
                onClick={() => setPaginaAtual(totalPaginas)}
                disabled={paginaAtual === totalPaginas}
              >
                Última ⏭️
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-section">
                <h3>Dados da Empresa</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Razão Social *</label>
                    <input
                      type="text"
                      name="razaoSocial"
                      value={formData.razaoSocial}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Nome Fantasia *</label>
                    <input
                      type="text"
                      name="nomeFantasia"
                      value={formData.nomeFantasia}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>CNPJ/CPF *</label>
                    <input
                      type="text"
                      name="cnpjCpf"
                      value={formData.cnpjCpf}
                      onChange={handleCNPJCPFChange}
                      required
                      maxLength="18"
                    />
                  </div>

                  <div className="form-group">
                    <label>Telefone *</label>
                    <input
                      type="text"
                      name="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
                      required
                      maxLength="15"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>E-mail *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {!editingId && (
                    <div className="form-group full-width">
                      <label>Senha *</label>
                      <input
                        type="password"
                        name="senha"
                        value={formData.senha}
                        onChange={handleInputChange}
                        required={!editingId}
                        minLength="6"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  )}

                  <div className="form-group full-width">
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="naoOptanteSimples"
                        checked={formData.naoOptanteSimples}
                        onChange={(e) => setFormData({ ...formData, naoOptanteSimples: e.target.checked })}
                        style={{ marginRight: '0.5rem', width: 'auto' }}
                      />
                      <span>Não optante pelo Simples Nacional</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Endereço</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Endereço *</label>
                    <input
                      type="text"
                      name="endereco"
                      value={formData.endereco}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Bairro *</label>
                    <input
                      type="text"
                      name="bairro"
                      value={formData.bairro}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Cidade *</label>
                    <input
                      type="text"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Estado *</label>
                    <select
                      name="estado"
                      value={formData.estado}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Selecione</option>
                      {estados.map(estado => (
                        <option key={estado} value={estado}>{estado}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Dados Bancários</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Banco *</label>
                    <input
                      type="text"
                      name="banco"
                      value={formData.banco}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Tipo de Conta *</label>
                    <select
                      name="tipoConta"
                      value={formData.tipoConta}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="corrente">Conta Corrente</option>
                      <option value="poupanca">Conta Poupança</option>
                      <option value="pagamento">Conta Pagamento</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Agência *</label>
                    <input
                      type="text"
                      name="agencia"
                      value={formData.agencia}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Conta *</label>
                    <input
                      type="text"
                      name="conta"
                      value={formData.conta}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Chave Pix</label>
                    <input
                      type="text"
                      name="chavePix"
                      value={formData.chavePix}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-salvar">
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
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

export default Fornecedores;
