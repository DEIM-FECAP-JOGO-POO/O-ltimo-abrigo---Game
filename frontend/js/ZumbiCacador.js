// NOVO (v3): ZumbiCacador é o zumbi com inteligência artificial simples.
// Herda de Obstaculo para entrar na MESMA lista polimórfica que o Jogo já percorre
// (atualizar, desenhar, aoColidir, receberGolpe) e reaproveita o que já existia:
//   - Entidade.colideCom (colisão AABB)
//   - Fisica.resolverHorizontal / resolverVertical (a mesma física do herói)
//   - Desenho.zumbi (o mesmo desenho da horda e do patrulheiro)
//
// O comportamento é uma MÁQUINA DE ESTADOS: o zumbi está sempre em UM estado,
// e cada estado decide o que ele faz e para qual estado ele vai depois.
//   IDLE ............. vagando perto de onde nasceu, sem ter visto o herói
//   CHASE ............ perseguindo o herói
//   APPROACH_OBSTACLE  barricada ou buraco à frente: decide se pula ou se para
//   JUMP ............. no ar, executando um salto calculado
//   ATTACK ........... preparando o bote ("!") e mordendo
//   STUNNED .......... recuando depois de levar um golpe
//   DEAD ............. tombando; depois é removido (ativo = false)
//
// Visual: camisa vermelha e olho amarelo, para diferenciar do patrulheiro.
class ZumbiCacador extends Obstaculo {
  //   x      -> posição horizontal (no mundo)
  //   chaoY  -> Y do chão onde ele fica de pé
  //   opcoes -> { multVelocidade, vidaExtra }, vindos do Diretor (dificuldade)
  constructor(x, chaoY, opcoes = {}) {
    super(x, chaoY - 46, 28, 46);
    const mult = opcoes.multVelocidade || 1;
    // Pequena variação sorteada: cada zumbi é um pouco diferente do outro
    const variacao = 1 + (Math.random() * 2 - 1) * ZumbiCacador.VARIACAO_VELOCIDADE;

    // Atributos individuais
    this.velocidade = ZumbiCacador.VELOCIDADE_BASE * mult * variacao;
    this.vidaMax = ZumbiCacador.VIDA_BASE + Math.floor(Math.random() * (ZumbiCacador.VARIACAO_VIDA + 1)) + (opcoes.vidaExtra || 0);
    this.vida = this.vidaMax;
    this.alcanceDeteccao = ZumbiCacador.ALCANCE_DETECCAO * (0.9 + Math.random() * 0.2);

    // Física: os mesmos nomes de atributo do Jogador, para poder usar a classe Fisica
    this.vx = 0;
    this.vy = 0;
    this.noChao = false;
    this.apoio = null;
    this.vxSalto = 0;     // velocidade horizontal mantida durante o salto

    // Inteligência artificial
    this.direcao = -1;    // nasce olhando para a esquerda (o herói vem de lá)
    this.estado = ZumbiCacador.ESTADO.IDLE;
    this.tempoEstado = 0; // há quantos segundos está no estado atual
    this.plano = null;    // resultado de _analisarCaminho(): o que há à frente e o que fazer
    this.recargaAtaque = 0;
    this.golpeDado = false;
    this.origemX = x;     // centro da área onde ele vaga no IDLE
    this.tempoVirar = 0;
    this.desistir = 0;    // ignora o herói por um tempo depois de ficar travado
    this.travadoTempo = 0;
    this.travadas = 0;
    this.ultimoX = x;

    // Visual
    this.animacao = Math.random() * 6;
    this.flashDano = 0;
  }

  get centroX() { return this.x + this.largura / 2; }
  get morto() { return this.estado === ZumbiCacador.ESTADO.DEAD; }

  // Sobrescreve o getter de Obstaculo: pode levar golpe enquanto estiver vivo
  get atingivel() { return this.ativo && !this.morto; }

  // Toda troca de estado passa por aqui, para zerar os contadores do estado anterior
  mudarEstado(novo) {
    if (this.estado === novo) return;
    this.estado = novo;
    this.tempoEstado = 0;
    this.travadoTempo = 0;
    this.ultimoX = this.x;
  }

  // ================= Atualização =================

