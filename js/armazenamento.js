// Guarda o projeto atual no navegador para não perder ao fechar a página.
const CHAVE = 'plano-de-corte:projeto';

export function carregarProjeto() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE));
  } catch {
    return null;
  }
}

export function salvarProjeto(projeto) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(projeto));
  } catch {
    // Sem armazenamento: o app funciona normalmente, só não lembra do projeto.
  }
}
