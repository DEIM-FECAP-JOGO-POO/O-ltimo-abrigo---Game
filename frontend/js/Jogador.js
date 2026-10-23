// Jogador (o herói) herda de Entidade e acrescenta tudo o que é só dele:
// correr e pular com o teclado (com física e colisão), perder e recuperar vidas,
// golpear com a barra de ferro e usar a adrenalina.
//
// ENCAPSULAMENTO: o Jogo não mexe direto nas vidas, na invulnerabilidade ou na
// adrenalina. Ele só AVISA ("você foi atingido", "ative a adrenalina") e o próprio
// Jogador decide o que fazer, chamando seus métodos (receberDano, ativarAdrenalina...).
class Jogador extends Entidade {
  constructor(x, y) {
    super(x, y, 26, 46);
    this.vx = 0;
    this.vy = 0;
    this.velocidade = 230;   // px/s (velocidade-BASE: nunca é alterada pelos efeitos)
    this.forcaPulo = 640;
    this.gravidade = Fisica.GRAVIDADE;

    this.vidas = 3;
    this.vidasMax = 5;

    this.noChao = false;
    this.apoio = null;           // obstáculo sólido sobre o qual está pisando
    this.tempoCoyote = 0;        // tolerância para pular logo após sair da beirada
    this.bufferPulo = 0;         // tolerância para apertar pulo um pouco antes de pousar
    this.puloSegurado = false;   // evita pular de novo enquanto a tecla continua apertada
    this.invulneravel = 0;       // segundos de proteção após levar dano
    this.atordoado = 0;          // segundos sem controle após levar dano
    this.virado = 1;             // 1 = direita, -1 = esquerda
    this.animacao = 0;
    this.ultimoSeguro = { x, y }; // onde renascer após cair num buraco
    this.direcaoEmpurrao = -1;   // NOVO (v3): para onde é empurrado ao levar dano

    // NOVO (v3): combate corpo a corpo (barra de ferro)
    this.tempoGolpe = -1;              // < 0 = não está golpeando
    this.recargaGolpe = 0;             // segundos até poder golpear de novo
    this.atingidosNoGolpe = new Set(); // quem já levou ESTE golpe (um acerto por alvo)
    // A área do golpe é um objeto só, reaproveitado em todos os golpes
    // (assim não criamos um objeto novo a cada quadro).
    this.areaGolpe = { x: 0, y: 0, largura: 0, altura: 0 };

    // NOVO (v3): efeitos temporários. Eles viram MULTIPLICADORES da velocidade;
    // os atributos-base (this.velocidade) nunca mudam.
    this.energia = 0;             // barra da adrenalina (0 até Jogador.ENERGIA_MAX)
    this.adrenalinaRestante = 0;  // segundos que ainda faltam de adrenalina
    this.energeticoRestante = 0;  // segundos que ainda faltam do energético
    this.multEnergetico = 1;      // quanto o energético multiplica a velocidade (quem define é o item)
  }

  // ---------- Multiplicadores temporários (NOVO v3) ----------

  get adrenalinaAtiva() { return this.adrenalinaRestante > 0; }
  get adrenalinaPronta() { return !this.adrenalinaAtiva && this.energia >= Jogador.ENERGIA_MAX; }

  // Junta todos os efeitos ativos num número só, com um teto.
  // Ex.: adrenalina (1,45) x energético (1,3) = 1,885 -> limitado a 1,8.
  get multVelocidade() {
    let m = 1;
    if (this.adrenalinaAtiva) m *= Jogador.MULT_ADRENALINA;
    if (this.energeticoRestante > 0) m *= this.multEnergetico;
    return Math.min(m, Jogador.MULT_VELOCIDADE_MAX);
  }

  // Chamado pela tecla Shift/K. Só funciona com a barra cheia.
  // Devolve true se ativou (o Jogo usa isso para mostrar o aviso).
  ativarAdrenalina() {
    if (!this.adrenalinaPronta) return false;
    this.energia = 0;
    this.adrenalinaRestante = Jogador.DURACAO_ADRENALINA;
    return true;
  }

  // Enche a barra da adrenalina (com o tempo e a cada zumbi eliminado)
  ganharEnergia(valor) {
    if (this.adrenalinaAtiva) return; // não recarrega enquanto está ativa
    this.energia = Math.min(Jogador.ENERGIA_MAX, this.energia + valor);
  }

  // Chamado pelo item Energetico: quem decide a duração e a força do efeito é o ITEM
  aplicarEnergetico(duracao, multiplicador) {
    this.energeticoRestante = duracao;
    this.multEnergetico = multiplicador;
  }

  // ---------- Combate (NOVO v3) ----------