  // Sobrescreve atualizar() da Entidade. Recebe o jogo para enxergar o herói e o cenário.
  atualizar(dt, jogo) {
    if (!jogo || !this.ativo) return;
    const E = ZumbiCacador.ESTADO;
    const jogador = jogo.jogador;

    // Ficou para trás: é engolido pela horda (vira parte dela)
    if (jogo.horda && this.direita < jogo.horda.frente - 30) {
      this.ativo = false;
      return;
    }

    // Longe do herói o zumbi "dorme" e não gasta processamento
    if (!this.morto && Math.abs(jogador.x - this.x) > ZumbiCacador.RAIO_ATIVACAO) return;

    this.tempoEstado += dt;
    this.recargaAtaque = Math.max(0, this.recargaAtaque - dt);
    this.flashDano = Math.max(0, this.flashDano - dt);
    this.desistir = Math.max(0, this.desistir - dt);
    this.tempoVirar = Math.max(0, this.tempoVirar - dt);

    const solidos = jogo.solidosFase;

    // Plataforma móvel leva o zumbi junto (o mesmo polimorfismo usado com o herói)
    if (this.apoio && this.apoio.ativo) this.apoio.carregar(this);

    // 1) A IA decide a velocidade horizontal (máquina de estados)
    this._pensar(dt, jogo, solidos);

    // 2) Física: gravidade + colisão com o cenário (assim ele nunca atravessa sólidos)
    this.vy = Math.min(this.vy + Fisica.GRAVIDADE * dt, Fisica.VELOCIDADE_QUEDA_MAX);
    this.x += this.vx * dt;
    this.bateuParede = Fisica.resolverHorizontal(this, solidos);
    this.y += this.vy * dt;
    Fisica.resolverVertical(this, solidos);
    if (this.noChao && this.apoio) this.apoio.aoPisar(this);

    // Caiu num buraco: sai do jogo
    if (this.y > 800) this.ativo = false;

    // Morto: espera a animação de queda terminar e é removido
    if (this.estado === E.DEAD && this.tempoEstado > 0.75) this.ativo = false;

    // Animação das pernas proporcional à velocidade
    this.animacao += dt * Math.max(0.15, Math.abs(this.vx) / 120);
  }

  // Método interno (começa com _ por convenção): o "cérebro" do zumbi.
  // Um switch com um caso para cada estado da máquina de estados.
  _pensar(dt, jogo, solidos) {
    const Z = ZumbiCacador;
    const E = Z.ESTADO;
    const jogador = jogo.jogador;

    const dx = (jogador.x + jogador.largura / 2) - this.centroX;
    const dy = jogador.base - this.base;
    const distancia = Math.abs(dx);
    const veHeroi = jogador.ativo && this.desistir <= 0 &&
                    distancia < this.alcanceDeteccao && Math.abs(dy) < Z.ALTURA_DETECCAO;
    // Para perder o herói ele precisa ir BEM mais longe do que para ver (histerese).
    // Isso evita o zumbi ficar trocando entre IDLE e CHASE sem parar.
    const perdeuHeroi = !jogador.ativo ||
                        distancia > this.alcanceDeteccao * Z.FATOR_PERDER_ALVO ||
                        Math.abs(dy) > Z.ALTURA_DETECCAO * 1.5;

    switch (this.estado) {
      case E.IDLE:
        this._vagar(solidos);
        if (veHeroi) this.mudarEstado(E.CHASE);
        break;

      case E.CHASE:
        if (perdeuHeroi) { this._voltarAoIdle(); break; }
        this._olharPara(dx);
        if (this._podeAtacar(jogador)) { this._iniciarAtaque(); break; }
        this.vx = this.direcao * this.velocidade;
        if (this.noChao) {
          this.plano = this._analisarCaminho(solidos);
          if (this.plano) { this.mudarEstado(E.APPROACH_OBSTACLE); this._seguirPlano(); }
          this._verificarTravado(dt);
        }
        break;

      case E.APPROACH_OBSTACLE:
        if (perdeuHeroi) { this._voltarAoIdle(); break; }
        // O herói passou para o outro lado: volta a perseguir (com folga, para não tremer)
        if (Math.sign(dx) !== this.direcao && distancia > 40) { this._olharPara(dx); this.mudarEstado(E.CHASE); break; }
        if (this._podeAtacar(jogador)) { this._iniciarAtaque(); break; }
        if (!this.noChao) break; // escorregou ou foi empurrado: espera pousar
        this.plano = this._analisarCaminho(solidos);
        if (!this.plano) { this.mudarEstado(E.CHASE); break; }
        this._seguirPlano();
        if (this.plano.viavel) this._verificarTravado(dt);
        break;

      case E.JUMP:
        this.vx = this.vxSalto;
        // Aterrissou: volta a perseguir
        if (this.noChao && this.tempoEstado > 0.05) {
          this.travadas = 0;
          this.mudarEstado(perdeuHeroi ? E.IDLE : E.CHASE);
        }
        break;

      case E.ATTACK:
        this.vx = 0;
        // Primeiro o "bote" (o jogador vê o "!" e pode fugir); depois a mordida
        if (!this.golpeDado && this.tempoEstado >= Z.PREPARO_ATAQUE) {
          this.golpeDado = true;
          if (this._alcancaHeroi(jogador, Z.ALCANCE_ATAQUE + 8) &&
              jogador.receberDano(this.direcao, Z.DANO)) {
            jogo.avisar('Mordida! -1 vida');
            jogo.efeitos.explosao(jogador.x + jogador.largura / 2, jogador.y + 20, 10, '#e53935', 160);
          }
        }
        if (this.tempoEstado >= Z.PREPARO_ATAQUE + Z.RECUPERACAO_ATAQUE) {
          this.recargaAtaque = Z.INTERVALO_ATAQUE; // intervalo até o próximo ataque
          this.mudarEstado(perdeuHeroi ? E.IDLE : E.CHASE);
        }
        break;

      case E.STUNNED:
        // Atrito: o recuo do golpe vai parando
        if (this.noChao) this.vx *= Math.max(0, 1 - 8 * dt);
        if (this.tempoEstado >= Z.TEMPO_ATORDOADO && this.noChao) {
          this.mudarEstado(perdeuHeroi ? E.IDLE : E.CHASE);
        }
        break;

      case E.DEAD:
        if (this.noChao) this.vx *= Math.max(0, 1 - 10 * dt);
        break;
    }
  }

