// Horda herda de Entidade: é a parede de zumbis que avança sem parar atrás do
// herói. Ela funciona como o "relógio" do jogo: quem para ou erra muito é alcançado.
// O retângulo da horda vai do fundo até a "frente"; se o herói passar da frente
// para trás, o Jogo considera que ele foi pego.
class Horda extends Entidade {
  //   frenteInicial -> X onde começa a frente da horda
  //   chaoY         -> Y do chão (onde ficam os pés dos zumbis)
  //   velocidade    -> px/s
  //   aceleracao    -> px/s² (a horda fica mais rápida com o tempo; 0 = constante)
  constructor(frenteInicial, chaoY, velocidade, aceleracao) {
    super(frenteInicial - 300, 0, 300, 450);
    this.chaoY = chaoY;
    this.velocidade = velocidade;        // velocidade-base (só a aceleração da fase muda ela)
    this.velocidadeAtual = velocidade;   // NOVO (v3): base + bônus do "elástico" neste quadro
    this.aceleracao = aceleracao;
    this.tempo = 0;

    // Posições fixas dos zumbis dentro da horda (geradas uma vez só)
    this.zumbis = [];
    for (let i = 0; i < 18; i++) {
      this.zumbis.push({
        deslocamento: (i * 53) % 290 + 10,        // distância atrás da frente
        profundidade: ((i * 7) % 5) * 5 - 4,      // varia o Y dos pés
        escala: 0.95 + ((i * 13) % 6) * 0.07,
        variacao: i % 2,
      });
    }
  }

  // Borda da frente da horda (se o herói encostar nela, é pego)
  get frente() { return this.x + this.largura; }

  // Sobrescreve atualizar() da Entidade: anda para a direita.
  // ALTERADO (v3): recebe o jogador (opcional). Se o herói abrir muita distância,
  // a horda acelera ("elástico") para continuar pressionando. O bônus nunca passa
  // de uma fração da velocidade do herói, então a fuga continua possível.
  atualizar(dt, jogador = null) {
    this.tempo += dt;
    this.velocidade += this.aceleracao * dt;
    this.velocidadeAtual = this.velocidade;

    if (jogador) {
      const distancia = jogador.x - this.frente;
      // 0 = perto (sem bônus) ... 1 = muito longe (bônus máximo)
      const fracao = Math.max(0, Math.min(1, (distancia - Horda.DISTANCIA_ELASTICO) / Horda.FAIXA_ELASTICO));
      if (fracao > 0) {
        const limite = Math.max(this.velocidade, jogador.velocidade * Horda.LIMITE_FRACAO_HEROI);
        this.velocidadeAtual = Math.min(this.velocidade * (1 + Horda.BONUS_ELASTICO_MAX * fracao), limite);
      }
    }
    this.x += this.velocidadeAtual * dt;
  }

  // Sobrescreve desenhar() da Entidade.
  // camX = posição da câmera, para a sombra cobrir tudo à esquerda da tela.
  desenhar(ctx, camX = 0) {
    // Sombra vermelha escura atrás dos zumbis
    const gradiente = ctx.createLinearGradient(this.frente - 320, 0, this.frente, 0);
    gradiente.addColorStop(0, 'rgba(20,0,0,0.9)');
    gradiente.addColorStop(1, 'rgba(60,0,0,0)');
    ctx.fillStyle = gradiente;
    ctx.fillRect(Math.min(camX - 20, this.frente - 320), 0, this.frente - Math.min(camX - 20, this.frente - 320), 450);

    // Corpo escuro da horda para quem está "dentro" dela
    ctx.fillStyle = 'rgba(20,0,0,0.85)';
    ctx.fillRect(camX - 20, 0, Math.max(0, this.frente - 320 - (camX - 20)), 450);

    // Zumbis individuais (do fundo para a frente), reaproveitando Desenho.zumbi()
    for (let i = 0; i < this.zumbis.length; i++) {
      const z = this.zumbis[i];
      const balanco = Math.sin(this.tempo * 3 + i) * 3;
      Desenho.zumbi(
        ctx,
        this.frente - z.deslocamento + balanco,
        this.chaoY + z.profundidade,
        z.escala,
        this.tempo + i * 0.7,
        1,
        z.variacao
      );
    }
  }
}

// NOVO (v3): constantes do "elástico" da horda.
Horda.DISTANCIA_ELASTICO = 450;  // px entre o herói e a frente da horda a partir dos quais ela acelera
Horda.FAIXA_ELASTICO = 600;      // px a mais para chegar ao bônus máximo
Horda.BONUS_ELASTICO_MAX = 1.2;  // até +120% de velocidade
Horda.LIMITE_FRACAO_HEROI = 0.9; // com o bônus, nunca passa de 90% da velocidade-base do herói
