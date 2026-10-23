// Barricada: herda de Obstaculo e é SÓLIDA. O herói (e os zumbis caçadores)
// precisam pular por cima dela.
class Barricada extends Obstaculo {
  constructor(x, y, largura, altura) {
    super(x, y, largura, altura);
    this.solido = true;
    this.fixo = true; // nunca se move
  }

  // Sobrescreve desenhar() da Entidade: pilha de tábuas com reforço diagonal
  desenhar(ctx) {
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(this.x, this.y, this.largura, this.altura);

    // Tábuas
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    for (let py = this.y + 14; py < this.base; py += 14) {
      ctx.beginPath();
      ctx.moveTo(this.x, py);
      ctx.lineTo(this.direita, py);
      ctx.stroke();
    }

    // Reforço diagonal
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.x + 2, this.base - 2);
    ctx.lineTo(this.direita - 2, this.y + 2);
    ctx.stroke();

    // Borda de cima mais clara
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(this.x, this.y, this.largura, 4);
  }
}
