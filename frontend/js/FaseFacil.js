// FASE 1 — Fácil: herda de Fase e sobrescreve construir().
// Buracos pequenos (120 px), obstáculos espaçados, horda lenta (90 px/s) e
// só dois zumbis caçadores posicionados no caminho.
class FaseFacil extends Fase {
  constructor() {
    // nome, dificuldade, comprimento, velocidade da horda, aceleração da horda, tema
    super('Fase 1 — Rua Deserta', 'Fácil', 3400, 90, 0, {
      semente: 11,
      ceuTopo: '#3a2a5c', ceuBase: '#e8825a', lua: '#fff3d6',
      prediosLonge: '#4a3563', prediosPerto: '#2a2140',
    });
  }

  // Sobrescreve construir() da classe pai (Template Method): o mapa desta fase
  construir() {
    // Chão (os espaços entre os trechos são buracos de 120 px)
    this.chao(0, 760);
    this.chao(880, 1650);
    this.chao(1770, 2500);
    this.chao(2620, 3500);

    this.barricada(420, 50, 45);
    this.energetico(650);          // NOVO (v3)
    this.espinho(1050, 50);
    this.barricada(1300, 50, 55);
    this.cacador(1180);            // NOVO (v3)
    this.remedio(1500);
    this.espinho(1950, 50);
    this.zumbi(2100, 2400, 45);
    this.cacador(2700);            // NOVO (v3)
    this.barricada(2850, 50, 50);
    this.espinho(3000, 50);

    this.definirAbrigo(3250);
  }
}
