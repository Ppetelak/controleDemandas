const { db, connectToDatabase } = require('./database');
const express = require('express')
const fs = require('fs');
const ejs = require('ejs')
const path = require('path');
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
const port = process.env.PORT || 3000;
const appUrl = process.env.APP_URL || 'http://demandas.midaideal.com';

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

/* VERIFICA SE A CONEXÃO COM BANCO DE DADOS FOI ESTABELECIDA ANTES DE INICIAR A APLICAÇÃO */

connectToDatabase()
    .then(() => {
        // Se a conexão com o banco de dados for bem-sucedida, inicie o servidor Express
        app.listen(port, () => {
            console.log(`Servidor rodando na porta ${port}`);
        });
    })
    .catch((error) => {
        app.get('*', (req, res) => {
            res.redirect('/error404');
        });
        console.error('Erro ao conectar ao banco de dados:', error);
        process.exit(1);
    });

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
    destination: 'uploads/',
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const modifiedFileName = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
        // Salve o nome original e o nome modificado em req.locals para acessá-lo posteriormente
        req.locals = {
            originalName: file.originalname,
            modifiedName: modifiedFileName
        };
        cb(null, modifiedFileName);
    }
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

app.post('/upload', upload.array('file'), (req, res) => {
    const filepaths = req.files.map(file => ({
        originalName: req.locals.originalName,
        modifiedName: file.filename,
        filepath: path.join(appUrl,'uploads', file.filename)
    }));
    console.log({filepaths})
    res.json({ filepaths });
});

app.post('/remove', (req, res) => {
    const { removefile } = req.body;
    console.log('chamou a rota de remover')
    const filepath = path.join('uploads', removefile);
    
    // Remove o arquivo
    fs.unlink(filepath, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Erro ao remover o arquivo.');
        } else {
            res.send('Arquivo removido com sucesso.');
        }
    });
});

