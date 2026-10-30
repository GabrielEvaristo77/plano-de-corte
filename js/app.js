// Ponto de entrada: lê o formulário, roda o otimizador e mostra o resultado.
import { otimizar, validar } from './otimizador.js';
import { desenharChapa, CORES, mm } from './desenho.js';
import { carregarProjeto, salvarProjeto } from './armazenamento.js';
import { EXEMPLO } from './exemplo.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (v) => `${(v * 100).toFixed(1).replace('.', ',')}%`;
const m2 = (mm2) => `${(mm2 / 1e6).toFixed(2).replace('.', ',')} m²`;

const campos = {
  modelo: $('modelo-chapa'),
  largura: $('chapa-largura'),
  altura: $('chapa-altura'),
  serra: $('chapa-serra'),
  refilo: $('chapa-refilo'),
};
const listaPecas = $('lista-pecas');
const resultado = $('resultado');

let projeto = carregarProjeto() || structuredClone(EXEMPLO);

// ---------- Formulário ----------

function preencherChapa() {
  const { largura, altura, serra, refilo } = projeto.chapa;
  campos.largura.value = largura;
  campos.altura.value = altura;
  campos.serra.value = serra;
  campos.refilo.value = refilo;
  const modelo = `${largura}x${altura}`;
  campos.modelo.value = [...campos.modelo.options].some((o) => o.value === modelo) ? modelo : 'personalizado';
}

function linhaPeca(p, i) {
  const cor = CORES[i % CORES.length];
  return `
    <div class="linha-peca" role="row" data-i="${i}">
      <label class="nome-com-cor"><i style="background:${cor}"></i>
        <input aria-label="Nome da peça ${i + 1}" data-campo="nome" value="${esc(p.nome)}" placeholder="Peça ${i + 1}" maxlength="30">
      </label>
      <input aria-label="Comprimento da peça ${i + 1}" data-campo="largura" type="number" min="1" inputmode="numeric" value="${p.largura || ''}">
      <input aria-label="Largura da peça ${i + 1}" data-campo="altura" type="number" min="1" inputmode="numeric" value="${p.altura || ''}">
      <input aria-label="Quantidade da peça ${i + 1}" data-campo="quantidade" type="number" min="1" max="500" inputmode="numeric" value="${p.quantidade || ''}">
      <label class="girar" title="Pode girar"><input data-campo="podeGirar" type="checkbox" ${p.podeGirar ? 'checked' : ''}><span aria-hidden="true">↻</span><span class="sr">Pode girar</span></label>
      <button type="button" class="remover" data-remover="${i}" aria-label="Remover peça ${i + 1}">×</button>
    </div>`;
}

function desenharListaPecas() {
  listaPecas.innerHTML = projeto.pecas.map(linhaPeca).join('');
  atualizarContador();
}

function atualizarContador() {
  const total = projeto.pecas.reduce((s, p) => s + (Number.isInteger(p.quantidade) ? p.quantidade : 0), 0);
  $('contador-pecas').textContent = `${total} ${total === 1 ? 'peça' : 'peças'}`;
}

// Lê um campo numérico; campo vazio vira NaN para a validação acusar.
const numero = (input) => (input.value.trim() === '' ? NaN : Number(input.value));

function lerChapa() {
  projeto.chapa = {
    largura: numero(campos.largura),
    altura: numero(campos.altura),
    serra: numero(campos.serra),
    refilo: numero(campos.refilo),
  };
}

campos.modelo.addEventListener('change', () => {
  if (campos.modelo.value === 'personalizado') return campos.largura.focus();
  const [l, a] = campos.modelo.value.split('x');
  campos.largura.value = l;
  campos.altura.value = a;
  alterou();
});

for (const nome of ['largura', 'altura', 'serra', 'refilo']) {
  campos[nome].addEventListener('input', () => {
    if (nome === 'largura' || nome === 'altura') campos.modelo.value = 'personalizado';
    alterou();
  });
}

listaPecas.addEventListener('input', (e) => {
  const linha = e.target.closest('.linha-peca');
  const campo = e.target.dataset.campo;
  if (!linha || !campo) return;
  const peca = projeto.pecas[Number(linha.dataset.i)];
  if (campo === 'nome') peca.nome = e.target.value;
  else if (campo === 'podeGirar') peca.podeGirar = e.target.checked;
  else peca[campo] = numero(e.target);
  atualizarContador();
  alterou();
});

