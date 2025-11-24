import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import './PerfilFornecedor.css';

function PerfilFornecedor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
    confirmarSenha: ''
  });

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setFormData({
        razaoSocial: user.razaoSocial || '',
        nomeFantasia: user.nomeFantasia || '',
        cnpjCpf: user.cnpjCpf || '',
        endereco: user.endereco || '',
        bairro: user.bairro || '',
        cidade: user.cidade || '',
        estado: user.estado || '',
        email: user.email || '',
        telefone: user.telefone || '',
        banco: user.banco || '',
        tipoConta: user.tipoConta || '',
        agencia: user.agencia || '',
        conta: user.conta || '',
        chavePix: user.chavePix || '',
        senha: '',
        confirmarSenha: ''
      });
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação de CNPJ/CPF
    const cnpjCpfRegex = /^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})$/;
    if (!cnpjCpfRegex.test(formData.cnpjCpf)) {
      toast.error('CNPJ/CPF inválido');
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
      const dataToUpdate = { ...formData };
      if (!formData.senha) {
        delete dataToUpdate.senha;
        delete dataToUpdate.confirmarSenha;
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
    <div className="perfil-fornecedor-container">
      <div className="perfil-fornecedor-content">
        <h1>Meu Perfil - Fornecedor</h1>
        <p className="perfil-fornecedor-subtitle">Gerencie suas informações e dados bancários</p>

        <form onSubmit={handleSubmit} className="perfil-fornecedor-form">
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
                  placeholder="Razão social da empresa"
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
                  placeholder="Nome fantasia"
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
                  placeholder="00.000.000/0000-00 ou 000.000.000-00"
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
                  placeholder="(00) 00000-0000"
                  maxLength="15"
                />
              </div>

              <div className="form-group full-width">
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
                  placeholder="Rua, número, complemento"
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
                  placeholder="Bairro"
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
                  placeholder="Cidade"
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
                  placeholder="Nome do banco"
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
                  placeholder="0000"
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
                  placeholder="00000-0"
                />
              </div>

              <div className="form-group full-width">
                <label>Chave Pix</label>
                <input
                  type="text"
                  name="chavePix"
                  value={formData.chavePix}
                  onChange={handleInputChange}
                  placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
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

export default PerfilFornecedor;
