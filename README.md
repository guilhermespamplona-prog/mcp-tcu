# mcp-tcu

MCP server para consulta de acórdãos do TCU (Tribunal de Contas da União) diretamente no Claude Code.

## O que faz

Expõe a ferramenta `tcu_buscar` no Claude Code, permitindo buscar acórdãos do TCU por palavras-chave sem sair do ambiente de trabalho. Útil para pesquisa de jurisprudência durante atividades jurídicas e de auditoria.

**Fontes:** [Dados Abertos TCU](https://dados-abertos.apps.tcu.gov.br/) — API pública, sem autenticação necessária.

## Como usar

Após instalado (ver abaixo), basta pedir ao Claude:

> *"Busca acórdãos do TCU sobre pregão eletrônico para serviços de TI"*

O Claude chamará `tcu_buscar` automaticamente e retornará os acórdãos relevantes com sumário e links para o texto completo e PDF.

### Parâmetros da ferramenta `tcu_buscar`

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `texto` | string | *obrigatório* | Termos de busca (AND lógico). Ex: `"pregão eletrônico TI"` |
| `campos` | string[] | `["sumario"]` | Campos onde buscar: `sumario`, `titulo`, `relator`, `colegiado` |
| `ano` | string | — | Filtrar por ano. Ex: `"2024"` |
| `limite` | number | `20` | Máximo de resultados |
| `atualizar` | boolean | `false` | Forçar re-download completo do cache |

### Exemplos

```
"Busca acórdãos sobre licitação"
"Busca acórdãos sobre pregão eletrônico no ano 2024"
"Busca acórdãos do relator Vital do Rêgo sobre obras públicas"
"Atualiza o cache de acórdãos do TCU"
```

## Arquitetura

```
src/
├── index.ts    # Entry point MCP — registra tcu_buscar, stdio transport
├── api.ts      # Cliente HTTP — paginação em lotes de 100 da API do TCU
├── cache.ts    # Cache local JSON com TTL 24h e sincronização incremental
├── search.ts   # Busca AND, normalização de acentos (NFD), ordenação por data
└── types.ts    # Interfaces Acordao e CacheData

tests/
├── search.test.ts  # 10 testes unitários (TDD)
└── cache.test.ts   # 6 testes unitários (TDD)

data/
└── acordaos.json   # Cache local (gitignored — gerado automaticamente)
```

**Fluxo de sincronização:**
1. Primeira chamada: baixa todos os acórdãos em lotes de 100
2. Chamadas seguintes (< 24h): usa cache local — busca instantânea
3. Cache expirado (> 24h): download incremental dos acórdãos novos
4. `atualizar: true`: re-download completo

## Instalação

### Pré-requisitos

- Node.js ≥ 20 (testado com v24.14.1 via nvm)
- Claude Code

### 1. Clonar e instalar

```bash
git clone https://github.com/guilhermespamplona-prog/mcp-tcu.git ~/mcp-tcu
cd ~/mcp-tcu
npm install
npm run build
```

### 2. Registrar no Claude Code

Adicionar em `~/.claude.json`, dentro de `projects["/home/SEU_USUARIO"]["mcpServers"]`:

```json
"tcu": {
  "command": "/home/SEU_USUARIO/.nvm/versions/node/v24.14.1/bin/node",
  "args": ["/home/SEU_USUARIO/mcp-tcu/dist/index.js"],
  "env": {
    "PATH": "/home/SEU_USUARIO/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin",
    "CACHE_PATH": "/home/SEU_USUARIO/mcp-tcu/data/acordaos.json"
  }
}
```

> **Nota sobre o nvm:** Use o caminho absoluto para o Node — o nvm não é carregado no ambiente do MCP.

### 3. Reiniciar o Claude Code

Feche e reabra o Claude Code. Use `/mcp` para verificar se o servidor `tcu` aparece como conectado.

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar testes
npm test

# Compilar
npm run build

# Verificar tipos sem compilar
npx tsc --noEmit
```

### Stack

- **TypeScript 5** — ESM NodeNext
- **@modelcontextprotocol/sdk** — protocolo MCP
- **zod** — validação de schema da ferramenta
- **node:test** — runner de testes nativo (sem dependências extras)
- **tsx** — execução de TypeScript nos testes

## API do TCU

Este servidor usa a [API de Dados Abertos do TCU](https://dados-abertos.apps.tcu.gov.br/):

```
GET https://dados-abertos.apps.tcu.gov.br/api/acordao/recupera-acordaos?inicio={n}&quantidade={n}
```

A API não suporta filtro por texto — apenas paginação por índice. A busca textual é implementada localmente sobre o cache.

## Licença

MIT
