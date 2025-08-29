export const CATEGORIAS = [
  { id: 'aprimorador', nome: 'Aprimoramento' },
  { id: 'emissor', nome: 'Emissão' },
  { id: 'transmutador', nome: 'Transmutação' },
  { id: 'manipulador', nome: 'Manipulação' },
  { id: 'conjurador', nome: 'Conjuração' },
  { id: 'especialista', nome: 'Especialização' },
];

export const AFINIDADES_PADRAO = {
  aprimorador: { aprimorador: 100, emissor: 80, transmutador: 60, manipulador: 60, conjurador: 80, especialista: 0 },
  emissor: { emissor: 100, transmutador: 80, aprimorador: 80, manipulador: 60, conjurador: 60, especialista: 0 },
  transmutador: { transmutador: 100, manipulador: 80, emissor: 60, conjurador: 60, aprimorador: 80, especialista: 0 },
  manipulador: { manipulador: 100, transmutador: 80, conjurador: 80, emissor: 60, especialista: 0, aprimorador: 60 },
  conjurador: { conjurador: 100, manipulador: 80, aprimorador: 60, especialista: 0, emissor: 60, transmutador: 80 },
  especialista: { especialista: 100, aprimorador: 0, emissor: 0, transmutador: 0, manipulador: 0, conjurador: 0 },
};

export function penalidadePorAfinidade(percent) {
  if (percent >= 100) return 0;
  if (percent >= 80) return 1;
  if (percent >= 60) return 2;
  if (percent >= 40) return 4;
  return Infinity; // 0%: proibido
}
