# Sistema de Usuários Fornecedores

## 📋 Visão Geral

O sistema agora suporta usuários do tipo **Fornecedor** com acesso restrito apenas para visualização dos seus próprios dados.

## 🔐 Permissões de Usuários Fornecedores

### ✅ Permitido (Somente Leitura)
- **Ordens de Serviço**: Visualizar apenas as OS relacionadas ao seu fornecedor
- **Faturas Fornecedores**: Visualizar apenas suas próprias faturas
- **Faturados**: Visualizar apenas seus próprios faturamentos
- **Perfil**: Visualizar e **editar** seus dados pessoais

### ❌ Bloqueado
- Criar, editar ou excluir Ordens de Serviço
- Criar, editar ou excluir Faturas
- Modificar status de pagamento
- Acessar dados de outros fornecedores
- Acessar dados de clientes
- Acessar contratos e empenhos
- Gerenciar usuários

## 🚀 Como Criar um Usuário Fornecedor

### Método 1: Script Interativo (Recomendado)

```bash
cd /workspaces/portal-finance
node backend/scripts/createFornecedorUser.js
```

O script irá:
1. Listar todos os fornecedores cadastrados
2. Solicitar os dados do usuário (nome, email, senha, etc.)
3. Criar o usuário vinculado ao fornecedor escolhido
4. Exibir as credenciais de acesso

### Método 2: Banco de Dados Manual

```javascript
// Exemplo via MongoDB
use portal-finance

db.users.insertOne({
  nome: "João Silva",
  email: "joao@fornecedor.com",
  senha: "$2a$10$...", // Hash bcrypt
  role: "fornecedor",
  fornecedorId: ObjectId("..."), // ID do fornecedor
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## 🔧 Estrutura Técnica

### Modelo de Usuário Atualizado

```javascript
{
  nome: String,
  email: String,
  senha: String (hashed),
  role: 'fornecedor', // Novo role
  fornecedorId: ObjectId, // Referência ao Fornecedor
  ativo: Boolean,
  cpf: String,
  telefone: String
}
```

### Middleware de Segurança

#### `filterByFornecedor`
Filtra automaticamente todas as consultas para retornar apenas dados do fornecedor logado.

```javascript
// Aplicado em rotas GET
if (req.user.role === 'fornecedor') {
  query.fornecedor = req.user.fornecedorId;
}
```

#### `fornecedorReadOnly`
Bloqueia operações de escrita (POST, PUT, PATCH, DELETE) para usuários fornecedores.

```javascript
// Aplicado em rotas de modificação
if (req.user.role === 'fornecedor') {
  return res.status(403).json({ 
    message: 'Somente visualização permitida' 
  });
}
```

### Rotas Protegidas

#### Ordens de Serviço
```javascript
router.get('/', protect, filterByFornecedor, controller.get);
router.post('/', protect, fornecedorReadOnly, controller.create);
router.put('/:id', protect, fornecedorReadOnly, controller.update);
router.delete('/:id', protect, fornecedorReadOnly, controller.delete);
```

#### Faturas
```javascript
router.get('/', protect, filterByFornecedor, controller.listar);
router.post('/', protect, fornecedorReadOnly, controller.criar);
router.put('/:id', protect, fornecedorReadOnly, controller.atualizar);
router.delete('/:id', protect, fornecedorReadOnly, controller.desativar);
```

## 📬 Sistema de Notificações

### Notificação Automática de Atualização de Perfil

Quando um usuário fornecedor atualiza seu perfil:

1. **Backend** cria notificações para todos os administradores ativos
2. **Administradores** recebem notificação em tempo real
3. **Notificação** inclui: nome do fornecedor, usuário que atualizou, data/hora

### API de Notificações

```bash
# Listar notificações do usuário logado
GET /api/notificacoes

# Listar apenas não lidas
GET /api/notificacoes?lida=false

# Marcar notificação como lida
PATCH /api/notificacoes/:id/ler

# Marcar todas como lidas
PATCH /api/notificacoes/marcar-todas-lidas

# Contar não lidas
GET /api/notificacoes/nao-lidas/count
```

## 🎨 Interface Frontend

### Página de Perfil para Fornecedores

Arquivo: `/frontend/src/pages/PerfilFornecedorUsuario.js`

Funcionalidades:
- Editar dados pessoais (nome, email, telefone, CPF)
- Alterar senha
- Informação clara sobre notificação automática aos admins
- Validação de formulário
- Feedback visual de sucesso/erro

### Componentes Afetados

Todos os componentes de visualização devem verificar a role do usuário:

```javascript
const user = authService.getCurrentUser();
const isFornecedor = user?.role === 'fornecedor';

