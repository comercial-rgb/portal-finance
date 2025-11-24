import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import './Perfil.css';

const Perfil = () => {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setFormData({
      nome: currentUser?.nome || '',
      email: currentUser?.email || '',
      senhaAtual: '',
      novaSenha: '',
      confirmarSenha: ''
    });
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Implementar atualização de perfil na API
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (formData.novaSenha !== formData.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (formData.novaSenha.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      // Implementar mudança de senha na API
      toast.success('Senha alterada com sucesso!');
      setFormData({
        ...formData,
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
      });
    } catch (error) {
      toast.error('Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplay = (role) => {
    const roles = {
      super_admin: 'Super Administrador',
      admin: 'Administrador',
      gerente: 'Gerente',
      funcionario: 'Funcionário'
    };
    return roles[role] || role;
  };

  return (
    <div className="dashboard-layout">
      <Header user={user} />
      
      <div className="dashboard-body">
        <Sidebar user={user} />
        
        <main className="dashboard-main">
          <div className="page-header">
            <h1>Meu Perfil</h1>
            <p className="page-subtitle">
              Gerencie suas informações pessoais e configurações de conta
            </p>
          </div>

          <div className="profile-grid">
            <div className="profile-card">
              <div className="profile-header">
                <div className="profile-avatar-large">
                  {user?.nome?.charAt(0).toUpperCase()}
                </div>
                <div className="profile-info">
                  <h2>{user?.nome}</h2>
                  <p className="profile-email">{user?.email}</p>
                  <span className="profile-role">{getRoleDisplay(user?.role)}</span>
                </div>
              </div>

              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-label">Membro desde</span>
                  <span className="stat-value">Novembro 2025</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Status</span>
                  <span className="stat-value status-active">
                    <span className="status-dot"></span>
                    Ativo
                  </span>
                </div>
              </div>
            </div>

            <div className="form-card">
              <h3>Informações Pessoais</h3>
              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label htmlFor="nome">Nome Completo</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">E-mail</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </form>
            </div>

            <div className="form-card">
              <h3>Alterar Senha</h3>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label htmlFor="senhaAtual">Senha Atual</label>
                  <input
                    type="password"
                    id="senhaAtual"
                    name="senhaAtual"
                    value={formData.senhaAtual}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="novaSenha">Nova Senha</label>
                  <input
                    type="password"
                    id="novaSenha"
                    name="novaSenha"
                    value={formData.novaSenha}
                    onChange={handleChange}
                    required
                  />
                  <small>Mínimo de 6 caracteres</small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmarSenha">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    id="confirmarSenha"
                    name="confirmarSenha"
                    value={formData.confirmarSenha}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default Perfil;
