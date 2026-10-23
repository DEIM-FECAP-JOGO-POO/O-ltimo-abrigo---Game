// NOVO (v3): Energético herda de Item e sobrescreve aoColetar() para deixar o herói
// mais rápido por alguns segundos.
// O efeito é um MULTIPLICADOR temporário: a velocidade-base do Jogador não muda,
// então quando o tempo acaba ele volta exatamente ao normal.
class Energetico extends Item {
  constructor(x, y) {
    super(x, y, 18, 28);
  }

  // Sobrescreve aoColetar() da classe pai (POLIMORFISMO).
  // Quem decide a duração e a força do efeito é o próprio item (constantes abaixo).
  aoColetar(jogador, jogo) {
    jogador.aplicarEnergetico(Energetico.DURACAO, Energetico.MULTIPLICADOR);
    jogo.avisar(`Energético! Velocidade +${Math.round((Energetico.MULTIPLICADOR - 1) * 100)}%`);
  }

  // Sobrescreve desenhar() da Entidade: lata azul com um raio amarelo
  desenhar(ctx) {
    const flutuar = Math.sin(this.tempo * 3) * 3;
    const y = this.y + flutuar;

    // Brilho azul
    ctx.fillStyle = 'rgba(79,195,247,0.22)';
    ctx.beginPath();
    ctx.arc(this.x + 9, y + 14, 19, 0, Math.PI * 2);
    ctx.fill();

    // Lata
    ctx.fillStyle = '#1e88e5';
    ctx.fillRect(this.x, y + 2, this.largura, this.altura - 2);
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(this.x, y, this.largura, 4);
    ctx.fillRect(this.x, y + this.altura - 3, this.largura, 3);
    Desenho.raio(ctx, this.x + 2, y + 7, 14, '#ffeb3b');
  }
}

Energetico.DURACAO = 5;          // segundos de efeito
Energetico.MULTIPLICADOR = 1.3;  // +30% de velocidade
