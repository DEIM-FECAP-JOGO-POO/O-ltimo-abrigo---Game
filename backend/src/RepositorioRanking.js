// NOVO (backend): RepositorioRanking guarda as pontuações num arquivo JSON.
// É o único lugar do servidor que lê ou escreve no disco (padrão "Repositório"):
// se um dia o ranking for para um banco de dados, só esta classe muda.
//
// As pontuações ficam em memória, separadas por fase, e o arquivo é regravado a
// cada pontuação nova. Cada fase guarda no máximo RepositorioRanking.LIMITE_POR_FASE
// linhas, então o arquivo nunca cresce sem parar.
const fs = require('fs');
const path = require('path');
const Pontuacao = require('./Pontuacao');

class RepositorioRanking {
  //   caminhoArquivo -> onde fica o ranking.json (a pasta é criada se não existir)
  constructor(caminhoArquivo) {
    this.caminhoArquivo = caminhoArquivo;
    this.porFase = {}; // { '1': [Pontuacao, ...], '2': [...], '3': [...] }
    this._carregar();
  }

  // Lista as melhores pontuações de uma fase (já em ordem)
  listar(fase, limite = RepositorioRanking.LIMITE_PADRAO) {
    const lista = this.porFase[fase] || [];
    return lista.slice(0, Math.max(1, Math.min(limite, RepositorioRanking.LIMITE_POR_FASE)));
  }

  // Guarda uma Pontuacao (já validada). Devolve a posição dela no ranking da fase
  // (1 = primeiro lugar) ou null se ela não ficou entre as LIMITE_POR_FASE melhores.
  adicionar(pontuacao) {
    const lista = this.porFase[pontuacao.fase] || (this.porFase[pontuacao.fase] = []);
    lista.push(pontuacao);
    lista.sort(Pontuacao.comparar);
    lista.length = Math.min(lista.length, RepositorioRanking.LIMITE_POR_FASE);
    this._salvar();
    const indice = lista.indexOf(pontuacao);
    return indice >= 0 ? indice + 1 : null;
  }

  // Método interno: lê o arquivo ao iniciar. Arquivo inexistente = ranking vazio.
  // Arquivo corrompido = avisa no terminal e começa vazio (o servidor não cai).
  _carregar() {
    if (!fs.existsSync(this.caminhoArquivo)) return;
    try {
      const dados = JSON.parse(fs.readFileSync(this.caminhoArquivo, 'utf8'));
      for (const [fase, linhas] of Object.entries(dados.porFase || {})) {
        this.porFase[fase] = linhas.map((l) => new Pontuacao(l)).sort(Pontuacao.comparar);
      }
    } catch (erro) {
      console.warn(`Aviso: não foi possível ler ${this.caminhoArquivo} (${erro.message}). Começando com o ranking vazio.`);
      this.porFase = {};
    }
  }

  // Método interno: grava primeiro num arquivo temporário e depois renomeia.
  // Se o servidor cair no meio da gravação, o ranking antigo continua inteiro.
  _salvar() {
    fs.mkdirSync(path.dirname(this.caminhoArquivo), { recursive: true });
    const temporario = this.caminhoArquivo + '.tmp';
    fs.writeFileSync(temporario, JSON.stringify({ porFase: this.porFase }, null, 2));
    fs.renameSync(temporario, this.caminhoArquivo);
  }
}

RepositorioRanking.LIMITE_POR_FASE = 50; // linhas guardadas por fase
RepositorioRanking.LIMITE_PADRAO = 10;   // linhas devolvidas quando o pedido não diz quantas

module.exports = RepositorioRanking;