listaPecas.addEventListener('click', (e) => {
  const botao = e.target.closest('[data-remover]');
  if (!botao) return;
  projeto.pecas.splice(Number(botao.dataset.remover), 1);
  desenharListaPecas();
  alterou();
});

$('btn-adicionar').addEventListener('click', () => {
  projeto.pecas.push({ nome: '', largura: NaN, altura: NaN, quantidade: 1, podeGirar: true });
  desenharListaPecas();
  listaPecas.querySelector('.linha-peca:last-child input[data-campo="nome"]').focus();
});

$('btn-limpar').addEventListener('click', () => {
  projeto.pecas = [];
  desenharListaPecas();
  alterou();
});

$('btn-exemplo').addEventListener('click', () => {
  projeto = structuredClone(EXEMPLO);
  preencherChapa();
  desenharListaPecas();
  alterou();
});

$('btn-imprimir').addEventListener('click', () => window.print());

// ---------- Cálculo ----------

let espera;
function alterou() {
  clearTimeout(espera);
  // Espera a pessoa parar de digitar antes de recalcular.
  espera = setTimeout(calcular, 250);
}

function calcular() {
  lerChapa();
  salvarProjeto(projeto);

  if (!projeto.pecas.length) {
    resultado.innerHTML = `
      <div class="cartao vazio">
        <h2>Nenhuma peça na lista</h2>
        <p>Adicione as peças do seu projeto ou carregue o exemplo para ver o plano de corte.</p>
      </div>`;
    return;
  }

  const erros = validar(projeto.chapa, projeto.pecas);
  if (erros.length) {
    resultado.innerHTML = `
      <div class="cartao aviso" role="alert">
        <h2>Confira os dados</h2>
        <ul>${erros.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
      </div>`;
    return;
  }

  const pecas = projeto.pecas.map((p, i) => ({ ...p, nome: p.nome.trim() || `Peça ${i + 1}` }));
  const r = otimizar(projeto.chapa, pecas);
  mostrarResultado(r);
}

function mostrarResultado(r) {
  const { chapa } = projeto;
  const areaChapa = chapa.largura * chapa.altura;
  const areaPecas = r.chapas.reduce((s, c) => s + c.areaPecas, 0);
  const desperdicio = r.chapas.length * areaChapa - areaPecas;

  const naoCabem = r.naoCabem.length ? `
    <div class="cartao aviso" role="alert">
      <h2>Peças maiores que a chapa</h2>
      <p>Estas peças não cabem na área útil da chapa${chapa.refilo ? ' (já descontando o refilo)' : ''} e ficaram de fora:</p>
      <ul>${r.naoCabem.map((p) => `<li><strong>${esc(p.nome)}</strong>: ${mm(p.largura)} × ${mm(p.altura)} mm (${p.quantidade}×)</li>`).join('')}</ul>
    </div>` : '';

  const resumo = `
    <div class="resumo">
      <div class="indicador destaque"><strong>${r.chapas.length}</strong><span>${r.chapas.length === 1 ? 'chapa' : 'chapas'}</span></div>
      <div class="indicador"><strong>${pct(r.aproveitamento)}</strong><span>de aproveitamento</span></div>
      <div class="indicador"><strong>${r.totalPecas}</strong><span>peças posicionadas</span></div>
      <div class="indicador"><strong>${m2(desperdicio)}</strong><span>de sobra</span></div>
    </div>`;

  const chapas = r.chapas.map((c, i) => `
    <article class="cartao chapa-resultado">
      <header class="cabecalho-chapa">
        <h2>Chapa ${i + 1} <span>de ${r.chapas.length}</span></h2>
        <div class="barra-uso" title="${pct(c.aproveitamento)} aproveitado">
          <span style="width:${(c.aproveitamento * 100).toFixed(1)}%"></span>
        </div>
        <strong class="uso">${pct(c.aproveitamento)}</strong>
      </header>
      ${desenharChapa(c, chapa, i + 1)}
      <footer class="rodape-chapa">
        <span>${c.pecas.length} ${c.pecas.length === 1 ? 'peça' : 'peças'}</span>
        ${c.sobras.length ? `<span>Sobras aproveitáveis: ${c.sobras.slice(0, 4).map((s) => `${mm(s.largura)} × ${mm(s.altura)}`).join(' · ')}${c.sobras.length > 4 ? ' …' : ''}</span>` : ''}
      </footer>
    </article>`).join('');

  resultado.innerHTML = naoCabem + (r.chapas.length ? resumo + chapas : '');
}

// ---------- Início ----------

preencherChapa();
desenharListaPecas();
calcular();
