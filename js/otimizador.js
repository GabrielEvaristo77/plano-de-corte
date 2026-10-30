// Otimizador de plano de corte para chapas (MDF, compensado etc.).
//
// Usa o algoritmo de "guilhotina": cada corte atravessa a área inteira,
// de ponta a ponta, que é como uma seccionadora ou serra esquadrejadeira corta.
// Toda vez que uma peça é encaixada, a área livre é dividida em dois retângulos menores.
//
// Como a ordem das peças e a forma de dividir mudam bastante o resultado,
// o otimizador testa várias combinações e fica com a que usa menos chapas.

// Formas de ordenar as peças antes de encaixar (as maiores primeiro costuma funcionar melhor).
const ORDENACOES = {
  area: (a, b) => b.largura * b.altura - a.largura * a.altura,
  maiorLado: (a, b) => Math.max(b.largura, b.altura) - Math.max(a.largura, a.altura),
  altura: (a, b) => b.altura - a.altura || b.largura - a.largura,
  largura: (a, b) => b.largura - a.largura || b.altura - a.altura,
  perimetro: (a, b) => b.largura + b.altura - (a.largura + a.altura),
};

// Como escolher o espaço livre onde a peça vai entrar.
const ENCAIXES = {
  // Espaço que sobra menos área
  menorArea: (livre, l, a) => [livre.largura * livre.altura - l * a, Math.min(livre.largura - l, livre.altura - a)],
  // Espaço em que o lado que sobra é o menor
  menorLado: (livre, l, a) => [Math.min(livre.largura - l, livre.altura - a), Math.max(livre.largura - l, livre.altura - a)],
};

// Depois de encaixar, em que direção fazer o corte que separa as sobras.
// "horizontal" = corte atravessando toda a largura; "vertical" = toda a altura.
const DIVISOES = {
  sobraMaior: (sobraL, sobraA) => (sobraL > sobraA ? 'vertical' : 'horizontal'),
  sobraMenor: (sobraL, sobraA) => (sobraL > sobraA ? 'horizontal' : 'vertical'),
  sempreHorizontal: () => 'horizontal',
  sempreVertical: () => 'vertical',
};

// Transforma a lista de peças (com quantidade) em peças individuais.
export function expandirPecas(pecas) {
  const lista = [];
  pecas.forEach((p, tipo) => {
    for (let i = 0; i < p.quantidade; i++) {
      lista.push({ tipo, nome: p.nome, largura: p.largura, altura: p.altura, podeGirar: p.podeGirar });
    }
  });
  return lista;
}

function novaChapa(chapa) {
  const r = chapa.refilo;
  return {
    pecas: [],
    livres: [{ x: r, y: r, largura: chapa.largura - 2 * r, altura: chapa.altura - 2 * r }],
  };
}

// Procura o melhor espaço livre para a peça em todas as chapas abertas.
function melhorPosicao(chapas, peca, encaixe) {
  let melhor = null;
  const orientacoes = [[peca.largura, peca.altura, false]];
  if (peca.podeGirar && peca.largura !== peca.altura) orientacoes.push([peca.altura, peca.largura, true]);

  chapas.forEach((chapa, iChapa) => {
    chapa.livres.forEach((livre, iLivre) => {
      for (const [l, a, girada] of orientacoes) {
        if (l > livre.largura || a > livre.altura) continue;
        const nota = encaixe(livre, l, a);
        if (!melhor || nota[0] < melhor.nota[0] || (nota[0] === melhor.nota[0] && nota[1] < melhor.nota[1])) {
          melhor = { iChapa, iLivre, largura: l, altura: a, girada, nota };
        }
      }
    });
  });
  return melhor;
}

// Divide o espaço livre em até dois retângulos, descontando a espessura da serra.
function dividir(livre, l, a, serra, divisao) {
  const sobraL = livre.largura - l - serra; // sobra à direita da peça
  const sobraA = livre.altura - a - serra; // sobra abaixo da peça
  const direcao = divisao(sobraL, sobraA);

  const direita = { x: livre.x + l + serra, y: livre.y, largura: sobraL };
  const abaixo = { x: livre.x, y: livre.y + a + serra, altura: sobraA };

  if (direcao === 'horizontal') {
    // Primeiro corte atravessa toda a largura: a sobra de baixo fica com a largura inteira.
    direita.altura = a;
    abaixo.largura = livre.largura;
  } else {
    // Primeiro corte atravessa toda a altura: a sobra da direita fica com a altura inteira.
    direita.altura = livre.altura;
    abaixo.largura = l;
  }
  return [direita, abaixo].filter((r) => r.largura > 0 && r.altura > 0);
}

function encaixarTodas(pecasOrdenadas, chapa, encaixe, divisao) {
  const chapas = [];
  for (const peca of pecasOrdenadas) {
    let pos = melhorPosicao(chapas, peca, encaixe);
    if (!pos) {
      chapas.push(novaChapa(chapa));
      pos = melhorPosicao([chapas.at(-1)], peca, encaixe);
      pos.iChapa = chapas.length - 1;
    }
    const alvo = chapas[pos.iChapa];
    const livre = alvo.livres[pos.iLivre];
    alvo.pecas.push({ ...peca, x: livre.x, y: livre.y, largura: pos.largura, altura: pos.altura, girada: pos.girada });
    alvo.livres.splice(pos.iLivre, 1, ...dividir(livre, pos.largura, pos.altura, chapa.serra, divisao));
  }
  return chapas;
}

