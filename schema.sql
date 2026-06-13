-- =============================================================
-- SXF Triagem — Arquitetura de Banco de Dados MySQL
-- Protocolo SXF·BR  |  Versão 2.0.0
-- Pesos e limiares alinhados a Romero et al. (2025), Tabelas 4 e 5.
-- (Para instalação NOVA. Se já tem dados, use migration_v2.sql.)
-- =============================================================

CREATE DATABASE IF NOT EXISTS sxf_triagem
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE sxf_triagem;

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- -------------------------------------------------------------
-- 1. USUARIOS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario     INT            NOT NULL AUTO_INCREMENT,
    nome           VARCHAR(120)   NOT NULL,
    email          VARCHAR(150)   NOT NULL UNIQUE,
    senha_hash     VARCHAR(255)   NOT NULL,             -- hash (werkzeug)
    nivel          ENUM('admin','medico','recepcao') NOT NULL DEFAULT 'recepcao',
    ativo          TINYINT(1)     NOT NULL DEFAULT 1,
    criado_em      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso  TIMESTAMP      NULL,
    PRIMARY KEY (id_usuario),
    INDEX idx_email (email),
    INDEX idx_nivel (nivel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 2. PROFISSIONAIS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profissionais (
    id_profissional  INT          NOT NULL AUTO_INCREMENT,
    id_usuario       INT          NOT NULL,
    nome_completo    VARCHAR(150) NOT NULL,
    crm              VARCHAR(30)  NOT NULL,
    especialidade    VARCHAR(100) NULL,
    criado_em        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_profissional),
    UNIQUE KEY uq_usuario (id_usuario),
    UNIQUE KEY uq_crm (crm),
    CONSTRAINT fk_prof_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 3. PACIENTES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pacientes (
    id_paciente     INT           NOT NULL AUTO_INCREMENT,
    nome_completo   VARCHAR(150)  NOT NULL,
    idade           TINYINT       NOT NULL CHECK (idade >= 0 AND idade <= 120),
    sexo_biologico  ENUM('M','F') NOT NULL,
    responsavel     VARCHAR(150)  NULL,
    criado_em       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_por      INT           NOT NULL,
    PRIMARY KEY (id_paciente),
    INDEX idx_nome (nome_completo),
    CONSTRAINT fk_pac_usuario
        FOREIGN KEY (criado_por) REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 4. SINTOMAS  (12 itens — Romero et al., 2025)
--    Pesos por sexo são DECIMAL (P = FX − FN do artigo).
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sintomas (
    id_sintoma      INT            NOT NULL AUTO_INCREMENT,
    nome            VARCHAR(160)   NOT NULL,
    categoria       ENUM('cognitivo','fisico') NOT NULL,
    peso_masculino  DECIMAL(3,2)   NOT NULL DEFAULT 0.00,
    peso_feminino   DECIMAL(3,2)   NOT NULL DEFAULT 0.00,
    ativo           TINYINT(1)     NOT NULL DEFAULT 1,
    PRIMARY KEY (id_sintoma),
    INDEX idx_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categoria 'cognitivo' agrupa sinais cognitivos E comportamentais
-- (o schema só prevê dois grupos; ver melhorias futuras).
INSERT INTO sintomas (nome, categoria, peso_masculino, peso_feminino) VALUES
    ('Atraso na fala ou linguagem',                                   'cognitivo', 0.14, 0.01),
    ('Dificuldades de aprendizagem',                                  'cognitivo', 0.18, 0.28),
    ('Déficit de atenção',                                            'cognitivo', 0.17, 0.12),
    ('Deficiência intelectual (DI)',                                  'cognitivo', 0.32, 0.20),
    ('Hiperatividade',                                                'cognitivo', 0.12, 0.04),
    ('Comportamento agressivo',                                       'cognitivo', 0.01, 0.02),
    ('Evita contato visual',                                          'cognitivo', 0.06, 0.08),
    ('Evita contato físico',                                          'cognitivo', 0.04, 0.07),
    ('Movimentos intencionais, repetitivos e rítmicos (estereotipias)','cognitivo', 0.17, 0.05),
    ('Hiperflexibilidade articular (hipermobilidade)',               'fisico',    0.19, 0.04),
    ('Macroorquidismo (apenas homens)',                              'fisico',    0.26, 0.00),
    ('Face alongada, mandíbula proeminente e/ou orelhas salientes',  'fisico',    0.29, 0.09);

-- -------------------------------------------------------------
-- 5. LIMIARES  (limiar de 95% de sensibilidade do artigo)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS limiares (
    id_limiar       INT            NOT NULL AUTO_INCREMENT,
    sexo_biologico  ENUM('M','F')  NOT NULL UNIQUE,
    valor           DECIMAL(3,2)   NOT NULL,
    score_maximo    DECIMAL(4,2)   NOT NULL,
    atualizado_em   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_limiar)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO limiares (sexo_biologico, valor, score_maximo) VALUES
    ('M', 0.56, 1.95),
    ('F', 0.55, 1.00);

-- -------------------------------------------------------------
-- 6. AVALIACOES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS avaliacoes (
    id_avaliacao     INT           NOT NULL AUTO_INCREMENT,
    id_paciente      INT           NOT NULL,
    id_profissional  INT           NOT NULL,
    score_obtido     DECIMAL(4,2)  NOT NULL DEFAULT 0.00,
    limiar_aplicado  DECIMAL(3,2)  NOT NULL,
    resultado        ENUM('encaminhar','monitorar') NOT NULL,
    observacoes      TEXT          NULL,
    data_avaliacao   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_avaliacao),
    INDEX idx_paciente   (id_paciente),
    INDEX idx_profissional (id_profissional),
    INDEX idx_resultado  (resultado),
    CONSTRAINT fk_aval_paciente
        FOREIGN KEY (id_paciente) REFERENCES pacientes (id_paciente)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_aval_profissional
        FOREIGN KEY (id_profissional) REFERENCES profissionais (id_profissional)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 7. RESPOSTAS_AVALIACAO
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS respostas_avaliacao (
    id_resposta    INT          NOT NULL AUTO_INCREMENT,
    id_avaliacao   INT          NOT NULL,
    id_sintoma     INT          NOT NULL,
    presente       TINYINT(1)   NOT NULL DEFAULT 0,
    peso_aplicado  DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (id_resposta),
    UNIQUE KEY uq_aval_sintoma (id_avaliacao, id_sintoma),
    CONSTRAINT fk_resp_avaliacao
        FOREIGN KEY (id_avaliacao) REFERENCES avaliacoes (id_avaliacao)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_resp_sintoma
        FOREIGN KEY (id_sintoma) REFERENCES sintomas (id_sintoma)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 8. LAUDOS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS laudos (
    id_laudo          INT          NOT NULL AUTO_INCREMENT,
    id_avaliacao      INT          NOT NULL UNIQUE,
    indicacao         VARCHAR(100) NOT NULL,
    resumo_diagnostico TEXT        NULL,
    gerado_em         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gerado_por        INT          NOT NULL,
    PRIMARY KEY (id_laudo),
    CONSTRAINT fk_laudo_avaliacao
        FOREIGN KEY (id_avaliacao) REFERENCES avaliacoes (id_avaliacao)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_laudo_usuario
        FOREIGN KEY (gerado_por) REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 9. HISTORICO_ACESSO
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historico_acesso (
    id_log      INT           NOT NULL AUTO_INCREMENT,
    id_usuario  INT           NOT NULL,
    acao        VARCHAR(80)   NOT NULL,
    entidade    VARCHAR(60)   NULL,
    entidade_id INT           NULL,
    ip          VARCHAR(45)   NULL,
    momento     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_log),
    INDEX idx_usuario (id_usuario),
    INDEX idx_momento (momento),
    CONSTRAINT fk_log_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
