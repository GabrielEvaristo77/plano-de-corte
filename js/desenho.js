// Desenha uma chapa com as peças em SVG.

// Cores suaves, uma por tipo de peça.
export const CORES = ['#93c5fd', '#fca5a5', '#86efac', '#fcd34d', '#c4b5fd', '#f9a8d4', '#67e8f9', '#fdba74', '#a5b4fc', '#bef264'];

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const mm = (n) => Math.round(n).toLocaleString('pt-BR');

export function desenharChapa(chapaInfo, chapa, numero) {
  const { largura: L, altura: A, refilo } = chapa;
  const margem = Math.max(L, A) * 0.045; // espaço para as cotas
  const vb = `${-margem} ${-margem} ${L + margem} ${A + margem}`;
  const fonteCota = Math.max(L, A) * 0.022;

  const pecas = chapaInfo.pecas.map((p) => {
    const cor = CORES[p.tipo % CORES.length];
    const menor = Math.min(p.largura, p.altura);
    const deitado = p.altura > p.largura * 1.6; // texto de lado em peças estreitas e altas
    const tamanho = Math.min(menor * 0.2, Math.max(L, A) * 0.02);
    const cabeTexto = menor >= Math.max(L, A) * 0.05;
    const cx = p.x + p.largura / 2;
    const cy = p.y + p.altura / 2;
    const rot = deitado ? ` transform="rotate(-90 ${cx} ${cy})"` : '';
    const texto = cabeTexto ? `
      <text x="${cx}" y="${cy - tamanho * 0.15}" font-size="${tamanho}" class="nome-peca"${rot}>${esc(p.nome)}</text>
      <text x="${cx}" y="${cy + tamanho * 1.05}" font-size="${tamanho * 0.85}" class="medida-peca"${rot}>${mm(p.largura)} × ${mm(p.altura)}${p.girada ? ' ↻' : ''}</text>` : '';
    return `
      <g>
        <title>${esc(p.nome)}: ${mm(p.largura)} × ${mm(p.altura)} mm${p.girada ? ' (girada)' : ''}</title>
        <rect x="${p.x}" y="${p.y}" width="${p.largura}" height="${p.altura}" fill="${cor}" class="peca"/>
        ${texto}
      </g>`;
  }).join('');

  const sobras = chapaInfo.sobras.map((s) => `
    <rect x="${s.x}" y="${s.y}" width="${s.largura}" height="${s.altura}" class="sobra" fill="url(#hachura-${numero})">
      <title>Sobra: ${mm(s.largura)} × ${mm(s.altura)} mm</title>
    </rect>`).join('');

  return `
    <svg viewBox="${vb}" class="desenho-chapa" role="img"
      aria-label="Chapa ${numero}: ${chapaInfo.pecas.length} peças, ${(chapaInfo.aproveitamento * 100).toFixed(1).replace('.', ',')}% aproveitado">
      <defs>
        <pattern id="hachura-${numero}" width="${L * 0.012}" height="${L * 0.012}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="${L * 0.012}" class="linha-hachura" stroke-width="${L * 0.002}"/>
        </pattern>
      </defs>

      <!-- cotas -->
      <line x1="0" y1="${-margem * 0.45}" x2="${L}" y2="${-margem * 0.45}" class="cota"/>
      <text x="${L / 2}" y="${-margem * 0.6}" font-size="${fonteCota}" class="texto-cota">${mm(L)} mm  →  veio</text>
      <line x1="${-margem * 0.45}" y1="0" x2="${-margem * 0.45}" y2="${A}" class="cota"/>
      <text x="${-margem * 0.6}" y="${A / 2}" font-size="${fonteCota}" class="texto-cota" transform="rotate(-90 ${-margem * 0.6} ${A / 2})">${mm(A)} mm</text>

      <rect x="0" y="0" width="${L}" height="${A}" class="chapa"/>
      ${refilo ? `<rect x="${refilo}" y="${refilo}" width="${L - 2 * refilo}" height="${A - 2 * refilo}" class="area-util"/>` : ''}
      ${sobras}
      ${pecas}
    </svg>`;
}
