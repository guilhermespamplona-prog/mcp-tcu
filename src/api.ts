import type { Acordao } from './types.js';

const BASE_URL =
  'https://dados-abertos.apps.tcu.gov.br/api/acordao/recupera-acordaos';
const BATCH_SIZE = 100;

async function fetchBatch(inicio: number): Promise<Acordao[]> {
  const url = `${BASE_URL}?inicio=${inicio}&quantidade=${BATCH_SIZE}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json;charset=UTF-8' },
  });
  if (!res.ok) {
    throw new Error(`API TCU retornou HTTP ${res.status} para inicio=${inicio}`);
  }
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as Acordao[]) : [];
}

/**
 * Busca todos os acórdãos a partir do índice `inicio`.
 * Itera páginas de BATCH_SIZE até a API retornar um lote vazio ou menor que BATCH_SIZE.
 *
 * @param inicio - Índice de início (0 para download completo, cache.totalBaixado para incremental)
 * @param onProgress - Callback opcional chamado a cada lote com o total acumulado
 */
export async function fetchAllFrom(
  inicio: number,
  onProgress?: (total: number) => void,
): Promise<Acordao[]> {
  const all: Acordao[] = [];
  let offset = inicio;

  while (true) {
    const batch = await fetchBatch(offset);
    if (batch.length === 0) break;
    all.push(...batch);
    offset += batch.length;
    onProgress?.(all.length);
    if (batch.length < BATCH_SIZE) break;
  }

  return all;
}
