// Classe Jogo: orquestra tudo. Controla o laço principal, os estados da partida,
// a câmera, as colisões e o combate.
//
// POLIMORFISMO em ação: a lista de obstáculos mistura Chao, Barricada, Espinho,
// PlataformaMovel, ZumbiPatrulha, ZumbiCacador... e o Jogo chama sempre
// obstaculo.atualizar(), obstaculo.desenhar(), obstaculo.aoColidir() e
// obstaculo.receberGolpe() sem precisar saber de qual tipo ele é. Cada um
// responde à sua própria maneira.
//
// O jogo tem estes estados:
//   'menu' -> 'jogando' (<-> 'pausa') -> 'derrota' ou 'vitoria' -> ... -> 'fim'
// De qualquer tela de fim dá para recomeçar sem recarregar a página.
//
// Quem faz o quê (responsabilidade única):
//   Jogo    -> regras, estados, câmera, colisões e combate
//   Tela    -> menu, pausa, derrota, vitória e resultado final
//   Hud     -> informações fixas na tela durante a partida
//   Diretor -> dificuldade progressiva e surgimento de zumbis/itens
//   Efeitos -> partículas e textos flutuantes
class Jogo {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.largura = canvas.width;
    this.altura = canvas.height;

    this.teclas = {};
    // As três fases ficam numa lista: o Jogo trata todas como "Fase" (polimorfismo)
    this.fases = [new FaseFacil(), new FaseMedia(), new FaseDificil()];
    this.indiceFase = 0;
    this.fase = this.fases[0];
    this.estado = 'menu'; // 'menu' | 'jogando' | 'pausa' | 'derrota' | 'vitoria' | 'fim'

    this.temposFases = [];    // tempo de cada fase concluída
    this.tempoFase = 0;
    this.motivoDerrota = '';
    this.aviso = null;        // mensagem rápida na tela: { texto, restante }
    this.relogio = 0;         // tempo desde que a página abriu (anima o menu)
    this.camX = 0;            // posição da câmera no mundo
    this.solidos = [];        // sólidos PERTO do herói (física do herói)
    this.solidosFase = [];    // NOVO (v3): todos os sólidos ativos (física e IA dos zumbis)
    this.ultimoTempo = null;

    // NOVO (v3): pontuação e feedback de dano
    this.pontos = 0;          // abates + itens da fase atual
    this.abates = 0;
    this.maiorX = 0;          // ponto mais distante alcançado (distância percorrida)
    this.pontosFases = [];    // pontos de cada fase concluída
    this.flashDano = 0;       // segundos de tela vermelha que ainda faltam
    this.tremor = 0;          // segundos de tremor de câmera que ainda faltam
    this.vidasAntes = 0;      // vidas no quadro anterior (para perceber que o herói se machucou)

    // NOVO (v3): objetos auxiliares (composição: o Jogo TEM uma Tela, um Hud...)
    this.tela = new Tela(this.ctx, this.largura, this.altura);
    this.hud = new Hud(this.ctx, this.largura, this.altura);
    this.efeitos = new Efeitos();
    this.diretor = new Diretor();

    // NOVO (backend): ranking online. Sem servidor ele fica "offline" e o jogo segue igual.
    this.ranking = new Ranking();
    this.mensagemRanking = '';   // linha mostrada nas telas de vitória e derrota
    this.painelRanking = document.getElementById('nome-jogador') ? new PainelRanking(this.ranking) : null;
    if (this.painelRanking) this.painelRanking.iniciar();

