import type { Acordao } from './types.js';

const DEFAULT_CAMPOS = ['sumario'] as const;

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseDate(d: string): number {
  // dataSessao formato: DD/MM/AAAA
  const [day, month, year] = d.split('/');
  if (!day || !month || !year) return 0;
  return new Date(`${year}-${month}-${day}`).getTime();
}

export interface SearchOptions {
  texto: string;
  campos?: string[];
  ano?: string;
  limite?: number;
}

export function search(acordaos: Acordao[], opts: SearchOptions): Acordao[] {
  const campos = opts.campos ?? [...DEFAULT_CAMPOS];
  const termos = normalize(opts.texto).split(/\s+/).filter(Boolean);
  const limite = opts.limite ?? 20;

  if (termos.length === 0) return [];

  let results = acordaos;

  if (opts.ano) {
    results = results.filter((a) => a.anoAcordao === opts.ano);
  }

  return results
    .map((a) => {
      const text = campos
        .map((c) => normalize((a as unknown as Record<string, string>)[c] ?? ''))
        .join(' ');
      const matches = termos.filter((t) => text.includes(t)).length;
      return { a, matches };
    })
    .filter(({ matches }) => matches === termos.length)
    .sort((x, y) => parseDate(y.a.dataSessao) - parseDate(x.a.dataSessao))
    .slice(0, limite)
    .map(({ a }) => a);
}
