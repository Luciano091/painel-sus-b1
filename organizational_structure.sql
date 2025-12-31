-- Cria o schema 'auth' se ele não existir, para garantir que as tabelas sejam criadas no lugar certo.
CREATE SCHEMA IF NOT EXISTS auth;

-- Tabela para armazenar as Unidades de Saúde (UBS)
CREATE TABLE auth.unidades_saude (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnes VARCHAR(50) UNIQUE NOT NULL
);

-- Tabela para armazenar as Equipes de Saúde
CREATE TABLE auth.equipes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    ine VARCHAR(50) UNIQUE,
    unidade_id INTEGER NOT NULL,
    CONSTRAINT fk_unidade
        FOREIGN KEY(unidade_id) 
        REFERENCES auth.unidades_saude(id)
        ON DELETE CASCADE
);

-- Adiciona as colunas 'unidade_id' e 'equipe_id' à tabela de usuários
-- Estas colunas são nullable, permitindo que um usuário não esteja vinculado a uma unidade ou equipe.
ALTER TABLE auth.users
ADD COLUMN unidade_id INTEGER,
ADD COLUMN equipe_id INTEGER,
ADD CONSTRAINT fk_unidade_saude
    FOREIGN KEY(unidade_id) 
    REFERENCES auth.unidades_saude(id)
    ON DELETE SET NULL,
ADD CONSTRAINT fk_equipe
    FOREIGN KEY(equipe_id) 
    REFERENCES auth.equipes(id)
    ON DELETE SET NULL;

-- Adiciona comentários para maior clareza do esquema
COMMENT ON TABLE auth.unidades_saude IS 'Armazena as Unidades Básicas de Saúde (UBS) ou outros estabelecimentos.';
COMMENT ON COLUMN auth.unidades_saude.cnes IS 'Cadastro Nacional de Estabelecimentos de Saúde.';
COMMENT ON TABLE auth.equipes IS 'Armazena as equipes de saúde (ex: Equipe de Saúde da Família).';
COMMENT ON COLUMN auth.equipes.ine IS 'Identificador Nacional de Equipe.';
COMMENT ON COLUMN auth.users.unidade_id IS 'Referência para a unidade de saúde à qual o usuário está vinculado.';
COMMENT ON COLUMN auth.users.equipe_id IS 'Referência para a equipe de saúde à qual o usuário está vinculado.';
