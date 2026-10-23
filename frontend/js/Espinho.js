// Espinho (arame farpado): herda de Obstaculo. NÃO é sólido (dá para passar
// por dentro), mas sobrescreve aoColidir() para machucar quem encosta.
class Espinho extends Obstaculo {
  constructor(x, y, largura) {
    super(x, y, largura, 18);
  }

  // Sobrescreve aoColidir() de Obstaculo (POLIMORFISMO): encostar tira 1 vida.
  // receberDano() devolve false durante a invulnerabilidade, então o aviso
  // não se repete a cada quadro.
  aoColidir(jogador, jogo) {
    if (jogador.receberDano()) jogo.avisar('Arame farpado! -1 vida');
  }

  // Sobrescreve desenhar() da Entidade: base cinza com pontas de metal
  desenhar(ctx) {
    ctx.fillStyle = '#455a64';
    ctx.fillRect(this.x, this.base - 4, this.largura, 4);
    ctx.fillStyle = '#b0bec5';
    for (let px = this.x; px < this.direita - 6; px += 12) {
      ctx.beginPath();
      ctx.moveTo(px, this.base - 4);
      ctx.lineTo(px + 6, this.y);
      ctx.lineTo(px + 12, this.base - 4);
      ctx.closePath();
      ctx.fill();
    }
  }
}