  // Começa um golpe. O Jogo chama uma vez por aperto da tecla J/X.
  // Devolve false se ainda está na recarga (isso impede "metralhar" golpes).
  iniciarAtaque() {
    if (this.recargaGolpe > 0 || this.atordoado > 0 || !this.ativo) return false;
    this.tempoGolpe = 0;
    // Com adrenalina a recarga fica menor (golpes mais rápidos)
    this.recargaGolpe = Jogador.RECARGA_GOLPE * (this.adrenalinaAtiva ? Jogador.MULT_RECARGA_ADRENALINA : 1);
    this.atingidosNoGolpe.clear();
    return true;
  }

  get golpeando() { return this.tempoGolpe >= 0; }

  // O golpe só causa dano no "meio" do movimento do braço (a janela ativa),
  // não durante toda a animação.
  get golpeAtivo() {
    return this.tempoGolpe >= Jogador.INICIO_GOLPE_ATIVO && this.tempoGolpe <= Jogador.FIM_GOLPE_ATIVO;
  }

  // Retângulo de dano À FRENTE do herói: depende de para onde ele está virado,
  // então zumbis atrás dele nunca são atingidos.
  obterAreaGolpe() {
    const a = this.areaGolpe;
    a.largura = Jogador.ALCANCE_GOLPE;
    a.altura = Jogador.ALTURA_GOLPE;
    a.x = this.virado > 0 ? this.x + this.largura - 4 : this.x + 4 - Jogador.ALCANCE_GOLPE;
    a.y = this.y + 2;
    return a;
  }

  // Registra que o alvo foi atingido. Devolve false se ele já levou ESTE golpe,
  // para um mesmo golpe não causar dano várias vezes (um por quadro).
  registrarAcerto(alvo) {
    if (this.atingidosNoGolpe.has(alvo)) return false;
    this.atingidosNoGolpe.add(alvo);
    return true;
  }

  // Todos os contadores de tempo andam aqui (em segundos, usando o dt)
  atualizarTemporizadores(dt) {
    this.invulneravel = Math.max(0, this.invulneravel - dt);
    this.atordoado = Math.max(0, this.atordoado - dt);
    this.bufferPulo = Math.max(0, this.bufferPulo - dt);
    this.recargaGolpe = Math.max(0, this.recargaGolpe - dt);
    this.energeticoRestante = Math.max(0, this.energeticoRestante - dt);
    if (this.adrenalinaRestante > 0) {
      this.adrenalinaRestante = Math.max(0, this.adrenalinaRestante - dt); // termina sozinha
    } else {
      this.ganharEnergia(Jogador.RECARGA_ENERGIA * dt);
    }
    if (this.tempoGolpe >= 0) {
      this.tempoGolpe += dt;
      if (this.tempoGolpe > Jogador.DURACAO_GOLPE) this.tempoGolpe = -1; // golpe terminou
    }
  }

  // ---------- Atualização ----------

  // Sobrescreve atualizar() da Entidade: lê o teclado e aplica a física.
  // Recebe o jogo para ler as teclas e os sólidos próximos.
  atualizar(dt, jogo) {
    const teclas = jogo.teclas;

    // 1) Se está sobre uma plataforma, ela decide como nos carregar
    //    (POLIMORFISMO: cada tipo de obstáculo implementa carregar() do seu jeito)
    if (this.apoio && this.apoio.ativo) this.apoio.carregar(this);

    // 2) Contadores de tempo (dano, golpe, adrenalina, energético)
    this.atualizarTemporizadores(dt);

    // 3) Entrada do teclado
    let direcao = 0;
    if (this.atordoado <= 0) {
      if (teclas['ArrowLeft'] || teclas['KeyA']) direcao -= 1;
      if (teclas['ArrowRight'] || teclas['KeyD']) direcao += 1;
    }
    // ALTERADO (v3): velocidade-base x multiplicadores temporários; e o empurrão
    // do dano agora respeita o lado de onde veio (antes era sempre -120).
    this.vx = this.atordoado > 0 ? 120 * this.direcaoEmpurrao
                                 : direcao * this.velocidade * this.multVelocidade;
    if (direcao !== 0 && !this.golpeando) this.virado = direcao; // não vira no meio do golpe

    const querPular = teclas['Space'] || teclas['ArrowUp'] || teclas['KeyW'];
    if (querPular && !this.puloSegurado) this.bufferPulo = 0.12;
    this.puloSegurado = !!querPular;

    this.tempoCoyote = this.noChao ? 0.1 : this.tempoCoyote - dt;
    if (this.bufferPulo > 0 && this.tempoCoyote > 0 && this.atordoado <= 0) {
      this.vy = -this.forcaPulo; // negativo = para cima
      this.noChao = false;
      this.tempoCoyote = 0;
      this.bufferPulo = 0;
      this.apoio = null;
    }

    // 4) Gravidade
    this.vy = Math.min(this.vy + this.gravidade * dt, Fisica.VELOCIDADE_QUEDA_MAX);

    // 5) Movimento horizontal + colisão com sólidos
    this.x += this.vx * dt;
    this.x = Math.max(jogo.camX, Math.min(this.x, jogo.fase.comprimento - this.largura));
    this.resolverHorizontal(jogo.solidos);

    // 6) Movimento vertical + colisão com sólidos
    this.y += this.vy * dt;
    this.resolverVertical(jogo.solidos);

    // 7) Avisa o obstáculo que estamos pisando nele e guarda posição segura
    if (this.noChao && this.apoio) {
      this.apoio.aoPisar(this);
      const s = this.apoio;
      if (s.seguroParaRenascer && this.invulneravel <= 0 &&
          this.x > s.x + 40 && this.direita < s.direita - 40) {
        this.ultimoSeguro = { x: this.x, y: this.y };
      }
    }

    // 8) Animação da corrida
    if (this.noChao) this.animacao += dt * (Math.abs(this.vx) / 40);
  }

