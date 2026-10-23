// NOVO (v3): Diretor controla a PROGRESSÃO DE DIFICULDADE e o surgimento de
// zumbis caçadores e itens durante a fase (como um "diretor" que decide o que
// entra em cena e quando).
//
// O "nível" vai de 0 (fácil) a 1 (o mais difícil) e é calculado a partir do
// progresso do herói até o abrigo, somado a uma base que depende da fase:
//   Fase 1: 0,0 até 0,4    Fase 2: 0,3 até 0,7    Fase 3: 0,6 até 1,0
// Cada parâmetro da tabela Diretor.PROGRESSAO vai do valor mínimo (nível 0) até um
// valor MÁXIMO (nível 1). Como existe esse teto, o jogo nunca fica impossível.
class Diretor {
  constructor() {
    this.reiniciar(0);
  }

  // Volta tudo ao começo da fase "indiceFase" (0, 1 ou 2)
  reiniciar(indiceFase) {
    this.indiceFase = indiceFase;
    this.nivel = Diretor.NIVEL_BASE_POR_FASE[indiceFase] || 0;
    // O primeiro zumbi vem um pouco mais cedo que os outros
    this.tempoSurgimento = Diretor.interpolar(Diretor.PROGRESSAO.intervaloSurgimento, this.nivel) * 0.6;
    this.tempoItem = Diretor.interpolar(Diretor.PROGRESSAO.intervaloItem, this.nivel);
  }

  // Método estático: devolve o valor da faixa [mínimo, máximo] para o nível t (0..1).
  // Ex.: interpolar([9, 3.6], 0.5) = 6.3
  static interpolar(faixa, t) {
    return faixa[0] + (faixa[1] - faixa[0]) * Math.max(0, Math.min(1, t));
  }

  // ---------- Parâmetros que dependem do nível atual ----------

  get multVelocidadeZumbi() { return Diretor.interpolar(Diretor.PROGRESSAO.multVelocidadeZumbi, this.nivel); }
  get vidaExtraZumbi() { return Math.floor(Diretor.interpolar(Diretor.PROGRESSAO.vidaExtra, this.nivel)); }
  get maxCacadores() { return Math.round(Diretor.interpolar(Diretor.PROGRESSAO.maxCacadores, this.nivel)); }

  // Opções usadas ao criar um ZumbiCacador
  opcoesZumbi() {
    return { multVelocidade: this.multVelocidadeZumbi, vidaExtra: this.vidaExtraZumbi };
  }

  // Nível = base da fase + progresso até o abrigo (0..1) x faixa
  calcularNivel(jogo) {
    const fim = jogo.fase.destino ? jogo.fase.destino.x : jogo.fase.comprimento;
    const progresso = Math.max(0, Math.min(1, jogo.jogador.x / fim));
    return Math.min(1, (Diretor.NIVEL_BASE_POR_FASE[this.indiceFase] || 0) + progresso * Diretor.FAIXA_DO_NIVEL);
  }

  // Chamado pelo Jogo a cada quadro
  atualizar(dt, jogo) {
    this.nivel = this.calcularNivel(jogo);

    // Zumbis caçadores: de tempos em tempos, se ainda couber mais um
    this.tempoSurgimento -= dt;
    if (this.tempoSurgimento <= 0) {
      // O intervalo varia ±20% para o jogador não "decorar" o ritmo
      this.tempoSurgimento = Diretor.interpolar(Diretor.PROGRESSAO.intervaloSurgimento, this.nivel) * (0.8 + Math.random() * 0.4);
      if (this.contarCacadores(jogo.fase) < this.maxCacadores) this.surgirZumbi(jogo);
    }

    // Itens
    this.tempoItem -= dt;
    if (this.tempoItem <= 0) {
      this.tempoItem = Diretor.interpolar(Diretor.PROGRESSAO.intervaloItem, this.nivel) * (0.8 + Math.random() * 0.4);
      this.surgirItem(jogo);
    }
  }

  // Quantos caçadores vivos existem na fase agora
  contarCacadores(fase) {
    let total = 0;
    for (const o of fase.obstaculos) if (o instanceof ZumbiCacador && o.atingivel) total++;
    return total;
  }

