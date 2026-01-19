import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import authService from '../services/authService';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import './Configuracoes.css';

function Configuracoes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('site');
  const [logoPreview, setLogoPreview] = useState(null);
  const [administradores, setAdministradores] = useState([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState(null);
  
  const [configData, setConfigData] = useState({
    nomeSite: 'Portal Finance - InstaSolutions',
    logo: null,
    emailContato: 'contato@instasolutions.com',
    telefoneContato: '(00) 0000-0000',
    endereco: '',
    textoRodape: '© 2024 InstaSolutions. Todos os direitos reservados.',
    linkPrivacidade: '/privacidade',
    linkTermos: '/termos',
    corPrimaria: '#005BED',
    corSecundaria: '#251C59',
    senhaMestre: ''
  });

  const [adminData, setAdminData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    senha: '',
    imagem: null
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadConfig();
    loadAdministradores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/configuracoes');
      if (response.data) {
        setConfigData({
          ...configData,
          ...response.data
        });
        if (response.data.logo) {
          setLogoPreview(response.data.logo);
        }
      }
    } catch (error) {
      console.log('Configurações não encontradas, usando padrão');
    }
  };

  const loadAdministradores = async () => {
    try {
      const response = await api.get('/administradores');
      setAdministradores(response.data);
    } catch (error) {
      toast.error('Erro ao carregar administradores');
    }
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfigData({
      ...configData,
      [name]: value
    });
  };

  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    setAdminData({
      ...adminData,
      [name]: value
    });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setConfigData({
          ...configData,
          logo: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdminData({
          ...adminData,
          imagem: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.post('/configuracoes', configData);
      toast.success('Configurações salvas com sucesso!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdmin = async (e) => {
    e.preventDefault();
    
    try {
      if (editingAdminId) {
        await api.put(`/administradores/${editingAdminId}`, adminData);
        toast.success('Administrador atualizado com sucesso!');
      } else {
        await api.post('/administradores', adminData);
        toast.success('Administrador cadastrado com sucesso!');
      }
      
      setShowAdminModal(false);
      resetAdminForm();
      loadAdministradores();
    } catch (error) {
      toast.error(error.response?.data?.mensagem || 'Erro ao salvar administrador');
    }
  };

  const resetAdminForm = () => {
    setAdminData({
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      senha: '',
      imagem: null
    });
    setEditingAdminId(null);
  };

  const handleEditAdmin = (admin) => {
    setAdminData({
      nome: admin.nome || '',
      email: admin.email || '',
      cpf: admin.cpf || '',
      telefone: admin.telefone || '',
      senha: '',
      imagem: admin.imagem || null
    });
    setEditingAdminId(admin._id);
    setShowAdminModal(true);
  };

  const handleDeleteAdmin = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este administrador?')) {
      try {
        await api.delete(`/administradores/${id}`);
        toast.success('Administrador excluído com sucesso!');
        loadAdministradores();
      } catch (error) {
        toast.error('Erro ao excluir administrador');
      }
    }
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

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="configuracoes-container">
            <div className="configuracoes-header">
              <h1>Configurações</h1>
              <p>Gerencie as configurações do sistema</p>
            </div>

      <div className="configuracoes-tabs">
        <button 
          className={`tab ${activeTab === 'site' ? 'active' : ''}`}
          onClick={() => setActiveTab('site')}
        >
          Configurações do Site
        </button>
        <button 
          className={`tab ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          Administradores
        </button>
      </div>

      {activeTab === 'site' && (
        <div className="configuracoes-content">
          <form onSubmit={handleSaveConfig} className="config-form">
            <div className="form-section">
              <h3>Identidade Visual</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Nome do Site</label>
                  <input
                    type="text"
                    name="nomeSite"
                    value={configData.nomeSite}
                    onChange={handleConfigChange}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Logo</label>
                  <div className="logo-upload">
                    {logoPreview && (
                      <div className="logo-preview">
                        <img src={logoPreview} alt="Logo" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Cor Primária</label>
                  <input
                    type="color"
                    name="corPrimaria"
                    value={configData.corPrimaria}
                    onChange={handleConfigChange}
                  />
                </div>

                <div className="form-group">
                  <label>Cor Secundária</label>
                  <input
                    type="color"
                    name="corSecundaria"
                    value={configData.corSecundaria}
                    onChange={handleConfigChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Informações de Contato</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>E-mail de Contato</label>
                  <input
                    type="email"
                    name="emailContato"
                    value={configData.emailContato}
                    onChange={handleConfigChange}
                  />
                </div>

                <div className="form-group">
                  <label>Telefone de Contato</label>
                  <input
                    type="text"
                    name="telefoneContato"
                    value={configData.telefoneContato}
                    onChange={handleConfigChange}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Endereço</label>
                  <input
                    type="text"
                    name="endereco"
                    value={configData.endereco}
                    onChange={handleConfigChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Rodapé</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Texto do Rodapé</label>
                  <input
                    type="text"
                    name="textoRodape"
                    value={configData.textoRodape}
                    onChange={handleConfigChange}
                  />
                </div>

                <div className="form-group">
                  <label>Link Política de Privacidade</label>
                  <input
                    type="text"
                    name="linkPrivacidade"
                    value={configData.linkPrivacidade}
                    onChange={handleConfigChange}
                  />
                </div>

                <div className="form-group">
                  <label>Link Termos de Uso</label>
                  <input
                    type="text"
                    name="linkTermos"
                    value={configData.linkTermos}
                    onChange={handleConfigChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Segurança</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Senha Mestre (acessa qualquer usuário)</label>
                  <input
                    type="password"
                    name="senhaMestre"
                    value={configData.senhaMestre}
                    onChange={handleConfigChange}
                    placeholder="Digite uma senha mestre"
                    minLength="8"
                  />
                  <small>Deixe em branco para manter a senha atual</small>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancelar" onClick={() => navigate('/dashboard')}>
                Cancelar
              </button>
              <button type="submit" className="btn-salvar" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="configuracoes-content">
          <div className="admins-header">
            <h3>Gerenciar Administradores</h3>
            <button 
              className="btn-novo-admin"
              onClick={() => {
                resetAdminForm();
                setShowAdminModal(true);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Novo Administrador
            </button>
          </div>

          <div className="admins-grid">
            {administradores.map(admin => (
              <div key={admin._id} className="admin-card">
                <div className="admin-image">
                  {admin.imagem ? (
                    <img src={admin.imagem} alt={admin.nome} />
                  ) : (
                    <div className="admin-placeholder">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="admin-info">
                  <h4>{admin.nome}</h4>
                  <p>{admin.email}</p>
                  <p>{admin.telefone}</p>
                </div>
                <div className="admin-actions">
                  <button className="btn-edit" onClick={() => handleEditAdmin(admin)}>
                    Editar
                  </button>
                  <button className="btn-delete" onClick={() => handleDeleteAdmin(admin._id)}>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAdminId ? 'Editar Administrador' : 'Novo Administrador'}</h2>
              <button className="modal-close" onClick={() => setShowAdminModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveAdmin} className="modal-form">
              <div className="form-group">
                <label>Foto de Perfil</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>

              <div className="form-group">
                <label>Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  value={adminData.nome}
                  onChange={handleAdminChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>E-mail *</label>
                <input
                  type="email"
                  name="email"
                  value={adminData.email}
                  onChange={handleAdminChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>CPF *</label>
                <input
                  type="text"
                  name="cpf"
                  value={adminData.cpf}
                  onChange={(e) => setAdminData({ ...adminData, cpf: formatCPF(e.target.value) })}
                  required
                  maxLength="14"
                />
              </div>

              <div className="form-group">
                <label>Telefone *</label>
                <input
                  type="text"
                  name="telefone"
                  value={adminData.telefone}
                  onChange={(e) => setAdminData({ ...adminData, telefone: formatTelefone(e.target.value) })}
                  required
                  maxLength="15"
                />
              </div>

              <div className="form-group">
                <label>Senha {editingAdminId ? '' : '*'}</label>
                <input
                  type="password"
                  name="senha"
                  value={adminData.senha}
                  onChange={handleAdminChange}
                  required={!editingAdminId}
                  minLength="6"
                  placeholder={editingAdminId ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => setShowAdminModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-salvar">
                  {editingAdminId ? 'Atualizar' : 'Cadastrar'}
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

export default Configuracoes;