// Ocultar botões de ação para fornecedores
{!isFornecedor && (
  <button onClick={handleEdit}>Editar</button>
)}
```

## 📊 Dashboard para Fornecedores

Recomenda-se criar um dashboard customizado com:

- Resumo de OS pendentes
- Total faturado no mês
- Últimas faturas
- Avisos importantes
- Link para perfil

## 🔍 Testes

### Teste Manual

1. **Criar fornecedor** no sistema (se ainda não existe)
2. **Executar script** `createFornecedorUser.js`
3. **Fazer logout** do usuário atual
4. **Fazer login** com credenciais do fornecedor
5. **Verificar**:
   - Dashboard mostra apenas opções permitidas
   - Ordens de Serviço lista apenas suas OS
   - Faturas lista apenas suas faturas
   - Botões de criar/editar/excluir não aparecem
   - Perfil pode ser editado
   - Notificação é criada ao atualizar perfil

### Teste de Segurança

```bash
# Tentar criar OS como fornecedor (deve falhar)
curl -X POST http://localhost:5000/api/ordens-servico \
  -H "Authorization: Bearer [token-fornecedor]" \
  -H "Content-Type: application/json" \
  -d '{"dados":"teste"}'

# Resposta esperada: 403 Forbidden
```

## 🐛 Troubleshooting

### Problema: Fornecedor vê dados de outros fornecedores
**Solução**: Verificar se middleware `filterByFornecedor` está aplicado na rota

### Problema: Fornecedor consegue criar/editar dados
**Solução**: Verificar se middleware `fornecedorReadOnly` está aplicado na rota

### Problema: Notificações não aparecem
**Solução**: 
- Verificar se route `/api/notificacoes` está registrada no server.js
- Verificar se model `Notificacao` foi criado
- Verificar logs do backend ao atualizar perfil

### Problema: Erro ao criar usuário fornecedor
**Solução**:
- Verificar se fornecedor existe no banco
- Verificar se email já está cadastrado
- Verificar formato do fornecedorId (deve ser ObjectId válido)

## 📝 Checklist de Implementação Frontend

- [ ] Atualizar Sidebar para mostrar apenas opções permitidas para fornecedores
- [ ] Ocultar botões de ação (Criar, Editar, Excluir) nas páginas de listagem
- [ ] Criar dashboard específico para fornecedores
- [ ] Adicionar badge "Somente Leitura" nas páginas
- [ ] Implementar sistema de notificações no header
- [ ] Criar rota para página de perfil fornecedor
- [ ] Adicionar validação de role nas rotas privadas
- [ ] Criar testes E2E para fluxo de fornecedor

## 🔒 Segurança

### Pontos de Atenção

1. **Token JWT**: Incluir `fornecedorId` no payload do token
2. **Validação**: Sempre validar role no backend, nunca confiar apenas no frontend
3. **Queries**: Sempre filtrar por `fornecedorId` quando role === 'fornecedor'
4. **Endpoints**: Proteger TODOS os endpoints de modificação com `fornecedorReadOnly`

### Boas Práticas

- Nunca expor IDs de outros fornecedores em respostas
- Logar todas as tentativas de acesso negado
- Implementar rate limiting mais restritivo para fornecedores
- Revisar periodicamente logs de acesso

## 📚 Próximos Passos

1. [ ] Implementar dashboard específico para fornecedores
2. [ ] Adicionar relatórios de faturamento para fornecedores
3. [ ] Criar sistema de mensagens entre fornecedor e admin
4. [ ] Implementar upload de documentos pelo fornecedor
5. [ ] Adicionar notificações push/email
6. [ ] Criar painel de analytics para fornecedores
7. [ ] Implementar sistema de tickets de suporte

---

## 💡 Dica Rápida

Para testar rapidamente, crie um fornecedor teste:

```bash
# Criar fornecedor via interface ou MongoDB
# Depois executar:
node backend/scripts/createFornecedorUser.js

# Selecionar o fornecedor
# Informar dados:
#   Nome: Teste Fornecedor
#   Email: teste@fornecedor.com
#   Senha: 123456

# Login: teste@fornecedor.com / 123456
```
