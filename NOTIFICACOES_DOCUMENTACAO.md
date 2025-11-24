# Sistema de Notificações Avançadas e Monitoramento de Faturas

## Visão Geral

Este documento descreve as funcionalidades de notificações com rastreamento de alterações e monitoramento automático de faturas vencidas.

## 1. Rastreamento de Alterações em Perfis

### Funcionalidade
Quando usuários Clientes ou Fornecedores atualizam seus perfis, o sistema automaticamente:
- Compara os dados antigos com os novos
- Identifica quais campos foram alterados
- Cria notificações para administradores com detalhes das mudanças
- Armazena histórico completo no campo `alteracoes` da notificação

### Campos Monitorados

**Fornecedor:**
- razaoSocial, nomeFantasia, cnpjCpf
- inscricaoEstadual, telefone, email
- endereco, numero, complemento, bairro, cidade, estado, cep
- banco, agencia, conta, tipoConta
- chavePix, tipoChavePix

**Cliente:**
- razaoSocial, nomeFantasia, cnpj
- inscricaoEstadual, telefone, email
- endereco, numero, complemento, bairro, cidade, estado, cep

### Visualização
As notificações mostram:
- Título e mensagem descritiva
- Lista de campos alterados
- Valores anteriores e novos (formato: "anterior → novo")
- Data/hora da alteração

### Exemplo de Notificação
```
Título: Perfil de Fornecedor Atualizado
Mensagem: O fornecedor XYZ Ltda atualizou seu perfil. Campos alterados: telefone, email, chavePix

Detalhes:
- telefone: (11) 1234-5678 → (11) 9876-5432
- email: antigo@email.com → novo@email.com
- chavePix: 12345678000190 → novachave@email.com
```

## 2. Data de Vencimento e Monitoramento de Faturas

### Campo dataVencimento
As faturas de Cliente agora possuem um campo opcional `dataVencimento` (tipo: Date).

**Como definir:**
1. Ao criar uma fatura na página "Faturas Clientes"
2. No modal de prévia da fatura
3. Campo "Data de Vencimento (opcional)"

### Monitoramento Automático
O sistema verifica diariamente faturas vencidas através do script:
```bash
npm run monitorar-faturas
```

**O script:**
- Busca faturas de Cliente com `dataVencimento` anterior à data atual
- Filtra apenas faturas não pagas (statusFatura ≠ 'Paga')
- Calcula dias de atraso
- Cria notificações para administradores
- Evita duplicação (não cria notificação se já existe no mesmo dia)

### Agendamento Recomendado
Para execução automática diária, configure um cron job:

**Linux/Mac:**
```bash
# Editar crontab
crontab -e

# Adicionar linha (executa todo dia às 8h)
0 8 * * * cd /caminho/para/portal-finance && npm run monitorar-faturas
```

**Windows (Task Scheduler):**
1. Abrir "Agendador de Tarefas"
2. Criar Tarefa Básica
3. Nome: "Monitorar Faturas Vencidas"
4. Gatilho: Diariamente às 8:00
5. Ação: Iniciar programa
6. Programa: `cmd.exe`
7. Argumentos: `/c cd C:\caminho\para\portal-finance && npm run monitorar-faturas`

### Popup de Alerta
Administradores recebem um popup visual ao acessar o Dashboard quando existem faturas vencidas.

**Características:**
- Exibe automaticamente no login
- Lista todas as faturas vencidas
- Mostra: número da fatura, cliente, valor devido, dias de atraso
- Opções: "Não mostrar hoje" ou "Ver Faturas"
- Não reaparece no mesmo dia após ser dispensado

**Verificação:**
- Automática ao carregar o Dashboard
- Re-verificação a cada 30 minutos
- Disparo manual: recarregar a página

## 3. Estrutura do Banco de Dados

