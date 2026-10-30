import { test } from 'node:test';
import assert from 'node:assert/strict';
import { otimizar, validar, expandirPecas, cabeNaChapa } from '../js/otimizador.js';
import { EXEMPLO } from '../js/exemplo.js';

const CHAPA = { largura: 2750, altura: 1850, serra: 4, refilo: 10 };

// Confere as regras que todo plano de corte precisa respeitar.
function conferirPlano(resultado, chapa) {
  for (const c of resultado.chapas) {
    for (const p of c.pecas) {
      assert.ok(p.x >= chapa.refilo && p.y >= chapa.refilo, `${p.nome} invade o refilo`);
      assert.ok(p.x + p.largura <= chapa.largura - chapa.refilo, `${p.nome} passa da largura`);
      assert.ok(p.y + p.altura <= chapa.altura - chapa.refilo, `${p.nome} passa da altura`);
    }
    // Nenhuma peça encosta em outra sem o espaço da serra.
    for (let i = 0; i < c.pecas.length; i++) {
      for (let j = i + 1; j < c.pecas.length; j++) {
        const a = c.pecas[i];
        const b = c.pecas[j];
        const separadas =
          a.x + a.largura + chapa.serra <= b.x || b.x + b.largura + chapa.serra <= a.x ||
          a.y + a.altura + chapa.serra <= b.y || b.y + b.altura + chapa.serra <= a.y;
        assert.ok(separadas, `${a.nome} e ${b.nome} se sobrepõem`);
      }
    }
    assert.ok(ehGuilhotina(c.pecas, chapa), 'o plano precisa ser cortável em guilhotina');
  }
}

// Um plano é "guilhotina" se dá para separar as peças com cortes de ponta a ponta,
// repetindo o processo em cada parte até sobrar uma peça por parte.
function ehGuilhotina(pecas) {
  if (pecas.length <= 1) return true;
  for (const eixo of ['x', 'y']) {
    const tam = eixo === 'x' ? 'largura' : 'altura';
    const cortes = [...new Set(pecas.map((p) => p[eixo] + p[tam]))].sort((a, b) => a - b);
    for (const corte of cortes) {
      const antes = pecas.filter((p) => p[eixo] + p[tam] <= corte);
      const depois = pecas.filter((p) => p[eixo] >= corte);
      if (antes.length && depois.length && antes.length + depois.length === pecas.length) {
        return ehGuilhotina(antes) && ehGuilhotina(depois);
      }
    }
  }
  return false;
}

test('exemplo de armário: todas as peças posicionadas e plano válido', () => {
  const r = otimizar(CHAPA, EXEMPLO.pecas);
  const total = EXEMPLO.pecas.reduce((s, p) => s + p.quantidade, 0);
  assert.equal(r.chapas.reduce((s, c) => s + c.pecas.length, 0), total);
  assert.equal(r.naoCabem.length, 0);
  conferirPlano(r, CHAPA);
  assert.ok(r.aproveitamento > 0 && r.aproveitamento <= 1);
});

test('peças que preenchem a chapa exatamente cabem em uma só', () => {
  const chapa = { largura: 1000, altura: 500, serra: 0, refilo: 0 };
  const r = otimizar(chapa, [{ nome: 'Quadrado', largura: 250, altura: 250, quantidade: 8, podeGirar: false }]);
  assert.equal(r.chapas.length, 1);
  assert.equal(r.aproveitamento, 1);
});

test('a espessura da serra é descontada entre as peças', () => {
  // Sem serra caberiam 4 peças de 250 em 1000 mm; com 4 mm de serra só cabem 3 por fileira.
  const chapa = { largura: 1000, altura: 250, serra: 4, refilo: 0 };
  const r = otimizar(chapa, [{ nome: 'P', largura: 250, altura: 250, quantidade: 4, podeGirar: false }]);
  assert.equal(r.chapas.length, 2);
  conferirPlano(r, chapa);
});

test('peça que não pode girar respeita o sentido do veio', () => {
  const chapa = { largura: 1000, altura: 400, serra: 0, refilo: 0 };
  const pecaEmPe = { nome: 'Lateral', largura: 300, altura: 900, quantidade: 1 };
  assert.equal(otimizar(chapa, [{ ...pecaEmPe, podeGirar: false }]).naoCabem.length, 1);
  const girando = otimizar(chapa, [{ ...pecaEmPe, podeGirar: true }]);
  assert.equal(girando.naoCabem.length, 0);
  assert.equal(girando.chapas[0].pecas[0].girada, true);
});

test('peça maior que a chapa é avisada e não trava o cálculo', () => {
  const r = otimizar(CHAPA, [
    { nome: 'Gigante', largura: 3000, altura: 500, quantidade: 2, podeGirar: true },
    { nome: 'Normal', largura: 500, altura: 500, quantidade: 3, podeGirar: true },
  ]);
  assert.deepEqual(r.naoCabem, [{ nome: 'Gigante', largura: 3000, altura: 500, quantidade: 2 }]);
  assert.equal(r.totalPecas, 3);
});

test('o refilo reduz a área útil', () => {
  const peca = { largura: 2750, altura: 100, podeGirar: false };
  assert.equal(cabeNaChapa(peca, { ...CHAPA, refilo: 0 }), true);
  assert.equal(cabeNaChapa(peca, CHAPA), false);
});

test('muitas peças pequenas: plano continua válido', () => {
  const r = otimizar(CHAPA, [
    { nome: 'A', largura: 437, altura: 289, quantidade: 37, podeGirar: true },
    { nome: 'B', largura: 813, altura: 152, quantidade: 21, podeGirar: false },
    { nome: 'C', largura: 1204, altura: 377, quantidade: 9, podeGirar: true },
  ]);
  conferirPlano(r, CHAPA);
  assert.equal(r.chapas.reduce((s, c) => s + c.pecas.length, 0), 67);
});

test('sobras listadas não se sobrepõem às peças', () => {
  const r = otimizar(CHAPA, EXEMPLO.pecas);
  for (const c of r.chapas) {
    for (const s of c.sobras) {
      for (const p of c.pecas) {
        const separadas = s.x + s.largura <= p.x || p.x + p.largura <= s.x || s.y + s.altura <= p.y || p.y + p.altura <= s.y;
        assert.ok(separadas, 'sobra em cima de peça');
      }
    }
  }
});

test('validação aponta dados inválidos', () => {
  assert.deepEqual(validar(CHAPA, EXEMPLO.pecas), []);
  const erros = validar({ largura: 0, altura: 1850, serra: 30, refilo: 10 }, [
    { nome: 'X', largura: 100, altura: NaN, quantidade: 1.5 },
  ]);
  assert.equal(erros.length, 5);
});

test('expandir peças respeita a quantidade', () => {
  assert.equal(expandirPecas([{ nome: 'a', largura: 1, altura: 1, quantidade: 3 }]).length, 3);
});
