// Abrigo herda de Entidade: é o objetivo de cada fase.
// Quando o herói encosta nele, o Jogo declara vitória.
class Abrigo extends Entidade {
  constructor(x, chaoY) {
    super(x, chaoY - 120, 120, 120);
    this.tempo = 0; // usado para a luz "pulsar"
  }

  // Sobrescreve atualizar() da Entidade: o abrigo não anda, só anima a luz.
  atualizar(dt) { this.tempo += dt; }

  // Sobrescreve desenhar() da Entidade: prédio de concreto com a porta iluminada.
  desenhar(ctx) {
    const pulso = 0.6 + Math.sin(this.tempo * 4) * 0.3;

    // Feixe de luz do holofote
    ctx.fillStyle = `rgba(105,240,174,${0.12 * pulso})`;
    ctx.beginPath();
    ctx.moveTo(this.x + 60, this.y - 6);
    ctx.lineTo(this.x - 40, this.base);
    ctx.lineTo(this.x + 160, this.base);
    ctx.closePath();
    ctx.fill();

    // Prédio de concreto
    ctx.fillStyle = '#37474f';
    ctx.fillRect(this.x, this.y + 10, this.largura, this.altura - 10);
    ctx.fillStyle = '#263238';
    ctx.fillRect(this.x - 6, this.y, this.largura + 12, 14);

    // Arame farpado no topo
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = this.x - 6; px < this.x + this.largura + 6; px += 8) {
      ctx.moveTo(px, this.y);
      ctx.lineTo(px + 4, this.y - 8);
      ctx.lineTo(px + 8, this.y);
    }
    ctx.stroke();

    // Placa
    ctx.fillStyle = '#00c853';
    ctx.fillRect(this.x + 20, this.y + 20, 80, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ABRIGO', this.x + 60, this.y + 36);

    // Porta iluminada
    ctx.fillStyle = `rgba(105,240,174,${pulso})`;
    ctx.fillRect(this.x + 38, this.y + 58, 44, this.altura - 58);
    ctx.fillStyle = '#1b5e20';
    ctx.fillRect(this.x + 59, this.y + 58, 2, this.altura - 58);
  }
}
