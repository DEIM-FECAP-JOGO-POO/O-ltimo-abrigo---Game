// NOVO (v3): Efeitos cuida das partículas (sangue, faíscas, brilho dos itens) e dos
// textos que sobem e somem ("+100", "-1", "+VELOCIDADE").
//
// Usa um "pool" (reserva) de partículas: quando uma partícula acaba, ela é
// REAPROVEITADA no próximo impacto, em vez de criarmos objetos novos o tempo todo.
// Isso deixa o jogo mais leve com muitos zumbis na tela.
class Efeitos {
  constructor(limiteParticulas = 220) {
    this.limite = limiteParticulas; // nunca existem mais partículas que isso
    this.particulas = [];
    this.textos = [];
  }

  // Apaga tudo (usado ao iniciar/reiniciar uma fase)
  limpar() {
    this.particulas.length = 0;
    this.textos.length = 0;
  }

  // Método interno: pega uma partícula livre do pool (ou cria uma, se ainda couber)
  _obterParticula() {
    for (const p of this.particulas) if (p.vida <= 0) return p;
    if (this.particulas.length >= this.limite) return null;
    const p = { x: 0, y: 0, vx: 0, vy: 0, vida: 0, vidaMax: 1, tam: 2, cor: '#fff', gravidade: 0 };
    this.particulas.push(p);
    return p;
  }

  // Explosão de partículas num ponto, para todos os lados.
  //   velocidade -> força da explosão (px/s)
  //   gravidade  -> 0 = partículas flutuam; maior = caem mais rápido
  explosao(x, y, quantidade, cor, velocidade = 180, gravidade = 900, tam = 3) {
    for (let i = 0; i < quantidade; i++) {
      const p = this._obterParticula();
      if (!p) return; // pool cheio: ignora o resto
      const angulo = Math.random() * Math.PI * 2;
      const v = velocidade * (0.35 + Math.random() * 0.65);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angulo) * v;
      p.vy = Math.sin(angulo) * v - velocidade * 0.3;
      p.vidaMax = p.vida = 0.35 + Math.random() * 0.35;
      p.tam = tam * (0.6 + Math.random() * 0.8);
      p.cor = cor;
      p.gravidade = gravidade;
    }
  }

  // Texto que sobe e some
  texto(texto, x, y, cor = '#ffeb3b', tamanho = 16) {
    if (this.textos.length > 30) this.textos.shift(); // limite de textos ao mesmo tempo
    this.textos.push({ texto, x, y, cor, tamanho, vida: 0.9, vidaMax: 0.9 });
  }

  atualizar(dt) {
    for (const p of this.particulas) {
      if (p.vida <= 0) continue; // partícula livre no pool
      p.vida -= dt;
      p.vy += p.gravidade * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (const t of this.textos) {
      t.vida -= dt;
      t.y -= 40 * dt; // sobe
    }
    // Remove os textos que acabaram (de trás para frente, para o índice não "pular")
    for (let i = this.textos.length - 1; i >= 0; i--) {
      if (this.textos[i].vida <= 0) this.textos.splice(i, 1);
    }
  }

  // Desenha em coordenadas do MUNDO (o Jogo chama dentro do translate da câmera)
  desenhar(ctx) {
    for (const p of this.particulas) {
      if (p.vida <= 0) continue;
      ctx.globalAlpha = Math.max(0, p.vida / p.vidaMax); // vai sumindo
      ctx.fillStyle = p.cor;
      ctx.fillRect(p.x - p.tam / 2, p.y - p.tam / 2, p.tam, p.tam);
    }
    ctx.globalAlpha = 1;
    for (const t of this.textos) {
      ctx.globalAlpha = Math.max(0, Math.min(1, t.vida / t.vidaMax * 1.5));
      Desenho.texto(ctx, t.texto, t.x, t.y, t.tamanho, t.cor);
    }
    ctx.globalAlpha = 1; // devolve a transparência ao normal para os outros desenhos
  }
}
