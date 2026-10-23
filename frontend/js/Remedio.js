// Kit médico: herda de Item e sobrescreve aoColetar() para devolver uma vida.
class Remedio extends Item {
  constructor(x, y) {
    super(x, y, 26, 26);
  }

  // Sobrescreve aoColetar() da classe pai (POLIMORFISMO): cura o herói
  aoColetar(jogador, jogo) {
    jogador.curar();
    jogo.avisar('+1 vida!');
  }

  // Sobrescreve desenhar() da Entidade: caixa branca com cruz vermelha
  desenhar(ctx) {
    const flutuar = Math.sin(this.tempo * 3) * 3;
    const y = this.y + flutuar;

    // Brilho
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(this.x + 13, y + 13, 19, 0, Math.PI * 2);
    ctx.fill();

    // Caixa branca com cruz vermelha
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(this.x, y, this.largura, this.altura);
    ctx.fillStyle = '#e53935';
    ctx.fillRect(this.x + 10, y + 4, 6, 18);
    ctx.fillRect(this.x + 4, y + 10, 18, 6);
  }
}
