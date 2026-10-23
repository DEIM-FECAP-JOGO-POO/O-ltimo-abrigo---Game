// NOVO (backend): ServidorJogo é o servidor HTTP do Último Abrigo, feito só com o
// módulo "http" do Node.js (sem Express nem outras dependências).
//
// Ele tem duas responsabilidades:
//   1) entregar os arquivos do frontend (index.html, estilo.css, js/...)
//   2) responder à API do ranking:
//        GET  /api/saude                 -> { ok: true }
//        GET  /api/ranking?fase=1&limite=10
//        POST /api/ranking               -> { nome, fase, pontos, tempo, abates }
//
// COMPOSIÇÃO: o servidor não sabe como o ranking é guardado; ele RECEBE um
// RepositorioRanking pronto e só conversa com ele (listar / adicionar).
const http = require('http');
const fs = require('fs');
const path = require('path');
const Pontuacao = require('./Pontuacao');

class ServidorJogo {
  //   pastaFrontend -> pasta com o index.html do jogo
  //   repositorio   -> um RepositorioRanking
  constructor(pastaFrontend, repositorio) {
    this.pastaFrontend = path.resolve(pastaFrontend);
    this.repositorio = repositorio;
    this.servidor = http.createServer((req, res) => this._tratar(req, res));
  }

  // Começa a escutar. porta 0 = o sistema escolhe uma livre (usado nos testes).
  // Devolve uma Promise com a porta usada.
  iniciar(porta = ServidorJogo.PORTA_PADRAO) {
    return new Promise((resolve, reject) => {
      this.servidor.once('error', reject);
      this.servidor.listen(porta, () => resolve(this.servidor.address().port));
    });
  }

  parar() {
    return new Promise((resolve) => this.servidor.close(() => resolve()));
  }

  // ================= Roteamento =================

  // Método interno: decide quem responde cada requisição
  async _tratar(req, res) {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) {
        this._cabecalhosCors(res);
        if (req.method === 'OPTIONS') return this._enviar(res, 204);
        if (url.pathname === '/api/saude' && req.method === 'GET') return this._json(res, 200, { ok: true });
        if (url.pathname === '/api/ranking' && req.method === 'GET') return this._listarRanking(url, res);
        if (url.pathname === '/api/ranking' && req.method === 'POST') return await this._registrarPontuacao(req, res);
        if (url.pathname === '/api/ranking') return this._json(res, 405, { erro: 'Método não permitido.' });
        return this._json(res, 404, { erro: 'Rota da API não encontrada.' });
      }
      if (req.method === 'GET' || req.method === 'HEAD') return this._arquivoEstatico(url, req, res);
      return this._enviar(res, 405, 'Método não permitido.');
    } catch (erro) {
      console.error(erro);
      return this._json(res, 500, { erro: 'Erro interno do servidor.' });
    }
  }

  // GET /api/ranking?fase=N&limite=M
  _listarRanking(url, res) {
    const fase = Number(url.searchParams.get('fase') || 1);
    if (!Number.isInteger(fase) || fase < 1 || fase > Pontuacao.TOTAL_FASES) {
      return this._json(res, 400, { erro: `Fase deve ser um número de 1 a ${Pontuacao.TOTAL_FASES}.` });
    }
    const limite = Number(url.searchParams.get('limite') || 10);
    return this._json(res, 200, { fase, ranking: this.repositorio.listar(fase, Number.isInteger(limite) ? limite : 10) });
  }

  // POST /api/ranking com { nome, fase, pontos, tempo, abates }
  async _registrarPontuacao(req, res) {
    let dados;
    try {
      dados = JSON.parse(await this._lerCorpo(req));
    } catch (erro) {
      return this._json(res, erro.code === 'MUITO_GRANDE' ? 413 : 400, { erro: erro.code === 'MUITO_GRANDE' ? 'Requisição grande demais.' : 'JSON inválido.' });
    }
    const resultado = Pontuacao.validar(dados);
    if (!resultado.ok) return this._json(res, 400, { erro: resultado.erro });

    const posicao = this.repositorio.adicionar(resultado.pontuacao);
    return this._json(res, 201, {
      posicao,                                            // null = ficou fora do ranking guardado
      pontuacao: resultado.pontuacao,
      ranking: this.repositorio.listar(resultado.pontuacao.fase),
    });
  }

  // Entrega um arquivo do frontend. Bloqueia caminhos como "/../backend/..."
  // (path traversal): só sai arquivo que está DENTRO da pasta do frontend.
  _arquivoEstatico(url, req, res) {
    let relativo;
    try {
      relativo = decodeURIComponent(url.pathname);
    } catch {
      return this._enviar(res, 400, 'Endereço inválido.');
    }
    if (relativo.endsWith('/')) relativo += 'index.html';
    const caminho = path.resolve(this.pastaFrontend, '.' + relativo);
    if (caminho !== this.pastaFrontend && !caminho.startsWith(this.pastaFrontend + path.sep)) {
      return this._enviar(res, 403, 'Acesso negado.');
    }
    fs.stat(caminho, (erro, info) => {
      if (erro || !info.isFile()) return this._enviar(res, 404, 'Arquivo não encontrado.');
      const tipo = ServidorJogo.TIPOS[path.extname(caminho).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': tipo, 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(caminho).pipe(res);
    });
  }

  // ================= Utilitários (métodos internos) =================

  // Lê o corpo da requisição, com limite de tamanho
  _lerCorpo(req) {
    return new Promise((resolve, reject) => {
      let corpo = '';
      req.setEncoding('utf8');
      req.on('data', (parte) => {
        corpo += parte;
        if (corpo.length > ServidorJogo.TAMANHO_MAX_CORPO) {
          const erro = new Error('corpo grande demais');
          erro.code = 'MUITO_GRANDE';
          req.destroy();
          reject(erro);
        }
      });
      req.on('end', () => resolve(corpo));
      req.on('error', reject);
    });
  }

  // Permite que o frontend publicado em outro endereço (ex.: GitHub Pages) use a API
  _cabecalhosCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  _json(res, status, objeto) {
    const corpo = JSON.stringify(objeto);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(corpo) });
    res.end(corpo);
  }

  _enviar(res, status, texto = '') {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(texto);
  }
}

ServidorJogo.PORTA_PADRAO = 3000;
ServidorJogo.TAMANHO_MAX_CORPO = 2048; // bytes: uma pontuação cabe com folga
ServidorJogo.TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

module.exports = ServidorJogo;
