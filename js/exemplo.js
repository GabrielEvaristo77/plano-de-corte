// Projeto de exemplo: um armário de cozinha simples em MDF.
// "comprimento" é a medida no sentido do veio da chapa (ao longo dos 2750 mm).
export const EXEMPLO = {
  chapa: { largura: 2750, altura: 1850, serra: 4, refilo: 10 },
  pecas: [
    { nome: 'Lateral', largura: 2100, altura: 550, quantidade: 2, podeGirar: false },
    { nome: 'Porta', largura: 2096, altura: 447, quantidade: 2, podeGirar: false },
    { nome: 'Fundo', largura: 2096, altura: 896, quantidade: 1, podeGirar: false },
    { nome: 'Base e tampo', largura: 868, altura: 550, quantidade: 2, podeGirar: true },
    { nome: 'Prateleira', largura: 864, altura: 520, quantidade: 4, podeGirar: true },
    { nome: 'Rodapé', largura: 868, altura: 100, quantidade: 2, podeGirar: true },
    { nome: 'Frente de gaveta', largura: 444, altura: 180, quantidade: 2, podeGirar: false },
    { nome: 'Lateral de gaveta', largura: 450, altura: 150, quantidade: 4, podeGirar: true },
  ],
};
