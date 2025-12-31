# Resumo das Implementações de Controle de Acesso (RBAC)

Este documento resume as alterações realizadas no sistema para implementar um controle de acesso baseado em perfis (Role-Based Access Control - RBAC), garantindo que cada tipo de usuário (`admin`, `gestor`, `visitante`, etc.) tenha acesso apenas às funcionalidades permitidas.

## Visão Geral

O objetivo principal foi delimitar o que cada usuário pode fazer na aplicação, especialmente na seção de gerenciamento de usuários. O trabalho foi dividido em três áreas principais: Backend, Frontend e Banco de Dados.

## 1. Alterações no Backend

As modificações no servidor foram focadas em criar uma base sólida para a verificação de permissões.

### a. Middleware de Autorização (`middleware/authorization.js`)
- Foi criado um novo middleware de autorização, centralizado na função `can()`.
- Este middleware recebe uma permissão como argumento (ex: `can('users.read')`) e verifica se o usuário logado possui essa permissão específica.
- A verificação é feita consultando o banco de dados de autenticação para encontrar a relação entre o `user_id` do usuário, a tabela `user_roles` e a tabela `role_permissions`.
- Se o usuário não tiver a permissão, o acesso à rota é bloqueado com um erro `403 Forbidden`.

### b. Proteção das Rotas da API
- Todas as rotas de gerenciamento de usuários, localizadas em `routes/admin/users.js`, foram protegidas com o middleware `can()`.
- **Exemplos de permissões aplicadas:**
  - `GET /api/admin/users` requer a permissão `users.read`.
  - `POST /api/admin/users` requer a permissão `users.create`.
  - `PUT /api/admin/users/:id` requer a permissão `users.update`.
  - `DELETE /api/admin/users/:id` requer a permissão `users.delete`.
- A rota de autenticação (`/api/admin/*`) agora é protegida pelo `authenticateToken`, garantindo que apenas usuários logados possam tentar acessá-la.

### c. Endpoint de Permissões do Usuário
- Foi criada uma nova rota `GET /api/auth/me/permissions`.
- Quando um usuário logado acessa esta rota, o backend consulta o banco de dados e retorna uma lista com todas as permissões que ele possui (ex: `['users.read', 'reports.view']`).
- Este endpoint é essencial para que o frontend possa ajustar a interface dinamicamente.

### d. Correção de Rotas e Conflitos
- Foi identificado e corrigido um conflito de roteamento entre os arquivos `server.js` and `routes/api.js`, onde as rotas de administração estavam sendo declaradas em duplicidade.
- O roteamento foi centralizado no `routes/api.js` para garantir clareza e um fluxo de requisição previsível.

## 2. Alterações no Frontend

A interface de usuário agora se adapta dinamicamente às permissões do usuário logado.

### a. Lógica de Permissões (`public/js/admin-users.js`)
- Ao carregar a página de gestão de usuários, o script agora faz uma chamada à nova rota `/api/auth/me/permissions`.
- As permissões retornadas são armazenadas em um `Set` para verificação rápida no lado do cliente.

### b. Interface Dinâmica
- **Botões Condicionais**: Os botões "Novo Usuário", "Editar" e "Excluir" só são exibidos na tela se o usuário possuir as permissões `users.create`, `users.update` e `users.delete`, respectivamente.
- **Feedback ao Usuário**: Caso o usuário não tenha a permissão `users.read`, a tabela de usuários exibe a mensagem "Você não tem permissão para visualizar usuários" em vez de tentar carregar os dados.

## 3. Configuração do Banco de Dados (Causa Raiz dos Erros)

A investigação revelou que a causa principal dos problemas de acesso era um banco de dados não populado.

### a. Diagnóstico
- Foi verificado que as tabelas `permissions` (que define as permissões existentes) e `role_permissions` (que liga perfis a permissões) estavam completamente vazias.
- Sem dados nessas tabelas, nenhum perfil (nem mesmo o `admin`) tinha permissão para fazer qualquer coisa no sistema.

### b. Solução
- Foram fornecidos scripts SQL para **popular (`seed`)** essas duas tabelas com os dados necessários.
- O script garantiu que:
  1. Todas as permissões necessárias (`users.read`, `users.create`, etc.) fossem inseridas na tabela `permissions`.
  2. Todas essas permissões fossem associadas ao perfil `admin` (`role_id = 1`) na tabela `role_permissions`.
- Após a execução correta deste script, o perfil `admin` passou a ter as permissões corretas, e o sistema de controle de acesso começou a funcionar como esperado.
