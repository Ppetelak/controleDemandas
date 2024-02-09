const express = require('express')
const ejs = require('ejs')
const path = require('path')
const mysql = require('mysql2')
const session = require('express-session');
const app = express()
const multer = require('multer');
const crypto = require('crypto');
const winston = require('winston')
const pdfGerador = require('html-pdf')
const puppeteer = require('puppeteer')
const bodyParser = require('body-parser')
const util = require('util')
const cookie = require('cookie-parser')
const { url } = require('inspector')
const ExcelJS = require('exceljs');
const uuid = require('uuid'); 

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.json())
app.use('/css', express.static('css', { maxAge: 0 }))
app.use('/js', express.static('js', { maxAge: 0 }))
app.use('/img', express.static('img'));
app.use('/uploads', express.static('uploads'));
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

app.post('/login-verifica', (req, res) => {
    const { username, password } = req.body;
    console.log(username, password)

    const query = 'SELECT * FROM usuarios WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
        console.error('Erro ao consultar o banco de dados:', err);
        //return res.status(500).json({ error: 'Erro ao processar a solicitação' });
        return res.render('login', { error: 'Erro no servidor contate o suporte' });
        }

        if (results.length === 0) {
        //return res.status(401).json({ error: 'Usuário não encontrado' });
        return res.render('login', { error: 'Usuário não encontrado' });
        }

        const user = results[0];

        if (user.senha !== password) {
        //return res.status(401).json({ error: 'Senha incorreta' });
        return res.render('login', { error: 'Senha incorreta' });
        }

        const originalUrl = req.session.originalUrl
        req.session.usuario = user;
        res.redirect(originalUrl);
    });
});

app.get('/login', (req, res) => {
    res.render('login');
})

app.get('/logout', (req, res) => {
// Remover as informações de autenticação da sessão
    req.session.destroy((err) => {
        if (err) {
        console.error('Erro ao encerrar a sessão:', err);
        }
        // Redirecionar o usuário para a página de login ou para outra página desejada
        res.redirect('/');
    });
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Gera um nome de arquivo único usando UUID
        const nomeArquivoUnico = `${uuid.v4()}_${file.originalname}`;
        cb(null, nomeArquivoUnico);
    },
});
const upload = multer({ storage: storage });

app.get('/', (req,res) => {
    res.render('index');
})

app.post('/pesquisarSolicitacao', (req, res) => {
    const numeroSolicitacao = req.body.numeroSolicitacao;

    const query = `
        SELECT statusDemanda 
        FROM statusDemandas 
        WHERE numeroSolicitacao = ? 
        ORDER BY dataRegistro DESC 
        LIMIT 1
    `;

    db.query(query, [numeroSolicitacao], (err, result) => {
        if (err) {
            console.error('Erro ao consultar o banco de dados:', err);
            // Trate o erro de acordo com a sua necessidade
            return res.status(500).send('Erro interno do servidor');
        }

        if (result.length === 0) {
            // Não foi encontrado nenhum registro para o número de solicitação especificado
            return res.status(404).send('Nenhum registro encontrado para o número de solicitação especificado');
        }

        // O resultado contém o status da última demanda
        const status = result[0].statusDemanda;
        
        // Renderize a página com o número da solicitação e o último status
        res.render('acompanhar', { numeroSolicitacao, status });
    });
});


app.get('/demandas', verificaAutenticacao, (req,res) => {
    //const searchDemandas = `SELECT * FROM demandas`;
    const searchDemandas = `
    SELECT 
    d.*,
    sd.statusDemanda AS ultimoStatus,
    sd.dataRegistro AS dataUltimoStatus,
    sdEnv.dataRegistro AS dataAbertura
    FROM 
        demandas d
    LEFT JOIN 
        statusDemandas sd ON d.numeroSolicitacao = sd.numeroSolicitacao
    LEFT JOIN 
        statusDemandas sdEnv ON d.numeroSolicitacao = sdEnv.numeroSolicitacao
    WHERE 
        sd.id = (
            SELECT MAX(id) 
            FROM statusDemandas 
            WHERE numeroSolicitacao = d.numeroSolicitacao
        )
    AND sdEnv.statusDemanda = 'ENVIADA';
    `;

    db.query(searchDemandas, (err, results) => {
        if(err) {
            console.error('Erro ao consultar demandas do banco de dados')
        }
        let demandas = results;
        res.render('demandas', {demandas: demandas})
    })
})

