import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import authService from '../services/authService';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import './PerfilFornecedor.css';

function PerfilFornecedorUsuario() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fornecedor, setFornecedor] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    senha: '',
    confirmarSenha: ''
  });
  const [fornecedorData, setFornecedorData] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    inscricaoEstadual: '',
    email: '',
    telefone: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    naoOptanteSimples: false,
    dadosBancarios: {
      banco: '',
      agencia: '',
      conta: '',
      tipoConta: '',
      pix: '',
      tipoChavePix: ''
    }
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data.user;
      
      setFormData({
        nome: userData.nome || '',
        email: userData.email || '',
        cpf: userData.cpf || '',
        telefone: userData.telefone || '',
        senha: '',
        confirmarSenha: ''
      });

      // Carregar dados do fornecedor se o usuário tiver fornecedorId
      if (userData.fornecedorId) {
        // Extrair o ID (pode ser objeto ou string)
        const fornecedorId = typeof userData.fornecedorId === 'object' 
          ? userData.fornecedorId._id 
          : userData.fornecedorId;
        
        const fornecedorResponse = await api.get(`/fornecedores/${fornecedorId}`);
        const fornecedorInfo = fornecedorResponse.data;
        setFornecedor(fornecedorInfo);
        
        console.log('🔍 DEBUG Dados do Fornecedor:', fornecedorInfo);
        
        // Preencher os dados do fornecedor no formulário
        setFornecedorData({
          razaoSocial: fornecedorInfo.razaoSocial || '',
          nomeFantasia: fornecedorInfo.nomeFantasia || '',
          cnpj: fornecedorInfo.cnpjCpf || '',
          inscricaoEstadual: fornecedorInfo.inscricaoEstadual || '',
          email: fornecedorInfo.email || '',
          telefone: fornecedorInfo.telefone || '',
          endereco: fornecedorInfo.endereco || '',
          bairro: fornecedorInfo.bairro || '',
          cidade: fornecedorInfo.cidade || '',
          estado: fornecedorInfo.estado || '',
          cep: fornecedorInfo.cep || '',
          naoOptanteSimples: fornecedorInfo.naoOptanteSimples || false,
          dadosBancarios: {
            banco: fornecedorInfo.banco || '',
            agencia: fornecedorInfo.agencia || '',
            conta: fornecedorInfo.conta || '',
            tipoConta: fornecedorInfo.tipoConta || '',
            pix: fornecedorInfo.chavePix || '',
            tipoChavePix: fornecedorInfo.tipoChavePix || ''
          }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar perfil');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFornecedorChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('dadosBancarios.')) {
      const fieldName = name.split('.')[1];
      setFornecedorData(prev => ({
        ...prev,
        dadosBancarios: {
          ...prev.dadosBancarios,
          [fieldName]: value
        }
      }));
    } else {
      setFornecedorData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (formData.senha || formData.confirmarSenha) {
      if (formData.senha !== formData.confirmarSenha) {
        toast.error('As senhas não conferem');
        return;
      }
      if (formData.senha.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres');
        return;
      }
    }

    try {
      setLoading(true);
      
      const dadosAtualizacao = {
        nome: formData.nome,
        email: formData.email,
        cpf: formData.cpf,
        telefone: formData.telefone
      };

      // Só incluir senha se foi informada
      if (formData.senha) {
        dadosAtualizacao.senha = formData.senha;
      }

      // Atualizar perfil do usuário
      await api.put('/auth/profile', dadosAtualizacao);
      
      // Atualizar dados do fornecedor se existir
      if (fornecedor && fornecedor._id) {
        // Mapear para o formato do modelo Fornecedor
        const dadosFornecedor = {
          razaoSocial: fornecedorData.razaoSocial,
          nomeFantasia: fornecedorData.nomeFantasia,
          cnpjCpf: fornecedorData.cnpj,
          inscricaoEstadual: fornecedorData.inscricaoEstadual,
          email: fornecedorData.email,
          telefone: fornecedorData.telefone,
          endereco: fornecedorData.endereco,
          bairro: fornecedorData.bairro,
          cidade: fornecedorData.cidade,
          estado: fornecedorData.estado,
          cep: fornecedorData.cep,
          naoOptanteSimples: fornecedorData.naoOptanteSimples,
          banco: fornecedorData.dadosBancarios.banco,
          agencia: fornecedorData.dadosBancarios.agencia,
          conta: fornecedorData.dadosBancarios.conta,
          tipoConta: fornecedorData.dadosBancarios.tipoConta,
          chavePix: fornecedorData.dadosBancarios.pix,
          tipoChavePix: fornecedorData.dadosBancarios.tipoChavePix
        };
        
        await api.put(`/fornecedores/${fornecedor._id}`, dadosFornecedor);
      }
      
      toast.success('Perfil e dados do fornecedor atualizados com sucesso! Administradores foram notificados.');
      
      // Limpar campos de senha
      setFormData(prev => ({
        ...prev,
        senha: '',
        confirmarSenha: ''
      }));
      
      // Recarregar perfil
      await carregarPerfil();
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error(error.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const formatarCNPJ = (cnpj) => {
    if (!cnpj) return '-';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatarTelefone = (telefone) => {
    if (!telefone) return '-';
    return telefone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
  };

  const formatarCEP = (cep) => {
    if (!cep) return '-';
    return cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  };

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="perfil-fornecedor-container">
            <div className="perfil-fornecedor-header">
              <h1>Meu Perfil</h1>
              <p className="perfil-subtitulo">Atualize seus dados pessoais e informações do fornecedor</p>
            </div>

            <form className="perfil-fornecedor-form" onSubmit={handleSubmit}>
              {/* Dados do Fornecedor - Editável */}
              {fornecedor && (
                <div className="form-section">
                  <div className="section-header-inline">
                    <h2>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                      Dados do Fornecedor
                    </h2>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Razão Social *</label>
                      <input
                        type="text"
                        name="razaoSocial"
                        value={fornecedorData.razaoSocial}
                        onChange={handleFornecedorChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Nome Fantasia</label>
                      <input
                        type="text"
                        name="nomeFantasia"
                        value={fornecedorData.nomeFantasia}
                        onChange={handleFornecedorChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>CNPJ *</label>
                      <input
                        type="text"
                        name="cnpj"
                        value={fornecedorData.cnpj}
                        onChange={handleFornecedorChange}
                        placeholder="00.000.000/0000-00"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Inscrição Estadual</label>
                      <input
                        type="text"
                        name="inscricaoEstadual"
                        value={fornecedorData.inscricaoEstadual}
                        onChange={handleFornecedorChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Email do Fornecedor</label>
                      <input
                        type="email"
                        name="email"
                        value={fornecedorData.email}
                        onChange={handleFornecedorChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Telefone do Fornecedor</label>
                      <input
                        type="text"
                        name="telefone"
                        value={fornecedorData.telefone}
                        onChange={handleFornecedorChange}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Endereço</h3>

                  <div className="form-row">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Endereço</label>
                      <input
                        type="text"
                        name="endereco"
                        value={fornecedorData.endereco}
                        onChange={handleFornecedorChange}
                        placeholder="Rua, Avenida, etc."
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Bairro</label>
                      <input
                        type="text"
                        name="bairro"
                        value={fornecedorData.bairro}
                        onChange={handleFornecedorChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Cidade</label>
                      <input
                        type="text"
                        name="cidade"
                        value={fornecedorData.cidade}
                        onChange={handleFornecedorChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Estado</label>
                      <select
                        name="estado"
                        value={fornecedorData.estado}
                        onChange={handleFornecedorChange}
                      >
                        <option value="">Selecione</option>
                        <option value="AC">AC</option>
                        <option value="AL">AL</option>
                        <option value="AP">AP</option>
                        <option value="AM">AM</option>
                        <option value="BA">BA</option>
                        <option value="CE">CE</option>
                        <option value="DF">DF</option>
                        <option value="ES">ES</option>
                        <option value="GO">GO</option>
                        <option value="MA">MA</option>
                        <option value="MT">MT</option>
                        <option value="MS">MS</option>
                        <option value="MG">MG</option>
                        <option value="PA">PA</option>
                        <option value="PB">PB</option>
                        <option value="PR">PR</option>
                        <option value="PE">PE</option>
                        <option value="PI">PI</option>
                        <option value="RJ">RJ</option>
                        <option value="RN">RN</option>
                        <option value="RS">RS</option>
                        <option value="RO">RO</option>
                        <option value="RR">RR</option>
                        <option value="SC">SC</option>
                        <option value="SP">SP</option>
                        <option value="SE">SE</option>
                        <option value="TO">TO</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>CEP</label>
                      <input
                        type="text"
                        name="cep"
                        value={fornecedorData.cep}
                        onChange={handleFornecedorChange}
                        placeholder="00000-000"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          name="naoOptanteSimples"
                          checked={fornecedorData.naoOptanteSimples}
                          onChange={handleFornecedorChange}
                        />
                        <span>Não Optante pelo Simples Nacional</span>
                      </label>
                    </div>
                  </div>

                  <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: '8px' }}>
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                    Dados Bancários
                  </h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Banco</label>
                      <input
                        type="text"
                        name="dadosBancarios.banco"
                        value={fornecedorData.dadosBancarios.banco}
                        onChange={handleFornecedorChange}
                        placeholder="Nome do Banco"
                      />
                    </div>

                    <div className="form-group">
                      <label>Agência</label>
                      <input
                        type="text"
                        name="dadosBancarios.agencia"
                        value={fornecedorData.dadosBancarios.agencia}
                        onChange={handleFornecedorChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Conta</label>
                      <input
                        type="text"
                        name="dadosBancarios.conta"
                        value={fornecedorData.dadosBancarios.conta}
                        onChange={handleFornecedorChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Tipo de Conta</label>
                      <select
                        name="dadosBancarios.tipoConta"
                        value={fornecedorData.dadosBancarios.tipoConta}
                        onChange={handleFornecedorChange}
                      >
                        <option value="">Selecione</option>
                        <option value="corrente">Corrente</option>
                        <option value="poupanca">Poupança</option>
                        <option value="pagamento">Pagamento</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Chave PIX</label>
                      <input
                        type="text"
                        name="dadosBancarios.pix"
                        value={fornecedorData.dadosBancarios.pix}
                        onChange={handleFornecedorChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Tipo de Chave PIX</label>
                      <select
                        name="dadosBancarios.tipoChavePix"
                        value={fornecedorData.dadosBancarios.tipoChavePix}
                        onChange={handleFornecedorChange}
                      >
                        <option value="">Selecione</option>
                        <option value="cpf">CPF</option>
                        <option value="cnpj">CNPJ</option>
                        <option value="email">Email</option>
                        <option value="telefone">Telefone</option>
                        <option value="aleatoria">Chave Aleatória</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Dados Pessoais do Usuário */}
              <div className="form-section">
                <h3>Dados Pessoais</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Nome Completo *</label>
                    <input
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>E-mail *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>CPF</label>
                    <input
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleChange}
                      maxLength="14"
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="form-group">
                    <label>Telefone</label>
                    <input
                      type="text"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Alterar Senha</h3>
                <p className="info-texto">Deixe em branco se não deseja alterar a senha</p>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Nova Senha</label>
                    <input
                      type="password"
                      name="senha"
                      value={formData.senha}
                      onChange={handleChange}
                      minLength="6"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirmar Nova Senha</label>
                    <input
                      type="password"
                      name="confirmarSenha"
                      value={formData.confirmarSenha}
                      onChange={handleChange}
                      placeholder="Digite a senha novamente"
                    />
                  </div>
                </div>
              </div>

              <div className="alert-info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>Ao atualizar seu perfil e dados do fornecedor, os administradores serão automaticamente notificados das alterações.</span>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secundario"
                  onClick={() => navigate('/dashboard-fornecedor')}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primario"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

export default PerfilFornecedorUsuario;
