# 🗄️ Guia: Configuração MongoDB Atlas

## Passo 1: Criar Conta

1. Acesse: **https://www.mongodb.com/cloud/atlas/register**
2. Crie conta (pode usar Google/GitHub para facilitar)
3. Preencha informações básicas

---

## Passo 2: Criar Cluster Gratuito

1. Após login, clique no botão verde **"+ Create"** ou **"Build a Database"**

2. **Escolha o plano:**
   - Selecione **"M0 FREE"** (512 MB - Gratuito para sempre)
   - ✅ Suporta até 500 conexões simultâneas

3. **Configurações do Cluster:**
   ```
   Provider:  AWS (Amazon Web Services)
   Region:    São Paulo (sa-east-1) ← Melhor latência Brasil
   Name:      portal-finance-cluster
   ```

4. Clique em **"Create Cluster"**

⏱️ **Aguarde 3-5 minutos** - O cluster será provisionado

---

## Passo 3: Configurar Usuário do Banco

Quando o cluster estiver pronto, um modal aparecerá:

### A) Criar Usuário

```
Username:  admin_portal
Password:  [Clique em "Autogenerate Secure Password"]
```

**⚠️ IMPORTANTE:** Copie e salve a senha em local seguro!

Exemplo de senha gerada: `Hx9kL2mN5pQ8rT4v`

### B) Permissões

- Deixe marcado: **"Read and write to any database"**
- Clique em **"Create User"**

---

## Passo 4: Configurar Acesso de Rede

### A) IP Atual

1. Clique em **"Add My Current IP Address"**
2. Será adicionado automaticamente

### B) Permitir Qualquer IP (Para Deploy)

1. Clique em **"Add a Different IP Address"**
2. Digite:
   ```
   IP Address:  0.0.0.0/0
   Description: Allow from anywhere (for production servers)
   ```
3. Clique em **"Add Entry"**

⚠️ **Nota:** Em produção, é mais seguro adicionar apenas IPs específicos do servidor

4. Clique em **"Finish and Close"**

---

## Passo 5: Obter Connection String

1. No painel do Atlas, vá até seu cluster
2. Clique no botão **"Connect"**
3. Escolha **"Connect your application"**
4. Configurações:
   ```
   Driver:   Node.js
   Version:  5.5 or later
   ```

5. Copie a **Connection String**:

```
mongodb+srv://admin_portal:<password>@portal-finance-cluster.abc123.mongodb.net/?retryWrites=true&w=majority
```

---

## Passo 6: Preparar Connection String

### Formato Original:
```
mongodb+srv://admin_portal:<password>@portal-finance-cluster.abc123.mongodb.net/?retryWrites=true&w=majority
```

### Modificações Necessárias:

1. **Substituir `<password>`** pela senha real (que você salvou)
2. **Adicionar nome do banco** antes da `?`

### Resultado Final:
```
mongodb+srv://admin_portal:Hx9kL2mN5pQ8rT4v@portal-finance-cluster.abc123.mongodb.net/portal-finance?retryWrites=true&w=majority
```

**Estrutura:**
```
mongodb+srv://[usuario]:[senha]@[cluster].[id].mongodb.net/[nome-banco]?[opcoes]
```

---

## Passo 7: Configurar no Projeto

### A) Gerar JWT Secret

Execute no terminal:
```bash
cd /workspaces/portal-finance
node backend/scripts/generate-jwt-secret.js
```

Copie a chave gerada.

### B) Criar arquivo .env

```bash
cp .env.example .env
```

### C) Editar .env com seus dados

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://admin_portal:SuaSenhaReal@portal-finance-cluster.abc123.mongodb.net/portal-finance?retryWrites=true&w=majority

# JWT
JWT_SECRET=chave_gerada_pelo_script
JWT_EXPIRE=30d

# Email (configurar depois)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-senha-de-app
```

---

## Passo 8: Testar Conexão

### A) Parar MongoDB local (se estiver rodando)

```bash
docker ps | grep mongo
docker stop [container_id]
```

### B) Iniciar backend com MongoDB Atlas

```bash
cd /workspaces/portal-finance
node backend/server.js
```

### C) Verificar logs

Procure por:
```
✅ MongoDB Conectado: portal-finance-cluster.abc123.mongodb.net
🚀 Servidor rodando na porta 5000
```

---

## Passo 9: Migrar Dados (Opcional)

Se você tem dados no MongoDB local e quer migrar:

### Exportar do MongoDB local:
```bash
mongodump --uri="mongodb://172.17.0.2:27017/portal-finance" --out=/tmp/backup
```

### Importar para MongoDB Atlas:
```bash
mongorestore --uri="mongodb+srv://admin_portal:senha@cluster.mongodb.net/portal-finance" /tmp/backup/portal-finance
```

---

## ✅ Checklist Final

- [ ] Cluster criado no MongoDB Atlas
- [ ] Usuário `admin_portal` criado
- [ ] IPs configurados (meu IP + 0.0.0.0/0)
- [ ] Connection String obtida e modificada
- [ ] JWT_SECRET gerado
- [ ] Arquivo `.env` criado e configurado
- [ ] Backend testado com sucesso
- [ ] Dados migrados (se necessário)

---

## 🔧 Troubleshooting

### Erro: "MongoNetworkError: connection timed out"
- Verifique se adicionou `0.0.0.0/0` nos IPs permitidos
- Verifique se a senha está correta na URI

### Erro: "Authentication failed"
- Verifique se o usuário e senha estão corretos
- A senha pode conter caracteres especiais que precisam ser URL-encoded

### Para URL-encode senha com caracteres especiais:
```javascript
const senha = "Abc@123#";
const senhaEncoded = encodeURIComponent(senha);
// Resultado: Abc%40123%23
```

---

## 📊 Monitoramento

No painel do MongoDB Atlas você pode:

- Ver métricas de uso (conexões, operações, storage)
- Configurar alertas
- Ver logs de acesso
- Fazer backups sob demanda
- Visualizar dados (Collections)

**Acesse:** Database → Collections → Browse Collections

---

## 🔒 Segurança

### Boas Práticas:

1. ✅ Nunca commite `.env` no Git
2. ✅ Use senhas fortes (geradas)
3. ✅ Rotacione credenciais periodicamente
4. ✅ Em produção, use IPs específicos
5. ✅ Ative autenticação de dois fatores no Atlas
6. ✅ Monitore logs de acesso

---

## 📞 Suporte

- Documentação: https://docs.atlas.mongodb.com/
- Comunidade: https://community.mongodb.com/
- Status: https://status.cloud.mongodb.com/

---

**Pronto! Seu MongoDB Atlas está configurado e pronto para produção! 🚀**