app.get('/pesquisarSolicitacao/:numeroSolicitacao', (req, res) => {
    const numeroSolicitacao = req.params.numeroSolicitacao;
    const selectStatusDemanda = `SELECT * FROM statusdemandas WHERE numeroSolicitacao=?`
    const selectAlteracoes = `SELECT * FROM alteracoes WHERE numeroSolicitacao=?`
    const query = `
        SELECT 
        sd.statusdemanda AS ultimoStatus,
        d.*,
        DATE_FORMAT(d.dataEntrega, '%d/%m/%Y') AS dataEntrega
        FROM 
            demandas d
        LEFT JOIN 
            statusdemandas sd ON d.numeroSolicitacao = sd.numeroSolicitacao
        WHERE 
            d.numeroSolicitacao = ?
        ORDER BY 
            sd.id DESC 
        LIMIT 1; 
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
            res.render('naolocalizado', {numeroSolicitacao: numeroSolicitacao})
        } else {
            const status = result[0].ultimoStatus;
            const motivoRecusa = result[0].motivoRecusa;
            const dataEntrega = result[0].dataEntrega;
            const demanda = result[0]

            db.query(selectStatusDemanda, [numeroSolicitacao], (err, resultStatus) => {
                if(err){
                    console.error("Erro ao buscar status da demanda")
                }
                db.query(selectAlteracoes, [numeroSolicitacao], (err, resultAlter) => {
                    if(err) {
                        console.error('Erro na busca pela tabela de alterações')
                    }
                    const selectAnexos = 'SELECT * FROM anexos WHERE  numeroSolicitacao = ?';
                    db.query(selectAnexos, [numeroSolicitacao], (err, resultAnexos) => {
                        if(err){
                            console.error('erro na busca por anexos referente a demanda')
                            logger.error({
                                message: 'erro na busca por anexos referente a demanda:' +numeroSolicitacao,
                                error: err.message,
                                stack: err.stack,
                                timestamp: new Date().toISOString()
                            });
                        }
                        res.render('acompanhar', { 
                            numeroSolicitacao, 
                            status,
                            motivoRecusa,
                            dataEntrega,
                            demanda,
                            statusdemanda: resultStatus,
                            alteracoes: resultAlter,
                            anexos: resultAnexos
                        })
                    });
                })
            })
        }
    });
});

app.post('/solicitacaoAlteracao/:numeroSolicitacao', (req, res) => {
    let numeroSolicitacao = req.params.numeroSolicitacao;
    let descricao = req.body.descricao;

    let novoStatus = 'ALTERAÇÃO'

    let dataHoje = new Date().toISOString().split('T')[0];

    const insertAlter = 'INSERT INTO alteracoes (numeroSolicitacao, dataAlteracao, descricao) VALUES (?, ?, ?)';
    const updateStatus = 'INSERT INTO statusdemandas (numeroSolicitacao, statusdemanda, dataRegistro) VALUES (?, ?, ?)';

    db.query(insertAlter, [numeroSolicitacao, dataHoje, descricao], (err, result) => {
        if(err) {
            console.error('Erro ao inserir alteração na tabela de alteração', err)
        }
        db.query(updateStatus, [numeroSolicitacao, novoStatus, dataHoje], (err, result) => {
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
            return res.status(200).json({
                mensagem: 'Alteração solicitada com sucesso',
                });
        });
    })
});

app.get('/demandas', verificaAutenticacao, (req,res) => {
    //const searchDemandas = `SELECT * FROM demandas`;
    const searchDemandas = `
    SELECT 
    d.*,
    sd.statusdemanda AS ultimoStatus,
    sd.dataRegistro AS dataUltimoStatus,
    sdEnv.dataRegistro AS dataAbertura
    FROM 
        demandas d
    LEFT JOIN 
        statusdemandas sd ON d.numeroSolicitacao = sd.numeroSolicitacao
    LEFT JOIN 
        statusdemandas sdEnv ON d.numeroSolicitacao = sdEnv.numeroSolicitacao
    WHERE 
        sd.id = (
            SELECT MAX(id) 
            FROM statusdemandas 
            WHERE numeroSolicitacao = d.numeroSolicitacao
        )
    AND sdEnv.statusdemanda = 'ENVIADA';
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
    sd.statusdemanda AS ultimoStatus,
    sd.dataRegistro AS dataUltimoStatus,
    sdEnv.dataRegistro AS dataAbertura
    FROM 
        demandas d
    LEFT JOIN 
        statusdemandas sd ON d.numeroSolicitacao = sd.numeroSolicitacao
    LEFT JOIN 
        statusdemandas sdEnv ON d.numeroSolicitacao = sdEnv.numeroSolicitacao
    WHERE 
        d.numeroSolicitacao = ? AND
        sd.id = (
            SELECT id
            FROM statusdemandas 
            WHERE numeroSolicitacao = d.numeroSolicitacao
            ORDER BY id DESC
            LIMIT 1
        )
    AND sdEnv.statusdemanda = 'ENVIADA';
    `;
    const selectStatusDemanda = `SELECT * FROM statusdemandas WHERE numeroSolicitacao=?`

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

            const selectAlteracoes = 'SELECT * FROM alteracoes WHERE numeroSolicitacao = ?'
            db.query(selectAlteracoes, [numeroSolicitacao], (err, resultAlteracoes) => {
                if(err){
                    console.error('erro na busca por alterações referente a demanda')
                    logger.error({
                        message: 'erro na busca por alterações referente a demanda:' +numeroSolicitacao,
                        error: err.message,
                        stack: err.stack,
                        timestamp: new Date().toISOString()
                    });
                }
                const selectAnexos = 'SELECT * FROM anexos WHERE  numeroSolicitacao = ?';
                db.query(selectAnexos, [numeroSolicitacao], (err, resultAnexos) => {
                    if(err){
                        console.error('erro na busca por anexos referente a demanda')
                        logger.error({
                            message: 'erro na busca por anexos referente a demanda:' +numeroSolicitacao,
                            error: err.message,
                            stack: err.stack,
                            timestamp: new Date().toISOString()
                        });
                    }
                    res.render('demandaSingle', {demanda: result[0], statusdemanda: resultStatus, alteracoes: resultAlteracoes, anexos: resultAnexos})
                })
            })
        })
    })
})

app.post('/mudarStatus/:id', verificaAutenticacao, (req, res) => {
    const numeroSolicitacao = req.params.id;
    const statusdemanda = req.body;
    const novoStatus = statusdemanda.novoStatus;
    const motivoRecusa = statusdemanda.motivoRecusa;
    const alteracao = statusdemanda.alteracao;
    const dataEntrega = statusdemanda.dataEntrega;
    const linkEntrega = statusdemanda.linkEntrega;
    const textoAprovacao = statusdemanda.textoAprovacao;
    const updateData = 'UPDATE demandas SET dataEntrega = ? WHERE numeroSolicitacao = ?';
    const updateMotivo = 'UPDATE demandas SET motivoRecusa = ? WHERE numeroSolicitacao = ?';

    const dataAtualSplit = new Date().toISOString().split('T')[0];

    const updateStatus = 'INSERT INTO statusdemandas (numeroSolicitacao, statusdemanda, dataRegistro) VALUES (?, ?, ?)';

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

        if (novoStatus === 'ALTERAÇÃO' && alteracao) {
            const insertAlteracao = 'INSERT INTO alteracoes (numeroSolicitacao, dataAlteracao, descricao) VALUES (?, ?, ?)';
            db.query(insertAlteracao, [numeroSolicitacao, dataAtualSplit, alteracao], (err, result) => {
                if (err) {
                    console.error('Erro ao atualizar a alteração na tabela alteração', err);
                    logger.error({
                        message: 'Erro ao inserir a alteração na tabela alteração',
                        error: err.message,
                        stack: err.stack,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }

        if (novoStatus === 'ENTREGUE' && linkEntrega){ 
            const updateDemandaLinkEntrega = 'UPDATE demandas SET linkEntrega= ? WHERE numeroSolicitacao = ?';
            db.query(updateDemandaLinkEntrega, [linkEntrega, numeroSolicitacao], (err, result) => {
                if (err) {
                    console.error('Erro ao atualizar o link de entrega', err);
                    logger.error({
                        message: 'Erro ao atualizar o link de entrega',
                        error: err.message,
                        stack: err.stack,
                        timestamp: new Date().toISOString()
                    });
                }
            })
        }

        if (novoStatus === 'APROVAÇÃO' && textoAprovacao) {
            const updateDemandaTextAprovacao = 'UPDATE demandas SET textoAprovacao = ? WHERE numeroSolicitacao = ?';
            db.query(updateDemandaTextAprovacao, [textoAprovacao, numeroSolicitacao], (err, result) => {
                if (err) {
                    console.error('Erro ao atualizar o texto referente a aprovação', err);
                    logger.error({
                        message: 'Erro ao atualizar o texto referente a aprovação',
                        error: err.message,
                        stack: err.stack,
                        timestamp: new Date().toISOString()
                    });
                }
            })
        }
        res.status(200).send('Status atualizado com sucesso');
    });
});

app.post('/mudarDataEntrega/:numeroSolicitacao', verificaAutenticacao, (req,res) => {
    let numeroSolicitacao = req.params.numeroSolicitacao;
    let novaData = req.body.novaDataEntrega;

    let updateDataEntrega = 'UPDATE demandas SET dataEntrega = ? WHERE numeroSolicitacao =?';

    db.query(updateDataEntrega, [novaData, numeroSolicitacao], (err, result) => {
        if(err){
            console.error('Erro ao atualizar data de emtrega da Solicitação', err);
            logger.error({
                message: 'Erro ao atualizar data de entrega de demanda:',
                error: err.message,
                stack: err.stack,
                timestamp: new Date().toISOString()
            });
            return res.status(500).send('Erro ao atualizar data de entrega da Solicitação');
        }
        res.status(200).send('Data de entrega atualizada com sucesso');
    })
})

app.get('/abrirSolicitacao', (req,res) => {
    res.render('form');
})

function padZero(num) {
    return num < 10 ? `0${num}` : num;
}

app.post('/enviarDados', (req,res) => {
    let dadosForm = req.body.dadosFormulario;
    let anexos = req.body.anexos

    const dataAtual = new Date();
    const numeroSolicitacao =
        `${dataAtual.getFullYear()}${padZero(dataAtual.getMonth() + 1)}${padZero(dataAtual.getDate())}` +
        `${padZero(dataAtual.getHours())}${padZero(dataAtual.getMinutes())}${padZero(dataAtual.getSeconds())}`;
    let nome = dadosForm.nome;

    const corretorasString = Array.isArray(dadosForm.corretoras) ? dadosForm.corretoras.join(', ') : dadosForm.corretoras;
    const administradorasString = Array.isArray(dadosForm.administradoras) ? dadosForm.administradoras.join(', ') : dadosForm.administradoras;
    const operadoraString = Array.isArray(dadosForm.operadora) ? dadosForm.operadora.join(', ') : dadosForm.operadora;
    const dataAtualSplit = new Date().toISOString().split('T')[0];
    const qualMaterialString = Array.isArray(dadosForm.qualMaterial) ? dadosForm.qualMaterial.join(', '): dadosForm.qualMaterial;
    const publicoString = Array.isArray(dadosForm.qualPublico) ? dadosForm.qualPublico.join(', ') : dadosForm.qualPublico;

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
        temLogo,
        corretoras,
        administradoras,
        operadora,
        logosAdicionais,
        valorMaterial,
        qualPublico,
        especificacoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `

    const insertstatusdemandas = `INSERT INTO statusdemandas (
        numeroSolicitacao,
        statusdemanda,
        dataRegistro
    ) VALUES(?, ?, ?)`

    const insertAnexos = 'INSERT INTO anexos (numeroSolicitacao, urlArquivo) VALUES(?, ?)';

    db.query(insertDemanda, [
            numeroSolicitacao, 
            dadosForm.nome,
            dadosForm.telefone,
            dadosForm.qualEmpresa,
            dadosForm.qualUnidade,
            dadosForm.tipoMaterial,
            qualMaterialString,
            dadosForm.quemImprimi,
            dadosForm.autorizacaoTem || null,
            dadosForm.temLogo || null,
            corretorasString || null,
            administradorasString || null,
            operadoraString || null,
            dadosForm.logosNovasNomes || null,
            dadosForm.infosValores || null,
            publicoString,
            dadosForm.maisInfos
        ], (err, result) => {
        if(err) {
            console.log(err)
            logger.error({
                message: 'Erro ao cadastrar demanda: ' + numeroSolicitacao,
                error: err.message,
                stack: err.stack,
                timestamp: new Date().toISOString()
            });
        }
        const statusdemanda = 'ENVIADA'
        db.query(insertstatusdemandas, [numeroSolicitacao, statusdemanda , dataAtualSplit], (err, result) => {
            if(err) {
                console.error('Erro ao inserir status ao BD', err);
                logger.error({
                    message: 'Erro ao inserir status inicial da demanda: ' + numeroSolicitacao,
                    error: err.message,
                    stack: err.stack,
                    timestamp: new Date().toISOString()
                });
            }
            if (anexos && Object.keys(anexos).length > 0) {
                let numAnexosProcessados = 0;
                const numTotalAnexos = Object.keys(anexos).length;
            
                Object.entries(anexos).forEach(([nomeArquivo, urlArquivo]) => {
                    db.query(insertAnexos, [numeroSolicitacao, urlArquivo], (err, result) => {
                        if (err) {
                            console.error('Erro ao inserir anexo ao BD', err);
                            logger.error({
                                message: 'Erro ao inserir anexo ao banco de dados da demanda: ' + numeroSolicitacao,
                                error: err.message,
                                stack: err.stack,
                                timestamp: new Date().toISOString()
                            });
                        } else {
                            numAnexosProcessados++;
                            if (numAnexosProcessados === numTotalAnexos) {
                                // Todos os anexos foram processados, enviar resposta
                                return res.status(200).json({
                                    mensagem: 'Dados enviados com sucesso',
                                    nome: nome,
                                    numeroSolicitacao: numeroSolicitacao
                                });
                            }
                        }
                    });
                });
            } else {
                // Não há anexos para processar, enviar resposta
                return res.status(200).json({
                    mensagem: 'Dados enviados com sucesso',
                    nome: nome,
                    numeroSolicitacao: numeroSolicitacao
                });
            }            
        }); 
    }); 
})

