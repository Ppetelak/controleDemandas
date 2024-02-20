const db = require('./database')
const express = require('express')
const fs = require('fs');
const ejs = require('ejs')
const path = require('path')
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
        logger.error({
            message: 'Erro login na plataforma:',
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
          });
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

const logger = winston.createLogger({
    level: 'error',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: path.join('erros', 'error.log.json'),
        }),
    ],
});

app.get('/', (req,res) => {
    res.render('index');
})

app.post('/pesquisarSolicitacao', (req, res) => {
    const numeroSolicitacao = req.body.numeroSolicitacao;

    const query = `
        SELECT 
            sd.statusDemanda AS ultimoStatus,
            d.motivoRecusa,
            DATE_FORMAT(d.dataEntrega, '%d/%m/%Y') AS dataEntrega
        FROM 
            demandas d
        LEFT JOIN 
            statusDemandas sd ON d.numeroSolicitacao = sd.numeroSolicitacao
        WHERE 
            d.numeroSolicitacao = ?
        ORDER BY 
            sd.dataRegistro DESC 
        LIMIT 1
    `;

    db.query(query, [numeroSolicitacao], (err, result) => {
        if (err) {
            console.error('Erro ao consultar o banco de dados:', err);
            logger.error({
                message: 'Erro consultar solicitação aberta:',
                error: err.message,
                stack: err.stack,
                timestamp: new Date().toISOString()
            });
            return res.status(500).send('Erro interno do servidor');
        }

        if (result.length === 0) {
            // Não foi encontrado nenhum registro para o número de solicitação especificado
            return res.status(404).send('Nenhum registro encontrado para o número de solicitação especificado');
        }

        // O resultado contém o último status, motivo de recusa e data de entrega
        const status = result[0].ultimoStatus;
        const motivoRecusa = result[0].motivoRecusa;
        const dataEntrega = result[0].dataEntrega;
        
        // Renderize a página com as informações
        res.render('acompanhar', { 
            numeroSolicitacao, 
            status,
            motivoRecusa,
            dataEntrega
        });
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
        sd.id = (
            SELECT id
            FROM statusDemandas 
            WHERE numeroSolicitacao = d.numeroSolicitacao
            ORDER BY id DESC
            LIMIT 1
        )
    AND sdEnv.statusDemanda = 'ENVIADA';
    `;
    const selectStatusDemanda = `SELECT * FROM statusDemandas WHERE numeroSolicitacao=?`

    db.query(selectDemanda, [numeroSolicitacao], (err, result) => {
        if(err) {
            console.error('Erro ao buscas infos de demanda')
            logger.error({
                message: 'Erro ao buscar infos da demanda no dashboard:',
                error: err.message,
                stack: err.stack,
                timestamp: new Date().toISOString()
            });
        }
        db.query(selectStatusDemanda, [numeroSolicitacao], (err, resultStatus) => {
            if(err){
                console.error("Erro ao buscar status da demanda")
            }
            res.render('demandaSingle', {demanda: result[0], statusDemanda: resultStatus})
        })
    })
})

app.post('/mudarStatus/:id', verificaAutenticacao, (req, res) => {
    const numeroSolicitacao = req.params.id;
    const statusDemanda = req.body;
    const novoStatus = statusDemanda.novoStatus;
    const motivoRecusa = statusDemanda.motivoRecusa;
    const dataEntrega = statusDemanda.dataEntrega;
    const updateData = 'UPDATE demandas SET dataEntrega = ? WHERE numeroSolicitacao = ?';
    const updateMotivo = 'UPDATE demandas SET motivoRecusa = ? WHERE numeroSolicitacao = ?';


    console.log(numeroSolicitacao, statusDemanda);

    const dataAtualSplit = new Date().toISOString().split('T')[0];

    const updateStatus = 'INSERT INTO statusDemandas (numeroSolicitacao, statusDemanda, dataRegistro) VALUES (?, ?, ?)';

    db.query(updateStatus, [numeroSolicitacao, novoStatus, dataAtualSplit], (err, result) => {
        if (err) {
            console.error('Erro ao atualizar status da Solicitação', err);
            logger.error({
                message: 'Erro ao atualizar status de demanda:',
                error: err.message,
                stack: err.stack,
                timestamp: new Date().toISOString()
            });
            return res.status(500).send('Erro ao atualizar status da Solicitação');
        } 

        if (novoStatus === 'RECEBIDA' && dataEntrega) {
            const updateData = 'UPDATE demandas SET dataEntrega = ? WHERE numeroSolicitacao = ?';
            db.query(updateData, [dataEntrega, numeroSolicitacao], (err, result) => {
                if (err) {
                    console.error('Erro ao atualizar a data de entrega da demanda', err);
                    logger.error({
                        message: 'Erro ao atualizar data de entrega de uma demanda:',
                        error: err.message,
                        stack: err.stack,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }

        if (novoStatus === 'RECUSADA' && motivoRecusa) {
            const updateMotivo = 'UPDATE demandas SET motivoRecusa = ? WHERE numeroSolicitacao = ?';
            db.query(updateMotivo, [motivoRecusa, numeroSolicitacao], (err, result) => {
                if (err) {
                    console.error('Erro ao atualizar o motivo da recusa', err);
                    logger.error({
                        message: 'Erro ao inserir motivo de recusa de uma demanda',
                        error: err.message,
                        stack: err.stack,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }
        res.status(200).send('Status atualizado com sucesso');
    });
});

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
    let publico = req.body.qualPublico;

    let primeiraEtapa;
    let segundaEtapa;
    let qualMaterial;
    let quemImprimi;
    let autorizacao;

    console.log(publico);

    if(origem === 'Impressão Mídia Ideal') { 
        primeiraEtapa  = req.session.primeiraEtapa;
        segundaEtapa = req.session.segundaEtapa;
        qualMaterial = req.session.qualMaterial;
        quemImprimi = req.session.quemImprimi;
        autorizacao = req.session.autorizacao;
        publico = publico;

    }

    else if (origem === 'Impressão a própria unidade') {
        primeiraEtapa = req.session.primeiraEtapa;
        segundaEtapa = req.session.segundaEtapa;
        qualMaterial = req.session.qualMaterial;
        publico = publico;

        req.session.quemImprimi = req.body;

        quemImprimi = req.session.quemImprimi;
    }

    else if (origem === 'Digital') {
        primeiraEtapa  = req.session.primeiraEtapa;
        segundaEtapa = req.session.segundaEtapa;
        qualMaterial = req.session.qualMaterial;
        publico = publico;
        quemImprimi = null;
        autorizacao = null;
    }

    res.render('valorMaterial' , {
        primeiraEtapa: primeiraEtapa,
        segundaEtapa: segundaEtapa,
        qualMaterial: qualMaterial,
        quemImprimi: quemImprimi,
        autorizacao: autorizacao,
        publico: publico
    });
})

app.post('/temLogo', (req,res) => {
    let primeiraEtapa = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let qualMaterial = req.session.qualMaterial;
    let quemImprimi = req.session.quemImprimi;
    let autorizacao = req.session.autorizacao;
    let publico = req.session.publico;

    req.session.valorMaterial = req.body;

    res.render('temLogo', {
        primeiraEtapa: primeiraEtapa,
        segundaEtapa: segundaEtapa,
        qualMaterial: qualMaterial,
        quemImprimi: quemImprimi,
        autorizacao: autorizacao,
        publico: publico,
        valorMaterial: req.session.valorMaterial
    })
})

app.post('/especificacoes', (req,res) => {
    let primeiraEtapa = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let qualMaterial = req.session.qualMaterial;
    let quemImprimi = req.session.quemImprimi;
    let autorizacao = req.session.autorizacao;
    let valorMaterial = req.session.valorMaterial;
    let publico = req.session.publico;

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
        publico: publico,
        valorMaterial: valorMaterial,
        temLogo: temLogo
    })
})

function padZero(num) {
    return num < 10 ? `0${num}` : num;
}

app.post('/finalizacao', upload.fields([{ name: 'referenciaAnexo', maxCount: 1 },]), (req, res) => {
    let quemImprimi = null;
    let autorizacao = null;
    if (req.session && req.session.quemImprimi) {
        quemImprimi = req.session.quemImprimi.quemImprimi;
    }

    if(req.session && req.session.autorizacao) {
        autorizacao = req.session.autorizacao.printAutorizacao;
    }

    const referenciaAnexo = req.files['referenciaAnexo'] ? req.files['referenciaAnexo'][0].path : null;
    req.session.referencia = { referenciaAnexo: referenciaAnexo };
    
    let primeiraEtapa = req.session.primeiraEtapa;
    let segundaEtapa = req.session.segundaEtapa;
    let qualMaterial = req.session.qualMaterial;
    let valorMaterial = req.session.valorMaterial
    let temLogo = req.session.temLogo;
    let publico = req.session.publico;

    req.session.especificacoes = req.body;

    let especificacoes = req.session.especificacoes;

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
        "Print Referência": referenciaAnexo,
        "Publico": publico
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

    const insertStatusDemandas = `INSERT INTO statusdemandas (
        numeroSolicitacao,
        statusDemanda,
        dataRegistro
    ) VALUES(?, ?, ?)`

    db.query(insertDemanda, [
            numeroSolicitacao, 
            primeiraEtapa.nome, 
            primeiraEtapa.telefone,
            primeiraEtapa.qualEmpresa,
            segundaEtapa.qualUnidade,
            segundaEtapa.tipoMaterial,
            qualMaterial.qualMaterial,
            quemImprimi,
            autorizacao,
            valorMaterial.infosValores,
            publico,
            temLogo.temLogo,
            temLogo.temLogo === 'sim' ? corretorasString : null,
            temLogo.temLogo === 'sim' ? administradorasString : null,
            temLogo.temLogo === 'sim' ? operadoraString : null,
            especificacoes.maisInfos,
            referenciaAnexo
        ], (err, result) => {
        if(err){
            console.log(err)
            logger.error({
                message: 'Erro ao cadastrar demanda: ' + numeroSolicitacao,
                error: err.message,
                stack: err.stack,
                timestamp: new Date().toISOString()
            });
        }
        const statusDemanda = 'ENVIADA'
        console.log({
            numeroSolicitacao: numeroSolicitacao,
            statusDemanda: statusDemanda,
            dataatual: dataAtualSplit
        })
        db.query(insertStatusDemandas, [numeroSolicitacao, statusDemanda , dataAtualSplit], (err, result) => {
            if(err) {
                console.error('Erro ao inserir status ao BD', err);
                logger.error({
                    message: 'Erro ao inserir status inicial da demanda: ' + numeroSolicitacao,
                    error: err.message,
                    stack: err.stack,
                    timestamp: new Date().toISOString()
                });
            }
            res.render('finalizacao', {
                nome: primeiraEtapa.nome,
                numeroSolicitacao: numeroSolicitacao
            })
        })
    })
})

app.get('/statusDemanda/:solicitacao', (req, res) => {
    const solicitacao = req.params.solicitacao;
    const sqlSolicitacao = 'SELECT * FROM statusdemandas WHERE numeroSolicitacao = ?'
    db.query(sqlSolicitacao, [solicitacao], (err, result) => {
        if(err) {
            console.error("Erro ao trazer status da solicitação" +err)
        }
        const statusDemanda = result
        res.json(statusDemanda);
    })
});


app.listen(3050, () => {
    console.log('Aplicação rodando na porta 3050');
});
  