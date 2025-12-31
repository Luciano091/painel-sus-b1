# Visão Geral do Projeto: Painel eSUS

Este documento descreve a finalidade, as tecnologias e as práticas de segurança implementadas na aplicação "Painel eSUS".

## 1. Sobre a Aplicação

O **Painel eSUS** é uma aplicação web desenhada para atuar como um dashboard de visualização de dados e indicadores de saúde, provavelmente extraídos ou baseados no sistema eSUS (Sistema de Saúde Eletrônico do Cidadão) do Brasil.

A aplicação permite que usuários acessem, visualizem e gerenciem informações através de uma interface web, com diferentes níveis de acesso controlados por um sistema de permissões.

## 2. Tecnologias Utilizadas

A aplicação segue uma arquitetura cliente-servidor tradicional, utilizando as seguintes tecnologias:

### Backend
- **Node.js:** Ambiente de execução para o JavaScript no lado do servidor.
- **Express.js:** Framework web para Node.js, utilizado para criar a API REST, gerenciar rotas e middlewares.
- **PostgreSQL:** Sistema de gerenciamento de banco de dados relacional. A conexão é feita através da biblioteca `pg`.

### Frontend
- **HTML5:** Linguagem de marcação para a estrutura das páginas.
- **CSS3:** Linguagem de estilização para o design visual.
- **JavaScript (Vanilla):** Linguagem de programação para a interatividade e lógica no lado do cliente (navegador).

## 3. Arquitetura de Segurança

A segurança é um pilar fundamental da aplicação, implementada através das seguintes camadas:

### Autenticação
- **JWT (JSON Web Tokens):** A autenticação é baseada em tokens. Após o login com sucesso, o servidor gera um token JWT assinado que é enviado ao cliente. Este token deve ser incluído em todas as requisições subsequentes para acessar rotas protegidas. A biblioteca utilizada é a `jsonwebtoken`.

### Autorização
- **RBAC (Role-Based Access Control):** O sistema utiliza um controle de acesso baseado em papéis (funções). Existem diferentes papéis de usuário (ex: administrador, usuário comum) com permissões distintas. Um middleware de autorização verifica se o papel do usuário autenticado tem a permissão necessária para acessar um determinado recurso ou executar uma ação.

### Segurança de Senhas
- **Hashing com Bcrypt:** As senhas dos usuários nunca são armazenadas em texto plano. Em vez disso, elas são processadas por um algoritmo de hashing (Bcrypt) antes de serem salvas no banco de dados. Isso impede que as senhas originais sejam expostas em caso de um vazamento de dados.

### Proteção de Dados Sensíveis
- **Variáveis de Ambiente (`.env`):** Informações sensíveis como credenciais do banco de dados, segredos do JWT e outras chaves de API são armazenadas fora do código-fonte, em um arquivo `.env`. A biblioteca `dotenv` é usada para carregar essas variáveis, evitando que sejam expostas no controle de versão.

### Prevenção contra SQL Injection
- **Queries Parametrizadas:** Embora não detalhado, a biblioteca `pg` para PostgreSQL suporta o uso de queries parametrizadas. É uma prática padrão de segurança, e a estrutura com `queryHelper.js` sugere que as consultas ao banco de dados são centralizadas, o que facilita a implementação correta desta técnica para evitar ataques de injeção de SQL.
