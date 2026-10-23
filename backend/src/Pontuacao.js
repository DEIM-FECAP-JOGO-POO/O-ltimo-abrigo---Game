// NOVO (backend): Pontuacao representa UMA linha do ranking: quem jogou, em qual
// fase, quantos pontos fez, em quanto tempo e quantos zumbis eliminou.
//
// ENCAPSULAMENTO: o servidor nunca confia nos dados que chegam do navegador.
// Toda pontuação nova passa por Pontuacao.validar(), que confere cada campo e
// devolve um objeto já limpo. Assim nenhum nome gigante, fase inexistente ou
// número absurdo entra no arquivo do ranking.
class Pontuacao {
  constructor({ nome, fase, pontos, tempo, abates, data }) {
    this.nome = nome;
    this.fase = fase;
    this.pontos = pontos;
    this.tempo = tempo;     // segundos que o herói levou para terminar (ou até perder)
    this.abates = abates;
    this.data = data || new Date().toISOString();
  }

  // Método estático: confere um objeto qualquer (vindo do JSON da requisição).
  // Devolve { ok: true, pontuacao } ou { ok: false, erro: 'mensagem' }.
  static validar(dados) {
    if (!dados || typeof dados !== 'object') return Pontuacao._erro('Corpo da requisição inválido.');

    const nome = Pontuacao._limparNome(dados.nome);
    if (!nome) return Pontuacao._erro(`Nome obrigatório (até ${Pontuacao.TAMANHO_MAX_NOME} caracteres).`);

    const fase = Number(dados.fase);
    if (!Number.isInteger(fase) || fase < 1 || fase > Pontuacao.TOTAL_FASES) {
      return Pontuacao._erro(`Fase deve ser um número de 1 a ${Pontuacao.TOTAL_FASES}.`);
    }

    const pontos = Number(dados.pontos);
    if (!Number.isInteger(pontos) || pontos < 0 || pontos > Pontuacao.PONTOS_MAX) {
      return Pontuacao._erro(`Pontos devem ser um número inteiro de 0 a ${Pontuacao.PONTOS_MAX}.`);
    }

    const tempo = Number(dados.tempo);
    if (!Number.isFinite(tempo) || tempo < 0 || tempo > Pontuacao.TEMPO_MAX) {
      return Pontuacao._erro(`Tempo deve estar entre 0 e ${Pontuacao.TEMPO_MAX} segundos.`);
    }

    const abates = Number(dados.abates ?? 0);
    if (!Number.isInteger(abates) || abates < 0 || abates > Pontuacao.ABATES_MAX) {
      return Pontuacao._erro(`Abates devem ser um número inteiro de 0 a ${Pontuacao.ABATES_MAX}.`);
    }

    // Tempo guardado com uma casa decimal (como aparece no jogo)
    return { ok: true, pontuacao: new Pontuacao({ nome, fase, pontos, tempo: Math.round(tempo * 10) / 10, abates }) };
  }

  // Método estático: ordem do ranking. Mais pontos primeiro; empate = menor tempo;
  // empate de novo = quem chegou antes.
  static comparar(a, b) {
    return (b.pontos - a.pontos) || (a.tempo - b.tempo) || a.data.localeCompare(b.data);
  }

  // Método interno: tira espaços extras e caracteres de controle e corta o tamanho.
  static _limparNome(nome) {
    if (typeof nome !== 'string') return '';
    const limpo = nome.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
    return limpo.slice(0, Pontuacao.TAMANHO_MAX_NOME);
  }

  static _erro(mensagem) {
    return { ok: false, erro: mensagem };
  }
}

// Limites de validação
Pontuacao.TAMANHO_MAX_NOME = 20;
Pontuacao.TOTAL_FASES = 3;
Pontuacao.PONTOS_MAX = 100000;
Pontuacao.TEMPO_MAX = 3600;   // 1 hora
Pontuacao.ABATES_MAX = 1000;

module.exports = Pontuacao;
