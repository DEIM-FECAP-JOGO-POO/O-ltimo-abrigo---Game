// Classe base: define o que TODA entidade do jogo tem em comum
// (posição, tamanho, se ainda existe e a capacidade de se atualizar e se desenhar).
// Jogador, Horda, Abrigo, Item e Obstaculo herdam daqui.
//
// Coordenadas do canvas: X cresce para a direita e Y cresce para BAIXO.
// Por isso "base" (os pés) é y + altura.
class Entidade {
  constructor(x, y, largura, altura) {
    this.x = x;
    this.y = y;
    this.largura = largura;
    this.altura = altura;
    this.ativo = true; // quando false, o Jogo remove a entidade da fase
  }

  // Bordas calculadas (getters): são lidas como atributos (entidade.direita),
  // mas o valor é calculado na hora, então nunca fica desatualizado.
  get direita() { return this.x + this.largura; }
  get base() { return this.y + this.altura; }

  // Métodos "vazios" de propósito: as subclasses SOBRESCREVEM (polimorfismo).
  // dt = segundos desde o quadro anterior (ver Jogo._loop).
  atualizar(dt) {}
  desenhar(ctx) {}

  // Colisão entre retângulos (AABB), usada por todas as entidades.
  // A pequena folga evita falsos positivos quando duas caixas apenas se encostam.
  colideCom(outra) {
    const FOLGA = 0.01;
    return (
      this.x + FOLGA < outra.direita &&
      this.direita - FOLGA > outra.x &&
      this.y + FOLGA < outra.base &&
      this.base - FOLGA > outra.y
    );
  }
}