  surgirZumbi(jogo) {
    const x = this.encontrarPosicaoLivre(jogo, 28);
    if (x === null) return null;
    const zumbi = new ZumbiCacador(x, jogo.fase.chaoY, this.opcoesZumbi());
    jogo.fase.obstaculos.push(zumbi); // entra na mesma lista polimórfica dos obstáculos
    return zumbi;
  }

  // Se o herói perdeu vida, metade das vezes vem um kit médico; senão, um energético
  surgirItem(jogo) {
    const x = this.encontrarPosicaoLivre(jogo, 26);
    if (x === null) return null;
    const fase = jogo.fase;
    const precisaCura = jogo.jogador.vidas < jogo.jogador.vidasMax;
    const item = precisaCura && Math.random() < 0.5
      ? new Remedio(x, fase.chaoY - 62)
      : new Energetico(x, fase.chaoY - 64);
    fase.itens.push(item);
    return item;
  }

  // Procura um X fora da tela (à direita), em cima de um trecho de Chao, longe do
  // herói, de buracos, barricadas, arame farpado e do abrigo.
  // Devolve null se não achar: melhor não criar nada do que criar num lugar ruim
  // (por exemplo, um zumbi nascendo em cima do herói).
  encontrarPosicaoLivre(jogo, largura) {
    const fase = jogo.fase;
    const limiteAbrigo = (fase.destino ? fase.destino.x : fase.comprimento) - Diretor.MARGEM_ABRIGO;

    for (let tentativa = 0; tentativa < 8; tentativa++) {
      const x = jogo.camX + jogo.largura + Diretor.interpolar(Diretor.DISTANCIA_SURGIMENTO, Math.random());
      if (x + largura > limiteAbrigo) return null;
      if (Math.abs(x - jogo.jogador.x) < Diretor.DISTANCIA_MIN_HEROI) continue;

      // Precisa estar inteiro em cima de um trecho de chão, com folga das beiradas
      const chao = fase.obstaculos.find(
        (o) => o instanceof Chao && o.ativo && x >= o.x + 30 && x + largura <= o.direita - 30
      );
      if (!chao) continue;

      // E longe de outros obstáculos e itens
      const ocupado = fase.obstaculos.some(
        (o) => o !== chao && o.ativo && !(o instanceof ZumbiCacador) &&
               x < o.direita + 24 && x + largura > o.x - 24 && o.base > fase.chaoY - 140
      ) || fase.itens.some((i) => x < i.direita + 24 && x + largura > i.x - 24);
      if (!ocupado) return x;
    }
    return null;
  }
}

// Nível inicial de cada fase (índice 0 = fase 1) e quanto ele sobe até o abrigo.
Diretor.NIVEL_BASE_POR_FASE = [0, 0.3, 0.6];
Diretor.FAIXA_DO_NIVEL = 0.4;

// Tabela da progressão: cada linha é [valor no nível 0, valor no nível 1].
// Nem tudo sobe junto e com força, para o jogo ficar mais difícil sem ficar injusto:
//   intervaloSurgimento -> segundos entre um zumbi caçador e outro (cai de 9 para 3,6)
//   maxCacadores        -> quantos caçadores vivos ao mesmo tempo, no máximo
//   multVelocidadeZumbi -> multiplica a velocidade dos caçadores (no máximo +18%)
//   vidaExtra           -> vida somada aos caçadores (no máximo +2)
//   intervaloItem       -> segundos entre um item e outro (os itens ficam um pouco mais raros)
Diretor.PROGRESSAO = {
  intervaloSurgimento: [9, 3.6],
  maxCacadores: [2, 5],
  multVelocidadeZumbi: [1, 1.18],
  vidaExtra: [0, 2],
  intervaloItem: [13, 20],
};

// Onde as coisas podem surgir
Diretor.DISTANCIA_SURGIMENTO = [80, 260]; // px além da borda direita da tela (sorteado nessa faixa)
Diretor.DISTANCIA_MIN_HEROI = 420;        // px: nunca nasce perto do herói
Diretor.MARGEM_ABRIGO = 260;              // px: nada nasce colado no abrigo