  // ---------- Comportamentos ----------

  // Vira para o herói só se ele estiver claramente de um lado (evita "tremer"
  // quando o herói está bem em cima do zumbi).
  _olharPara(dx) {
    if (Math.abs(dx) > 14) this.direcao = Math.sign(dx);
  }

  _voltarAoIdle() {
    this.origemX = this.x;
    this.mudarEstado(ZumbiCacador.ESTADO.IDLE);
  }

  // IDLE: anda devagar para lá e para cá, virando na beirada, na parede
  // ou quando se afasta demais de onde começou.
  _vagar(solidos) {
    if (!this.noChao) { this.vx *= 0.9; return; }
    const frente = this.direcao > 0 ? this.direita : this.x;
    const semChao = !Fisica.temChaoAbaixo(frente + this.direcao * 6, this.base, 4, solidos);
    const longe = (this.x - this.origemX) * this.direcao > 60;
    if ((semChao || longe || this.bateuParede) && this.tempoVirar <= 0) {
      this.direcao *= -1;
      this.tempoVirar = 0.4;
    }
    // Para na beirada em vez de cair enquanto ainda não virou
    this.vx = semChao ? 0 : this.direcao * ZumbiCacador.VELOCIDADE_VAGAR;
  }

  // Olha à frente (na direção atual) usando a posição e o tamanho REAIS dos sólidos
  // e devolve o obstáculo mais próximo:
  //   { tipo: 'barricada', distancia, viavel, ... }
  //   { tipo: 'buraco',    distancia, viavel, ... }
  // ou null se o caminho está livre.
  _analisarCaminho(solidos) {
    const Z = ZumbiCacador;
    const g = Fisica.GRAVIDADE;
    const d = this.direcao;
    const frente = d > 0 ? this.direita : this.x;

    // 1) Parede / barricada à frente: qualquer sólido na altura do corpo
    let parede = null;
    let distParede = Infinity;
    for (const s of solidos) {
      if (s === this.apoio) continue;
      if (s.y >= this.base - 2 || s.base <= this.y) continue; // não está na altura do corpo
      const dist = d > 0 ? s.x - frente : frente - s.direita;
      if (dist < -2 || dist > Z.VISAO_OBSTACULO) continue;
      if (dist < distParede) { parede = s; distParede = Math.max(0, dist); }
    }

    // 2) Buraco: a beirada do sólido em que está pisando, sem chão logo depois
    //    (descer um degrau, como sair de cima de uma barricada, não conta como buraco)
    let distBuraco = Infinity;
    let borda = 0;
    if (this.apoio) {
      borda = d > 0 ? this.apoio.direita : this.apoio.x;
      const dist = d > 0 ? borda - frente : frente - borda;
      if (dist <= Z.VISAO_OBSTACULO &&
          !Fisica.temChaoAbaixo(borda + d * 4, this.base, Z.QUEDA_SEGURA, solidos)) {
        distBuraco = Math.max(0, dist);
      }
    }

    if (!parede && distBuraco === Infinity) return null;

    if (parede && distParede <= distBuraco) {
      // Barricada: altura a vencer (+ margem) e o salto de MENOR impulso,
      // em que o ponto mais alto acontece exatamente na face da barricada.
      const altura = this.base - parede.y + 8;
      const vy = Math.sqrt(2 * g * altura);
      const tApice = vy / g;
      return {
        tipo: 'barricada', alvo: parede, distancia: distParede,
        viavel: vy <= Z.SALTO_VY_MAX,                       // alta demais = não tenta
        vy: Math.max(vy, Z.SALTO_VY_MIN),
        gatilho: Math.min(Z.SALTO_VX, this.velocidade) * tApice, // a que distância pular
        tApice,
      };
    }

    // Buraco: procura onde pousar do outro lado. Só vale sólido FIXO
    // (plataformas móveis/quebradiças não são confiáveis para um salto planejado).
    let pouso = null;
    let vao = Infinity;
    for (const s of solidos) {
      if (!s.fixo || s === this.apoio) continue;
      if (s.y < this.base - 110 || s.y > this.base + Z.QUEDA_SEGURA) continue;
      const v = d > 0 ? s.x - borda : borda - s.direita;
      if (v < -1 || v > Z.BUSCA_POUSO) continue;
      if (v < vao) { vao = Math.max(0, v); pouso = s; }
    }

    let vy = null;
    if (pouso) {
      // Distância total: da frente do zumbi até 16 px DENTRO do outro lado
      const dxTotal = distBuraco + vao + 16;
      const subir = this.base - pouso.y; // > 0 se o outro lado é mais alto
      vy = Fisica.impulsoParaAlcancar(dxTotal, subir, Z.SALTO_VX, g, Z.SALTO_VY_MIN, Z.SALTO_VY_MAX);
    }
    return { tipo: 'buraco', distancia: distBuraco, viavel: vy !== null, vy, vao, pouso };
  }

