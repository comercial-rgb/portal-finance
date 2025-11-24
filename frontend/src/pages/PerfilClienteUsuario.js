import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import authService from '../services/authService';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import './PerfilFornecedor.css';

function PerfilClienteUsuario() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    senha: '',
    confirmarSenha: ''
  });
  const [clienteData, setClienteData] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpjCpf: '',
    inscricaoEstadual: '',
    email: '',
    telefone: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    tipoImposto: 'normal',
    percentualDesconto: 0,
    taxaPagamentoCartao: 0,
    taxaPagamentoBoleto: 0
  });

  useEffect(() => {
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);

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

      if (userData.clienteId) {
        // Extrair o ID (pode ser objeto ou string)
        const clienteId = typeof userData.clienteId === 'object' 
          ? userData.clienteId._id 
          : userData.clienteId;
        
        console.log('🔍 DEBUG clienteId:', {
          original: userData.clienteId,
          tipo: typeof userData.clienteId,
          extracted: clienteId
        });
        
        const clienteRes = await api.get(`/clientes/${clienteId}`);
        const clienteInfo = clienteRes.data;
        setCliente(clienteInfo);
        
        // Mapear campos aninhados corretamente
        setClienteData({
          razaoSocial: clienteInfo.razaoSocial || '',
          nomeFantasia: clienteInfo.nomeFantasia || '',
          cnpjCpf: clienteInfo.cnpjCpf || '',
          inscricaoEstadual: clienteInfo.inscricaoEstadual || '',
          email: clienteInfo.contatos?.email || clienteInfo.email || '',
          telefone: clienteInfo.contatos?.telefone || clienteInfo.telefone || '',
          celular: clienteInfo.contatos?.celular || '',
          endereco: clienteInfo.endereco?.logradouro || clienteInfo.endereco || '',
          numero: clienteInfo.endereco?.numero || '',
          complemento: clienteInfo.endereco?.complemento || '',
          bairro: clienteInfo.endereco?.bairro || clienteInfo.bairro || '',
          cidade: clienteInfo.endereco?.cidade || clienteInfo.cidade || '',
          estado: clienteInfo.endereco?.estado || clienteInfo.estado || '',
          cep: clienteInfo.endereco?.cep || clienteInfo.cep || ''
        });
      }
    } catch (error) {
      toast.error('Erro ao carregar perfil');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClienteChange = (e) => {
    const { name, value } = e.target;
    setClienteData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.senha && formData.senha !== formData.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    if (formData.senha && formData.senha.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    
    try {
      const dataToSend = { ...formData };
      if (!formData.senha) {
        delete dataToSend.senha;
        delete dataToSend.confirmarSenha;
      }
      
      await api.put('/auth/profile', dataToSend);
      
      if (cliente) {
        // Mapear dados flat para estrutura aninhada do backend
        const dadosClienteParaEnviar = {
          razaoSocial: clienteData.razaoSocial,
          nomeFantasia: clienteData.nomeFantasia,
          cnpjCpf: clienteData.cnpjCpf,
          inscricaoEstadual: clienteData.inscricaoEstadual,
          endereco: {
            logradouro: clienteData.endereco,
            numero: clienteData.numero,
            complemento: clienteData.complemento,
            bairro: clienteData.bairro,
            cidade: clienteData.cidade,
            estado: clienteData.estado,
            cep: clienteData.cep
          },
          contatos: {
            telefone: clienteData.telefone,
            celular: clienteData.celular,
            email: clienteData.email
          }
        };
        
        await api.put(`/clientes/${cliente._id}`, dadosClienteParaEnviar);
      }
      
      toast.success('Perfil e dados do cliente atualizados com sucesso!');
      carregarPerfil();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar perfil');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Header user={user} />
        <div className="content-wrapper">
          <Sidebar user={user} />
          <main className="main-content">
            <div className="loading">Carregando...</div>
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header user={user} />
      <div className="content-wrapper">
        <Sidebar user={user} />
        <main className="main-content">
          <div className="perfil-fornecedor-container">
            <div className="page-header">
              <div>
                <h1>Meu Perfil - Cliente</h1>
                <p>Gerencie suas informações pessoais e dados da empresa</p>
              </div>
            </div>

            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Ao atualizar seu perfil ou dados da empresa, os administradores serão notificados automaticamente.</span>
            </div>

            <form onSubmit={handleSubmit} className="perfil-form">
              {/* Dados Pessoais */}
              <div className="form-section">
                <div className="section-header-inline">
                  <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Dados Pessoais
                  </h2>
                </div>
                
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
                    />
                  </div>
                  <div className="form-group">
                    <label>Telefone</label>
                    <input
                      type="text"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Alterar Senha */}
              <div className="form-section">
                <div className="section-header-inline">
                  <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Alterar Senha
                  </h2>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Nova Senha</label>
                    <input
                      type="password"
                      name="senha"
                      value={formData.senha}
                      onChange={handleChange}
                      placeholder="Deixe em branco para não alterar"
                      minLength="6"
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirmar Nova Senha</label>
                    <input
                      type="password"
                      name="confirmarSenha"
                      value={formData.confirmarSenha}
                      onChange={handleChange}
                      placeholder="Confirme a nova senha"
                      minLength="6"
                    />
                  </div>
                </div>
              </div>

              {/* Dados da Empresa */}
              {cliente && (
                <>
                  <div className="form-section">
                    <div className="section-header-inline">
                      <h2>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                          <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        Dados da Empresa
                      </h2>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Razão Social *</label>
                        <input
                          type="text"
                          name="razaoSocial"
                          value={clienteData.razaoSocial}
                          onChange={handleClienteChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Nome Fantasia</label>
                        <input
                          type="text"
                          name="nomeFantasia"
                          value={clienteData.nomeFantasia}
                          onChange={handleClienteChange}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>CNPJ/CPF *</label>
                        <input
                          type="text"
                          name="cnpjCpf"
                          value={clienteData.cnpjCpf}
                          onChange={handleClienteChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Inscrição Estadual</label>
                        <input
                          type="text"
                          name="inscricaoEstadual"
                          value={clienteData.inscricaoEstadual}
                          onChange={handleClienteChange}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>E-mail</label>
                        <input
                          type="email"
                          name="email"
                          value={clienteData.email}
                          onChange={handleClienteChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Telefone</label>
                        <input
                          type="text"
                          name="telefone"
                          value={clienteData.telefone}
                          onChange={handleClienteChange}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="form-section">
                    <div className="section-header-inline">
                      <h2>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        Endereço
                      </h2>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Endereço</label>
                        <input
                          type="text"
                          name="endereco"
                          value={clienteData.endereco}
                          onChange={handleClienteChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Bairro</label>
                        <input
                          type="text"
                          name="bairro"
                          value={clienteData.bairro}
                          onChange={handleClienteChange}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Cidade</label>
                        <input
                          type="text"
                          name="cidade"
                          value={clienteData.cidade}
                          onChange={handleClienteChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Estado</label>
                        <select
                          name="estado"
                          value={clienteData.estado}
                          onChange={handleClienteChange}
                        >
                          <option value="">Selecione</option>
                          <option value="AC">Acre</option>
                          <option value="AL">Alagoas</option>
                          <option value="AP">Amapá</option>
                          <option value="AM">Amazonas</option>
                          <option value="BA">Bahia</option>
                          <option value="CE">Ceará</option>
                          <option value="DF">Distrito Federal</option>
                          <option value="ES">Espírito Santo</option>
                          <option value="GO">Goiás</option>
                          <option value="MA">Maranhão</option>
                          <option value="MT">Mato Grosso</option>
                          <option value="MS">Mato Grosso do Sul</option>
                          <option value="MG">Minas Gerais</option>
                          <option value="PA">Pará</option>
                          <option value="PB">Paraíba</option>
                          <option value="PR">Paraná</option>
                          <option value="PE">Pernambuco</option>
                          <option value="PI">Piauí</option>
                          <option value="RJ">Rio de Janeiro</option>
                          <option value="RN">Rio Grande do Norte</option>
                          <option value="RS">Rio Grande do Sul</option>
                          <option value="RO">Rondônia</option>
                          <option value="RR">Roraima</option>
                          <option value="SC">Santa Catarina</option>
                          <option value="SP">São Paulo</option>
                          <option value="SE">Sergipe</option>
                          <option value="TO">Tocantins</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>CEP</label>
                        <input
                          type="text"
                          name="cep"
                          value={clienteData.cep}
                          onChange={handleClienteChange}
                        />
                      </div>
                    </div>
                  </div>

                </>
              )}

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default PerfilClienteUsuario;
