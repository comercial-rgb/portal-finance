# Documentação - Notas Fiscais Clientes

## Visão Geral

O módulo de **Notas Fiscais Clientes** permite o gerenciamento completo de notas fiscais vinculadas aos clientes, incluindo integração com faturas, centros de custo e subunidades.

## Funcionalidades

### 1. Inclusão de Notas Fiscais

- **N° da Nota Fiscal**: Campo obrigatório para identificação única da nota
- **Tipo**: Seleção entre Peças, Serviços ou Geral
- **Cliente**: Vinculação obrigatória com um cliente cadastrado
- **Centro de Custo**: Campo opcional para organização contábil
- **Subunidade**: Campo opcional para subdivisão organizacional
- **Data de Emissão**: Data obrigatória de emissão da nota fiscal
- **Data de Vencimento**: Calculado automaticamente 30 dias após a data de emissão (pode ser editado)
- **Fatura**: Campo opcional para vincular a uma fatura existente do cliente
- **Valor Devido**: Preenchido automaticamente ao vincular uma fatura, ou manualmente se não houver fatura vinculada
- **Status**: Pendente, Pago, Vencido ou Cancelado
- **Observações**: Campo livre para anotações

### 2. Listagem e Filtros

A página permite filtrar notas fiscais por:
- Cliente
- Status
- Período (data início e fim)

### 3. Edição e Exclusão

- Editar notas fiscais existentes
- Excluir notas fiscais (com confirmação)

## Estrutura Técnica

### Backend

#### Modelo (`NotaFiscalCliente.js`)
```javascript
{
  numeroNotaFiscal: String (obrigatório),
  tipo: String (Peças|Serviços|Geral),
  dataEmissao: Date (obrigatório),
  dataVencimento: Date (obrigatório),
  clienteId: ObjectId (referência ao Cliente),
  centroCusto: String,
  subunidade: String,
  faturaId: ObjectId (referência à Fatura, opcional),
  valorDevido: Number (obrigatório),
  observacoes: String,
  status: String (pendente|pago|vencido|cancelado),
  criadoPor: ObjectId (referência ao User)
}
```

#### Rotas (`/api/notas-fiscais-clientes`)

- `POST /` - Criar nova nota fiscal
- `GET /` - Listar notas fiscais (com paginação e filtros)
- `GET /estatisticas` - Buscar estatísticas
- `GET /:id` - Buscar nota fiscal por ID
- `PUT /:id` - Atualizar nota fiscal
- `DELETE /:id` - Deletar nota fiscal

#### Controller (`notaFiscalClienteController.js`)

Implementa todas as operações CRUD e lógica de negócio:
- Validação de cliente existente
- Cálculo automático do vencimento (30 dias)
- Preenchimento automático do valor quando vincula fatura
- Estatísticas agregadas por status

### Frontend

#### Página (`NotasFiscaisClientes.js`)

Componente React completo com:
- Formulário modal para criar/editar
- Tabela com listagem paginada
- Filtros avançados
- Integração com APIs de clientes e faturas
- Validações de formulário
- Feedback visual (toasts)

#### Rotas

- Acessível em: `/notas-fiscais-clientes`
- Disponível para roles: `super_admin`, `admin`, `gerente`, `funcionario`

## Fluxo de Uso

### Criar Nova Nota Fiscal

1. Acessar "Notas Fiscais Clientes" no menu lateral
2. Clicar em "+ Nova Nota Fiscal"
3. Preencher os campos obrigatórios:
   - N° da Nota Fiscal
   - Tipo (Peças, Serviços ou Geral)
   - Cliente
   - Data de Emissão
4. (Opcional) Selecionar uma fatura do cliente
   - O valor será preenchido automaticamente
5. Se não vincular fatura, preencher o valor manualmente
6. A data de vencimento é calculada automaticamente (30 dias após emissão)
7. Adicionar Centro de Custo, Subunidade e Observações se necessário
8. Clicar em "Criar"

### Vincular Fatura

Ao selecionar um cliente:
- O sistema carrega automaticamente as faturas disponíveis daquele cliente
- Ao selecionar uma fatura, o valor devido é preenchido automaticamente com o valor total da fatura

### Editar Nota Fiscal

1. Clicar no ícone de edição (✏️) na linha desejada
2. Modificar os campos necessários
3. Clicar em "Atualizar"

### Filtrar Notas Fiscais

1. Usar os campos de filtro na parte superior
2. Selecionar cliente, status e/ou período
3. Clicar em "Filtrar"
4. Use "Limpar" para remover todos os filtros

## Permissões

A funcionalidade está disponível **exclusivamente** para os seguintes perfis administrativos:
- Super Admin
- Admin

> **Nota**: Gerentes e Funcionários não têm acesso a este módulo.

## Validações

### Campos Obrigatórios
- N° da Nota Fiscal
- Cliente
- Tipo
- Data de Emissão
- Valor Devido

### Validações de Negócio
- Cliente deve existir no sistema
- Se fatura for informada, ela deve existir e pertencer ao cliente
- Valor devido deve ser maior que zero
- Data de vencimento é calculada automaticamente mas pode ser editada

## Integrações

### Com Clientes
- Cada nota fiscal deve estar vinculada a um cliente
- O sistema valida a existência do cliente antes de criar a nota

### Com Faturas
- Vinculação opcional com faturas existentes
- Ao vincular, o valor da fatura é usado automaticamente
- Permite rastreamento de notas fiscais relacionadas a faturas

## Índices no Banco de Dados

Para otimizar as consultas, foram criados índices em:
- `clienteId`
- `faturaId`
- `numeroNotaFiscal`
- `dataVencimento`
- `status`

## Próximas Melhorias Sugeridas

1. **Relatórios**: Exportação de relatórios em PDF/Excel
2. **Dashboard**: Widget com resumo de notas fiscais no dashboard
3. **Notificações**: Alertas automáticos para notas próximas ao vencimento
4. **Upload de Arquivos**: Anexar PDF da nota fiscal
5. **Histórico**: Log de alterações em cada nota fiscal
6. **Integração Contábil**: Exportação para sistemas contábeis
7. **Lote**: Criação de múltiplas notas fiscais de uma vez
8. **Aprovação**: Fluxo de aprovação antes da confirmação

## Suporte

Para dúvidas ou problemas:
- Verifique os logs do servidor backend
- Console do navegador para erros de frontend
- Documentação da API em `/api/health`
