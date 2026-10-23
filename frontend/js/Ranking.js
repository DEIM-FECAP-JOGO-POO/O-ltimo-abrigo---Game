// NOVO (backend): Ranking é o cliente da API do servidor (pasta backend/).
// Ele só conversa com a rede: enviar uma pontuação e buscar a lista de uma fase.
// Quem mostra a lista na página é o PainelRanking (responsabilidade única).
//
// O jogo continua funcionando SEM o servidor: aberto direto pelo arquivo
// (file://) ou publicado sem backend (GitHub Pages), o ranking fica "offline"
// e nada quebra.
class Ranking {
  // urlApi: endereço do servidor. Padrão = o mesmo endereço da página, ou o que
  // estiver em <meta name="ranking-api" content="..."> no index.html.
  constructor(urlApi = Ranking.descobrirUrl()) {
    this.urlApi = urlApi;
    this.online = false; // só vira true depois que /api/saude responder
  }

  // Método estático: de onde vem a API?
  static descobrirUrl() {
    const meta = document.querySelector('meta[name="ranking-api"]');
    if (meta && meta.content.trim()) return meta.content.trim().replace(/\/$/, '');
    if (location.protocol === 'file:') return null; // aberto pelo arquivo: sem servidor
    return location.origin;
  }

  // Confere se o servidor está no ar. Devolve true/false (nunca lança erro).
  async verificar() {
    if (!this.urlApi) return (this.online = false);
    const resposta = await this._pedir('/api/saude');
    return (this.online = !!(resposta && resposta.ok));
  }

  // Envia { nome, fase, pontos, tempo, abates }.
  // Devolve { posicao, ranking } ou null se não deu para enviar.
  async enviar(pontuacao) {
    if (!this.online) return null;
    return this._pedir('/api/ranking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pontuacao),
    });
  }

  // Lista as melhores pontuações de uma fase. Devolve um array (vazio se offline).
  async listar(fase, limite = Ranking.LIMITE_LISTA) {
    if (!this.online) return [];
    const resposta = await this._pedir(`/api/ranking?fase=${fase}&limite=${limite}`);
    return resposta && Array.isArray(resposta.ranking) ? resposta.ranking : [];
  }

  // Método interno: faz o pedido com tempo-limite. Qualquer falha devolve null.
  async _pedir(caminho, opcoes = {}) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), Ranking.TEMPO_LIMITE_MS);
    try {
      const resposta = await fetch(this.urlApi + caminho, { ...opcoes, signal: controle.signal });
      if (!resposta.ok) return null;
      return await resposta.json();
    } catch (erro) {
      return null; // servidor fora do ar, sem rede, CORS... o jogo segue normalmente
    } finally {
      clearTimeout(timer);
    }
  }
}

Ranking.TEMPO_LIMITE_MS = 3000; // espera no máximo 3 s pela resposta
Ranking.LIMITE_LISTA = 5;       // linhas mostradas no painel
