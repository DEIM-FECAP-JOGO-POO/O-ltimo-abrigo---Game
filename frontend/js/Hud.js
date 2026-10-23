// NOVO (v3, separado do Jogo): classe Hud, que desenha as informações fixas na
// tela durante a partida: nome da fase, vidas, barra de progresso, tempo, pontos,
// adrenalina, recarga do golpe, energético e os avisos rápidos.
// Também desenha os efeitos "de tela inteira": a vinheta vermelha quando a horda
// está perto e o clarão vermelho ao levar dano.
// O Hud só LÊ o estado do jogo; ele nunca muda nada (responsabilidade única).
class Hud {
  constructor(ctx, largura, altura) {
    this.ctx = ctx;
    this.largura = largura;
    this.altura = altura;
  }

  // Desenha o HUD inteiro. Recebe o jogo para ler fase, jogador, horda e placar.
  desenhar(jogo) {
    this._desenharFase(jogo.fase);
    this._desenharVidas(jogo.jogador);
    this._desenharProgresso(jogo);
    this._desenharPlacar(jogo);
    this._desenharHabilidades(jogo.jogador, jogo.relogio);
    this._desenharAviso(jogo.aviso);
  }

  // Efeitos que cobrem a tela: desenhados logo depois do mundo, antes do HUD.
  desenharEfeitosDeTela(jogo) {
    const ctx = this.ctx;

    // Vinheta vermelha na esquerda quando a horda está perto
    const distancia = jogo.jogador.x - jogo.horda.frente;
    if (distancia < 380) {
      const intensidade = Math.max(0, (380 - distancia) / 380) * 0.55;
      const g = ctx.createLinearGradient(0, 0, 260, 0);
      g.addColorStop(0, `rgba(200,0,0,${intensidade})`);
      g.addColorStop(1, 'rgba(200,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 260, this.altura);
    }

    // NOVO (v3): clarão vermelho ao levar dano (some em Jogo.DURACAO_FLASH_DANO segundos)
    if (jogo.flashDano > 0) {
      ctx.fillStyle = `rgba(220,0,0,${(jogo.flashDano / Jogo.DURACAO_FLASH_DANO) * 0.35})`;
      ctx.fillRect(0, 0, this.largura, this.altura);
    }
  }

  // ---------- Partes do HUD (métodos internos) ----------

  // Nome da fase e dificuldade
  _desenharFase(fase) {
    Desenho.texto(this.ctx, fase.nome, 14, 24, 15, '#ffffff', 'left');
    Desenho.texto(this.ctx, `Dificuldade: ${fase.dificuldade}`, 14, 42, 12, '#b0bec5', 'left');
  }

  // Corações: cheios = vidas que restam; apagados = até o máximo
  _desenharVidas(jogador) {
    for (let i = 0; i < jogador.vidasMax; i++) {
      const cor = i < jogador.vidas ? '#ef5350' : 'rgba(255,255,255,0.18)';
      Desenho.coracao(this.ctx, 24 + i * 24, 52, 18, cor);
    }
  }

  // Barra de progresso: herói (azul), horda (vermelho) e abrigo (verde)
  _desenharProgresso(jogo) {
    const ctx = this.ctx;
    const bx = 260, bw = 280, by = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, bw, 8);
    // Converte uma posição do mundo numa posição da barra
    const pos = (x) => bx + Math.max(0, Math.min(1, x / jogo.fase.comprimento)) * bw;
    ctx.fillStyle = 'rgba(198,40,40,0.8)';
    ctx.fillRect(bx, by, pos(jogo.horda.frente) - bx, 8);
    ctx.fillStyle = '#00e676';
    ctx.fillRect(bx + bw - 3, by - 5, 6, 18);
    ctx.fillStyle = '#42a5f5';
    ctx.beginPath();
    ctx.arc(pos(jogo.jogador.x), by + 4, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tempo, pontos (NOVO v3), distância e abates (NOVO v3), no canto direito
  _desenharPlacar(jogo) {
    const direita = this.largura - 14;
    Desenho.texto(this.ctx, `${jogo.tempoFase.toFixed(1)} s`, direita, 24, 16, '#ffffff', 'right');
    Desenho.texto(this.ctx, `Pontos: ${jogo.pontuacao}`, direita, 44, 14, '#ffeb3b', 'right');
    Desenho.texto(this.ctx, `Distância: ${jogo.metros} m   Abates: ${jogo.abates}`, direita, 62, 12, '#cfd8dc', 'right');
  }

  // NOVO (v3): adrenalina (raio + barra), recarga do golpe (J) e energético ativo
  _desenharHabilidades(jogador, relogio) {
    const ctx = this.ctx;
    const x = 14, y = 80;

    // Adrenalina: o raio fica amarelo quando está pronta ou ativa
    Desenho.raio(ctx, x, y - 2, 16, jogador.adrenalinaAtiva || jogador.adrenalinaPronta ? '#ffd54f' : '#78909c');
    if (jogador.adrenalinaAtiva) {
      // Ativa: a barra mostra o tempo que ainda resta
      Desenho.barra(ctx, x + 20, y + 2, 110, 9, jogador.adrenalinaRestante / Jogador.DURACAO_ADRENALINA, '#ffd54f');
      Desenho.texto(ctx, `ATIVA ${jogador.adrenalinaRestante.toFixed(1)}s`, x + 136, y + 11, 11, '#ffd54f', 'left');
    } else if (jogador.adrenalinaPronta) {
      // Pronta: a barra pisca para chamar a atenção
      const brilho = 0.6 + Math.sin(relogio * 8) * 0.4;
      Desenho.barra(ctx, x + 20, y + 2, 110, 9, 1, `rgba(255,213,79,${brilho})`);
      Desenho.texto(ctx, 'PRONTA! [SHIFT]', x + 136, y + 11, 11, '#ffd54f', 'left');
    } else {
      // Carregando
      Desenho.barra(ctx, x + 20, y + 2, 110, 9, jogador.energia / Jogador.ENERGIA_MAX, '#8d6e63');
      Desenho.texto(ctx, 'adrenalina', x + 136, y + 11, 11, '#90a4ae', 'left');
    }

    // Golpe (J): barrinha que enche conforme a recarga acaba
    const recargaTotal = Jogador.RECARGA_GOLPE * (jogador.adrenalinaAtiva ? Jogador.MULT_RECARGA_ADRENALINA : 1);
    Desenho.texto(ctx, 'J', x + 5, y + 31, 12, jogador.recargaGolpe > 0 ? '#78909c' : '#ffffff', 'left');
    Desenho.barra(ctx, x + 20, y + 23, 50, 5, 1 - jogador.recargaGolpe / recargaTotal, '#e0e0e0');

    // Energético ativo: latinha azul e os segundos que faltam
    if (jogador.energeticoRestante > 0) {
      ctx.fillStyle = '#1e88e5';
      ctx.fillRect(x + 80, y + 18, 9, 14);
      Desenho.texto(ctx, `${jogador.energeticoRestante.toFixed(1)}s`, x + 94, y + 31, 11, '#4fc3f7', 'left');
    }
  }

  // Aviso temporário no meio da tela ("Mordida! -1 vida", "ADRENALINA!"...).
  // Some aos poucos nos últimos 0,5 s.
  _desenharAviso(aviso) {
    if (!aviso) return;
    this.ctx.globalAlpha = Math.min(1, aviso.restante * 2);
    Desenho.texto(this.ctx, aviso.texto, this.largura / 2, 84, 20, '#ffeb3b');
    this.ctx.globalAlpha = 1;
  }
}