  // Executa o plano: anda até o ponto certo e pula, ou para na beirada.
  _seguirPlano() {
    const Z = ZumbiCacador;
    const p = this.plano;

    if (!p.viavel) {
      // Salto impossível: não força. Para antes da beirada/parede e espera ("?").
      this.vx = p.distancia > Z.DISTANCIA_BEIRADA + 2 ? this.direcao * this.velocidade * 0.5 : 0;
      return;
    }

    if (p.tipo === 'barricada') {
      if (p.distancia <= p.gatilho + 4) {
        // Se já está mais perto do que o ideal, diminui o impulso horizontal
        // para o ponto mais alto continuar sobre a face da barricada.
        const vx = Math.max(40, Math.min(Z.SALTO_VX, p.distancia / p.tApice));
        this._pular(p.vy, this.direcao * vx);
      } else {
        this.vx = this.direcao * this.velocidade;
      }
    } else { // buraco: pula na beirada (antes de cair)
      if (p.distancia <= Z.DISTANCIA_BEIRADA) this._pular(p.vy, this.direcao * Z.SALTO_VX);
      else this.vx = this.direcao * this.velocidade;
    }
  }

  _pular(vy, vx) {
    if (!this.noChao) return; // nunca pula no ar
    this.vy = -vy;            // negativo = para cima
    this.vxSalto = vx;
    this.vx = vx;
    this.noChao = false;
    this.apoio = null;
    this.mudarEstado(ZumbiCacador.ESTADO.JUMP);
  }

  // Se não sai do lugar por um tempo, tenta um salto; se continuar travado,
  // desiste do herói por um instante e vira (assim ele não fica preso).
  _verificarTravado(dt) {
    if (Math.abs(this.vx) < 1) { this.travadoTempo = 0; this.ultimoX = this.x; return; }
    if (Math.abs(this.x - this.ultimoX) > 3) {
      this.travadoTempo = 0;
      this.ultimoX = this.x;
      return;
    }
    this.travadoTempo += dt;
    if (this.travadoTempo < ZumbiCacador.TEMPO_TRAVADO) return;

    this.travadas++;
    this.travadoTempo = 0;
    if (this.travadas <= 1) {
      this._pular(ZumbiCacador.SALTO_VY_MAX, this.direcao * this.velocidade * 0.6);
    } else {
      this.travadas = 0;
      this.desistir = 1.5;
      this.direcao *= -1;
      this._voltarAoIdle();
    }
  }

