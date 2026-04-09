import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCache, writeCache, isCacheExpired } from '../src/cache.ts';
import type { CacheData } from '../src/types.ts';

const TMP_DIR = join(tmpdir(), 'mcp-tcu-test-' + Date.now());
const TMP_CACHE = join(TMP_DIR, 'acordaos.json');

before(() => mkdirSync(TMP_DIR, { recursive: true }));
after(() => rmSync(TMP_DIR, { recursive: true, force: true }));

const SAMPLE: CacheData = {
  lastUpdated: new Date().toISOString(),
  totalBaixado: 1,
  acordaos: [
    {
      key: '1', tipo: 'Acórdão', anoAcordao: '2024', titulo: 'T',
      numeroAcordao: '1', colegiado: 'Plenário', dataSessao: '01/01/2024',
      relator: 'X', situacao: 'Normal', sumario: 'S',
      urlArquivo: '', urlArquivoPDF: '', urlAcordao: '',
    },
  ],
};

describe('cache', () => {
  it('retorna null quando arquivo não existe', () => {
    const result = readCache(join(TMP_DIR, 'nonexistent.json'));
    assert.equal(result, null);
  });

  it('escreve e lê o cache corretamente', () => {
    writeCache(SAMPLE, TMP_CACHE);
    const result = readCache(TMP_CACHE);
    assert.deepEqual(result, SAMPLE);
  });

  it('cache fresco não está expirado', () => {
    const data: CacheData = { ...SAMPLE, lastUpdated: new Date().toISOString() };
    assert.equal(isCacheExpired(data), false);
  });

  it('cache com 25h de idade está expirado', () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const data: CacheData = { ...SAMPLE, lastUpdated: old };
    assert.equal(isCacheExpired(data), true);
  });

  it('cria diretório automaticamente ao escrever', () => {
    const nestedPath = join(TMP_DIR, 'subdir', 'cache.json');
    writeCache(SAMPLE, nestedPath);
    const result = readCache(nestedPath);
    assert.ok(result !== null);
  });

  it('retorna null quando acordaos não é array', () => {
    const corruptPath = join(TMP_DIR, 'corrupt.json');
    writeFileSync(corruptPath, JSON.stringify({ lastUpdated: new Date().toISOString(), acordaos: null, totalBaixado: 0 }));
    const result = readCache(corruptPath);
    assert.equal(result, null);
  });
});
