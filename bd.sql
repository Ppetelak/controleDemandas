CREATE TABLE demandas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numeroSolicitacao VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(255) NOT NULL,
    qualEmpresa VARCHAR(255) NOT NULL,
    qualUnidade VARCHAR(255),
    tipoMaterial VARCHAR(255) NOT NULL,
    qualMaterial VARCHAR(255) NOT NULL,
    quemImprime VARCHAR(255),
    autorizacao VARCHAR(500),
    valorMaterial TEXT,
    qualPublico VARCHAR(500),
    temLogo VARCHAR(10),
    corretoras TEXT,
    administradoras TEXT,
    operadora TEXT,
    especificacoes TEXT,
    referenciaAnexo VARCHAR(500)
);

CREATE TABLE statusDemandas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numeroSolicitacao INT,
    statusDemanda VARCHAR(50),
    dataRegistro DATE
);

CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50),
    senha VARCHAR(50),
    nome VARCHAR(250)
)


/* ATUALIZAÇÕES A SEREM FEITAS NO SERVER */
-- Adicionar uma nova tabela chamada alterações -- 

CREATE TABLE alteracoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numeroSolicitacao VARCHAR(255),
    dataAlteracao DATE,
    descricao TEXT
);

CREATE TABLE anexos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numeroSolicitacao VARCHAR(255),
    urlArquivo TEXT
);

ALTER TABLE demandas DROP COLUMN referenciaAnexo;
ALTER TABLE demandas ADD COLUMN logosAdicionais TEXT;

ALTER TABLE demandas
ADD COLUMN linkEntrega text;

ALTER TABLE demandas
ADD COLUMN textoAprovacao text;



