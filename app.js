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

app.listen(3050, () => {
    console.log('Aplicação rodando na porta 3050');
});
  