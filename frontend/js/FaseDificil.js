// FASE 3 — Difícil: herda de Fase e sobrescreve construir().
// Plataformas que desabam, duas plataformas móveis em sequência, horda rápida
// (140 px/s) que ainda ACELERA com o tempo e seis zumbis caçadores no caminho.
class FaseDificil extends Fase {
  constructor() {
    // nome, dificuldade, comprimento, velocidade da horda, aceleração da horda, tema
    super('Fase 3 — Ponte Final', 'Difícil', 5800, 140, 1, {
      semente: 37,
      ceuTopo: '#2b0a0a', ceuBase: '#7a1f1f', lua: '#ff8a80',
      prediosLonge: '#3a1111', prediosPerto: '#1a0808',
    });
  }

  // Sobrescreve construir() da classe pai (Template Method): o mapa desta fase
  construir() {
    this.chao(0, 500);
    this.espinho(300, 50);

    this.chao(650, 1200);                 // buraco de 150 px
    this.barricada(800, 40, 60);
    this.barricada(950, 40, 80);
    this.cacador(1100);                   // NOVO (v3)

    // Buraco de 650 px com três plataformas que desabam
    this.plataformaQuebradica(1220, 100);
    this.plataformaQuebradica(1420, 100);
    this.plataformaQuebradica(1620, 100);

    this.chao(1850, 2700);
    this.zumbi(1950, 2250, 85);
    this.energetico(1960);                // NOVO (v3)
    this.espinho(2350, 70);
    this.remedio(2520);
    this.cacador(2600);                   // NOVO (v3)

    this.chao(2850, 3300);
    this.barricada(3000, 40, 50);
    this.espinho(3150, 40);
    this.cacador(3230);                   // NOVO (v3)

    // Buraco de 600 px com duas plataformas móveis em sequência
    this.plataformaMovel(3310, 3310, 3500, 110, 130);
    this.plataformaMovel(3780, 3590, 3780, 110, 130);

    this.chao(3900, 4600);
    this.barricada(4000, 40, 50);
    this.barricada(4150, 40, 70);
    this.espinho(4300, 60);
    this.zumbi(4400, 4580, 70);
    this.cacador(4500);                   // NOVO (v3)

    this.chao(4750, 5900);
    this.espinho(4900, 40);
    this.barricada(5050, 40, 60);
    this.zumbi(5100, 5350, 90);
    this.cacador(5450);                   // NOVO (v3)

    this.definirAbrigo(5600);
  }
}
