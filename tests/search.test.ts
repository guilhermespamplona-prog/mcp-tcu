import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { search } from '../src/search.ts';
import type { Acordao } from '../src/types.ts';

function makeAcordao(overrides: Partial<Acordao> = {}): Acordao {
  return {
    key: '1',
    tipo: 'Acórdão',
    anoAcordao: '2024',
    titulo: 'Sobre licitação pública',
    numeroAcordao: '1234',
    colegiado: 'Plenário',
    dataSessao: '15/03/2024',
    relator: 'Min. João Silva',
    situacao: 'Normal',
    sumario: 'Trata de pregão eletrônico para serviços de TI.',
    urlArquivo: '',
    urlArquivoPDF: 'http://example.com/pdf',
    urlAcordao: 'http://example.com',
    ...overrides,
  };
}

describe('search', () => {
  it('encontra acórdão quando todos os termos estão no sumário', () => {
    const acordaos = [makeAcordao()];
    const result = search(acordaos, { texto: 'pregão eletrônico' });
    assert.equal(result.length, 1);
  });

  it('busca sem acento encontra texto com acento', () => {
    const acordaos = [makeAcordao()];
    const result = search(acordaos, { texto: 'pregao eletronico' });
    assert.equal(result.length, 1);
  });

  it('busca case-insensitive', () => {
    const acordaos = [makeAcordao()];
    const result = search(acordaos, { texto: 'PREGÃO' });
    assert.equal(result.length, 1);
  });

  it('AND lógico: exige todos os termos', () => {
    const acordaos = [makeAcordao({ sumario: 'Apenas pregão aqui.' })];
    const result = search(acordaos, { texto: 'pregão licitação' });
    assert.equal(result.length, 0);
  });

  it('filtra por ano', () => {
    const acordaos = [
      makeAcordao({ anoAcordao: '2023', sumario: 'licitação' }),
      makeAcordao({ key: '2', anoAcordao: '2024', sumario: 'licitação' }),
    ];
    const result = search(acordaos, { texto: 'licitação', ano: '2024' });
    assert.equal(result.length, 1);
    assert.equal(result[0].anoAcordao, '2024');
  });

  it('respeita o limite de resultados', () => {
    const acordaos = Array.from({ length: 10 }, (_, i) =>
      makeAcordao({ key: String(i), sumario: 'licitação pregão' }),
    );
    const result = search(acordaos, { texto: 'licitação', limite: 3 });
    assert.equal(result.length, 3);
  });

  it('ordena por data mais recente primeiro', () => {
    const acordaos = [
      makeAcordao({ key: '1', dataSessao: '01/01/2022', sumario: 'pregão' }),
      makeAcordao({ key: '2', dataSessao: '01/01/2024', sumario: 'pregão' }),
      makeAcordao({ key: '3', dataSessao: '01/01/2023', sumario: 'pregão' }),
    ];
    const result = search(acordaos, { texto: 'pregão' });
    assert.equal(result[0].dataSessao, '01/01/2024');
    assert.equal(result[1].dataSessao, '01/01/2023');
    assert.equal(result[2].dataSessao, '01/01/2022');
  });

  it('busca no titulo quando especificado em campos', () => {
    const acordaos = [makeAcordao({ titulo: 'Pregão para obras', sumario: 'outro conteúdo' })];
    const result = search(acordaos, { texto: 'pregão', campos: ['titulo'] });
    assert.equal(result.length, 1);
  });

  it('texto vazio retorna array vazio', () => {
    const acordaos = [makeAcordao()];
    const result = search(acordaos, { texto: '' });
    assert.equal(result.length, 0);
  });

  it('texto com apenas espaços retorna array vazio', () => {
    const acordaos = [makeAcordao()];
    const result = search(acordaos, { texto: '   ' });
    assert.equal(result.length, 0);
  });
});