app.get('/demanda/:id', verificaAutenticacao, (req,res) => {
    const numeroSolicitacao = req.params.id;
    const selectDemanda = `
    SELECT 
    d.*,
    sd.statusDemanda AS ultimoStatus,
    sd.dataRegistro AS dataUltimoStatus,
    sdEnv.dataRegistro AS dataAbertura
    FROM 
        demandas d
    LEFT JOIN 
        statusDemandas sd ON d.numeroSolicitacao = sd.numeroSolicitacao
    LEFT JOIN 
        statusDemandas sdEnv ON d.numeroSolicitacao = sdEnv.numeroSolicitacao
    WHERE 
        d.numeroSolicitacao = ? AND
        sd.dataRegistro = (
            SELECT MAX(dataRegistro) 
            FROM statusDemandas 
            WHERE numeroSolicitacao = d.numeroSolicitacao
        )
    AND sdEnv.statusDemanda = 'ENVIADA';
    `;
    const selectStatusDemanda = `SELECT * FROM statusDemandas WHERE numeroSolicitacao=?`

    db.query(selectDemanda, [numeroSolicitacao], (err, result) => {
        if(err) {
            console.error('Erro ao buscas infos de demanda')
        }
        db.query(selectStatusDemanda, [numeroSolicitacao], (err, resultStatus) => {
            if(err){
                console.error("Erro ao buscar status da demanda")
            }
            res.render('demandaSingle', {demanda: result[0], statusDemanda: resultStatus})
        })
    })
})

app.post('/mudarStatus/:id', verificaAutenticacao, (req,res) => {
    const numeroSolicitacao = req.params.id;
    const statusDemanda = req.body;

    console.log(numeroSolicitacao, statusDemanda);

    const dataAtualSplit = new Date().toISOString().split('T')[0];

    const updateStatus = 'INSERT INTO statusDemandas (numeroSolicitacao, statusDemanda, dataRegistro) VALUES (?, ?, ?)'

    db.query(updateStatus, [numeroSolicitacao, statusDemanda.novoStatus, dataAtualSplit], (err, result) => {
        if (err) {
            console.error('Erro ao atualizar status da Solicitação', err);
            res.status(500).send('Erro ao atualizar status da Solicitação');
        } else {
            // Envie uma resposta de status 200 OK para indicar sucesso
            res.status(200).send('Status atualizado com sucesso');
        }
    })
})

app.get('/abrirSolicitacao', (req,res) => {
    res.render('solicitacao1');
})

app.post('/solicitacao2', (req, res) => {
    req.session.primeiraEtapa = req.body;

    let primeiraEtapa = req.session.primeiraEtapa
    res.render('solicitacao2', {primeiraEtapa: req.session.primeiraEtapa});
})

app.post('/solicitacao3', (req, res) => {
    let primeiraEtapa  = req.session.primeiraEtapa;
    
    req.session.segundaEtapa = req.body;
    let segundaEtapa = req.session.segundaEtapa

    let tipoMaterial = segundaEtapa.tipoMaterial

    if (tipoMaterial === 'digital') {
        res.render('solicitacao3-digital', {
            primeiraEtapa: primeiraEtapa,
            segundaEtapa: segundaEtapa,
            origem: 'Digital' 
        });
    }
    else if (tipoMaterial === 'impresso'){
        res.render('solicitacao3-impresso', {
            primeiraEtapa: primeiraEtapa,
            segundaEtapa: segundaEtapa,
        });
    }
})

app.post('/solicitacao3-digital', (req, res) => {
    let primeiraEtapa  = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;

    req.session.qualMaterial = req.body;

    let qualMaterial = req.session.qualMaterial
    res.render('publico', {
        primeiraEtapa: primeiraEtapa,
        segundaEtapa: segundaEtapa,
        qualMaterial: qualMaterial,
        origem: 'Digital'
    })
})