### Modelo Notificacao
```javascript
{
  tipo: String, // 'perfil_fornecedor_atualizado', 'perfil_cliente_atualizado', 'fatura_vencida'
  titulo: String,
  mensagem: String,
  usuario: ObjectId, // Administrador destinatário
  fornecedor: ObjectId, // Referência ao fornecedor (opcional)
  cliente: ObjectId, // Referência ao cliente (opcional)
  fatura: ObjectId, // Referência à fatura (opcional)
  alteracoes: Object, // Objeto com detalhes das mudanças
  lida: Boolean,
  dataLeitura: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Formato do campo alteracoes

**Para perfis:**
```javascript
{
  telefone: { anterior: "(11) 1234-5678", novo: "(11) 9876-5432" },
  email: { anterior: "antigo@email.com", novo: "novo@email.com" }
}
```

**Para faturas vencidas:**
```javascript
{
  numeroFatura: "FAT-CLI-12345678",
  dataVencimento: "2024-01-15T00:00:00.000Z",
  diasVencidos: 5,
  valorDevido: 1500.00,
  valorRestante: 1500.00
}
```

### Modelo Fatura (novo campo)
```javascript
{
  // ... campos existentes
  dataVencimento: Date, // Opcional
  // ... demais campos
}
```

## 4. APIs

### GET /notificacoes
Lista notificações do usuário logado (admin).

**Resposta:**
```json
[
  {
    "_id": "...",
    "tipo": "perfil_fornecedor_atualizado",
    "titulo": "Perfil de Fornecedor Atualizado",
    "mensagem": "O fornecedor XYZ atualizou seu perfil...",
    "alteracoes": {
      "telefone": { "anterior": "...", "novo": "..." }
    },
    "lida": false,
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
]
```

### PATCH /notificacoes/:id/ler
Marca notificação como lida.

### PATCH /notificacoes/marcar-todas-lidas
Marca todas as notificações do usuário como lidas.

### GET /notificacoes/nao-lidas/count
Retorna contagem de notificações não lidas.

## 5. Componentes Frontend

### FaturasVencidasAlert
**Localização:** `/frontend/src/components/FaturasVencidasAlert.js`

**Props:** Nenhuma (usa contexto do usuário)

**Comportamento:**
- Auto-renderiza no Dashboard para admins
- Verifica faturas vencidas ao montar
- Re-verifica a cada 30 minutos
- Armazena dismissal no localStorage

### Header (Notificações)
**Melhorias:**
- Exibe detalhes das alterações inline
- Ícones diferenciados por tipo de notificação
- Limite de 3 alterações visíveis (com indicador "+N mais")
- Scroll infinito para muitas notificações

## 6. Casos de Uso

### Caso 1: Fornecedor atualiza telefone
1. Fornecedor faz login
2. Acessa "Meu Perfil"
3. Altera telefone de (11) 1234-5678 para (11) 9876-5432
4. Clica em "Salvar"
5. Sistema detecta alteração
6. Administradores recebem notificação instantânea
7. Notificação mostra: "telefone: (11) 1234-5678 → (11) 9876-5432"

### Caso 2: Fatura de Cliente vence
1. Administrador cria fatura para Cliente XYZ
2. Define dataVencimento como 2024-01-15
3. Fatura não é paga até 2024-01-20
4. Script diário executa às 8h
5. Detecta fatura vencida há 5 dias
6. Cria notificação para todos os admins
7. Admins veem popup ao fazer login
8. Popup mostra: "Fatura FAT-CLI-12345 vencida há 5 dias - R$ 1.500,00"

## 7. Manutenção

### Limpeza de Notificações Antigas
Recomenda-se criar script para arquivar/deletar notificações antigas:

```javascript
// Exemplo: deletar notificações lidas com mais de 90 dias
const tresMesesAtras = new Date();
tresMesesAtras.setDate(tresMesesAtras.getDate() - 90);

await Notificacao.deleteMany({
  lida: true,
  dataLeitura: { $lt: tresMesesAtras }
});
```

### Logs
O sistema registra logs importantes:
- `📬 Notificações criadas para N administradores...`
- `🔍 Encontradas N faturas vencidas`
- `✅ Total de N notificações criadas...`

## 8. Segurança

### Controle de Acesso
- Apenas admins (admin, super_admin) visualizam notificações
- Cada admin vê apenas suas próprias notificações
- Usuários comuns não têm acesso às APIs de notificação

### Validação
- Controllers validam IDs antes de comparar alterações
- Prevenção de duplicação em notificações de faturas vencidas
- Sanitização de dados no campo alteracoes

## 9. Performance

### Otimizações Implementadas
- Índices em Notificacao: `usuario`, `lida`, `createdAt`
- Índices em Fatura: `dataVencimento`, `statusFatura`
- Uso de `.lean()` em queries de leitura
- Batch insert com `insertMany()`
- Cache no localStorage para dismissal de popups

### Recomendações
- Executar script de monitoramento fora do horário de pico
- Implementar paginação se notificações > 100
- Considerar WebSocket para notificações real-time (futuro)

## 10. Troubleshooting

### Notificações não aparecem
1. Verificar se usuário é admin: `user.role === 'admin' || 'super_admin'`
2. Checar console: erro de API?
3. Verificar MongoDB: `db.notificacoes.find({ usuario: ObjectId(...) })`

### Script de monitoramento não executa
1. Verificar conexão MongoDB: `MONGODB_URI` no .env
2. Testar manualmente: `npm run monitorar-faturas`
3. Verificar logs: erros de conexão ou queries
4. Checar cron job: `crontab -l` (Linux/Mac)

### Popup não aparece
1. Verificar localStorage: `ultimoAlertaFaturasVencidas`
2. Limpar: `localStorage.removeItem('ultimoAlertaFaturasVencidas')`
3. Verificar se há faturas vencidas no banco
4. Checar console do navegador: erros JS?

---

**Última atualização:** Janeiro 2024  
**Versão:** 1.0.0
