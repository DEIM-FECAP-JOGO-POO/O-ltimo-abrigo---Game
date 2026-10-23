// NOVO (v3): Fisica é uma classe utilitária (só MÉTODOS ESTÁTICOS) com a física
// dos corpos que andam sobre os sólidos do cenário.
//
// A colisão abaixo é a MESMA que já existia dentro do Jogador na v2. Ela foi movida
// para cá para que o herói e os zumbis caçadores usem um único sistema, em vez de
// dois sistemas parecidos (e que poderiam se comportar diferente).
//
// Um "corpo" é qualquer Entidade que tenha: x, y, largura, altura, vy, noChao, apoio.
class Fisica {
  // Empurra o corpo para fora de paredes (lado esquerdo/direito).
  // Devolve true se bateu em alguma coisa (a IA dos zumbis usa para virar).
  static resolverHorizontal(corpo, solidos) {
    let bateu = false;
    for (const s of solidos) {
      if (!corpo.colideCom(s)) continue;
      const centroCorpo = corpo.x + corpo.largura / 2;
      const centroSolido = s.x + s.largura / 2;
      corpo.x = centroCorpo < centroSolido ? s.x - corpo.largura : s.direita;
      bateu = true;
    }
    return bateu;
  }

  // Pouso em cima de sólidos ou batida de cabeça embaixo deles
  static resolverVertical(corpo, solidos) {
    corpo.noChao = false;
    corpo.apoio = null;
    for (const s of solidos) {
      if (!corpo.colideCom(s)) continue;
      if (corpo.vy >= 0) {          // descendo: pousou em cima
        corpo.y = s.y - corpo.altura;
        corpo.vy = 0;
        corpo.noChao = true;
        corpo.apoio = s;
      } else {                      // subindo: bateu a cabeça
        corpo.y = s.base;
        corpo.vy = 0;
      }
    }
  }

  // Existe chão no ponto x, entre a altura yTopo e yTopo + quedaMax?
  // Serve para diferenciar um "degrau para baixo" (seguro) de um buraco.
  static temChaoAbaixo(x, yTopo, quedaMax, solidos) {
    for (const s of solidos) {
      if (x >= s.x && x <= s.direita && s.y >= yTopo - 1 && s.y <= yTopo + quedaMax) return true;
    }
    return false;
  }

  // Calcula o impulso vertical MÍNIMO para que, depois de andar "dx" pixels na
  // horizontal com velocidade "vx", o corpo esteja pelo menos "dy" pixels ACIMA da
  // altura de onde saiu (dy negativo = pode estar abaixo).
  //
  // É a fórmula do lançamento de projétil (lembrando que o Y do canvas cresce para baixo):
  //   tempo até chegar lá:  t = dx / vx
  //   altura nesse tempo:   vy*t - g*t²/2  >=  dy   ->   vy >= (dy + g*t²/2) / t
  //
  // Devolve null quando o salto NÃO é fisicamente possível (precisaria de mais
  // impulso do que vyMax). Assim ninguém tenta um salto impossível.
  static impulsoParaAlcancar(dx, dy, vx, gravidade, vyMin, vyMax) {
    if (dx <= 0) dx = 1;
    const t = dx / vx;
    const necessario = (dy + 0.5 * gravidade * t * t) / t;
    const vy = Math.max(vyMin, necessario);
    return vy <= vyMax ? vy : null;
  }

  // Altura máxima que um impulso vy alcança: h = vy² / (2g)
  static alturaMaxima(vy, gravidade) {
    return (vy * vy) / (2 * gravidade);
  }

  // Colisão entre um retângulo simples {x, y, largura, altura} (por exemplo, a área
  // do golpe do herói) e uma Entidade.
  static retanguloColide(r, e) {
    return r.x < e.direita && r.x + r.largura > e.x && r.y < e.base && r.y + r.altura > e.y;
  }
}

// Constantes da física, usadas pelo Jogador e pelos zumbis.
Fisica.GRAVIDADE = 1800;            // px/s² (o Y cresce para baixo, então a gravidade é positiva)
Fisica.VELOCIDADE_QUEDA_MAX = 950;  // px/s: limite da queda, para ninguém atravessar o chão num quadro lento
