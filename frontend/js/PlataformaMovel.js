// Plataforma móvel: herda de Obstaculo, é SÓLIDA e anda de um lado para o outro
// entre xMin e xMax. Sobrescreve carregar() para levar junto quem está em cima.
// Ela NÃO é "fixa": por isso os zumbis caçadores não planejam saltos até ela.
class PlataformaMovel extends Obstaculo {
  constructor(xInicial, y, largura, xMin, xMax, velocidade) {
    super(xInicial, y, largura, 16);
    this.solido = true;
    this.xMin = xMin;
    this.xMax = xMax;
    this.velocidade = velocidade; // px/s
    this.direcao = 1;
    this.deslocamentoX = 0; // quanto andou neste quadro (usado para carregar quem está em cima)
  }

  // Sobrescreve atualizar() da Entidade: vai e volta entre os limites
  atualizar(dt) {
    const antes = this.x;
    this.x += this.direcao * this.velocidade * dt;
    if (this.x >= this.xMax) {
      this.x = this.xMax;
      this.direcao = -1;
    } else if (this.x <= this.xMin) {
      this.x = this.xMin;
      this.direcao = 1;
    }
    this.deslocamentoX = this.x - antes;
  }

  // Sobrescreve carregar() de Obstaculo: quem está em cima anda junto
  // (serve para o Jogador e para o ZumbiCacador, pois os dois têm "x")
  carregar(jogador) {
    jogador.x += this.deslocamentoX;
  }

  // Sobrescreve desenhar() da Entidade: plataforma de metal com listras de alerta
  desenhar(ctx) {
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(this.x, this.y, this.largura, this.altura);
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(this.x, this.y, this.largura, 4);

    // Listras de alerta
    ctx.fillStyle = '#ffb300';
    for (let px = this.x + 6; px < this.direita - 10; px += 18) {
      ctx.beginPath();
      ctx.moveTo(px, this.base - 2);
      ctx.lineTo(px + 8, this.y + 6);
      ctx.lineTo(px + 14, this.y + 6);
      ctx.lineTo(px + 6, this.base - 2);
      ctx.closePath();
      ctx.fill();
    }
  }
}
