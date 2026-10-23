// Zumbi patrulheiro: herda de Obstaculo. Anda de um lado para o outro entre
// xMin e xMax, sem perseguir ninguém. Encostar de lado machuca; pisar em cima
// (ou, desde a v3, golpear com a barra de ferro) elimina o zumbi.
class ZumbiPatrulha extends Obstaculo {
  constructor(y, xMin, xMax, velocidade) {
    super(xMin, y, 28, 46);
    this.xMin = xMin;
    this.xMax = xMax;
    this.velocidade = velocidade; // px/s
    this.direcao = 1;
    this.tempo = Math.random() * 6; // para cada zumbi andar num ritmo diferente
  }

  // Sobrescreve atualizar() da Entidade: anda de um lado para o outro
  atualizar(dt) {
    this.tempo += dt;
    this.x += this.direcao * this.velocidade * dt;
    if (this.direita >= this.xMax) {
      this.x = this.xMax - this.largura;
      this.direcao = -1;
    } else if (this.x <= this.xMin) {
      this.x = this.xMin;
      this.direcao = 1;
    }
  }

  // Sobrescreve aoColidir() de Obstaculo: pisar em cima elimina o zumbi;
  // encostar de lado machuca.
  aoColidir(jogador, jogo) {
    // "Pisando" = o herói está caindo e os pés dele estão na parte de cima do zumbi
    const pisando = jogador.vy > 0 && jogador.base < this.y + this.altura * 0.6;
    if (pisando) {
      this.ativo = false;
      jogador.vy = -430; // quica para cima
      jogador.noChao = false;
      jogo.avisar('Zumbi eliminado!');
      jogo.registrarAbate(this, ZumbiPatrulha.PONTOS);
    } else {
      // ALTERADO (v3): empurra o herói para LONGE do zumbi (antes era sempre para a esquerda)
      const lado = jogador.x + jogador.largura / 2 < this.x + this.largura / 2 ? -1 : 1;
      if (jogador.receberDano(lado)) jogo.avisar('Mordida! -1 vida');
    }
  }

  // NOVO (v3): pode ser alvo do golpe enquanto existir
  get atingivel() { return this.ativo; }

  // NOVO (v3): sobrescreve receberGolpe() de Obstaculo.
  // O patrulheiro é fraco: um golpe da barra de ferro basta.
  receberGolpe(dano, direcao, jogo) {
    if (!this.ativo) return false;
    this.ativo = false;
    jogo.registrarAbate(this, ZumbiPatrulha.PONTOS);
    return true;
  }

  // Sobrescreve desenhar() da Entidade, reaproveitando Desenho.zumbi()
  desenhar(ctx) {
    Desenho.zumbi(ctx, this.x + this.largura / 2, this.base, 0.9, this.tempo, this.direcao, 1);
  }
}

// NOVO (v3): pontos ganhos ao eliminar um patrulheiro.
ZumbiPatrulha.PONTOS = 50;