  // ---------- Ataque ----------

  // O herói está à frente do zumbi, na mesma altura e dentro do alcance?
  _alcancaHeroi(jogador, alcance) {
    if (jogador.base <= this.y + 8 || jogador.y >= this.base - 8) return false; // alturas diferentes
    const vao = this.direcao > 0 ? jogador.x - this.direita : this.x - jogador.direita;
    return vao <= alcance && vao > -this.largura; // à frente, nunca pelas costas
  }

  _podeAtacar(jogador) {
    return this.noChao && this.recargaAtaque <= 0 && jogador.ativo &&
           this._alcancaHeroi(jogador, ZumbiCacador.ALCANCE_ATAQUE);
  }

  _iniciarAtaque() {
    this.golpeDado = false;
    this.vx = 0;
    this.mudarEstado(ZumbiCacador.ESTADO.ATTACK);
  }

  // ---------- Reação aos golpes do herói ----------

  // Sobrescreve receberGolpe() de Obstaculo (POLIMORFISMO):
  // perde vida, pisca, recua atordoado; com vida 0, morre.
  receberGolpe(dano, direcao, jogo) {
    if (!this.atingivel) return false;
    this.vida -= dano;
    this.flashDano = 0.15;
    jogo.efeitos.explosao(this.centroX, this.y + 18, 8, '#7cb342', 170);
    jogo.efeitos.texto(`-${dano}`, this.centroX, this.y - 10, '#ffffff', 14);

    if (this.vida <= 0) {
      this._morrer(jogo, direcao);
    } else {
      this.mudarEstado(ZumbiCacador.ESTADO.STUNNED);
      this.vx = direcao * ZumbiCacador.EMPURRAO_GOLPE; // recua para o lado do golpe
      if (this.noChao) {
        this.vy = -160; // pulinho
        this.noChao = false;
        this.apoio = null;
      }
      this.direcao = -direcao; // vira para quem bateu
    }
    return true;
  }

  _morrer(jogo, direcao) {
    this.mudarEstado(ZumbiCacador.ESTADO.DEAD);
    this.vx = direcao * ZumbiCacador.EMPURRAO_GOLPE * 0.6;
    this.direcao = -direcao;
    jogo.registrarAbate(this, ZumbiCacador.PONTOS);
  }

  // Sobrescreve aoColidir() de Obstaculo.
  // Pisar em cima continua eliminando zumbis (mecânica original preservada).
  // Encostar de lado NÃO machuca: o dano vem só do ataque (que tem intervalo).
  aoColidir(jogador, jogo) {
    if (this.morto) return;
    const pisando = jogador.vy > 0 && jogador.base < this.y + this.altura * 0.6;
    if (pisando) {
      jogador.vy = -430;
      jogador.noChao = false;
      jogo.avisar('Zumbi eliminado!');
      jogo.efeitos.explosao(this.centroX, this.y + 6, 12, '#7cb342', 200);
      this._morrer(jogo, jogador.x + jogador.largura / 2 < this.centroX ? 1 : -1);
    }
  }

  // ================= Desenho =================

