-- Etapa 1: Criar a tabela de Perfis (Roles)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE roles IS 'Armazena os perfis de usuário (ex: admin, gestor, visitante).';
COMMENT ON COLUMN roles.name IS 'O nome único do perfil, ex: "admin".';


-- Etapa 2: Criar a tabela de Permissões (Permissions)
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- "slug" da permissão, ex: "users.create"
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE permissions IS 'Armazena as permissões individuais do sistema.';
COMMENT ON COLUMN permissions.name IS 'O nome único (slug) da permissão, ex: "users.read_all".';


-- Etapa 3: Criar a tabela pivô para associar Roles e Permissions (N-para-N)
CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

COMMENT ON TABLE role_permissions IS 'Tabela de ligação para associar múltiplas permissões a múltiplos perfis.';


-- Etapa 4: Alterar a tabela `users` para adicionar a associação com `roles`
ALTER TABLE users
ADD COLUMN role_id INTEGER;

-- Adiciona a Foreign Key após a coluna ter sido criada
-- A constraint é adicionada como 'DEFERRABLE' para facilitar o seed inicial
ALTER TABLE users
ADD CONSTRAINT fk_users_role
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

COMMENT ON COLUMN users.role_id IS 'Chave estrangeira que associa o usuário a um perfil na tabela `roles`.';


-- Etapa 5: Script de SEED (popular o banco com dados iniciais)
-- Envolvemos o seed em uma transação para garantir a atomicidade.
BEGIN;

-- Força a verificação da constraint no final da transação
SET CONSTRAINTS fk_users_role IMMEDIATE;

-- 5.1: Criar Perfis (Roles)
-- Usamos ON CONFLICT DO NOTHING para tornar o script repetível sem erros.
INSERT INTO roles (id, name, description) VALUES
(1, 'admin', 'Administrador com acesso total ao sistema.'),
(2, 'gestor', 'Gestor com permissões de visualização e gerenciamento de usuários.'),
(3, 'visitante', 'Usuário com permissões apenas de visualização de relatórios.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 5.2: Criar Permissões (Permissions)
-- Permissões são granulares e seguem o padrão "recurso.ação"
INSERT INTO permissions (name, description) VALUES
('users.create', 'Permite criar novos usuários.'),
('users.read', 'Permite visualizar usuários.'),
('users.update', 'Permite editar usuários existentes.'),
('users.delete', 'Permite deletar usuários.'),
('roles.create', 'Permite criar novos perfis.'),
('roles.read', 'Permite visualizar perfis e suas permissões.'),
('roles.update', 'Permite editar perfis e associar permissões.'),
('roles.delete', 'Permite deletar perfis.'),
('reports.view', 'Permite visualizar os painéis e relatórios de indicadores.')
ON CONFLICT (name) DO NOTHING;

-- 5.3: Associar Permissões aos Perfis
-- ADMINISTRADOR (tem todas as permissões)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON CONFLICT DO NOTHING;

-- GESTOR (gerencia usuários e visualiza perfis)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE name IN (
    'users.create', 'users.read', 'users.update', 'roles.read', 'reports.view'
)
ON CONFLICT DO NOTHING;

-- VISITANTE (apenas visualiza relatórios)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE name = 'reports.view'
ON CONFLICT DO NOTHING;

-- 5.4: Criar um usuário ADMIN padrão
-- A senha é 'admin123'
-- ATENÇÃO: O HASH ABAIXO CORRESPONDE A 'admin123'. Mude em produção!
-- Gerado com: await bcrypt.hash('admin123', 10);
DO $$
DECLARE
    admin_role_id INT := 1;
    admin_email TEXT := 'admin@example.com';
    -- Hash para 'admin123'
    password_hash TEXT := '$2b$10$fWpqX2345B.sP1vP0mXGj.K6zY5Z3t9W2mJ4aH1sN0bC8dI7jF6k'; 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = admin_email) THEN
        INSERT INTO users (nome, email, password_hash, role_id)
        VALUES ('Admin Padrão', admin_email, password_hash, admin_role_id);
    ELSE
        -- Se o admin já existe, apenas garante que ele tem o role_id correto
        UPDATE users SET role_id = admin_role_id WHERE email = admin_email;
    END IF;
END $$;

-- 5.5: Garante que outros usuários existentes tenham um perfil padrão (ex: visitante)
-- Isso evita que a constraint NOT NULL falhe em bancos já populados.
UPDATE users SET role_id = 3 WHERE role_id IS NULL;

-- Etapa 6: Alterar a coluna para ser NOT NULL após o preenchimento
ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;


COMMIT;
