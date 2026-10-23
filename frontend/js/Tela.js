// NOVO (v3, separado do Jogo): classe Tela, que desenha as telas "de parada" do jogo:
// menu, pausa, derrota, vitória e resultado final.
// Separar isso do Jogo segue o princípio de RESPONSABILIDADE ÚNICA:
// o Jogo cuida das regras; a Tela só mostra mensagens.
// A Tela não sabe as regras do jogo: o Jogo passa tudo o que ela precisa mostrar
// como parâmetro (motivo da derrota, pontos, tempos...).
class Tela {
  constructor(ctx, largura, altura) {
    this.ctx = ctx;
    this.largura = largura;
    this.altura = altura;

    // Fundo animado do menu (o tema da fase 1)
    this.cenarioMenu = new Cenario(new FaseFacil().tema, 8000);
    // Herói decorativo do menu, criado uma vez só.
    // ALTERADO (v3): antes era criado um Jogador novo a cada quadro do menu.
    this.heroiMenu = new Jogador(300, 334);
    this.heroiMenu.noChao = true;
    this.heroiMenu.vx = 230; // só para a animação de corrida aparecer
  }

  // Tela inicial. relogio = tempo desde que a página abriu (anima o fundo).
  desenharMenu(relogio) {
    const ctx = this.ctx;
    const c = this.largura / 2;
    this.cenarioMenu.desenhar(ctx, relogio * 60, this.largura, this.altura, 380);
    this._escurecer(0.35);

    // Cena decorativa: zumbis correndo atrás do herói
    ctx.fillStyle = '#1b1c22';
    ctx.fillRect(0, 380, this.largura, 70);
    for (let i = 0; i < 4; i++) {
      Desenho.zumbi(ctx, 40 + i * 38, 382 + (i % 2) * 6, 1.1, relogio + i, 1, i % 2);
    }
    this.heroiMenu.animacao = relogio * 6;
    this.heroiMenu.desenhar(ctx);

    Desenho.texto(ctx, 'ÚLTIMO ABRIGO', c, 110, 52, '#ef5350');
    Desenho.texto(ctx, 'A cidade caiu. A horda está atrás de você.', c, 150, 17, '#eceff1');
    Desenho.texto(ctx, 'Corra, pule os obstáculos e chegue ao abrigo antes que ela te alcance!', c, 174, 15, '#cfd8dc');

    Desenho.texto(ctx, 'ENTER — começar do início', c, 240, 20, '#ffffff');
    Desenho.texto(ctx, 'Ou escolha a fase:', c, 275, 14, '#b0bec5');
    Desenho.texto(ctx, '1 — Fácil     2 — Média     3 — Difícil', c, 300, 18, '#ffeb3b');
    // NOVO (v3): lembrete dos controles novos
    Desenho.texto(ctx, 'J ou X: golpear     SHIFT ou K: adrenalina     pule em cima dos zumbis!', c, 330, 13, '#cfd8dc');
  }

  // Desenhada POR CIMA do jogo congelado
  desenharPausa() {
    const c = this.largura / 2;
    this._escurecer(0.6);
    Desenho.texto(this.ctx, 'PAUSADO', c, 210, 44);
    Desenho.texto(this.ctx, 'P ou ENTER: continuar   |   ESC: menu', c, 255, 16, '#cfd8dc');
  }

  // motivo: texto explicando a derrota | placar: { pontos, metros, abates }
  // ALTERADO (backend): mensagemRanking (opcional) = resultado do envio ao ranking
  desenharDerrota(motivo, placar, mensagemRanking = '') {
    const c = this.largura / 2;
    this._escurecer(0.7);
    Desenho.texto(this.ctx, 'VOCÊ FOI PEGO!', c, 190, 46, '#ef5350');
    Desenho.texto(this.ctx, motivo, c, 228, 18, '#eceff1');
    // NOVO (v3): placar da tentativa
    Desenho.texto(this.ctx, `Pontos: ${placar.pontos}   |   Distância: ${placar.metros} m   |   Abates: ${placar.abates}`, c, 254, 14, '#ffeb3b');
    Desenho.texto(this.ctx, 'ENTER ou R — tentar de novo', c, 292, 18, '#ffffff');
    Desenho.texto(this.ctx, 'ESC — menu   |   1, 2, 3 — escolher fase', c, 320, 14, '#b0bec5');
    if (mensagemRanking) Desenho.texto(this.ctx, mensagemRanking, c, 356, 14, '#4fc3f7');
  }

  // nomeFase, tempo (s), placar: { pontos, abates }, ultima: era a última fase?
  // ALTERADO (backend): mensagemRanking (opcional) = resultado do envio ao ranking
  desenharVitoria(nomeFase, tempo, placar, ultima, mensagemRanking = '') {
    const c = this.largura / 2;
    this._escurecer(0.65);
    Desenho.texto(this.ctx, 'ABRIGO ALCANÇADO!', c, 180, 44, '#69f0ae');
    Desenho.texto(this.ctx, `${nomeFase} concluída em ${tempo.toFixed(1)} s`, c, 222, 18, '#eceff1');
    Desenho.texto(this.ctx, `Pontos: ${placar.pontos}   |   Abates: ${placar.abates}`, c, 246, 15, '#ffeb3b'); // NOVO (v3)
    Desenho.texto(this.ctx, ultima ? 'ENTER — ver resultado final' : 'ENTER — próxima fase', c, 275, 20, '#ffffff');
    if (mensagemRanking) Desenho.texto(this.ctx, mensagemRanking, c, 310, 14, '#4fc3f7');
  }

  // Resultado final depois da fase 3.
  //   fases       -> lista de Fase (para mostrar a dificuldade de cada uma)
  //   tempos      -> tempo de cada fase concluída (s)
  //   pontosFases -> pontos de cada fase concluída
  desenharFim(fases, tempos, pontosFases) {
    const c = this.largura / 2;
    const total = tempos.reduce((soma, t) => soma + (t || 0), 0);
    const pontosTotal = pontosFases.reduce((soma, p) => soma + (p || 0), 0);
    this._escurecer(0.8);
    Desenho.texto(this.ctx, 'VOCÊ SOBREVIVEU!', c, 140, 46, '#69f0ae');
    Desenho.texto(this.ctx, 'Todas as fases concluídas', c, 175, 18, '#eceff1');
    fases.forEach((f, i) => {
      const t = tempos[i];
      Desenho.texto(this.ctx, `${f.dificuldade}: ${t ? t.toFixed(1) + ' s' : '—'}`, c, 225 + i * 28, 18, '#ffeb3b');
    });
    Desenho.texto(this.ctx, `Tempo total: ${total.toFixed(1)} s   |   Pontos: ${pontosTotal}`, c, 325, 22, '#ffffff');
    Desenho.texto(this.ctx, 'ENTER — voltar ao menu', c, 375, 16, '#b0bec5');
  }

  // Método interno (começa com _ por convenção): escurece a tela inteira
  // para o texto da tela ficar legível por cima do jogo.
  _escurecer(alfa) {
    this.ctx.fillStyle = `rgba(0,0,0,${alfa})`;
    this.ctx.fillRect(0, 0, this.largura, this.altura);
  }
}
