const { authQuery } = require('../db');
const bcrypt = require('bcrypt');
const saltRounds = 10;

/**
 * =================================================
 *              SERVIÇOS DE USUÁRIOS
 * =================================================
 */

const userService = {
    /**
     * Lista todos os usuários com seus respectivos perfis.
     */
    async getAll() {
        const query = `
            SELECT u.id, u.nome, u.email, u.created_at, r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.nome;
        `;
        const { rows } = await authQuery(query);
        return rows;
    },

    /**
     * Busca um usuário por ID.
     */
    async getById(id) {
        const query = `
            SELECT u.id, u.nome, u.email, u.created_at, u.role_id, r.name as role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1;
        `;
        const { rows } = await authQuery(query, [id]);
        return rows[0];
    },

    /**
     * Cria um novo usuário.
     */
    async create({ nome, email, password, role_id }) {
        const password_hash = await bcrypt.hash(password, saltRounds);
        const query = `
            INSERT INTO users (nome, email, password_hash, role_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, nome, email, role_id, created_at;
        `;
        const { rows } = await authQuery(query, [nome, email, password_hash, role_id]);
        return rows[0];
    },

    /**
     * Atualiza um usuário.
     * Nota: Não atualiza a senha aqui por simplicidade. Uma rota /change-password seria ideal.
     */
    async update(id, { nome, email, role_id }) {
        const query = `
            UPDATE users
            SET nome = $1, email = $2, role_id = $3
            WHERE id = $4
            RETURNING id, nome, email, role_id;
        `;
        const { rows } = await authQuery(query, [nome, email, role_id, id]);
        return rows[0];
    },

    /**
     * Deleta um usuário.
     */
    async delete(id) {
        const { rowCount } = await authQuery('DELETE FROM users WHERE id = $1', [id]);
        return rowCount;
    }
};

/**
 * =================================================
 *              SERVIÇOS DE PERFIS (ROLES)
 * =================================================
 */

const roleService = {
    /**
     * Lista todos os perfis e suas permissões associadas.
     */
    async getAll() {
        const query = `
            SELECT 
                r.id, r.name, r.description,
                COALESCE(
                    (SELECT json_agg(json_build_object('id', p.id, 'name', p.name))
                     FROM permissions p
                     JOIN role_permissions rp ON p.id = rp.permission_id
                     WHERE rp.role_id = r.id),
                    '[]'::json
                ) as permissions
            FROM roles r
            ORDER BY r.name;
        `;
        const { rows } = await authQuery(query);
        return rows;
    },

    /**
     * Cria um novo perfil com um conjunto de permissões.
     */
    async create({ name, description, permissions = [] }) {
        // Transação para garantir consistência
        const client = await authQuery('BEGIN');
        try {
            const roleQuery = 'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *;';
            const { rows: roleRows } = await authQuery(roleQuery, [name, description]);
            const newRole = roleRows[0];

            if (permissions.length > 0) {
                const permissionsQuery = `
                    INSERT INTO role_permissions (role_id, permission_id)
                    SELECT $1, id FROM permissions WHERE id = ANY($2::int[]);
                `;
                await authQuery(permissionsQuery, [newRole.id, permissions]);
            }
            
            await authQuery('COMMIT');
            return newRole;
        } catch (e) {
            await authQuery('ROLLBACK');
            throw e;
        }
    },

     /**
     * Atualiza um perfil e suas permissões.
     */
    async update(id, { name, description, permissions = [] }) {
        const client = await authQuery('BEGIN');
        try {
            const roleQuery = 'UPDATE roles SET name = $1, description = $2 WHERE id = $3 RETURNING *;';
            const { rows: roleRows } = await authQuery(roleQuery, [name, description, id]);
            
            // Limpa permissões antigas
            await authQuery('DELETE FROM role_permissions WHERE role_id = $1', [id]);

            // Insere novas permissões
            if (permissions.length > 0) {
                const values = permissions.map(pid => `(${id}, ${pid})`).join(',');
                const permissionsQuery = `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values};`;
                await authQuery(permissionsQuery);
            }
            
            await authQuery('COMMIT');
            return roleRows[0];
        } catch (e) {
            await authQuery('ROLLBACK');
            throw e;
        }
    },

    /**
     * Deleta um perfil. A constraint no banco (ON DELETE CASCADE) cuida da tabela pivô.
     */
    async delete(id) {
        const { rowCount } = await authQuery('DELETE FROM roles WHERE id = $1', [id]);
        return rowCount;
    }
};

/**
 * =================================================
 *            SERVIÇOS DE PERMISSÕES
 * =================================================
 */

const permissionService = {
    /**
     * Lista todas as permissões disponíveis no sistema.
     */
    async getAll() {
        const { rows } = await authQuery('SELECT id, name, description FROM permissions ORDER BY name;');
        return rows;
    }
};


module.exports = {
    userService,
    roleService,
    permissionService
};
