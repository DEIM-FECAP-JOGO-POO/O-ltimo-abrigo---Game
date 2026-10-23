// Fase é a classe base das três fases do jogo. FaseFacil, FaseMedia e FaseDificil
// herdam dela.
//
// Padrão "Template Method": a classe base define o PASSO A PASSO (reiniciar()
// limpa tudo e chama construir()), e cada subclasse sobrescreve construir() para
// montar o seu próprio mapa. O Jogo só chama fase.reiniciar() e não precisa saber
// qual é a fase (POLIMORFISMO).
//
// Mapa lateral: o herói corre da esquerda para a direita. A coordenada X é a
// posição no "mundo"; o Y do chão é fixo (chaoY).
//
// Referência de física para projetar o mapa:
//  - o salto do herói percorre ~165 px na horizontal e sobe ~113 px
//  - buracos de até ~160 px são pulados com folga pelo herói
//  - NOVO (v3): zumbis caçadores vencem buracos de até ~170 px e barricadas de até
//    ~95 px; buracos maiores (com plataformas) eles não atravessam: param na beirada
class Fase {
  //   nome, dificuldade -> textos mostrados no HUD
  //   comprimento       -> tamanho da fase em px
  //   velocidadeHorda   -> px/s
  //   aceleracaoHorda   -> px/s² (0 = horda com velocidade constante)
  //   tema              -> cores do Cenario
  constructor(nome, dificuldade, comprimento, velocidadeHorda, aceleracaoHorda, tema) {
    this.nome = nome;
    this.dificuldade = dificuldade;
    this.comprimento = comprimento;
    this.velocidadeHorda = velocidadeHorda;
    this.aceleracaoHorda = aceleracaoHorda;
    this.tema = tema;
    this.chaoY = 380;
    this.nivelBase = 0;  // NOVO (v3): nível de dificuldade inicial (o Jogo define antes de reiniciar)

    this.obstaculos = []; // lista POLIMÓRFICA: chão, barricadas, plataformas, espinhos e zumbis
    this.itens = [];
    this.destino = null;  // o Abrigo
  }

  // Recria todos os objetos da fase do zero (usado ao iniciar e ao reiniciar).
  // Assim nada da tentativa anterior (zumbi morto, item pego, plataforma caída) fica para trás.
  reiniciar() {
    this.obstaculos = [];
    this.itens = [];
    this.destino = null;
    this.construir(); // chama a versão da SUBCLASSE
  }

  // Cada subclasse sobrescreve este método e monta o seu mapa.
  // Se alguém esquecer, o erro avisa na hora.
  construir() {
    throw new Error('A subclasse de Fase deve implementar construir()');
  }

  // ---- Métodos auxiliares para montar o mapa com poucas linhas ----
  // Cada um cria o objeto certo (new Chao, new Barricada...) já na altura do chão.

  // Trecho de chão entre x1 e x2 (o espaço até o próximo trecho vira um buraco)
  chao(x1, x2) {
    this.obstaculos.push(new Chao(x1, this.chaoY, x2 - x1, 220));
  }

  barricada(x, largura, altura) {
    this.obstaculos.push(new Barricada(x, this.chaoY - altura, largura, altura));
  }

  espinho(x, largura) {
    this.obstaculos.push(new Espinho(x, this.chaoY - 18, largura));
  }

  // Zumbi patrulheiro que anda entre xMin e xMax
  zumbi(xMin, xMax, velocidade) {
    this.obstaculos.push(new ZumbiPatrulha(this.chaoY - 46, xMin, xMax, velocidade));
  }

  plataformaMovel(xInicial, xMin, xMax, largura, velocidade) {
    this.obstaculos.push(new PlataformaMovel(xInicial, this.chaoY, largura, xMin, xMax, velocidade));
  }

  plataformaQuebradica(x, largura) {
    this.obstaculos.push(new PlataformaQuebradica(x, this.chaoY, largura));
  }

  remedio(x) {
    this.itens.push(new Remedio(x, this.chaoY - 62));
  }

  // NOVO (v3)
  energetico(x) {
    this.itens.push(new Energetico(x, this.chaoY - 64));
  }

  // NOVO (v3): zumbi caçador posicionado no percurso. A força dele segue o nível
  // inicial da fase (os que o Diretor cria durante a partida ficam mais fortes).
  cacador(x) {
    const p = Diretor.PROGRESSAO;
    this.obstaculos.push(new ZumbiCacador(x, this.chaoY, {
      multVelocidade: Diretor.interpolar(p.multVelocidadeZumbi, this.nivelBase),
      vidaExtra: Math.floor(Diretor.interpolar(p.vidaExtra, this.nivelBase)),
    }));
  }

  definirAbrigo(x) {
    this.destino = new Abrigo(x, this.chaoY);
  }
}
