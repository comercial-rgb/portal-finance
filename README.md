# Sistema Financeiro - InstaSolutions

Sistema financeiro completo com autenticação segura, controle de usuários e recuperação de senha.

## 🚀 Tecnologias

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT para autenticação
- Bcrypt para criptografia de senhas
- Nodemailer para envio de emails

### Frontend
- React 18
- React Router DOM
- Axios
- React Toastify

## 📋 Funcionalidades

### ✅ Implementadas
- **Tela de Login** com logo centralizada e design moderno
- **Autenticação segura** com JWT
- **Sistema de roles** (Super Admin, Admin, Gerente, Funcionário)
- **Recuperação de senha** via email
- **Redefinição de senha** com token temporário
- **Dashboard** básico com informações do usuário

### 🔐 Níveis de Acesso
1. **Super Admin** - Acesso total, pode criar outros administradores
2. **Admin** - Gerenciar usuários e sistema
3. **Gerente** - Acesso intermediário
4. **Funcionário** - Acesso básico

## 🛠️ Instalação e Configuração

### 1. Instalar dependências do backend

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/portal-finance
JWT_SECRET=seu_jwt_secret_super_seguro_aqui
JWT_EXPIRE=7d

# Email Configuration (Gmail como exemplo)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_de_aplicativo
EMAIL_FROM=noreply@instasolutions.com

FRONTEND_URL=http://localhost:3000
```

### 3. Iniciar MongoDB

Certifique-se de que o MongoDB está rodando:

```bash
# Se estiver usando Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Ou inicie o serviço MongoDB local
sudo service mongodb start
```

### 4. Criar Super Admin

Execute o script para criar o primeiro usuário Super Admin:

```bash
node backend/scripts/createSuperAdmin.js
```

**Credenciais padrão:**
- Email: `admin@instasolutions.com`
- Senha: `admin123456`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

### 5. Instalar dependências do frontend

```bash
cd frontend
npm install
```

### 6. Iniciar o sistema

#### Opção 1: Rodar backend e frontend separadamente

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

#### Opção 2: Rodar tudo junto (requer instalação do concurrently)
```bash
npm run dev:full
```

### 7. Acessar o sistema

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health

## 📧 Configuração de Email (Gmail)

Para usar o Gmail para envio de emails de recuperação de senha:

1. Acesse sua conta Google
2. Vá em **Segurança** → **Verificação em duas etapas**
3. Em **Senhas de app**, gere uma nova senha
4. Use essa senha no campo `EMAIL_PASSWORD` do arquivo `.env`

## 🔐 Endpoints da API

### Autenticação

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@email.com",
  "senha": "senha123"
}
```

#### Esqueci Senha
```http
POST /api/auth/esqueci-senha
Content-Type: application/json

{
  "email": "usuario@email.com"
}
```

#### Redefinir Senha
```http
PUT /api/auth/redefinir-senha/:token
Content-Type: application/json

{
  "novaSenha": "novaSenha123"
}
```

#### Obter Usuário Atual (Requer autenticação)
```http
GET /api/auth/me
Authorization: Bearer {token}
```

## 📱 Tela de Login

A tela de login foi desenvolvida seguindo todas as especificações:

✅ Logo da empresa (InstaSolutions) centralizada  
✅ Título "Sistema Financeiro – InstaSolutions"  
✅ Campos de e-mail e senha com design médio e fácil identificação  
✅ Botão "Entrar" estilizado  
✅ Link "Esqueci a senha" como hyperlink  
✅ Design responsivo para mobile  
✅ Animações suaves  
✅ Validação de campos  

## 🎨 Design

O sistema utiliza uma paleta de cores moderna:
- **Primária:** Gradiente roxo/azul (#667eea → #764ba2)
- **Fundo:** Branco com sombras suaves
- **Textos:** Tons de cinza (#2d3748, #718096)

## 📂 Estrutura do Projeto

```
portal-finance/
├── backend/
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   └── authRoutes.js
│   ├── scripts/
│   │   └── createSuperAdmin.js
│   ├── utils/
│   │   └── email.js
│   └── server.js
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   └── PrivateRoute.js
│       ├── pages/
│       │   ├── Login.js/css
│       │   ├── EsqueciSenha.js/css
│       │   ├── RedefinirSenha.js/css
│       │   └── Dashboard.js/css
│       ├── services/
│       │   ├── api.js
│       │   └── authService.js
│       ├── App.js
│       └── index.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🔒 Segurança

- Senhas criptografadas com bcrypt (salt de 10 rounds)
- Tokens JWT com expiração configurável
- Tokens de reset de senha válidos por 30 minutos
- Proteção de rotas privadas
- Validação de dados no backend
- CORS configurado

## 🚧 Próximas Implementações

- [ ] Gestão de usuários (CRUD completo)
- [ ] Dashboard financeiro
- [ ] Módulo de contas a pagar/receber
- [ ] Relatórios financeiros
- [ ] Gráficos e indicadores
- [ ] Módulo de clientes e fornecedores
- [ ] Controle de fluxo de caixa
- [ ] Exportação de relatórios (PDF/Excel)

## 📝 Licença

Todos os direitos reservados - InstaSolutions © 2025

## 🤝 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.

---

**Sistema desenvolvido para InstaSolutions** 🚀