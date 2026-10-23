// Chão: herda de Obstaculo e é SÓLIDO. Os espaços entre dois trechos de chão
// são os buracos da fase. É o único obstáculo onde o herói pode renascer.
class Chao extends Obstaculo {
  constructor(x, y, largura, altura) {
    super(x, y, largura, altura);
    this.solido = true;
    this.seguroParaRenascer = true;
    this.fixo = true; // nunca se move: os zumbis podem planejar um salto até ele
  }

  // Sobrescreve desenhar() da Entidade: asfalto com calçada e faixa amarela
  desenhar(ctx) {
    // Asfalto
    ctx.fillStyle = '#2d2f36';
    ctx.fillRect(this.x, this.y, this.largura, this.altura);
    // Calçada
    ctx.fillStyle = '#4a4d58';
    ctx.fillRect(this.x, this.y, this.largura, 8);
    ctx.fillStyle = '#1b1c22';
    ctx.fillRect(this.x, this.y + 8, this.largura, 4);
    // Faixa tracejada (alinhada ao mundo, para não "andar" com a câmera)
    ctx.fillStyle = '#d9b84a';
    const inicio = Math.ceil((this.x + 10) / 70) * 70;
    for (let px = inicio; px < this.direita - 36; px += 70) {
      ctx.fillRect(px, this.y + 32, 36, 4);
    }
  }
}
