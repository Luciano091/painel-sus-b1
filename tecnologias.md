# Tecnologias Utilizadas

Este documento descreve as tecnologias utilizadas no projeto `painel-esus`.

## Backend

*   **Node.js**: Ambiente de execução para JavaScript no lado do servidor.
*   **Express.js**: Framework web para Node.js, utilizado para criar a API e servir as páginas.
*   **PostgreSQL**: Banco de dados relacional utilizado para armazenar os dados da aplicação.
    *   **pg (node-postgres)**: Cliente PostgreSQL para Node.js, para interagir com o banco de dados.
*   **JSON Web Tokens (JWT)**: Utilizado para autenticação e autorização, permitindo que os usuários acessem rotas protegidas.
*   **bcrypt**: Biblioteca para criptografar senhas antes de armazená-las no banco de dados.
*   **dotenv**: Módulo para carregar variáveis de ambiente de um arquivo `.env`, facilitando a configuração em diferentes ambientes.
*   **node-cache**: Módulo para cache em memória, utilizado para otimizar o desempenho de consultas frequentes.

## Frontend

*   **HTML, CSS, JavaScript**: Tecnologias padrão para a construção da interface do usuário.
*   **Bootstrap (implícito)**: É provável que algum framework de CSS como o Bootstrap esteja sendo usado para a estilização dos componentes da interface, dada a estrutura de arquivos e a natureza da aplicação.

## Desenvolvimento

*   **Nodemon**: Ferramenta que reinicia o servidor automaticamente sempre que detecta alterações nos arquivos, agilizando o desenvolvimento.

# Sobre a Aplicação

O `painel-esus` é uma aplicação web que funciona como um painel de controle (dashboard). A aplicação possui um sistema de autenticação de usuários com diferentes níveis de permissão (RBAC - Role-Based Access Control), sugerindo que diferentes tipos de usuários terão acesso a diferentes funcionalidades e dados.

O nome "esus" indica que a aplicação provavelmente lida com dados do sistema e-SUS (Estratégia de Saúde Digital para o Brasil), possivelmente exibindo indicadores de saúde, relatórios e outras informações relevantes para a gestão em saúde.