app.post('/solicitacao4-impresso', (req,res) => {
    let primeiraEtapa  = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    
    req.session.qualMaterial = req.body;

    let qualMaterial = req.session.qualMaterial;

    res.render('solicitacao4-impresso', {
        primeiraEtapa : primeiraEtapa,
        segundaEtapa: segundaEtapa,
        qualMaterial: qualMaterial
    })
})

app.post('/autorizacao', (req,res) => {
    let primeiraEtapa  = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let qualMaterial = req.session.qualMaterial;

    req.session.quemImprimi = req.body;

    let quemImprimi = req.session.quemImprimi;

    if(quemImprimi.quemImprimi === 'a própria unidade'){
        res.render ('publico', {
            primeiraEtapa: primeiraEtapa,
            segundaEtapa: segundaEtapa,
            qualMaterial: qualMaterial,
            quemImprimi: quemImprimi,
            origem: 'Impressão a própria unidade'
        })
    }
    else if(quemImprimi.quemImprimi === 'Mídia Ideal') {
        res.render ('enviarAutorizacao', {
            primeiraEtapa: primeiraEtapa,
            segundaEtapa: segundaEtapa,
            qualMaterial: qualMaterial,
            quemImprimi: quemImprimi,
            origem: 'Impressão Mídia Ideal'
        })
    }
})

app.post('/receberAutorizacao', upload.fields([{ name: 'printAutorizacao', maxCount: 1 },]), (req, res) => {    
    req.session.autorizacao = { printAutorizacao: req.files['printAutorizacao'][0].path };
    let autorizacao = req.session.autorizacao;
    let primeiraEtapa  = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let qualMaterial = req.session.qualMaterial;
    let quemImprimi = req.session.quemImprimi;

    res.render ('publico', {
        primeiraEtapa: primeiraEtapa,
        segundaEtapa: segundaEtapa,
        qualMaterial: qualMaterial,
        quemImprimi: quemImprimi,
        autorizacao: autorizacao,
        origem: 'Impressão Mídia Ideal'
    })
})

app.post('/publico', (req,res) => {
    let origem = req.body.origem;

    let primeiraEtapa;
    let segundaEtapa;
    let qualMaterial;
    let quemImprimi;
    let autorizacao;

    if(origem === 'Impressão Mídia Ideal') { 
        primeiraEtapa  = req.session.primeiraEtapa;
        segundaEtapa = req.session.segundaEtapa;
        qualMaterial = req.session.qualMaterial;
        quemImprimi = req.session.quemImprimi;
        autorizacao = req.session.autorizacao
    }

    else if (origem === 'Impressão a própria unidade') {
        primeiraEtapa = req.session.primeiraEtapa;
        segundaEtapa = req.session.segundaEtapa;
        qualMaterial = req.session.qualMaterial;
        
        req.session.quemImprimi = req.body;

        quemImprimi = req.session.quemImprimi;
    }

    else if (origem === 'Digital') {
        primeiraEtapa  = req.session.primeiraEtapa;
        segundaEtapa = req.session.segundaEtapa;
        qualMaterial = req.session.qualMaterial;
        quemImprimi = null;
        autorizacao = null;
    }

    res.render('valorMaterial' , {
        primeiraEtapa: primeiraEtapa,
        segundaEtapa: segundaEtapa,
        qualMaterial: qualMaterial,
        quemImprimi: quemImprimi,
        autorizacao: autorizacao
    });
})

app.post('/temLogo', (req,res) => {
    let primeiraEtapa = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let qualMaterial = req.session.qualMaterial;
    let quemImprimi = req.session.quemImprimi;
    let autorizacao = req.session.autorizacao;

    req.session.valorMaterial = req.body;

    res.render('temLogo', {
        primeiraEtapa: primeiraEtapa,
        segundaEtapa: segundaEtapa,
        qualMaterial: qualMaterial,
        quemImprimi: quemImprimi,
        autorizacao: autorizacao,
        valorMaterial: req.session.valorMaterial
    })
})

