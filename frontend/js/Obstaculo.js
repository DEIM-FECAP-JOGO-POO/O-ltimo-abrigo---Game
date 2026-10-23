// Obstaculo é a classe base de tudo que fica no caminho do herói: chão, barricadas,
// plataformas, arame farpado e zumbis. Ela herda de Entidade.
//
// Hierarquia:
//   Entidade
//    └── Obstaculo
//         ├── Chao                  (sólido)
//         ├── Barricada             (sólido)
//         ├── PlataformaMovel       (sólido, anda de um lado para o outro)
//         ├── PlataformaQuebradica  (sólido, cai depois de pisar)
//         ├── Espinho               (perigo: causa dano)
//         ├── ZumbiPatrulha         (perigo: pode ser pisado ou golpeado)
//         └── ZumbiCacador          (NOVO v3: inimigo com inteligência)
//
// POLIMORFISMO: o Jogo guarda todos eles numa ÚNICA lista e chama sempre os
// mesmos métodos (atualizar, desenhar, aoColidir, aoPisar, carregar, receberGolpe).
// Cada subclasse responde do seu jeito, sem o Jogo precisar saber qual é o tipo.
// Os métodos abaixo são "ganchos" vazios: só quem precisa os sobrescreve.
class Obstaculo extends Entidade {
  constructor(x, y, largura, altura) {
    super(x, y, largura, altura);
    this.solido = false;              // sólidos bloqueiam o movimento (física)
    this.seguroParaRenascer = false;  // o herói pode renascer em cima dele?
    this.fixo = false;                // NOVO (v3): sólido que nunca se move (a IA dos zumbis usa para planejar saltos)
  }

  // Chamado quando o herói encosta (usado pelos obstáculos "de perigo")
  aoColidir(jogador, jogo) {}

  // Chamado a cada quadro em que alguém está EM CIMA do obstáculo
  aoPisar(jogador) {}

  // Chamado a cada quadro para mover junto quem está em cima (plataformas móveis)
  carregar(jogador) {}

  // NOVO (v3): chamado quando o golpe do herói acerta este obstáculo.
  // Por padrão nada acontece (caixas, chão...). Os inimigos SOBRESCREVEM.
  // Devolve true se o golpe teve efeito.
  receberGolpe(dano, direcao, jogo) { return false; }

  // NOVO (v3): pode ser alvo do golpe do herói? Os inimigos sobrescrevem.
  get atingivel() { return false; }
}
