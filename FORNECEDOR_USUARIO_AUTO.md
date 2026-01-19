# Cadastro Automático de Usuários para Fornecedores

## Problema Identificado

Anteriormente, quando um fornecedor era cadastrado na aba "Fornecedores", era apenas criada uma entidade de negócio, mas **não era criado automaticamente um usuário** para que o fornecedor pudesse fazer login no sistema. Isso exigia que os administradores:

1. Cadastrassem o fornecedor na aba "Fornecedores"
2. Manualmente criassem um usuário na aba "Usuários"
3. Vinculassem o usuário ao fornecedor

## Solução Implementada

### 1. Criação Automática de Usuário

Agora, quando um fornecedor é cadastrado através da aba "Fornecedores", o sistema **automaticamente cria um usuário** com:

- **Nome**: Nome fantasia ou razão social do fornecedor
- **Email**: Email do fornecedor
- **Senha**: A mesma senha informada no cadastro do fornecedor
- **Role**: `fornecedor`
- **FornecedorId**: ID do fornecedor criado
- **Status**: Ativo

### 2. Fluxo de Cadastro

```
Cadastro de Fornecedor
         ↓
Fornecedor é criado
         ↓
Sistema verifica se existe usuário com o email
         ↓
   Se NÃO existe:
   - Cria novo usuário automaticamente
   - Vincula ao fornecedor
         ↓
   Se JÁ existe:
   - Vincula o usuário existente ao fornecedor
         ↓
Fornecedor pode fazer login imediatamente
```

### 3. Tratamento de Erros

- Se houver erro ao criar o usuário, o cadastro do fornecedor **não falha**
- O erro é registrado no console do servidor
- O usuário pode ser criado manualmente depois, se necessário

## Migração de Fornecedores Existentes

### Para Fornecedores Já Cadastrados

Se você já tem fornecedores cadastrados que não possuem usuários, execute o script de migração:

```bash
cd /workspaces/portal-finance
node backend/scripts/migrarFornecedoresParaUsuarios.js
```

### O que o Script Faz

1. **Busca** todos os fornecedores ativos no sistema
2. **Verifica** se cada fornecedor já possui um usuário vinculado
3. **Cria** automaticamente usuários para fornecedores sem usuário
4. **Vincula** usuários existentes que tenham o mesmo email
5. **Gera** senhas temporárias para novos usuários
6. **Exibe** um relatório completo da migração

### Exemplo de Saída do Script

```
✅ Conectado ao MongoDB

📋 Total de fornecedores ativos encontrados: 15

✅ Novo usuário criado para: Empresa ABC Ltda (contato@empresaabc.com)
   Senha temporária: k7m9p2xTemp123!

🔗 Usuário vinculado ao fornecedor: Empresa XYZ (contato@xyz.com)

⏭️  Usuário já existe para: Fornecedor DEF (fornecedor@def.com)

============================================================
📊 RESUMO DA MIGRAÇÃO:
============================================================
Total de fornecedores processados: 15
✅ Usuários criados/vinculados: 10
⏭️  Usuários já existentes: 5
❌ Erros: 0
============================================================

⚠️  IMPORTANTE:
   - As senhas temporárias foram exibidas acima
   - Os fornecedores devem alterar suas senhas no primeiro acesso
   - Recomenda-se usar a funcionalidade "Esqueci minha senha"
```

## Recomendações

### Para Novos Fornecedores

✅ **Não precisa mais criar usuário manualmente!**
- Apenas cadastre o fornecedor normalmente
- O sistema cria o usuário automaticamente
- O fornecedor pode fazer login imediatamente

### Para Fornecedores Migrados

⚠️ **Atenção com as senhas temporárias:**
- Anote as senhas temporárias geradas
- Oriente os fornecedores a:
  1. Fazer login com a senha temporária
  2. Alterar a senha imediatamente
  3. OU usar "Esqueci minha senha" para definir uma nova

### Segurança

🔒 **Boas práticas:**
- Senhas são sempre armazenadas com hash bcrypt
- Senhas temporárias são fortes (8 caracteres + números + símbolos)
- Recomenda-se que fornecedores alterem senhas no primeiro acesso
- Use a funcionalidade "Esqueci minha senha" para redefinir senhas com segurança

## Script Manual (Caso Necessário)

Se precisar criar um usuário fornecedor manualmente:

```bash
node backend/scripts/createFornecedorUser.js
```

Este script:
1. Lista todos os fornecedores disponíveis
2. Permite selecionar um fornecedor
3. Solicita os dados do usuário
4. Cria o usuário vinculado ao fornecedor

## Verificação

### Confirmar que Usuário Foi Criado

1. Acesse a aba "Usuários" no painel administrativo
2. Busque pelo email do fornecedor
3. Verifique que:
   - Role = `fornecedor`
   - FornecedorId está preenchido
   - Status = Ativo

### Testar Login

1. Faça logout do sistema
2. Tente fazer login com:
   - Email do fornecedor
   - Senha cadastrada
3. Verifique que o acesso foi concedido
4. Confirme que o dashboard de fornecedor é exibido

## Códigos Alterados

### Arquivos Modificados

- `backend/controllers/fornecedorController.js` - Adiciona criação automática de usuário
- `backend/scripts/migrarFornecedoresParaUsuarios.js` - Script de migração (novo)
- `FORNECEDOR_USUARIO_AUTO.md` - Esta documentação (novo)

### Alterações no Controller

A função `criarFornecedor` agora:
1. Cria o fornecedor
2. Verifica se existe usuário com o email
3. Cria usuário automaticamente se não existir
4. Vincula usuário existente se necessário
5. Registra logs para rastreamento

## Suporte

Em caso de problemas:

1. **Verifique os logs do servidor** - Erros na criação de usuários são registrados
2. **Execute o script de migração** - Cria usuários faltantes
3. **Crie usuário manualmente** - Use `createFornecedorUser.js` se necessário
4. **Use "Esqueci minha senha"** - Para redefinir senhas problemáticas

## Benefícios

✅ **Automação completa** - Não precisa mais criar usuários manualmente  
✅ **Menos erros** - Reduz esquecimento de criar usuários  
✅ **Melhor experiência** - Fornecedores podem acessar imediatamente  
✅ **Sincronização** - Usuário e fornecedor sempre vinculados  
✅ **Segurança** - Senhas sempre com hash bcrypt  
✅ **Rastreabilidade** - Logs de criação de usuários  