    this._configurarTeclado();
    // Um ÚNICO laço de animação para o jogo inteiro (nunca chamamos isso de novo)
    requestAnimationFrame((t) => this._loop(t));
  }

  // ================= Entrada =================

  _configurarTeclado() {
    window.addEventListener('keydown', (e) => {
      // NOVO (backend): digitando o nome no campo do ranking, as teclas não controlam o jogo
      if (e.target instanceof HTMLInputElement) return;
      // Impede que setas e espaço rolem a página enquanto se joga
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      // Segurar uma tecla faz o navegador repetir o keydown. Só tratamos o
      // PRIMEIRO aperto como "ação" (assim segurar J não vira uma metralhadora).
      const jaEstavaPressionada = this.teclas[e.code];
      this.teclas[e.code] = true;
      if (!jaEstavaPressionada) this._aoPressionar(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.teclas[e.code] = false;
    });

    // NOVO (v3): se a janela perde o foco, o keyup pode nunca chegar e a tecla
    // ficaria "presa" (o herói correria sozinho). Então soltamos todas.
    window.addEventListener('blur', () => {
      this.teclas = {};
    });
  }

  // Teclas de "ação" (disparadas uma vez por aperto). O que cada tecla faz
  // depende do estado do jogo.
  _aoPressionar(codigo) {
    const numero = { Digit1: 0, Digit2: 1, Digit3: 2 }[codigo];

    switch (this.estado) {
      case 'menu':
        if (codigo === 'Enter') this.iniciarFase(0);
        else if (numero !== undefined) this.iniciarFase(numero);
        break;
      case 'jogando':
        if (codigo === 'KeyP') this.estado = 'pausa';
        else if (codigo === 'KeyR') this.iniciarFase(this.indiceFase);
        else if (codigo === 'Escape') this.estado = 'menu';
        // NOVO (v3): golpe e adrenalina
        else if (Jogo.TECLAS_GOLPE.includes(codigo)) this.jogador.iniciarAtaque();
        else if (Jogo.TECLAS_ADRENALINA.includes(codigo)) this._ativarAdrenalina();
        break;
      case 'pausa':
        if (codigo === 'KeyP' || codigo === 'Enter') this.estado = 'jogando';
        else if (codigo === 'Escape') this.estado = 'menu';
        break;
      case 'derrota':
        if (codigo === 'Enter' || codigo === 'KeyR') this.iniciarFase(this.indiceFase);
        else if (codigo === 'Escape') this.estado = 'menu';
        else if (numero !== undefined) this.iniciarFase(numero);
        break;
      case 'vitoria':
        if (codigo === 'Enter') {
          if (this.indiceFase < this.fases.length - 1) this.iniciarFase(this.indiceFase + 1);
          else this.estado = 'fim';
        } else if (codigo === 'Escape') this.estado = 'menu';
        break;
      case 'fim':
        if (codigo === 'Enter' || codigo === 'Escape') this.estado = 'menu';
        break;
    }
  }

  // NOVO (v3): o Jogo só PEDE; quem decide se dá para ativar é o Jogador (encapsulamento)
  _ativarAdrenalina() {
    if (this.jogador.ativarAdrenalina()) {
      this.avisar('ADRENALINA!');
      this.efeitos.explosao(this.jogador.x + 13, this.jogador.y + 23, 16, '#ffd54f', 220, 0, 3);
    }
  }

  // ================= Controle de fase =================

  // Começa (ou recomeça) uma fase. Cria tudo do zero, garantindo que nada da
  // tentativa anterior fique para trás.
  iniciarFase(indice) {
    this.indiceFase = indice;
    this.fase = this.fases[indice];
    this.fase.nivelBase = Diretor.NIVEL_BASE_POR_FASE[indice] || 0;
    this.fase.reiniciar();                       // recria os obstáculos (polimorfismo)
    this.cenario = new Cenario(this.fase.tema, this.fase.comprimento);

    this.jogador = new Jogador(80, this.fase.chaoY - 46);
    this.horda = new Horda(this.jogador.x - 240, this.fase.chaoY,
                           this.fase.velocidadeHorda, this.fase.aceleracaoHorda);
    this.camX = 0;
    this.tempoFase = 0;
    this.aviso = null;
    this.solidos = [];
    this.solidosFase = [];
    this.teclas = {}; // evita "tecla presa" vinda da tentativa anterior

    // NOVO (v3): tudo o que foi acrescentado também é zerado ao reiniciar
    this.efeitos.limpar();
    this.diretor.reiniciar(indice);
    this.pontos = 0;
    this.abates = 0;
    this.maiorX = this.jogador.x;
    this.flashDano = 0;
    this.tremor = 0;
    this.vidasAntes = this.jogador.vidas;
    this.mensagemRanking = '';  // NOVO (backend)
    this.estado = 'jogando';
  }

  // Mostra uma mensagem rápida no meio da tela (o Hud desenha)
  avisar(texto) {
    this.aviso = { texto, restante: Jogo.DURACAO_AVISO };
  }

  // ================= Pontuação (NOVO v3) =================

  // Getters: calculados na hora, a partir do ponto mais distante alcançado
  get metros() { return Math.max(0, Math.floor((this.maiorX - 80) / Jogo.PIXELS_POR_METRO)); }
  get pontuacao() { return this.pontos + this.metros; }

  // Chamado por QUALQUER inimigo eliminado (golpe ou pisão). Cada inimigo informa
  // quantos pontos vale; o Jogo não precisa saber o tipo dele.
  registrarAbate(inimigo, pontos) {
    this.pontos += pontos;
    this.abates++;
    this.jogador.ganharEnergia(Jogador.ENERGIA_POR_ABATE);
    const cx = inimigo.x + inimigo.largura / 2;
    this.efeitos.texto(`+${pontos}`, cx, inimigo.y - 18, '#ffeb3b', 16);
    this.efeitos.explosao(cx, inimigo.y + 20, 14, '#558b2f', 200);
  }

  // ================= Laço principal =================

  // O navegador chama o _loop no ritmo do monitor e informa o horário atual.
  // dt = segundos desde o quadro anterior. Tudo que se move usa o dt, então a
  // velocidade do jogo é a mesma em monitores de 60, 120 ou 144 Hz.
  _loop(tempoAtual) {
    if (this.ultimoTempo === null) this.ultimoTempo = tempoAtual;
    // Limita o dt para o jogo não "pular" (e atravessar o chão) depois de um
    // travamento ou de a aba ficar em segundo plano
    const dt = Math.min((tempoAtual - this.ultimoTempo) / 1000, Jogo.DT_MAXIMO);
    this.ultimoTempo = tempoAtual;

    this._atualizar(dt);
    this._desenhar();
    requestAnimationFrame((t) => this._loop(t));
  }

  _atualizar(dt) {
    this.relogio += dt;
    if (this.aviso) {
      this.aviso.restante -= dt;
      if (this.aviso.restante <= 0) this.aviso = null;
    }
    this.flashDano = Math.max(0, this.flashDano - dt);
    this.tremor = Math.max(0, this.tremor - dt);
    if (this.estado === 'jogando') this._atualizarJogo(dt);
  }

  // Uma "rodada" das regras do jogo. Cada entidade é atualizada UMA vez por quadro.
  _atualizarJogo(dt) {
    const fase = this.fase;
    this.tempoFase += dt;

    // Sólidos ativos da fase. São referências aos objetos, então as posições
    // das plataformas móveis continuam atualizadas.
    this.solidosFase = fase.obstaculos.filter((o) => o.ativo && o.solido);

    // POLIMORFISMO: cada obstáculo executa a sua própria versão de atualizar().
    // O Jogo é passado junto para quem precisa dele (a IA do ZumbiCacador);
    // os outros simplesmente ignoram esse parâmetro.
    fase.obstaculos.forEach((o) => o.atualizar(dt, this));
    fase.itens.forEach((i) => i.atualizar(dt));
    fase.destino.atualizar(dt);

    // Sólidos perto do herói (por desempenho).
    // Usa as duas bordas, senão um trecho de chão largo "some" quando o herói anda (bug nº 1).
    this.solidos = fase.obstaculos.filter(
      (o) => o.ativo && o.solido &&
             o.direita > this.jogador.x - Jogo.RAIO_SOLIDOS && o.x < this.jogador.x + Jogo.RAIO_SOLIDOS
    );

    this.jogador.atualizar(dt, this);
    this.horda.atualizar(dt, this.jogador); // ALTERADO (v3): a horda recebe o herói (elástico)
    this.maiorX = Math.max(this.maiorX, this.jogador.x);

    this._tratarCombate();
    this._tratarColisoes();
    this.diretor.atualizar(dt, this);
    this.efeitos.atualizar(dt);
    this._verificarDanoSofrido();
    this._removerInativos();
    this._atualizarCamera(dt);
    this._verificarFimDeFase();
  }

  // NOVO (v3): golpe do herói contra os obstáculos.
  // A área de dano só existe durante a janela ativa do golpe, e cada alvo é
  // atingido no máximo UMA vez por golpe (Jogador.registrarAcerto).
  _tratarCombate() {
    const jogador = this.jogador;
    if (!jogador.golpeAtivo) return;
    const area = jogador.obterAreaGolpe();
    for (const o of this.fase.obstaculos) {
      if (!o.atingivel || !Fisica.retanguloColide(area, o)) continue;
      if (!jogador.registrarAcerto(o)) continue;
      // Chamada polimórfica: cada inimigo reage ao golpe do seu jeito
      if (o.receberGolpe(Jogador.DANO_GOLPE, jogador.virado, this)) {
        const faiscaX = jogador.virado > 0 ? area.x + area.largura * 0.6 : area.x + area.largura * 0.4;
        this.efeitos.explosao(faiscaX, area.y + 16, 6, '#fff59d', 240, 300, 2);
        this.tremor = Math.max(this.tremor, 0.08);
      }
    }
  }

  // NOVO (v3): feedback ao perder vida, venha o dano de onde vier (zumbi, arame,
  // queda). Basta comparar as vidas com as do quadro anterior.
  _verificarDanoSofrido() {
    if (this.jogador.vidas < this.vidasAntes) {
      this.flashDano = Jogo.DURACAO_FLASH_DANO;
      this.tremor = Jogo.TEMPO_TREMOR_DANO;
    }
    this.vidasAntes = this.jogador.vidas;
  }

  _tratarColisoes() {
    const jogador = this.jogador;
    const fase = this.fase;

    // Obstáculos "de perigo" (não sólidos): cada um reage do seu jeito em aoColidir()
    for (const o of fase.obstaculos) {
      if (o.ativo && !o.solido && jogador.colideCom(o)) o.aoColidir(jogador, this);
    }

    // Itens: cada tipo faz algo diferente em aoColetar()
    for (const item of fase.itens) {
      if (item.ativo && jogador.colideCom(item)) {
        item.aoColetar(jogador, this);
        item.ativo = false; // o item some depois de pego
        // NOVO (v3): pontos e feedback visual
        this.pontos += Item.PONTOS;
        const cx = item.x + item.largura / 2;
        const ehEnergetico = item instanceof Energetico;
        this.efeitos.explosao(cx, item.y + 12, 12, ehEnergetico ? '#4fc3f7' : '#ffffff', 150, 200, 3);
        this.efeitos.texto(ehEnergetico ? '+VELOCIDADE' : '+1 VIDA', cx, item.y - 8, '#b9f6ca', 14);
      }
    }

    // Caiu num buraco?
    if (jogador.y > this.altura + 100) {
      jogador.cair();
      if (jogador.ativo) this.avisar('Caiu! -1 vida');
    }
  }

  // Tira das listas tudo o que ficou inativo (zumbis mortos, itens pegos,
  // plataformas que caíram), para não continuar gastando processamento com eles.
  _removerInativos() {
    this.fase.obstaculos = this.fase.obstaculos.filter((o) => o.ativo);
    this.fase.itens = this.fase.itens.filter((i) => i.ativo);
  }

  _atualizarCamera(dt) {
    // O herói fica um pouco à esquerda, para ver o que vem pela frente.
    // A câmera "persegue" o alvo suavemente em vez de pular direto para ele.
    const alvo = this.jogador.x - 260;
    this.camX += (alvo - this.camX) * Math.min(1, dt * 6);
    this.camX = Math.max(0, Math.min(this.camX, this.fase.comprimento - this.largura + 100));
  }

  _verificarFimDeFase() {
    const jogador = this.jogador;

    if (jogador.colideCom(this.fase.destino)) {
      this.temposFases[this.indiceFase] = this.tempoFase;
      this.pontosFases[this.indiceFase] = this.pontuacao; // NOVO (v3)
      this.estado = 'vitoria';
      this._enviarPontuacao();
    } else if (!jogador.ativo) {
      this.motivoDerrota = 'Você ficou sem vidas!';
      this.estado = 'derrota';
      this._enviarPontuacao();
    } else if (jogador.x + 4 < this.horda.frente) {
      this.motivoDerrota = 'A horda te alcançou!';
      this.estado = 'derrota';
      this._enviarPontuacao();
    }
  }

  // NOVO (backend): manda o resultado da fase para o servidor (vitória ou derrota).
  // É assíncrono: o jogo não espera a resposta; a tela mostra a posição quando ela chega.
  async _enviarPontuacao() {
    const fase = this.indiceFase + 1;
    if (!this.ranking.online) {
      this.mensagemRanking = 'Ranking offline: rode o servidor (pasta backend) para salvar';
      return;
    }
    this.mensagemRanking = 'Enviando para o ranking…';
    const resposta = await this.ranking.enviar({
      nome: this.painelRanking ? this.painelRanking.nome : 'Anônimo',
      fase,
      pontos: this.pontuacao,
      tempo: this.tempoFase,
      abates: this.abates,
    });
    if (!resposta) {
      this.mensagemRanking = 'Não foi possível enviar ao ranking';
    } else {
      this.mensagemRanking = resposta.posicao
        ? `Ranking da fase ${fase}: você ficou em ${resposta.posicao}º lugar!`
        : `Ranking da fase ${fase}: pontuação salva, mas fora do top ${resposta.ranking.length}`;
      if (this.painelRanking) this.painelRanking.mostrarFase(fase, resposta.ranking);
    }
  }

  // ================= Desenho =================

  // A entidade aparece na tela? (só desenhamos o que é visível)
  _visivel(e) {
    return e.direita > this.camX - 50 && e.x < this.camX + this.largura + 50;
  }

  _desenhar() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.largura, this.altura);

    if (this.estado === 'menu') {
      this.tela.desenharMenu(this.relogio);
      return;
    }

    // Nas outras telas o jogo continua desenhado ao fundo, congelado
    this._desenharMundo();
    this.hud.desenharEfeitosDeTela(this);
    this.hud.desenhar(this);

    const placar = { pontos: this.pontuacao, metros: this.metros, abates: this.abates };
    if (this.estado === 'pausa') {
      this.tela.desenharPausa();
    } else if (this.estado === 'derrota') {
      this.tela.desenharDerrota(this.motivoDerrota, placar, this.mensagemRanking);
    } else if (this.estado === 'vitoria') {
      this.tela.desenharVitoria(this.fase.nome, this.tempoFase, placar, this.indiceFase === this.fases.length - 1, this.mensagemRanking);
    } else if (this.estado === 'fim') {
      this.tela.desenharFim(this.fases, this.temposFases, this.pontosFases);
    }
  }

  // Desenha o cenário e todas as entidades, na ordem de profundidade:
  // fundo -> sólidos -> perigos/inimigos -> itens -> horda -> herói -> efeitos
  _desenharMundo() {
    const ctx = this.ctx;
    const fase = this.fase;

    this.cenario.desenhar(ctx, this.camX, this.largura, this.altura, fase.chaoY);

    // NOVO (v3): tremor de câmera (dano / impacto do golpe)
    const forca = this.tremor > 0 ? this.tremor * 24 : 0;
    const tremorX = forca ? (Math.random() - 0.5) * forca : 0;
    const tremorY = forca ? (Math.random() - 0.5) * forca : 0;

    ctx.save(); // a translação da câmera vale só para o mundo, não para o HUD
    ctx.translate(-Math.round(this.camX) + tremorX, tremorY);

    // POLIMORFISMO: o mesmo desenhar() para todos, resultados visuais diferentes
    if (this._visivel(fase.destino)) fase.destino.desenhar(ctx);
    fase.obstaculos.forEach((o) => { if (o.solido && this._visivel(o)) o.desenhar(ctx); });
    fase.obstaculos.forEach((o) => { if (!o.solido && this._visivel(o)) o.desenhar(ctx); });
    fase.itens.forEach((i) => { if (this._visivel(i)) i.desenhar(ctx); });
    this.horda.desenhar(ctx, this.camX);
    this.jogador.desenhar(ctx);
    this.efeitos.desenhar(ctx);

    ctx.restore();
  }
}

// Constantes do Jogo
Jogo.DT_MAXIMO = 0.05;           // maior dt aceito (s): abaixo de 20 FPS o jogo fica mais lento em vez de "pular"
Jogo.RAIO_SOLIDOS = 700;         // px: só sólidos a esta distância do herói entram na física dele
Jogo.DURACAO_AVISO = 1.4;        // segundos que um aviso fica na tela
Jogo.DURACAO_FLASH_DANO = 0.35;  // NOVO (v3): segundos de tela vermelha ao levar dano
Jogo.TEMPO_TREMOR_DANO = 0.25;   // NOVO (v3): segundos de tremor da câmera ao levar dano
Jogo.PIXELS_POR_METRO = 40;      // NOVO (v3): para mostrar a distância em metros

// NOVO (v3): teclas das ações novas (e.code = posição física da tecla)
Jogo.TECLAS_GOLPE = ['KeyJ', 'KeyX'];
Jogo.TECLAS_ADRENALINA = ['ShiftLeft', 'ShiftRight', 'KeyK'];

// Cria o jogo quando a página termina de carregar.
// Fica em window.jogo só para facilitar testes no console do navegador.
window.addEventListener('load', () => {
  window.jogo = new Jogo(document.getElementById('tela'));
});