app.get('/sucesso/:numeroSolicitacao/:nome', (req,res) => {
    let numeroSolicitacao = req.params.numeroSolicitacao;
    let nome = req.params.nome;

    res.render('finalizacao', {nome: nome, numeroSolicitacao: numeroSolicitacao})
})

app.post('/finalizacao', (req, res) => {

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

    const insertstatusdemandas = `INSERT INTO statusdemandas (
        numeroSolicitacao,
        statusdemanda,
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
        const statusdemanda = 'ENVIADA'
        console.log({
            numeroSolicitacao: numeroSolicitacao,
            statusdemanda: statusdemanda,
            dataatual: dataAtualSplit
        })
        db.query(insertstatusdemandas, [numeroSolicitacao, statusdemanda , dataAtualSplit], (err, result) => {
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

app.get('/statusdemanda/:solicitacao', (req, res) => {
    const solicitacao = req.params.solicitacao;
    const sqlSolicitacao = 'SELECT * FROM statusdemandas WHERE numeroSolicitacao = ?'
    db.query(sqlSolicitacao, [solicitacao], (err, result) => {
        if(err) {
            console.error("Erro ao trazer status da solicitação" +err)
        }
        const statusdemanda = result
        res.json(statusdemanda);
    })
});

app.use((req, res, next) => {
    res.render('erro404')
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.render('ErroServidor')
});