  // Sobrescreve desenhar() da Entidade, reaproveitando Desenho.zumbi()
  desenhar(ctx) {
    const E = ZumbiCacador.ESTADO;
    const cx = this.centroX;

    ctx.save();
    if (this.estado === E.DEAD) {
      // Tomba para trás e some aos poucos
      const queda = Math.min(1, this.tempoEstado / 0.3);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, this.tempoEstado - 0.4) / 0.35);
      ctx.translate(cx, this.base);
      ctx.rotate(-this.direcao * queda * Math.PI / 2);
      Desenho.zumbi(ctx, 0, 0, 0.95, this.animacao, this.direcao, 2);
      ctx.restore();
      return;
    }

    const tremor = this.estado === E.STUNNED ? Math.sin(this.tempoEstado * 70) * 2 : 0;
    const preparando = this.estado === E.ATTACK && !this.golpeDado;
    const avanco = preparando ? -this.direcao * 3 : (this.estado === E.ATTACK ? this.direcao * 5 : 0);
    Desenho.zumbi(ctx, cx + tremor + avanco, this.base, 0.95, this.animacao, this.direcao, 2, preparando ? 1 : 0);

    // Clarão branco ao levar golpe
    if (this.flashDano > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashDano / 0.15 * 0.6})`;
      ctx.beginPath();
      ctx.ellipse(cx, this.y + this.altura / 2, 16, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Indicadores acima da cabeça: "!" = vai morder; "?" = não consegue passar
    if (preparando) {
      Desenho.texto(ctx, '!', cx, this.y - 6, 18, '#ff5252');
    } else if (this.estado === E.APPROACH_OBSTACLE && this.plano && !this.plano.viavel) {
      Desenho.texto(ctx, '?', cx, this.y - 6, 14, '#b0bec5');
    }
    // Barra de vida só aparece depois do primeiro golpe
    if (this.vida < this.vidaMax) {
      Desenho.barra(ctx, cx - 14, this.y - 4, 28, 4, this.vida / this.vidaMax, '#ef5350');
    }
    ctx.restore();
  }
}

// Nomes dos estados. Object.freeze "congela" o objeto: ninguém consegue alterar
// por engano, e um erro de digitação (E.CHSAE) dá undefined em vez de um texto novo.
ZumbiCacador.ESTADO = Object.freeze({
  IDLE: 'IDLE',
  CHASE: 'CHASE',
  APPROACH_OBSTACLE: 'APPROACH_OBSTACLE',
  JUMP: 'JUMP',
  ATTACK: 'ATTACK',
  STUNNED: 'STUNNED',
  DEAD: 'DEAD',
});

// Parâmetros do zumbi caçador (velocidades em px/s, tempos em segundos).
// O herói corre a 230 px/s: os zumbis são mais rápidos que os patrulheiros,
// mas mais lentos que o herói, então a fuga sempre é possível.
ZumbiCacador.VELOCIDADE_BASE = 150;      // perseguição
ZumbiCacador.VARIACAO_VELOCIDADE = 0.15; // ±15% sorteado para cada zumbi
ZumbiCacador.VELOCIDADE_VAGAR = 35;      // andando sem ter visto o herói
ZumbiCacador.VIDA_BASE = 2;              // golpes necessários (o Diretor pode somar vida extra)
ZumbiCacador.VARIACAO_VIDA = 1;          // +0 ou +1 de vida sorteado
ZumbiCacador.DANO = 1;                   // corações que cada mordida tira
ZumbiCacador.PONTOS = 100;               // pontos ao eliminar

// Percepção
ZumbiCacador.ALCANCE_DETECCAO = 420;     // distância horizontal para "ver" o herói
ZumbiCacador.ALTURA_DETECCAO = 220;      // diferença de altura máxima para ver o herói
ZumbiCacador.FATOR_PERDER_ALVO = 1.6;    // só desiste depois de alcance x 1,6
ZumbiCacador.RAIO_ATIVACAO = 1100;       // mais longe que isso do herói, o zumbi "dorme"

// Ataque
ZumbiCacador.ALCANCE_ATAQUE = 26;        // px entre a frente do zumbi e o herói
ZumbiCacador.PREPARO_ATAQUE = 0.3;       // duração do bote ("!") antes da mordida
ZumbiCacador.RECUPERACAO_ATAQUE = 0.35;  // parado depois de morder
ZumbiCacador.INTERVALO_ATAQUE = 1.1;     // tempo mínimo entre dois ataques
ZumbiCacador.TEMPO_ATORDOADO = 0.35;     // recuo depois de levar golpe
ZumbiCacador.EMPURRAO_GOLPE = 220;       // velocidade do recuo

// Saltos (a altura máxima é vy² / 2g = 620² / 3600 ≈ 106 px)
ZumbiCacador.SALTO_VX = 270;             // impulso horizontal do salto (vence buracos de até ~170 px)
ZumbiCacador.SALTO_VY_MAX = 620;         // impulso vertical máximo
ZumbiCacador.SALTO_VY_MIN = 280;         // impulso vertical mínimo (para o salto não ficar "rasteiro")
ZumbiCacador.VISAO_OBSTACULO = 90;       // quanto à frente ele enxerga barricadas e buracos
ZumbiCacador.DISTANCIA_BEIRADA = 6;      // pula quando a frente chega a isto da beirada
ZumbiCacador.BUSCA_POUSO = 320;          // até onde procura chão do outro lado de um buraco
ZumbiCacador.QUEDA_SEGURA = 200;         // descer até esta altura é "degrau", não buraco
ZumbiCacador.TEMPO_TRAVADO = 0.6;        // parado por este tempo = travado