  // ALTERADO (v3): a colisão com o cenário foi para a classe Fisica (compartilhada
  // com os zumbis). Os métodos continuam aqui com o mesmo nome, só repassando.
  resolverHorizontal(solidos) {
    Fisica.resolverHorizontal(this, solidos);
  }

  resolverVertical(solidos) {
    Fisica.resolverVertical(this, solidos);
  }

  // ---------- Vida ----------

  // O que acontece quando o herói é atingido. Devolve true se o dano foi aplicado
  // (false = estava invulnerável, então nada acontece).
  //   direcaoEmpurrao -> -1 empurra para a esquerda (padrão antigo), 1 para a direita
  //   dano            -> quantos corações perde
  // ALTERADO (v3): ganhou os dois parâmetros. Como eles têm valor padrão, quem já
  // chamava receberDano() sem nada (Espinho) continua funcionando igual.
  receberDano(direcaoEmpurrao = -1, dano = 1) {
    if (this.invulneravel > 0) return false;
    this.direcaoEmpurrao = direcaoEmpurrao;
    this.tempoGolpe = -1; // apanhar interrompe o golpe
    this.vidas -= dano;
    this.invulneravel = 1.6;
    this.atordoado = 0.35;
    this.vy = -380;
    this.noChao = false;
    if (this.vidas <= 0) this.ativo = false;
    return true;
  }

  // Caiu num buraco: perde uma vida e volta ao último ponto seguro.
  cair() {
    this.vidas -= 1;
    if (this.vidas <= 0) {
      this.ativo = false;
      return;
    }
    this.x = this.ultimoSeguro.x;
    this.y = this.ultimoSeguro.y;
    this.vx = 0;
    this.vy = 0;
    this.invulneravel = 1.6;
  }

  curar() {
    this.vidas = Math.min(this.vidasMax, this.vidas + 1);
  }

  // ---------- Desenho ----------

