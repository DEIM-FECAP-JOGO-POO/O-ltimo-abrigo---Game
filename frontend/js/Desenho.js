// Desenho: classe utilitária com MÉTODOS ESTÁTICOS de desenho.
// Método estático pertence à CLASSE, não a um objeto: chamamos Desenho.zumbi(...)
// sem precisar fazer "new Desenho()".
// Ela existe porque mais de uma classe precisa do mesmo desenho (por exemplo, o
// zumbi aparece na Horda, no ZumbiPatrulha e no ZumbiCacador). Centralizar aqui
// evita repetir código (princípio DRY: "não se repita").
// Todos os gráficos do jogo são desenhados por código, sem imagens externas.
class Desenho {
  // Desenha um zumbi em pé.
  //   cx       -> centro horizontal
  //   base     -> posição Y dos pés
  //   escala   -> tamanho (1 = ~52 px de altura)
  //   tempo    -> tempo acumulado, usado na animação das pernas
  //   direcao  -> 1 = olhando para a direita, -1 = esquerda
  //   variacao -> 0 ou 1 muda a cor da roupa; 2 = zumbi caçador (camisa vermelha)
  //   pose     -> 0 = andando, 1 = preparando o bote (braços erguidos)
  // ALTERADO (v3): ganhou a variação 2 e o parâmetro "pose" para o ZumbiCacador.
  // Os dois têm valor padrão, então quem já chamava sem eles continua igual.
  static zumbi(ctx, cx, base, escala, tempo, direcao, variacao = 0, pose = 0) {
    ctx.save(); // guarda o estado do canvas: o translate/scale abaixo não "vaza" para os outros desenhos
    ctx.translate(cx, base);
    ctx.scale(escala * direcao, escala); // escala negativa no X espelha o desenho

    const passo = Math.sin(tempo * 6);

    // Pernas
    ctx.strokeStyle = '#2f3340';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3, -18);
    ctx.lineTo(-3 + passo * 8, 0);
    ctx.moveTo(3, -18);
    ctx.lineTo(3 - passo * 8, 0);
    ctx.stroke();

    // Tronco (roupa rasgada)
    ctx.fillStyle = variacao === 2 ? '#8e2424' : variacao ? '#6d4c41' : '#546e7a';
    ctx.fillRect(-7, -36, 14, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-7, -22, 5, 6); // rasgo

    // Braços esticados para frente (levantados quando vai dar o bote)
    ctx.strokeStyle = '#7cb342';
    ctx.lineWidth = 5;
    ctx.beginPath();
    const ergue = pose === 1 ? -12 : 0;
    ctx.moveTo(4, -32);
    ctx.lineTo(21, -30 + passo * 2 + ergue);
    ctx.moveTo(4, -27);
    ctx.lineTo(20, -25 - passo * 2 + ergue);
    ctx.stroke();

    // Cabeça
    ctx.fillStyle = '#8bc34a';
    ctx.beginPath();
    ctx.arc(2, -44, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = variacao === 2 ? '#ffea00' : '#d50000'; // olho (caçador: amarelo)
    ctx.fillRect(4, -47, 3, 3);
    ctx.fillStyle = '#33691e'; // boca
    ctx.fillRect(3, -41, 6, 2);

    ctx.restore();
  }

  // Coração usado no HUD (vidas)
  static coracao(ctx, x, y, tam, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(x, y + tam * 0.3);
    ctx.bezierCurveTo(x, y, x - tam / 2, y, x - tam / 2, y + tam * 0.3);
    ctx.bezierCurveTo(x - tam / 2, y + tam * 0.6, x, y + tam * 0.8, x, y + tam);
    ctx.bezierCurveTo(x, y + tam * 0.8, x + tam / 2, y + tam * 0.6, x + tam / 2, y + tam * 0.3);
    ctx.bezierCurveTo(x + tam / 2, y, x, y, x, y + tam * 0.3);
    ctx.fill();
  }

  // NOVO (v3): raio, usado como ícone da adrenalina no HUD e na lata do energético
  static raio(ctx, x, y, tam, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(x + tam * 0.55, y);
    ctx.lineTo(x + tam * 0.1, y + tam * 0.55);
    ctx.lineTo(x + tam * 0.45, y + tam * 0.55);
    ctx.lineTo(x + tam * 0.3, y + tam);
    ctx.lineTo(x + tam * 0.9, y + tam * 0.4);
    ctx.lineTo(x + tam * 0.55, y + tam * 0.4);
    ctx.closePath();
    ctx.fill();
  }

  // NOVO (v3): barra horizontal com fundo escuro (vida dos zumbis, adrenalina, recarga do golpe).
  // fracao vai de 0 (vazia) a 1 (cheia); valores fora disso são limitados.
  static barra(ctx, x, y, largura, altura, fracao, cor, fundo = 'rgba(0,0,0,0.55)') {
    ctx.fillStyle = fundo;
    ctx.fillRect(x, y, largura, altura);
    ctx.fillStyle = cor;
    ctx.fillRect(x, y, largura * Math.max(0, Math.min(1, fracao)), altura);
  }

  // Texto com sombra, para ficar legível sobre qualquer fundo
  static texto(ctx, texto, x, y, tamanho, cor = '#ffffff', alinhamento = 'center') {
    ctx.font = `bold ${tamanho}px Arial`;
    ctx.textAlign = alinhamento;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(texto, x + 2, y + 2);
    ctx.fillStyle = cor;
    ctx.fillText(texto, x, y);
  }
}
