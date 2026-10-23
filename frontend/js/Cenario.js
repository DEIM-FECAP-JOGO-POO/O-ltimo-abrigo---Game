// Cenario: desenha o fundo (céu, lua, estrelas e prédios) com efeito PARALLAX:
// as camadas mais distantes andam mais devagar que a câmera, dando sensação de
// profundidade. Cada fase passa um "tema" (cores e semente) diferente.
class Cenario {
  //   tema        -> cores e semente do sorteio (definidos em cada Fase)
  //   comprimento -> tamanho da fase, para gerar prédios suficientes
  constructor(tema, comprimento) {
    this.tema = tema;
    this.comprimento = comprimento;
    this.sorteio = Cenario.criarSorteio(tema.semente); // aleatório repetível

    // Estrelas
    this.estrelas = [];
    for (let i = 0; i < 50; i++) {
      this.estrelas.push({ x: this.sorteio() * 900, y: this.sorteio() * 200, r: 0.5 + this.sorteio() * 1.2 });
    }

    // Duas camadas de prédios: distante (lenta) e próxima (mais rápida)
    this.camadas = [
      { fator: 0.15, cor: tema.prediosLonge, alturaMin: 80, alturaMax: 190, janelas: false },
      { fator: 0.40, cor: tema.prediosPerto, alturaMin: 70, alturaMax: 230, janelas: true },
    ].map((c) => ({ ...c, predios: this.gerarPredios(c) }));
  }

  // Método estático: gerador de números pseudo-aleatórios com semente (mulberry32).
  // Com a mesma semente, a sequência é sempre igual: o cenário de cada fase
  // fica idêntico toda vez que ela é jogada.
  static criarSorteio(semente) {
    let s = semente >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Cria a fileira de prédios de uma camada (uma vez só, no construtor)
  gerarPredios(camada) {
    const lista = [];
    let x = -50;
    const limite = this.comprimento * camada.fator + 1000;
    while (x < limite) {
      const largura = 50 + this.sorteio() * 90;
      const altura = camada.alturaMin + this.sorteio() * (camada.alturaMax - camada.alturaMin);
      const luzes = [];
      for (let i = 0; i < 40; i++) luzes.push(this.sorteio() < 0.13);
      lista.push({ x, largura, altura, luzes });
      x += largura + this.sorteio() * 25;
    }
    return lista;
  }

  // Desenha o fundo inteiro. camX = posição da câmera no mundo.
  desenhar(ctx, camX, largura, altura, chaoY) {
    const t = this.tema;

    // Céu
    const ceu = ctx.createLinearGradient(0, 0, 0, chaoY);
    ceu.addColorStop(0, t.ceuTopo);
    ceu.addColorStop(1, t.ceuBase);
    ctx.fillStyle = ceu;
    ctx.fillRect(0, 0, largura, altura);

    // Estrelas (quase paradas)
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const e of this.estrelas) {
      const x = (((e.x - camX * 0.03) % 900) + 900) % 900;
      if (x < largura) ctx.fillRect(x, e.y, e.r, e.r);
    }

    // Lua
    ctx.fillStyle = t.lua;
    ctx.beginPath();
    ctx.arc(largura - 150 - camX * 0.02, 90, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(largura - 150 - camX * 0.02, 90, 56, 0, Math.PI * 2);
    ctx.fill();

    // Prédios (parallax: cada camada se desloca uma fração da câmera)
    for (const camada of this.camadas) {
      const deslocamento = camX * camada.fator;
      for (const p of camada.predios) {
        const px = p.x - deslocamento;
        if (px + p.largura < 0 || px > largura) continue; // fora da tela: nem desenha
        ctx.fillStyle = camada.cor;
        ctx.fillRect(px, chaoY - p.altura, p.largura, p.altura + 2);

        if (camada.janelas) {
          let indice = 0;
          for (let jy = chaoY - p.altura + 12; jy < chaoY - 24; jy += 20) {
            for (let jx = px + 8; jx < px + p.largura - 12; jx += 16) {
              if (p.luzes[indice % 40]) {
                ctx.fillStyle = 'rgba(255,214,102,0.55)';
                ctx.fillRect(jx, jy, 7, 10);
              }
              indice++;
            }
          }
        }
      }
    }

    // Névoa rente ao chão
    const nevoa = ctx.createLinearGradient(0, chaoY - 70, 0, chaoY);
    nevoa.addColorStop(0, 'rgba(255,255,255,0)');
    nevoa.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = nevoa;
    ctx.fillRect(0, chaoY - 70, largura, 70);

    // Abismo (aparece nos buracos do chão)
    const abismo = ctx.createLinearGradient(0, chaoY, 0, altura);
    abismo.addColorStop(0, '#0a0508');
    abismo.addColorStop(1, '#000000');
    ctx.fillStyle = abismo;
    ctx.fillRect(0, chaoY, largura, altura - chaoY);
  }
}