  // Sobrescreve desenhar() da Entidade: herói de capa vermelha, virado para
  // o lado em que está andando.
  desenhar(ctx) {
    // Pisca enquanto está invulnerável
    if (this.invulneravel > 0 && Math.floor(this.invulneravel * 12) % 2 === 0) return;

    const cx = this.x + this.largura / 2;
    const t = this.animacao;
    const noAr = !this.noChao;
    const correndo = this.noChao && Math.abs(this.vx) > 10;
    const balanco = correndo ? Math.sin(t) : 0;

    // NOVO (v3): aura da adrenalina (amarela) ou do energético (azul), atrás do herói
    if (this.adrenalinaAtiva || this.energeticoRestante > 0) this._desenharAura(ctx, cx);

    ctx.save(); // o translate/scale abaixo vale só para o herói
    ctx.translate(cx, this.y);
    ctx.scale(this.virado, 1); // -1 espelha o desenho quando ele olha para a esquerda

    // Capa vermelha (atrás do corpo), balança com o movimento
    const onda = Math.sin(t * 1.5) * 3;
    ctx.fillStyle = '#c62828';
    ctx.beginPath();
    ctx.moveTo(-3, 18);
    ctx.lineTo(-20 - (noAr ? 6 : 0) + onda, noAr ? 20 : 30);
    ctx.lineTo(-17 + onda, 38);
    ctx.lineTo(-4, 32);
    ctx.closePath();
    ctx.fill();

    // Pernas
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const anguloA = noAr ? 0.7 : balanco * 0.9;
    const anguloB = noAr ? -0.5 : -balanco * 0.9;
    for (const a of [anguloA, anguloB]) {
      ctx.beginPath();
      ctx.moveTo(0, 32);
      ctx.lineTo(Math.sin(a) * 14, 32 + Math.cos(a) * 14);
      ctx.stroke();
    }

    // Tronco e cinto
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(-8, 17, 16, 16);
    ctx.fillStyle = '#ffca28';
    ctx.fillRect(-8, 30, 16, 3);

    // Braço. ALTERADO (v3): durante o golpe ele gira de trás/cima até a frente.
    ctx.strokeStyle = '#ffcc80';
    ctx.lineWidth = 5;
    let anguloBraco = noAr ? -2.4 : -balanco * 0.9;
    if (this.golpeando) {
      const progresso = Math.min(1, this.tempoGolpe / Jogador.FIM_GOLPE_ATIVO);
      anguloBraco = 3.6 - progresso * 2.1;
    }
    const maoX = Math.sin(anguloBraco) * 12;
    const maoY = 21 + Math.cos(anguloBraco) * 12;
    ctx.beginPath();
    ctx.moveTo(0, 21);
    ctx.lineTo(maoX, maoY);
    ctx.stroke();

    if (this.golpeando) this._desenharBarraDeFerro(ctx, maoX, maoY, anguloBraco);

    // Cabeça
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(0, 9, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4e342e'; // cabelo
    ctx.beginPath();
    ctx.arc(0, 8, 8.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#212121'; // olho
    ctx.fillRect(3, 8, 2, 3);

    ctx.restore();
  }

  // Método interno (começa com _ por convenção): só a própria classe usa.
  // Brilho em volta do herói e "linhas de velocidade" atrás dele.
  _desenharAura(ctx, cx) {
    const pulso = 0.5 + Math.sin(this.animacao * 3 + this.adrenalinaRestante * 10) * 0.2;
    ctx.fillStyle = this.adrenalinaAtiva ? `rgba(255,213,79,${0.28 * pulso + 0.1})`
                                         : `rgba(79,195,247,${0.2 * pulso + 0.08})`;
    ctx.beginPath();
    ctx.ellipse(cx, this.y + this.altura / 2, 24, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.adrenalinaAtiva ? 'rgba(255,236,179,0.6)' : 'rgba(179,229,252,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const ly = this.y + 12 + i * 11;
      const lx = cx - this.virado * (18 + ((this.animacao * 40 + i * 13) % 20));
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx - this.virado * 14, ly);
    }
    ctx.stroke();
  }

  // Método interno: a barra de ferro na mão e o rastro branco do golpe.
  // O rastro aparece só na janela em que o golpe causa dano (feedback visual).
  _desenharBarraDeFerro(ctx, maoX, maoY, anguloBraco) {
    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(maoX, maoY);
    ctx.lineTo(maoX + Math.sin(anguloBraco) * 26, maoY + Math.cos(anguloBraco) * 26);
    ctx.stroke();

    if (this.golpeAtivo) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 21, 36, -1.3, 0.9);
      ctx.stroke();
    }
  }
}

// NOVO (v3): constantes do golpe. Ficam na CLASSE (static) para os números não
// ficarem "soltos" no meio do código e serem fáceis de ajustar. Tempos em segundos.
Jogador.DANO_GOLPE = 1;            // vida que cada golpe tira de um zumbi
Jogador.ALCANCE_GOLPE = 50;        // largura (px) da área de golpe à frente do herói
Jogador.ALTURA_GOLPE = 40;         // altura (px) da área de golpe
Jogador.DURACAO_GOLPE = 0.28;      // animação completa do golpe
Jogador.INICIO_GOLPE_ATIVO = 0.05; // a área só causa dano entre o início...
Jogador.FIM_GOLPE_ATIVO = 0.18;    // ...e o fim da janela ativa
Jogador.RECARGA_GOLPE = 0.38;      // tempo mínimo entre o início de dois golpes

// NOVO (v3): constantes da adrenalina e dos multiplicadores de velocidade.
Jogador.ENERGIA_MAX = 100;              // barra cheia = adrenalina pronta
Jogador.RECARGA_ENERGIA = 7;            // energia por segundo (~14 s para encher do zero)
Jogador.ENERGIA_POR_ABATE = 15;         // bônus por zumbi eliminado
Jogador.DURACAO_ADRENALINA = 4;         // segundos de efeito
Jogador.MULT_ADRENALINA = 1.45;         // +45% de velocidade
Jogador.MULT_RECARGA_ADRENALINA = 0.6;  // recarga do golpe 40% menor durante a adrenalina
Jogador.MULT_VELOCIDADE_MAX = 1.8;      // teto quando adrenalina e energético se somam
