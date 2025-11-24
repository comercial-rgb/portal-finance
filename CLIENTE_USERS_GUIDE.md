# Sistema de Usuários Cliente - Guia Completo

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Permissões](#permissões)
4. [Criação de Usuários](#criação-de-usuários)
5. [Interface do Usuário](#interface-do-usuário)
6. [Fluxo de Trabalho](#fluxo-de-trabalho)
7. [Diferenças entre Fornecedor e Cliente](#diferenças-entre-fornecedor-e-cliente)

---

## 🎯 Visão Geral

O sistema de usuários Cliente permite que empresas clientes tenham acesso controlado ao portal para:
- **Visualizar** suas Ordens de Serviço (modo somente leitura)
- **Visualizar** suas Faturas (modo somente leitura)
- **Gerenciar** seu próprio perfil
- **Acompanhar** pagamentos e obrigações financeiras

### Características Principais
- ✅ Acesso restrito apenas aos dados do próprio cliente
- ✅ Modo somente leitura para OS e Faturas
- ✅ Dashboard específico com informações financeiras
- ✅ Notificações automáticas ao admin quando atualiza perfil
- ✅ Interface intuitiva e responsiva

---

## 🏗️ Arquitetura

### Backend

#### 1. Modelo de Dados (`/backend/models/User.js`)
```javascript
{
  nome: String,
  email: String (único),
  senha: String (hash bcrypt),
  role: 'cliente',           // Tipo de usuário
  clienteId: ObjectId,       // Referência ao Cliente (obrigatório para role='cliente')
  telefone: String,
  cpf: String,
  ativo: Boolean
}
```

#### 2. Middleware (`/backend/middleware/cliente.js`)

##### `isCliente`
- Verifica se usuário tem role='cliente'
- Retorna 403 se não for cliente

##### `clienteReadOnly`
- Bloqueia operações de POST, PUT, PATCH, DELETE
- Permite apenas GET (visualização)
- Retorna 403 com mensagem apropriada

##### `filterByCliente`
- Adiciona filtro automático por clienteId nas queries
- Garante que cliente vê apenas seus próprios dados
- Define `req.clienteFilter = true` para controllers

#### 3. Controllers

##### `authController.js`
- **register()**: Aceita clienteId no cadastro, valida que cliente existe
- **getMe()**: Popula dados do cliente (razaoSocial, nomeFantasia, etc)
- **updateProfile()**: Cria notificação para admin quando cliente atualiza perfil

##### `faturaController.js`
- **listar()**: Filtra faturas por clienteId quando `req.clienteFilter === true`
- **buscarPorId()**: Valida se fatura pertence ao cliente logado

##### `ordemServicoController.js`
- **listar()**: Filtra OS por clienteId quando `req.clienteFilter === true`
- **buscarPorId()**: Valida se OS pertence ao cliente logado

#### 4. Rotas Protegidas

##### `/backend/routes/ordemServicoRoutes.js`
```javascript
router.get('/', 
  auth, 
  filterByCliente,    // Filtra por clienteId se for cliente
  clienteReadOnly,    // Bloqueia criação/edição
  listar
);
```

##### `/backend/routes/faturaRoutes.js`
```javascript
router.get('/', 
  auth, 
  filterByCliente,    // Filtra por clienteId se for cliente
  clienteReadOnly,    // Bloqueia criação/edição
  listar
);
```

### Frontend

#### 1. Dashboard (`/frontend/src/pages/DashboardCliente.js`)

##### Estatísticas Exibidas:
- **Total de Faturas**: Quantidade de faturas tipo='Cliente'
- **Total a Pagar**: Soma de `valorRestante` de todas faturas
- **Total Pago**: Soma de `valorPago` de todas faturas
- **Ordens de Serviço**: Quantidade total de OS

##### Tabelas:
- **Últimas Faturas** (5 mais recentes)
  - Número da Fatura
  - Cliente
  - Valor Total
  - Valor Pago
  - Valor Restante
  - Status (pago/parcial/pendente)
  - Ações: Ver Detalhes
  
- **Últimas Ordens de Serviço** (5 mais recentes)
  - Código OS
  - Cliente
  - Fornecedor
  - Valor Final
  - Status
  - Ações: Ver Detalhes

##### Funcionalidades:
- Clique em fatura/OS redireciona para página de detalhes
- Badges coloridos por status
- Valores formatados em R$
- Atualização automática ao carregar página

#### 2. Perfil (`/frontend/src/pages/PerfilClienteUsuario.js`)

##### Seções do Formulário:

###### **Dados Pessoais**
- Nome Completo*
- E-mail*
- CPF
- Telefone

###### **Alterar Senha**
- Nova Senha
- Confirmar Nova Senha
- Validação: senhas devem corresponder

###### **Dados da Empresa**
- Razão Social*
- Nome Fantasia
- CNPJ/CPF*
- Inscrição Estadual
- E-mail da Empresa
- Telefone da Empresa

###### **Endereço**
- Endereço
- Bairro
- Cidade
- Estado (select com 27 estados brasileiros)
- CEP

###### **Configurações Fiscais**
- Tipo de Imposto (Normal/Isento/Suspenso)
- Percentual de Desconto (%)
- Taxa Pagamento Cartão (%)
- Taxa Pagamento Boleto (%)

##### Comportamento:
- Carrega dados do usuário via `/auth/me`
- Carrega dados do cliente via `/clientes/:id`
- Atualiza ambos endpoints ao salvar
- Cria notificação automática para admin
- Mostra alert informativo sobre notificação
- Toast de sucesso/erro
- Validação de campos obrigatórios

#### 3. Sidebar (`/frontend/src/components/Sidebar.js`)

##### Menu para Cliente:
```
Dashboard
└─ Dashboard Cliente

Operacional
├─ Ordens de Serviço (somente leitura)
└─ Faturados (somente leitura)

Minha Conta
└─ Perfil (editar dados)
```

#### 4. Login (`/frontend/src/pages/Login.js`)

##### Redirecionamento por Role:
```javascript
if (user.role === 'fornecedor') {
  navigate('/dashboard-fornecedor');
} else if (user.role === 'cliente') {
  navigate('/dashboard-cliente');
} else {
  navigate('/dashboard');
}
```

#### 5. Proteções de UI

##### OrdensServico.js
- Banner: "Visualização Somente Leitura - Você pode visualizar mas não editar ou criar ordens de serviço"
- Botão "Nova OS" oculto para clientes
- Botões de edição/exclusão ocultos para clientes

##### Faturados.js
- Banner: "Visualização Somente Leitura - Você pode visualizar as faturas mas não editá-las"
- Botões de ação ocultos para clientes

##### OrdemServicoForm.js
- Banner de readonly quando cliente acessa
- Todos campos desabilitados (`disabled={isReadOnly}`)
- Botão "Salvar" oculto
- Botão "Cancelar" muda para "Voltar"
- Submit bloqueado com mensagem de erro
- Classe CSS `readonly-form` aplicada

---

## 🔐 Permissões

### O que Cliente PODE fazer:
- ✅ Ver dashboard com estatísticas financeiras
- ✅ Listar suas Ordens de Serviço
- ✅ Ver detalhes de suas Ordens de Serviço
- ✅ Listar suas Faturas
- ✅ Ver detalhes de suas Faturas
- ✅ Editar próprio perfil (dados pessoais)
- ✅ Editar dados da empresa vinculada
- ✅ Alterar própria senha
- ✅ Ver notificações

### O que Cliente NÃO PODE fazer:
- ❌ Criar Ordens de Serviço
- ❌ Editar Ordens de Serviço
- ❌ Excluir Ordens de Serviço
- ❌ Criar Faturas
- ❌ Editar Faturas
- ❌ Excluir Faturas
- ❌ Ver dados de outros clientes
- ❌ Acessar área administrativa
- ❌ Gerenciar usuários
- ❌ Configurações do sistema

### Validações Backend:
```javascript
// Middleware clienteReadOnly bloqueia:
if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
  return res.status(403).json({ 
    message: 'Você tem permissão apenas para visualizar os dados' 
  });
}
```

---

## 👥 Criação de Usuários

### Método 1: Interface Web (Admin)

1. **Login como Admin** em `http://localhost:3000`

2. **Navegue até Usuários**
   - Menu lateral → Administração → Usuários

3. **Clique em "Novo Usuário"**

4. **Preencha os dados:**
   ```
   Nome: João Silva
   E-mail: joao@cliente.com
   Senha: senha123
   Perfil: cliente
   Cliente: [Selecionar da lista]
   ```

5. **Observações:**
   - Campo "Cliente" aparece automaticamente quando perfil='cliente'
   - Lista mostra: Razão Social + CNPJ
   - Validação: clienteId é obrigatório para role='cliente'

6. **Clique em "Criar"**

### Método 2: Script CLI

1. **Listar Clientes Disponíveis:**
   ```bash
   docker exec -it mongodb mongo portalfinance \
     --username admin --password senha123 --authenticationDatabase admin \
     --eval "db.clientes.find({}, {_id:1, razaoSocial:1, nomeFantasia:1, cnpjCpf:1}).pretty()"
   ```

2. **Copie o `_id` do cliente desejado**

3. **Execute o script:**
   ```bash
   cd /workspaces/portal-finance
   node backend/scripts/createClienteUser.js joao@cliente.com senha123 <CLIENTE_ID>
   ```

4. **Exemplo de saída:**
   ```
   🔄 Conectando ao MongoDB...
   ✅ Conectado ao MongoDB

   📋 Cliente encontrado: Empresa ABC Ltda

   🔄 Criando usuário cliente...

   ✅ Usuário cliente criado com sucesso!

   📋 Detalhes do usuário:
   ─────────────────────────────────────────
      ID: 507f1f77bcf86cd799439011
      Nome: Empresa ABC Ltda
      Email: joao@cliente.com
      Role: cliente
      Cliente: Empresa ABC Ltda
      Cliente ID: 507f191e810c19729de860ea
   ─────────────────────────────────────────

   💡 O usuário pode fazer login em:
      http://localhost:3000/login

   ✨ Permissões:
      ✓ Visualizar Ordens de Serviço do cliente (somente leitura)
      ✓ Visualizar Faturas do cliente (somente leitura)
      ✓ Editar próprio perfil
      ✗ Criar ou editar Ordens de Serviço
      ✗ Criar ou editar Faturas
      ✗ Acessar dados de outros clientes
   ```

---

## 🖥️ Interface do Usuário

### Login

1. **Acesse:** `http://localhost:3000/login`

2. **Credenciais:**
   ```
   E-mail: [email do usuário cliente]
   Senha: [senha definida]
   ```

3. **Redirecionamento automático** para `/dashboard-cliente`

### Dashboard Cliente

#### Layout:
```
┌─────────────────────────────────────────────┐
│  Header (Nome do Usuário)                   │
├──────────┬──────────────────────────────────┤
│          │  Dashboard do Cliente            │
│ Sidebar  │  ┌────────┬────────┬─────────┐  │
│          │  │ Total  │ Total  │  Total  │  │
│ • Home   │  │Faturas │ Pagar  │  Pago   │  │
│ • OS     │  └────────┴────────┴─────────┘  │
│ • Fatura │                                   │
│ • Perfil │  Últimas Faturas                 │
│          │  [Tabela com 5 faturas]          │
│          │                                   │
│          │  Últimas Ordens de Serviço       │
│          │  [Tabela com 5 OS]               │
└──────────┴──────────────────────────────────┘
```

#### Cards de Estatísticas:
- **Total de Faturas**: Fundo azul, ícone de documento
- **Total a Pagar**: Fundo laranja, ícone de alerta
- **Total Pago**: Fundo verde, ícone de check
- **Ordens de Serviço**: Fundo roxo, ícone de lista

### Ordens de Serviço (Somente Leitura)

#### Banner de Aviso:
```
ⓘ Visualização Somente Leitura - Você pode visualizar 
   mas não editar ou criar ordens de serviço
```

#### Funcionalidades:
- ✅ Listar todas OS do cliente
- ✅ Filtrar por código, fornecedor, status
- ✅ Visualizar detalhes completos
- ❌ Botão "Nova OS" não aparece
- ❌ Botões de editar/excluir não aparecem

### Faturas (Somente Leitura)

#### Banner de Aviso:
```
ⓘ Visualização Somente Leitura - Você pode visualizar 
   as faturas mas não editá-las
```

#### Abas:
- **Faturas de Fornecedores**: Filtra por tipo='Fornecedor'
- **Faturas de Clientes**: Filtra por tipo='Cliente'

#### Funcionalidades:
- ✅ Listar todas faturas do cliente
- ✅ Filtrar por busca e status
- ✅ Ver detalhes e pagamentos
- ❌ Não pode editar valores
- ❌ Não pode registrar pagamentos

### Perfil

#### Estrutura de Cards:
```
┌─────────────────────────────────────────┐
│  DADOS PESSOAIS                         │
│  • Nome  • Email  • CPF  • Telefone     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ALTERAR SENHA                          │
│  • Nova Senha  • Confirmar Senha        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  DADOS DA EMPRESA                       │
│  • Razão Social  • Nome Fantasia        │
│  • CNPJ  • Inscrição Estadual           │
│  • Email  • Telefone                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ENDEREÇO                               │
│  • Endereço  • Bairro  • Cidade         │
│  • Estado  • CEP                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  CONFIGURAÇÕES FISCAIS                  │
│  • Tipo Imposto  • Desconto             │
│  • Taxa Cartão  • Taxa Boleto           │
└─────────────────────────────────────────┘

[Cancelar]  [Salvar Alterações]
```

#### Validações:
- Nome obrigatório
- Email obrigatório e válido
- Senhas devem corresponder (se preenchidas)
- Razão Social obrigatória
- CNPJ obrigatório

---

## 🔄 Fluxo de Trabalho

### Cenário: Acompanhamento de OS

```
1. Cliente faz login
   ↓
2. Vê dashboard com resumo
   ↓
3. Clica em "Ver todas faturas" ou menu "Faturados"
   ↓
4. Filtra faturas por status (ex: "Pendente")
   ↓
5. Clica em "Ver Detalhes" de uma fatura
   ↓
6. Visualiza:
   - Valor total
   - Valor pago
   - Valor restante
   - Histórico de pagamentos
   - Documentos anexados
   ↓
7. Retorna para dashboard
```

### Cenário: Atualização de Perfil

```
1. Cliente acessa menu "Minha Conta" → "Perfil"
   ↓
2. Sistema carrega dados atuais
   ↓
3. Cliente atualiza telefone ou email
   ↓
4. Clica em "Salvar Alterações"
   ↓
5. Sistema valida dados
   ↓
6. Atualiza User e Cliente
   ↓
7. Cria notificação para admin:
   "Cliente [Nome] atualizou seus dados cadastrais"
   ↓
8. Mostra toast de sucesso
```

### Cenário: Verificação de Pagamentos

```
1. Cliente acessa "Faturados"
   ↓
2. Filtra por status "Pago"
   ↓
3. Vê lista de faturas quitadas
   ↓
4. Clica em uma fatura
   ↓
5. Visualiza histórico de pagamentos:
   - Data do pagamento
   - Valor pago
   - Forma de pagamento
   - Comprovante (se anexado)
```

---

## ⚖️ Diferenças entre Fornecedor e Cliente

### Contexto Financeiro

| Aspecto | Fornecedor | Cliente |
|---------|------------|---------|
| **Papel** | Presta serviços | Recebe serviços |
| **Financeiro** | RECEBE pagamentos | PAGA pelos serviços |
| **Faturas** | Valores A RECEBER | Valores A PAGAR |
| **Dashboard** | Mostra receitas | Mostra despesas |

### Permissões

| Funcionalidade | Fornecedor | Cliente |
|----------------|------------|---------|
| Ver próprias OS | ✅ Somente leitura | ✅ Somente leitura |
| Criar OS | ❌ | ❌ |
| Editar OS | ❌ | ❌ |
| Ver próprias Faturas | ✅ Somente leitura | ✅ Somente leitura |
| Editar Faturas | ❌ | ❌ |
| Editar Perfil | ✅ | ✅ |
| Notifica Admin | ✅ | ✅ |

### Dashboard

#### Fornecedor:
- **Total a Receber**: Soma de valores pendentes
- **Total Recebido**: Soma de pagamentos recebidos
- **Próximos Recebimentos**: Faturas com previsão

#### Cliente:
- **Total a Pagar**: Soma de valores pendentes
- **Total Pago**: Soma de pagamentos realizados
- **Últimas OS**: Serviços solicitados

### Interface

#### Fornecedor:
- Cor tema: Verde (recebimentos)
- Badges: Verde para "Recebido"
- Menu: "Minhas Faturas a Receber"

#### Cliente:
- Cor tema: Azul (pagamentos)
- Badges: Azul para "Pago"
- Menu: "Meus Pagamentos"

### Modelo de Dados

```javascript
// Fornecedor
User {
  role: 'fornecedor',
  fornecedorId: ObjectId -> Fornecedor
}

// Cliente
User {
  role: 'cliente',
  clienteId: ObjectId -> Cliente
}
```

---

## 🧪 Testes

### Teste Manual Completo

#### 1. Criar Cliente via Script
```bash
# Listar clientes
docker exec -it mongodb mongo portalfinance \
  --username admin --password senha123 --authenticationDatabase admin \
  --eval "db.clientes.find().limit(1).pretty()"

# Criar usuário (use o _id do cliente)
node backend/scripts/createClienteUser.js teste@cliente.com senha123 <CLIENTE_ID>
```

#### 2. Login
- Acesse `http://localhost:3000/login`
- Use credenciais criadas
- Verifique redirecionamento para `/dashboard-cliente`

#### 3. Dashboard
- [ ] Verifica se estatísticas carregam
- [ ] Verifica se mostra apenas dados do cliente logado
- [ ] Testa clique em fatura → redireciona para detalhes
- [ ] Testa clique em OS → redireciona para detalhes

#### 4. Ordens de Serviço
- [ ] Banner de "somente leitura" aparece
- [ ] Botão "Nova OS" NÃO aparece
- [ ] Lista mostra apenas OS do cliente
- [ ] Botões de editar/excluir NÃO aparecem
- [ ] Filtros funcionam
- [ ] Clique em "Ver" abre detalhes
- [ ] Na página de detalhes, campos estão desabilitados
- [ ] Botão "Salvar" NÃO aparece
- [ ] Tenta submeter formulário → mostra erro

#### 5. Faturas
- [ ] Banner de "somente leitura" aparece
- [ ] Lista mostra apenas faturas do cliente
- [ ] Filtros funcionam
- [ ] Ver detalhes funciona
- [ ] Não consegue editar valores

#### 6. Perfil
- [ ] Carrega dados do usuário
- [ ] Carrega dados da empresa
- [ ] Permite editar campos
- [ ] Salva alterações
- [ ] Mostra toast de sucesso
- [ ] Verifica no banco se dados foram atualizados
- [ ] Verifica se notificação foi criada para admin

#### 7. Segurança
- [ ] Testa acessar OS de outro cliente via URL → 403
- [ ] Testa acessar fatura de outro cliente via URL → 403
- [ ] Testa fazer POST em `/ordens-servico` → 403
- [ ] Testa fazer PUT em `/faturas/:id` → 403
- [ ] Testa acessar área admin → 403

### Testes com Postman/Insomnia

#### Criar Token
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "teste@cliente.com",
  "password": "senha123"
}
```

#### Listar Ordens de Serviço
```http
GET http://localhost:5000/api/ordens-servico
Authorization: Bearer <TOKEN>
```
**Esperado**: Retorna apenas OS do cliente

#### Tentar Criar OS
```http
POST http://localhost:5000/api/ordens-servico
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "cliente": "...",
  "fornecedor": "..."
}
```
**Esperado**: 403 Forbidden

---

## 📝 Notas Importantes

### Segurança
- ✅ Validação no backend (middleware)
- ✅ Validação no frontend (UI)
- ✅ Filtros automáticos por clienteId
- ✅ Verificação de ownership
- ✅ Tokens JWT com expiração

### Performance
- ✅ Índices no MongoDB em clienteId
- ✅ Paginação nas listagens
- ✅ Cache de consultas frequentes
- ✅ Lazy loading de componentes

### Manutenibilidade
- ✅ Código comentado
- ✅ Padrões consistentes
- ✅ Separação de responsabilidades
- ✅ Reutilização de componentes

### Escalabilidade
- ✅ Suporta múltiplos usuários por cliente
- ✅ Suporta múltiplos clientes
- ✅ Middleware reutilizável
- ✅ Arquitetura modular

---

## 🆘 Troubleshooting

### Problema: Usuário não consegue logar
**Causa**: ClienteId inválido ou cliente não existe
**Solução**: 
```bash
# Verificar se cliente existe
docker exec -it mongodb mongo portalfinance \
  --username admin --password senha123 --authenticationDatabase admin \
  --eval "db.clientes.findOne({_id: ObjectId('...')})"
```

### Problema: Dashboard não carrega estatísticas
**Causa**: Faturas sem tipo definido
**Solução**:
```bash
# Atualizar faturas antigas
docker exec -it mongodb mongo portalfinance \
  --username admin --password senha123 --authenticationDatabase admin \
  --eval "db.faturas.updateMany({tipo: null}, {$set: {tipo: 'Cliente'}})"
```

### Problema: Cliente vê dados de outros clientes
**Causa**: Middleware não aplicado na rota
**Solução**: Verificar se middleware `filterByCliente` está na rota:
```javascript
router.get('/', auth, filterByCliente, clienteReadOnly, listar);
```

### Problema: Perfil não salva alterações
**Causa**: Validação falhou ou cliente não tem permissão
**Solução**: Verificar console do navegador e logs do backend

---

## 📚 Referências

- [Documentação Completa do Sistema](../README.md)
- [Guia de Usuários Fornecedor](../FORNECEDOR_USERS_GUIDE.md)
- [Documentação de Faturas](../FATURA_CLIENTES_DOCUMENTACAO.md)
- [Otimização de Performance](../PERFORMANCE_OPTIMIZATION.md)

---

**Última Atualização**: Dezembro 2024  
**Versão**: 1.0  
**Autor**: Sistema Portal Finance
