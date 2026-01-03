# Sobre a Aplicação

O **Painel e-SUS** é uma aplicação web que funciona como um painel de controle (dashboard) para o monitoramento de indicadores de saúde pública, com foco no programa Previne Brasil.

O sistema foi desenhado para gestores e profissionais de saúde, permitindo a visualização de dados consolidados e nominais sobre o desempenho das equipes de Atenção Primária à Saúde (APS).

## Funcionalidades Principais

*   **Visualização de Indicadores**: Exibe dados percentuais e listas nominais de pacientes para os indicadores do Previde Brasil (C1 ao C7).
*   **Filtros Dinâmicos**: Permite filtrar os dados por equipe (INE), microárea e competência (mês/ano).
*   **Controle de Acesso**: Possui um sistema de autenticação de usuários com diferentes níveis de permissão (RBAC - Role-Based Access Control), garantindo que cada usuário acesse apenas as informações pertinentes ao seu nível.
*   **Exportação de Dados**: Funcionalidade para baixar relatórios em formato CSV.

# Tecnologias Utilizadas

Este documento descreve as tecnologias utilizadas no projeto.

## Backend

*   **Node.js**: Ambiente de execução para JavaScript no lado do servidor.
*   **Express.js**: Framework web para Node.js, utilizado para construir a API RESTful que fornece os dados para o frontend.
*   **PostgreSQL**: Banco de dados relacional utilizado para armazenar todos os dados da aplicação, incluindo cadastros de cidadãos, atendimentos e dados de usuários.
    *   **pg (node-postgres)**: Cliente PostgreSQL para Node.js, utilizado para a comunicação entre a aplicação e o banco de dados.
*   **jsonwebtoken (JWT)**: Padrão utilizado para criar tokens de acesso que permitem a autenticação e autorização segura dos usuários.
*   **bcrypt**: Biblioteca para criptografar as senhas dos usuários antes de armazená-las no banco de dados, seguindo as melhores práticas de segurança.
*   **dotenv**: Módulo para carregar variáveis de ambiente a partir de um arquivo `.env`, facilitando a configuração da aplicação em diferentes ambientes (desenvolvimento, produção).
*   **node-cache**: Módulo para cache em memória, utilizado para otimizar o desempenho de consultas frequentes e reduzir a carga sobre o banco de dados.

## Frontend

*   **HTML5**: Linguagem de marcação para a estrutura das páginas.
*   **CSS3**: Linguagem de estilização para o design da interface.
*   **JavaScript (Vanilla)**: Utilizado para toda a lógica de frontend, incluindo a manipulação do DOM, chamadas de API (fetch), e construção dinâmica das tabelas e filtros.
*   **Bootstrap 5**: Framework CSS utilizado para a criação de um layout responsivo e para a estilização de componentes como modais, botões e tabelas.
*   **Font Awesome**: Biblioteca de ícones utilizada para melhorar a usabilidade e o apelo visual da interface.

## Ambiente de Desenvolvimento

*   **Nodemon**: Ferramenta que monitora alterações nos arquivos do projeto e reinicia o servidor Node.js automaticamente, agilizando o ciclo de desenvolvimento.