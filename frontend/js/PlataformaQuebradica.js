// Plataforma quebradiça: herda de Obstaculo e é SÓLIDA até alguém pisar nela.
// Depois ela treme por um instante e cai.
// ENCAPSULAMENTO: o estado ('estavel' -> 'tremendo' -> 'caindo') fica guardado
// dentro da própria plataforma; o Jogo só chama aoPisar() e atualizar().
class PlataformaQuebradica extends Obstaculo {
  constructor(x, y, largura) {
    super(x, y, largura, 16);
    this.solido = true;
    this.estado = 'estavel';
    this.temporizador = 0;
    this.vy = 0;
  }

  // Sobrescreve aoPisar() de Obstaculo: ao ser pisada, começa a tremer
  aoPisar(jogador) {
    if (this.estado === 'estavel') {
      this.estado = 'tremendo';
      this.temporizador = 0.6; // segundos até cair
    }
  }

  // Sobrescreve atualizar() da Entidade: conta o tempo do tremor e depois cai
  atualizar(dt) {
    if (this.estado === 'tremendo') {
      this.temporizador -= dt;
      if (this.temporizador <= 0) {
        this.estado = 'caindo';
        this.solido = false; // deixa de segurar quem estava em cima
      }
    } else if (this.estado === 'caindo') {
      this.vy += 1500 * dt;
      this.y += this.vy * dt;
      if (this.y > 800) this.ativo = false; // saiu da tela: o Jogo remove
    }
  }

  // Sobrescreve desenhar() da Entidade: madeira rachada que treme antes de cair
  desenhar(ctx) {
    const tremor = this.estado === 'tremendo' ? Math.sin(this.temporizador * 90) * 2 : 0;
    const x = this.x + tremor;

    ctx.fillStyle = this.estado === 'estavel' ? '#8d6e63' : '#a1887f';
    ctx.fillRect(x, this.y, this.largura, this.altura);
    ctx.fillStyle = '#bcaaa4';
    ctx.fillRect(x, this.y, this.largura, 4);

    // Rachaduras
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + this.largura * 0.3, this.y);
    ctx.lineTo(x + this.largura * 0.38, this.y + 8);
    ctx.lineTo(x + this.largura * 0.3, this.base);
    ctx.moveTo(x + this.largura * 0.7, this.y);
    ctx.lineTo(x + this.largura * 0.62, this.y + 9);
    ctx.lineTo(x + this.largura * 0.7, this.base);
    ctx.stroke();
  }
}
