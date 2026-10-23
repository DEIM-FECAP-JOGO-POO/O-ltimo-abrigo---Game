// Item é a classe base de tudo que o herói pode pegar no caminho.
// Ela guarda o que é comum (posição, tamanho, animação de "flutuar") e deixa o
// efeito específico para as subclasses -> é aqui que o POLIMORFISMO acontece:
// o Jogo trata todo mundo como "Item" e chama aoColetar(), mas cada tipo faz
// uma coisa diferente (Remedio cura, Energetico acelera).
class Item extends Entidade {
  constructor(x, y, largura, altura) {
    super(x, y, largura, altura);
    this.tempo = Math.random() * 6; // cada item flutua num ritmo um pouco diferente
  }

  // Sobrescreve atualizar() da Entidade: o item só anima.
  atualizar(dt) { this.tempo += dt; }

  // Método "gancho": cada tipo de item SOBRESCREVE com o seu efeito.
  // Por padrão, um item genérico não faz nada.
  aoColetar(jogador, jogo) {}
}

// NOVO (v3): pontos ganhos ao pegar qualquer item.
Item.PONTOS = 25;
