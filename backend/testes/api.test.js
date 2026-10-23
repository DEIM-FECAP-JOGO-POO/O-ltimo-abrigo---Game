// Testes do backend (usam o executor de testes que já vem no Node.js 18+).
// Rodar dentro da pasta backend:  npm test
// Cada teste sobe um servidor numa porta livre, com um ranking em pasta temporária.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const RepositorioRanking = require('../src/RepositorioRanking');
const ServidorJogo = require('../src/ServidorJogo');
const Pontuacao = require('../src/Pontuacao');

const PASTA_FRONTEND = path.join(__dirname, '..', '..', 'frontend');
let pastaTemp, arquivo, servidor, base;

beforeEach(async () => {
  pastaTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'ranking-'));
  arquivo = path.join(pastaTemp, 'ranking.json');
  servidor = new ServidorJogo(PASTA_FRONTEND, new RepositorioRanking(arquivo));
  base = `http://127.0.0.1:${await servidor.iniciar(0)}`;
});

afterEach(async () => {
  await servidor.parar();
  fs.rmSync(pastaTemp, { recursive: true, force: true });
});

const enviar = (pontuacao) => fetch(`${base}/api/ranking`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pontuacao),
});

// Pedido "cru" (o fetch normaliza caminhos com "..", então usamos o módulo http)
const pedidoCru = (caminho) => new Promise((resolve) => {
  http.get(base + caminho, (res) => { res.resume(); resolve(res.statusCode); });
});

test('GET /api/saude responde ok', async () => {
  const res = await fetch(`${base}/api/saude`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test('ranking começa vazio', async () => {
  const dados = await (await fetch(`${base}/api/ranking?fase=1`)).json();
  assert.deepEqual(dados, { fase: 1, ranking: [] });
});

test('POST registra a pontuação e devolve a posição', async () => {
  const res = await enviar({ nome: 'Enzo', fase: 1, pontos: 300, tempo: 40.25, abates: 2 });
  assert.equal(res.status, 201);
  const dados = await res.json();
  assert.equal(dados.posicao, 1);
  assert.equal(dados.pontuacao.tempo, 40.3);
  assert.equal(dados.ranking.length, 1);
});

test('ranking ordena por pontos e, no empate, pelo menor tempo', async () => {
  await enviar({ nome: 'Igor', fase: 2, pontos: 200, tempo: 50, abates: 1 });
  await enviar({ nome: 'Mateus', fase: 2, pontos: 500, tempo: 80, abates: 4 });
  await enviar({ nome: 'Daniel', fase: 2, pontos: 200, tempo: 30, abates: 0 });
  const { ranking } = await (await fetch(`${base}/api/ranking?fase=2`)).json();
  assert.deepEqual(ranking.map((p) => p.nome), ['Mateus', 'Daniel', 'Igor']);
});

test('fases têm rankings separados', async () => {
  await enviar({ nome: 'Enzo', fase: 3, pontos: 100, tempo: 10, abates: 0 });
  const fase1 = await (await fetch(`${base}/api/ranking?fase=1`)).json();
  assert.equal(fase1.ranking.length, 0);
});

test('dados inválidos são recusados com 400', async () => {
  const casos = [
    { fase: 1, pontos: 10, tempo: 5 },                         // sem nome
    { nome: '   ', fase: 1, pontos: 10, tempo: 5 },            // nome vazio
    { nome: 'A', fase: 4, pontos: 10, tempo: 5 },              // fase inexistente
    { nome: 'A', fase: 1, pontos: -1, tempo: 5 },              // pontos negativos
    { nome: 'A', fase: 1, pontos: 1.5, tempo: 5 },             // pontos quebrados
    { nome: 'A', fase: 1, pontos: 10, tempo: 99999 },          // tempo absurdo
  ];
  for (const caso of casos) assert.equal((await enviar(caso)).status, 400, JSON.stringify(caso));
  const ruim = await fetch(`${base}/api/ranking`, { method: 'POST', body: '{isto não é json' });
  assert.equal(ruim.status, 400);
});

test('nome é limpo e cortado em 20 caracteres', async () => {
  const dados = await (await enviar({ nome: '  Nome\n muito   comprido demais para caber ', fase: 1, pontos: 1, tempo: 1 })).json();
  assert.equal(dados.pontuacao.nome, 'Nome muito comprido ');
  assert.ok(dados.pontuacao.nome.length <= Pontuacao.TAMANHO_MAX_NOME);
});

test('corpo grande demais é recusado', async () => {
  const res = await fetch(`${base}/api/ranking`, { method: 'POST', body: 'x'.repeat(5000) }).catch(() => null);
  assert.ok(res === null || res.status === 413);
});

test('ranking continua salvo depois de reiniciar o servidor', async () => {
  await enviar({ nome: 'Daniel', fase: 1, pontos: 77, tempo: 12, abates: 1 });
  const outro = new RepositorioRanking(arquivo);
  assert.equal(outro.listar(1)[0].nome, 'Daniel');
});

test('arquivo corrompido não derruba o servidor', () => {
  fs.writeFileSync(arquivo, '{corrompido');
  const repo = new RepositorioRanking(arquivo);
  assert.deepEqual(repo.listar(1), []);
});

test('entrega o index.html e os scripts do frontend', async () => {
  const pagina = await fetch(`${base}/`);
  assert.equal(pagina.status, 200);
  assert.match(pagina.headers.get('content-type'), /text\/html/);
  assert.match(await pagina.text(), /ÚLTIMO ABRIGO/);
  const script = await fetch(`${base}/js/Jogo.js`);
  assert.equal(script.status, 200);
  assert.match(script.headers.get('content-type'), /javascript/);
});

test('não deixa sair da pasta do frontend', async () => {
  // 403 (bloqueado) ou 404 (caminho normalizado para dentro do frontend): nunca 200
  for (const caminho of ['/../backend/server.js', '/%2e%2e/backend/server.js', '/..%2fbackend%2fserver.js', '/..%5cbackend%5cserver.js']) {
    const status = await pedidoCru(caminho);
    assert.ok(status === 403 || status === 404, `${caminho} devolveu ${status}`);
  }
  assert.equal((await fetch(`${base}/nao-existe.js`)).status, 404);
});

test('rota da API inexistente devolve 404 e CORS está liberado', async () => {
  const res = await fetch(`${base}/api/outra`);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});
