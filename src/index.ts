import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { fetchAllFrom } from './api.js';
import { readCache, writeCache, isCacheExpired } from './cache.js';
import { search } from './search.js';
import type { CacheData } from './types.js';

const server = new McpServer({
  name: 'tcu',
  version: '1.0.0',
});

server.tool(
  'tcu_buscar',
  'Busca acórdãos do TCU por palavras-chave. Sincroniza o cache local automaticamente na primeira vez ou quando expirado (>24h). Use para consultar jurisprudência do Tribunal de Contas da União.',
  {
    texto: z.string().describe(
      'Termos de busca separados por espaço (AND lógico). Ex: "pregão eletrônico TI"',
    ),
    campos: z
      .array(z.enum(['sumario', 'titulo', 'relator', 'colegiado']))
      .optional()
      .describe('Campos onde buscar (default: sumario)'),
    ano: z.string().optional().describe('Filtrar por ano de expedição. Ex: "2024"'),
    limite: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Máximo de resultados retornados (default: 20)'),
    atualizar: z
      .boolean()
      .optional()
      .describe('Forçar re-download completo do cache (default: false)'),
  },
  async ({ texto, campos, ano, limite, atualizar }) => {
    try {
      let cache = readCache();
      const needsSync = !cache || isCacheExpired(cache) || atualizar === true;

      if (needsSync) {
        if (!cache || atualizar === true) {
          // Download completo
          const acordaos = await fetchAllFrom(0);
          cache = {
            lastUpdated: new Date().toISOString(),
            totalBaixado: acordaos.length,
            acordaos,
          } satisfies CacheData;
        } else {
          // Download incremental: apenas os novos
          const novos = await fetchAllFrom(cache.totalBaixado);
          // Deduplicar por key para evitar duplicatas em caso de re-indexação da API
          const existingKeys = new Set(cache.acordaos.map((a) => a.key));
          const unicos = novos.filter((a) => !existingKeys.has(a.key));
          cache.acordaos.push(...unicos);
          // Nota: totalBaixado é usado como offset da API. Para a API do TCU, que usa
          // índices sequenciais append-only, offset == array length. Se a API mudar
          // para indexação não-sequencial, estas grandezas precisarão ser separadas.
          cache.totalBaixado = cache.acordaos.length;
          cache.lastUpdated = new Date().toISOString();
        }
        try {
          writeCache(cache);
        } catch (err) {
          process.stderr.write(`[mcp-tcu] Cache write failed: ${err}\n`);
          // Continua — cache válido em memória para esta requisição
        }
      }

      // cache is guaranteed non-null: either it was already set (needsSync=false only when cache != null)
      // or it was assigned inside the needsSync block above.
      const resultados = search(cache!.acordaos, { texto, campos, ano, limite });

      if (resultados.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Nenhum acórdão encontrado para "${texto}"${ano ? ` no ano ${ano}` : ''}.`,
            },
          ],
        };
      }

      const linhas = resultados.map(
        (a, i) =>
          `## ${i + 1}. Acórdão ${a.numeroAcordao}/${a.anoAcordao} — ${a.colegiado}\n` +
          `**Data:** ${a.dataSessao} | **Relator:** ${a.relator} | **Situação:** ${a.situacao}\n` +
          `**Título:** ${a.titulo}\n` +
          `**Sumário:** ${a.sumario.length > 500 ? a.sumario.slice(0, 500) + '…' : a.sumario}\n` +
          `**Links:** [Texto completo](${a.urlAcordao}) | [PDF](${a.urlArquivoPDF})\n`,
      );

      const header =
        `Encontrados **${resultados.length}** acórdão(s) de ${cache!.acordaos.length} no cache` +
        (ano ? ` (filtrado por ano: ${ano})` : '') +
        `:\n\n`;

      return {
        content: [{ type: 'text', text: header + linhas.join('\n---\n\n') }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Erro ao consultar acórdãos do TCU: ${msg}` }],
      };
    }
  },
);

const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  process.stderr.write(`[mcp-tcu] Fatal: ${err}\n`);
  process.exit(1);
});
