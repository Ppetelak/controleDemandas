const express = require('express')
const ejs = require('ejs')
const path = require('path')
const mysql = require('mysql2')
const session = require('express-session');
const app = express()
const crypto = require('crypto');
const winston = require('winston')
const pdfGerador = require('html-pdf')
const puppeteer = require('puppeteer')
const bodyParser = require('body-parser')
const util = require('util')
const cookie = require('cookie-parser')
const { url } = require('inspector')
const ExcelJS = require('exceljs');

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.json())
app.use('/css', express.static('css', { maxAge: 0 }))
app.use('/js', express.static('js', { maxAge: 0 }))
app.use('/logo-adm', express.static('logo-adm'))
app.use('/img', express.static('img'));
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

/* CRIPTOGRAFIA DE ACESSO */

const generateSecretKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

const secretKey = generateSecretKey();

app.use(session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false
}));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'pmp078917',
    database: 'demandas',
    port: '3306'
});

db.connect((error) => {
    if (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
    } else {
        console.log('Conexão bem-sucedida ao banco de dados');
    }
});

const verificaAutenticacao = (req, res, next) => {
    if (req.session && req.session.usuario) {
      res.locals.user = req.session.usuario;
      next();
    } else {
      req.session.originalUrl = req.originalUrl;
      res.redirect('/login');
    }
};

app.get('/', (req,res) => {
    res.render('index');
})

app.post('/pesquisarSolicitacao', (req, res) => {
    const numeroSolicitacao = req.body.numeroSolicitacao;
    // Faça algo com o número da solicitação
    // ...
});

app.get('/abrirSolicitacao', (req,res) => {
    res.render('solicitacao1');
})

app.post('/solicitacao2', (req, res) => {
    req.session.primeiraEtapa = req.body;

    let primeiraEtapa = req.session.primeiraEtapa

    console.log( {
        "Nome do Solicitante": primeiraEtapa.nome,
        "Telefone do Solicitante": primeiraEtapa.telefone,
        "Empresa Solicitante": primeiraEtapa.qualEmpresa
    })
    res.render('solicitacao2', {primeiraEtapa: req.session.primeiraEtapa});
})

app.post('/solicitacao3', (req, res) => {
    let primeiraEtapa  = req.session.primeiraEtapa;
    req.session.segundaEtapa = req.body;

    let segundaEtapa = req.session.segundaEtapa
    let tipoMaterial = req.session.segundaEtapa.tipoMaterial

    console.log( {
        "Nome do Solicitante": primeiraEtapa.nome,
        "Telefone do Solicitante": primeiraEtapa.telefone,
        "Empresa Solicitante": primeiraEtapa.qualEmpresa,
        "Unidade": segundaEtapa.qualUnidade,
        "Tipo material": tipoMaterial
    })


    if (tipoMaterial === 'digital') {
        res.render('solicitacao3-digital', {
            primeiraEtapa: primeiraEtapa,
            segundaEtapa: req.session.segundaEtapa
        });
    }
    else if (tipoMaterial === 'impresso'){
        res.render('solicitacao3-impresso', {
            primeiraEtapa: primeiraEtapa,
            segundaEtapa: req.session.segundaEtapa
        });
    }
})

app.post('/solicitacao4-impresso', (req,res) => {
    let primeiraEtapa  = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;

    req.session.terceiraEtapa = req.body;

    res.render('solicitacao4-impresso', {
        primeiraEtapa : primeiraEtapa,
        segundaEtapa : segundaEtapa,
        terceiraEtapa: req.session.terceiraEtapa
    })
})

app.post('/autorizacao', (req,res) => {
    let primeiraEtapa = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let terceiraEtapa = req.session.terceiraEtapa;

    req.session.quartaEtapa = req.body;

    let quartaEtapa = req.session.quartaEtapa;

    if(quartaEtapa.quemImprimi === 'a própria unidade'){
        res.render ('publico', {
            primeiraEtapa: primeiraEtapa,
            segundaEtapa: segundaEtapa,
            terceiraEtapa: terceiraEtapa,
            quartaEtapa: quartaEtapa
        })
    }
    else if(quartaEtapa.quemImprimi === 'Mídia Ideal') {
        res.render ('enviarAutorizacao', {
            primeiraEtapa: primeiraEtapa,
            segundaEtapa: segundaEtapa,
            terceiraEtapa: terceiraEtapa,
            quartaEtapa: quartaEtapa
        })
    }
})

app.post('/publico', (req,res) => {
    let primeiraEtapa = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let terceiraEtapa = req.session.terceiraEtapa;
    let quartaEtapa = req.session.quartaEtapa;

    req.session.autorizacao = req.body;

    let autorizacao = req.session.autorizacao

    
    res.render('valorMaterial' , {
        primeiraEtapa: primeiraEtapa,
        segundaEtapa: segundaEtapa,
        terceiraEtapa: terceiraEtapa,
        quartaEtapa: quartaEtapa,
        autorizacao: autorizacao
    });
})

app.post('/temLogo', (req,res) => {
    let primeiraEtapa = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let terceiraEtapa = req.session.terceiraEtapa;
    let quartaEtapa = req.session.quartaEtapa;
    let autorizacao = req.session.autorizacao

    req.session.valorMaterial = req.body;

    res.render('temLogo', {
        primeiraEtapa: primeiraEtapa,
        segundaEtapa: segundaEtapa,
        terceiraEtapa: terceiraEtapa,
        quartaEtapa: quartaEtapa,
        autorizacao: autorizacao,
        valorMaterial: req.session.valorMaterial
    })
})

app.post('/especificacoes', (req,res) => {
    let primeiraEtapa = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let terceiraEtapa = req.session.terceiraEtapa;
    let quartaEtapa = req.session.quartaEtapa;
    let autorizacao = req.session.autorizacao
    let valorMaterial = req.session.valorMaterial

    req.session.temLogo = req.body;

    res.render('especificacoes', {
        primeiraEtapa: primeiraEtapa,
        segundaEtapa: segundaEtapa,
        terceiraEtapa: terceiraEtapa,
        quartaEtapa: quartaEtapa,
        autorizacao: autorizacao,
        valorMaterial: valorMaterial,
        temLogo: req.session.temLogo
    })
})

app.post('/finalizacao', (req, res) => {
    let primeiraEtapa = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let terceiraEtapa = req.session.terceiraEtapa;
    let quartaEtapa = req.session.quartaEtapa;
    let autorizacao = req.session.autorizacao
    let valorMaterial = req.session.valorMaterial
    let temLogo = req.session.temLogo

    req.session.especificacoes = req.body;

    let especificacoes = req.session.especificacoes;



    res.render('finalizacao', {
        primeiraEtapa: primeiraEtapa,
        segundaEtapa: segundaEtapa,
        terceiraEtapa: terceiraEtapa,
        quartaEtapa: quartaEtapa,
        autorizacao: autorizacao,
        valorMaterial: valorMaterial,
        temLogo: temLogo,
        especificacoes: req.session.especificacoes
    })
})

app.listen(3050, () => {
    console.log('Aplicação rodando na porta 3050');
});
  