export interface Acordao {
  key: string;
  tipo: string;
  anoAcordao: string;
  titulo: string;
  numeroAcordao: string;
  colegiado: string;
  dataSessao: string;   // formato DD/MM/AAAA
  relator: string;
  situacao: string;
  sumario: string;
  urlArquivo: string;
  urlArquivoPDF: string;
  urlAcordao: string;
}

export interface CacheData {
  lastUpdated: string;   // ISO timestamp
  totalBaixado: number;  // total de acórdãos no array
  acordaos: Acordao[];
}
