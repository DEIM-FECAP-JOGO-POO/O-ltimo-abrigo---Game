// NOVO (backend): PainelRanking cuida da parte do ranking que fica na PÁGINA,
// abaixo do canvas: o campo com o nome do jogador, as abas das fases e a lista.
// Ele usa um objeto Ranking para buscar os dados (COMPOSIÇÃO) e só mexe no HTML.
class PainelRanking {
  constructor(ranking) {
    this.ranking = ranking;
    this.fase = 1;
    this.campoNome = document.getElementById('nome-jogador');
    this.status = document.getElementById('ranking-status');
    this.lista = document.getElementById('ranking-lista');
    this.abas = [...document.querySelectorAll('[data-fase-ranking]')];

    // O nome fica salvo no navegador para não precisar digitar de novo
    this.campoNome.value = PainelRanking._lerNomeSalvo();
    this.campoNome.addEventListener('change', () => PainelRanking._salvarNome(this.nome));
    // Enter no campo devolve o foco ao jogo
    this.campoNome.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.campoNome.blur(); });

    this.abas.forEach((aba) => aba.addEventListener('click', () => {
      this.mostrarFase(Number(aba.dataset.faseRanking));
      aba.blur(); // tira o foco do botão para o Espaço não "clicar" nele durante o jogo
    }));
  }

  // Nome digitado (ou "Anônimo"), já sem espaços nas pontas
  get nome() {
    return this.campoNome.value.trim().slice(0, 20) || 'Anônimo';
  }

  // Liga o painel: verifica o servidor e mostra a fase 1
  async iniciar() {
    this._mostrarStatus('Conectando ao servidor…');
    const online = await this.ranking.verificar();
    this._mostrarStatus(online ? 'Online' : 'Offline: rode o servidor (pasta backend) para salvar pontuações');
    await this.mostrarFase(this.fase);
  }

  // Mostra a lista de uma fase. "linhas" opcional: lista já recebida (evita outro pedido)
  async mostrarFase(fase, linhas = null) {
    this.fase = fase;
    this.abas.forEach((aba) => aba.setAttribute('aria-pressed', String(Number(aba.dataset.faseRanking) === fase)));
    const dados = linhas || await this.ranking.listar(fase);
    this._desenharLista(dados.slice(0, Ranking.LIMITE_LISTA));
  }

  // Método interno: monta os <li> da lista (textContent: um nome nunca vira HTML)
  _desenharLista(linhas) {
    this.lista.replaceChildren();
    if (!linhas.length) {
      const vazio = document.createElement('li');
      vazio.className = 'vazio';
      vazio.textContent = this.ranking.online ? 'Ninguém pontuou nesta fase ainda.' : 'Ranking indisponível sem o servidor.';
      this.lista.append(vazio);
      return;
    }
    linhas.forEach((p) => {
      const item = document.createElement('li');
      const nome = document.createElement('span');
      nome.className = 'nome';
      nome.textContent = p.nome;
      const pontos = document.createElement('span');
      pontos.className = 'pontos';
      pontos.textContent = `${p.pontos} pts · ${Number(p.tempo).toFixed(1)} s`;
      item.append(nome, pontos);
      this.lista.append(item);
    });
  }

  _mostrarStatus(texto) {
    this.status.textContent = texto;
    this.status.dataset.online = String(this.ranking.online);
  }

  // O armazenamento do navegador pode estar bloqueado (aba anônima): por isso try/catch
  static _lerNomeSalvo() {
    try { return localStorage.getItem(PainelRanking.CHAVE_NOME) || ''; } catch (e) { return ''; }
  }

  static _salvarNome(nome) {
    try { localStorage.setItem(PainelRanking.CHAVE_NOME, nome); } catch (e) { /* sem armazenamento: tudo bem */ }
  }
}

PainelRanking.CHAVE_NOME = 'ultimo-abrigo-nome';