// Uma peça cabe numa chapa vazia (considerando o refilo e a rotação permitida)?
export function cabeNaChapa(peca, chapa) {
  const L = chapa.largura - 2 * chapa.refilo;
  const A = chapa.altura - 2 * chapa.refilo;
  if (peca.largura <= L && peca.altura <= A) return true;
  return peca.podeGirar && peca.altura <= L && peca.largura <= A;
}

// Nota para comparar resultados: menos chapas é melhor; com o mesmo número,
// é melhor concentrar as peças nas primeiras chapas e deixar a última mais livre.
function pontuar(chapas, areaChapa) {
  const usos = chapas.map((c) => c.pecas.reduce((s, p) => s + p.largura * p.altura, 0) / areaChapa);
  return [chapas.length, -usos.reduce((s, u) => s + u * u, 0)];
}

export function otimizar(chapa, pecas, opcoes = {}) {
  const todas = expandirPecas(pecas);
  const naoCabem = todas.filter((p) => !cabeNaChapa(p, chapa));
  const cabem = todas.filter((p) => cabeNaChapa(p, chapa));
  const areaChapa = chapa.largura * chapa.altura;

  let melhor = null;
  let tentativas = 0;
  const ordenacoes = opcoes.ordenacoes || Object.keys(ORDENACOES);
  for (const nomeOrdem of ordenacoes) {
    const ordenadas = [...cabem].sort(ORDENACOES[nomeOrdem]);
    for (const encaixe of Object.values(ENCAIXES)) {
      for (const divisao of Object.values(DIVISOES)) {
        tentativas++;
        const chapas = encaixarTodas(ordenadas, chapa, encaixe, divisao);
        const nota = pontuar(chapas, areaChapa);
        if (!melhor || nota[0] < melhor.nota[0] || (nota[0] === melhor.nota[0] && nota[1] < melhor.nota[1])) {
          melhor = { chapas, nota };
        }
      }
    }
  }

  const chapas = (melhor?.chapas || []).map((c) => resumirChapa(c, chapa));
  const areaPecas = chapas.reduce((s, c) => s + c.areaPecas, 0);
  return {
    chapas,
    naoCabem: agrupar(naoCabem),
    tentativas,
    totalPecas: cabem.length,
    aproveitamento: chapas.length ? areaPecas / (areaChapa * chapas.length) : 0,
  };
}

// Sobras com pelo menos este tamanho nos dois lados são listadas como reaproveitáveis.
const SOBRA_MINIMA = 100;

function resumirChapa(c, chapa) {
  const areaPecas = c.pecas.reduce((s, p) => s + p.largura * p.altura, 0);
  return {
    pecas: c.pecas,
    sobras: c.livres
      .filter((r) => r.largura >= SOBRA_MINIMA && r.altura >= SOBRA_MINIMA)
      .sort((a, b) => b.largura * b.altura - a.largura * a.altura),
    areaPecas,
    aproveitamento: areaPecas / (chapa.largura * chapa.altura),
  };
}

function agrupar(lista) {
  const mapa = new Map();
  for (const p of lista) {
    const chave = `${p.nome}|${p.largura}|${p.altura}`;
    if (!mapa.has(chave)) mapa.set(chave, { nome: p.nome, largura: p.largura, altura: p.altura, quantidade: 0 });
    mapa.get(chave).quantidade++;
  }
  return [...mapa.values()];
}

// Confere os dados digitados. Devolve uma lista de mensagens de erro (vazia = tudo certo).
export function validar(chapa, pecas) {
  const erros = [];
  const num = (v) => Number.isFinite(v) && v > 0;
  if (!num(chapa.largura) || !num(chapa.altura)) erros.push('Informe a largura e a altura da chapa.');
  if (!(chapa.serra >= 0 && chapa.serra <= 20)) erros.push('A espessura da serra deve ficar entre 0 e 20 mm.');
  if (!(chapa.refilo >= 0) || chapa.refilo * 2 >= Math.min(chapa.largura, chapa.altura)) {
    erros.push('O refilo é grande demais para essa chapa.');
  }
  pecas.forEach((p, i) => {
    const nome = p.nome || `Peça ${i + 1}`;
    if (!num(p.largura) || !num(p.altura)) erros.push(`${nome}: informe largura e altura.`);
    if (!Number.isInteger(p.quantidade) || p.quantidade < 1 || p.quantidade > 500) {
      erros.push(`${nome}: a quantidade deve ser um número inteiro entre 1 e 500.`);
    }
  });
  const total = pecas.reduce((s, p) => s + (Number.isInteger(p.quantidade) ? p.quantidade : 0), 0);
  if (total > 1000) erros.push('O limite é de 1000 peças por plano.');
  return erros;
}