app.post('/especificacoes', (req,res) => {
    let primeiraEtapa = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let qualMaterial = req.session.qualMaterial;
    let quemImprimi = req.session.quemImprimi;
    let autorizacao = req.session.autorizacao
    let valorMaterial = req.session.valorMaterial

    req.session.temLogo = req.body;

    let temLogo = req.session.temLogo;

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.render('especificacoes', {
        primeiraEtapa: primeiraEtapa,
        segundaEtapa: segundaEtapa,
        qualMaterial: qualMaterial,
        quemImprimi: quemImprimi,
        autorizacao: autorizacao,
        valorMaterial: valorMaterial,
        temLogo: temLogo
    })
})

function padZero(num) {
    return num < 10 ? `0${num}` : num;
}

app.post('/finalizacao', upload.fields([{ name: 'referenciaAnexo', maxCount: 1 },]), (req, res) => {
    req.session.referencia = { referenciaAnexo: req.files['referenciaAnexo'][0].path };
    let primeiraEtapa = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let qualMaterial = req.session.qualMaterial;
    let quemImprimi = req.session.quemImprimi;
    let autorizacao = req.session.autorizacao
    let valorMaterial = req.session.valorMaterial
    let temLogo = req.session.temLogo;

    req.session.especificacoes = req.body;

    let especificacoes = req.session.especificacoes;
    let referenciaAnexo = req.session.referencia;

    const dataAtual = new Date();
    const numeroSolicitacao =
        `${dataAtual.getFullYear()}${padZero(dataAtual.getMonth() + 1)}${padZero(dataAtual.getDate())}` +
        `${padZero(dataAtual.getHours())}${padZero(dataAtual.getMinutes())}${padZero(dataAtual.getSeconds())}`;


    console.log( {
        "Primeira Etapa": primeiraEtapa,
        "Segunda Etapa": segundaEtapa,
        "Qual material" : qualMaterial,
        "Quem Imprime" : quemImprimi,
        "Autorização" : autorizacao,
        "Valor Material" : valorMaterial,
        "Tem logo" : temLogo,
        "Especificações" : especificacoes.maisInfos,
        "Print Referência": referenciaAnexo
    })

    const corretorasString = Array.isArray(temLogo.corretoras) ? temLogo.corretoras.join(', ') : temLogo.corretoras;
    const administradorasString = Array.isArray(temLogo.administradoras) ? temLogo.administradoras.join(', ') : temLogo.administradoras;
    const operadoraString = Array.isArray(temLogo.operadora) ? temLogo.operadora.join(', ') : temLogo.operadora;
    const dataAtualSplit = new Date().toISOString().split('T')[0];


    const insertDemanda = `INSERT INTO demandas (
        numeroSolicitacao,
        nome,
        telefone,
        qualEmpresa,
        qualUnidade,
        tipoMaterial,
        qualMaterial,
        quemImprime,
        autorizacao,
        valorMaterial,
        qualPublico,
        temLogo,
        corretoras,
        administradoras,
        operadora,
        especificacoes,
        referenciaAnexo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `

    const insertStatusDemandas = `INSERT INTO statusDemandas (
        numeroSolicitacao,
        statusDemanda,
        dataRegistro
    )`

    db.query(insertDemanda, [
            numeroSolicitacao, 
            primeiraEtapa.nome, 
            primeiraEtapa.telefone,
            primeiraEtapa.qualEmpresa,
            segundaEtapa.qualUnidade,
            segundaEtapa.tipoMaterial,
            qualMaterial.qualMaterial,
            quemImprimi.quemImprimi,
            autorizacao.printAutorizacao,
            valorMaterial.infosValores,
            'ver',
            temLogo.temLogo,
            temLogo.temLogo === 'sim' ? corretorasString : null,
            temLogo.temLogo === 'sim' ? administradorasString : null,
            temLogo.temLogo === 'sim' ? operadoraString : null,
            especificacoes.maisInfos,
            referenciaAnexo
        ], (err, result) => {
        if(err){
            console.log(err)
        }
        db.query(insertStatusDemandas, [numeroSolicitacao, 'ENVIADA', dataAtualSplit], (err, result) => {
            if(err) {
                console.error('Erro ao inserir status ao BD')
            }
            res.render('finalizacao', {
                nome: primeiraEtapa.nome,
                numeroSolicitacao: numeroSolicitacao
            })
        })
    })
})

app.listen(3050, () => {
    console.log('Aplicação rodando na porta 3050');
});
  