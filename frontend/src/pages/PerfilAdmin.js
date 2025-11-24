import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import './PerfilAdmin.css';

function PerfilAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    senha: '',
    confirmarSenha: '',
    imagem: null
  });

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setFormData({
        nome: user.nome || '',
        email: user.email || '',
        cpf: user.cpf || '',
        telefone: user.telefone || '',
        senha: '',
        confirmarSenha: '',
        imagem: null
      });
      if (user.imagem) {
        setImagePreview(user.imagem);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData({
          ...formData,
          imagem: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação de CPF
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(formData.cpf)) {
      toast.error('CPF inválido. Use o formato: 000.000.000-00');
      return;
    }

    // Validação de telefone
    const telefoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
    if (!telefoneRegex.test(formData.telefone)) {
      toast.error('Telefone inválido. Use o formato: (00) 00000-0000');
      return;
    }

    // Validação de senha
    if (formData.senha || formData.confirmarSenha) {
      if (formData.senha.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres');
        return;
      }
      if (formData.senha !== formData.confirmarSenha) {
        toast.error('As senhas não coincidem');
        return;
      }
    }

    setLoading(true);
    try {
      const dataToUpdate = {
        nome: formData.nome,
        email: formData.email,
        cpf: formData.cpf,
        telefone: formData.telefone,
        imagem: formData.imagem
      };

      if (formData.senha) {
        dataToUpdate.senha = formData.senha;
      }

      await authService.updateProfile(dataToUpdate);
      toast.success('Perfil atualizado com sucesso!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      toast.error(error.response?.data?.mensagem || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
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
    <div className="perfil-admin-container">
      <div className="perfil-admin-content">
        <h1>Meu Perfil - Administrador</h1>
        <p className="perfil-admin-subtitle">Gerencie suas informações pessoais</p>

        <form onSubmit={handleSubmit} className="perfil-admin-form">
          <div className="form-section">
            <div className="image-upload-section">
              <label className="image-upload-label">
                <div className="image-preview">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" />
                  ) : (
                    <div className="image-placeholder">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span>Clique para adicionar foto</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
              <p className="image-upload-hint">Formatos aceitos: JPG, PNG. Máximo 5MB</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  required
                  placeholder="Digite seu nome completo"
                />
              </div>

              <div className="form-group">
                <label>E-mail de Acesso *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="seu@email.com"
                />
              </div>

              <div className="form-group">
                <label>CPF *</label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  required
                  placeholder="000.000.000-00"
                  maxLength="14"
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
                  placeholder="(00) 00000-0000"
                  maxLength="15"
                />
              </div>
            </div>
          </div>

          <div className="form-section password-section">
            <h3>Alterar Senha</h3>
            <p className="section-subtitle">Preencha apenas se desejar alterar sua senha</p>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Nova Senha</label>
                <input
                  type="password"
                  name="senha"
                  value={formData.senha}
                  onChange={handleInputChange}
                  placeholder="Mínimo 6 caracteres"
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label>Confirmar Nova Senha</label>
                <input
                  type="password"
                  name="confirmarSenha"
                  value={formData.confirmarSenha}
                  onChange={handleInputChange}
                  placeholder="Digite a senha novamente"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancelar"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-salvar"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PerfilAdmin;
