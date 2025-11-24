import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import authService from '../services/authService';
import './Usuarios.css';

function Usuarios() {
  const [user, setUser] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    role: 'funcionario',
    fornecedorId: '',
    clienteId: '',
    ativo: true
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadUsuarios();
    loadFornecedores();
    loadClientes();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/usuarios');
      setUsuarios(response.data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadFornecedores = async () => {
    try {
      const response = await api.get('/fornecedores?limit=1000');
      const fornecedoresData = response.data.fornecedores || response.data;
      setFornecedores(Array.isArray(fornecedoresData) ? fornecedoresData : []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const loadClientes = async () => {
    try {
      const response = await api.get('/clientes?limit=1000');
      const clientesData = response.data.clientes || response.data;
      setClientes(Array.isArray(clientesData) ? clientesData : []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setFormData({
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: '',
      role: 'funcionario',
      fornecedorId: '',
      clienteId: '',
      ativo: true
    });
    setShowModal(true);
  };

  const handleEdit = (usuario) => {
    setEditingUser(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      confirmarSenha: '',
      role: usuario.role,
      fornecedorId: usuario.fornecedorId || '',
      clienteId: usuario.clienteId || '',
      ativo: usuario.ativo
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: '',
      role: 'funcionario',
      fornecedorId: '',
      clienteId: '',
      ativo: true
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar fornecedor
    if (formData.role === 'fornecedor' && !formData.fornecedorId) {
      toast.error('Selecione um fornecedor para usuários do tipo Fornecedor');
      return;
    }
    
    // Validar cliente
    if (formData.role === 'cliente' && !formData.clienteId) {
      toast.error('Selecione um cliente para usuários do tipo Cliente');
      return;
    }
    
    // Validar senhas ao criar novo usuário
    if (!editingUser) {
      if (!formData.senha || formData.senha.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres');
        return;
      }
      if (formData.senha !== formData.confirmarSenha) {
        toast.error('As senhas não coincidem');
        return;
      }
    }
    
    // Validar senhas ao editar (se fornecidas)
    if (editingUser && formData.senha) {
      if (formData.senha.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres');
        return;
      }
      if (formData.senha !== formData.confirmarSenha) {
        toast.error('As senhas não coincidem');
        return;
      }
    }
    
    try {
      const dataToSend = { ...formData };
      // Remover campos de senha vazios ao editar
      if (editingUser && !formData.senha) {
        delete dataToSend.senha;
        delete dataToSend.confirmarSenha;
      }
      
      if (editingUser) {
        await api.put(`/usuarios/${editingUser._id}`, dataToSend);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await api.post('/auth/register', dataToSend);
        toast.success('Usuário criado com sucesso!');
      }
      
      handleCloseModal();
      loadUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar usuário');
    }
  };

  const handleToggleStatus = async (usuario) => {
    try {
      await api.put(`/usuarios/${usuario._id}`, {
        ...usuario,
        ativo: !usuario.ativo
      });
      toast.success(`Usuário ${!usuario.ativo ? 'ativado' : 'desativado'} com sucesso!`);
      loadUsuarios();
    } catch (error) {
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const getRoleDisplay = (role) => {
    const roles = {
      super_admin: 'Super Admin',
      admin: 'Administrador',
      gerente: 'Gerente',
      funcionario: 'Funcionário',
      fornecedor: 'Fornecedor'
    };
    return roles[role] || role;
  };

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="usuarios-container">
            <div className="page-header">
              <div>
                <h1>Usuários</h1>
                <p>Gerencie os usuários do sistema</p>
              </div>
              <button className="btn-primary" onClick={handleNewUser}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                Novo Usuário
              </button>
            </div>

            {loading ? (
              <div className="loading">Carregando...</div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Perfil</th>
                      <th>Status</th>
                      <th>Data Cadastro</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                          Nenhum usuário encontrado
                        </td>
                      </tr>
                    ) : (
                      usuarios.map((usuario) => (
                        <tr key={usuario._id}>
                          <td><strong>{usuario.nome}</strong></td>
                          <td>{usuario.email}</td>
                          <td>
                            <span className={`role-badge role-${usuario.role}`}>
                              {getRoleDisplay(usuario.role)}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${usuario.ativo ? 'status-ativo' : 'status-inativo'}`}>
                              {usuario.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td>{new Date(usuario.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td>
                            <div className="table-actions">
                              <button 
                                className="btn-icon btn-edit"
                                onClick={() => handleEdit(usuario)}
                                title="Editar"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button 
                                className={`btn-icon ${usuario.ativo ? 'btn-delete' : 'btn-success'}`}
                                onClick={() => handleToggleStatus(usuario)}
                                title={usuario.ativo ? 'Desativar' : 'Ativar'}
                              >
                                {usuario.ativo ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="15" y1="9" x2="9" y2="15"></line>
                                    <line x1="9" y1="9" x2="15" y2="15"></line>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Senha {!editingUser && '*'}</label>
                <input
                  type="password"
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  required={!editingUser}
                  placeholder={editingUser ? 'Deixe em branco para não alterar' : 'Mínimo 6 caracteres'}
                  minLength="6"
                />
              </div>
              <div className="form-group">
                <label>Confirmar Senha {!editingUser && '*'}</label>
                <input
                  type="password"
                  name="confirmarSenha"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  required={!editingUser}
                  placeholder={editingUser ? 'Deixe em branco para não alterar' : 'Digite a senha novamente'}
                  minLength="6"
                />
              </div>
              <div className="form-group">
                <label>Perfil *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="funcionario">Funcionário</option>
                  <option value="gerente">Gerente</option>
                  <option value="admin">Administrador</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="fornecedor">Fornecedor</option>
                  <option value="cliente">Cliente</option>
                </select>
              </div>
              {formData.role === 'fornecedor' && (
                <div className="form-group">
                  <label>Fornecedor *</label>
                  <select
                    name="fornecedorId"
                    value={formData.fornecedorId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecione um fornecedor</option>
                    {fornecedores.map(f => (
                      <option key={f._id} value={f._id}>
                        {f.razaoSocial || f.nomeFantasia}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px', display: 'block' }}>
                    Usuários fornecedores terão acesso somente leitura aos dados do fornecedor selecionado
                  </small>
                </div>
              )}
              {formData.role === 'cliente' && (
                <div className="form-group">
                  <label>Cliente *</label>
                  <select
                    name="clienteId"
                    value={formData.clienteId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.razaoSocial || c.nomeFantasia}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px', display: 'block' }}>
                    Usuários clientes terão acesso somente leitura aos seus dados
                  </small>
                </div>
              )}
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="ativo"
                    checked={formData.ativo}
                    onChange={handleChange}
                  />
                  <span>Usuário Ativo</span>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Usuarios;
