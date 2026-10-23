// NOVO (backend): ponto de entrada do servidor. Rode com:  node server.js
// (ou npm start). Depois abra http://localhost:3000 no navegador.
//
// Variáveis de ambiente opcionais:
//   PORT         -> porta do servidor (padrão 3000)
//   RANKING_ARQ  -> caminho do arquivo do ranking (padrão backend/dados/ranking.json)
const path = require('path');
const RepositorioRanking = require('./src/RepositorioRanking');
const ServidorJogo = require('./src/ServidorJogo');

const porta = Number(process.env.PORT) || ServidorJogo.PORTA_PADRAO;
const arquivoRanking = process.env.RANKING_ARQ || path.join(__dirname, 'dados', 'ranking.json');
const pastaFrontend = path.join(__dirname, '..', 'frontend');

const repositorio = new RepositorioRanking(arquivoRanking);
const servidor = new ServidorJogo(pastaFrontend, repositorio);

servidor.iniciar(porta)
  .then((p) => {
    console.log(`Último Abrigo rodando em http://localhost:${p}`);
    console.log(`Ranking salvo em ${arquivoRanking}`);
    console.log('Para parar o servidor: Ctrl+C');
  })
  .catch((erro) => {
    if (erro.code === 'EADDRINUSE') console.error(`A porta ${porta} já está em uso. Tente: PORT=3001 node server.js`);
    else console.error(erro);
    process.exit(1);
  });
