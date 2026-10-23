// FASE 2 — Média: herda de Fase e sobrescreve construir().
// Plataforma móvel sobre um buraco largo, zumbis patrulhando, buracos de 150 px,
// horda mais rápida (120 px/s) e cinco zumbis caçadores no caminho.
class FaseMedia extends Fase {
  constructor() {
    // nome, dificuldade, comprimento, velocidade da horda, aceleração da horda, tema
    super('Fase 2 — Cidade em Ruínas', 'Média', 4600, 120, 0, {
      semente: 23,
      ceuTopo: '#0e1530', ceuBase: '#3b3a66', lua: '#e3e8ff',
      prediosLonge: '#1c1f3d', prediosPerto: '#12142a',
    });
  }

  // Sobrescreve construir() da classe pai (Template Method): o mapa desta fase
  construir() {
    this.chao(0, 700);
    this.barricada(380, 50, 50);
    this.espinho(560, 50);

    this.chao(850, 1500);                 // buraco de 150 px
    this.zumbi(1000, 1300, 50);
    this.cacador(1250);                   // NOVO (v3)
    this.barricada(1380, 40, 60);

    // Buraco largo (450 px): só dá para atravessar na plataforma móvel.
    // Os zumbis caçadores não conseguem: param na beirada.
    this.plataformaMovel(1510, 1510, 1830, 110, 100);

    this.chao(1950, 2700);
    this.espinho(2100, 60);
    this.remedio(2250);
    this.cacador(2300);                   // NOVO (v3)
    this.espinho(2380, 50);
    this.zumbi(2480, 2650, 60);

    this.chao(2850, 3500);
    this.energetico(2950);                // NOVO (v3)
    this.barricada(3000, 40, 55);
    this.cacador(3100);                   // NOVO (v3): entre duas barricadas
    this.barricada(3180, 40, 70);
    this.espinho(3330, 50);
    this.cacador(3420);                   // NOVO (v3)

    this.chao(3650, 4700);
    this.zumbi(3750, 4000, 70);
    this.espinho(4080, 50);
    this.cacador(4200);                   // NOVO (v3)

    this.definirAbrigo(4350);
  }
}
