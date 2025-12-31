# Painel e-SUS

## Sobre o Projeto

O Painel e-SUS é uma aplicação web desenvolvida para visualização e monitoramento de dados do sistema e-SUS, o sistema de informação da Atenção Básica do sistema de saúde público brasileiro. Ele serve como um dashboard para gestores e profissionais de saúde acompanharem indicadores, relatórios e outras informações relevantes.

## Tecnologias Utilizadas

A aplicação é construída com as seguintes tecnologias:

*   **Backend:**
    *   **[Node.js](https://nodejs.org/)**: Ambiente de execução JavaScript no servidor.
    *   **[Express.js](https://expressjs.com/)**: Framework para Node.js, utilizado para construir a API RESTful.
*   **Frontend:**
    *   HTML, CSS e JavaScript puros.
*   **Banco de Dados:**
    *   **[PostgreSQL](https://www.postgresql.org/)**: Sistema de gerenciamento de banco de dados relacional.
*   **Autenticação e Autorização:**
    *   **[JSON Web Tokens (JWT)](https://jwt.io/)**: Para criação de sessões de usuário seguras.
    *   **[bcrypt](https://www.npmjs.com/package/bcrypt)**: Para hash de senhas, garantindo que as senhas não sejam armazenadas em texto plano.
*   **Ferramentas de Desenvolvimento:**
    *   **[Nodemon](https://nodemon.io/)**: Para reiniciar o servidor automaticamente durante o desenvolvimento.
    *   **[Dotenv](https://www.npmjs.com/package/dotenv)**: Para gerenciar variáveis de ambiente.

## Segurança

A segurança da aplicação é uma prioridade e é garantida através de várias medidas:

*   **Autenticação baseada em Token:** O acesso a rotas protegidas é controlado por JSON Web Tokens (JWT), que são gerados no login e devem ser enviados em cada requisição.
*   **Hashing de Senhas:** As senhas dos usuários são armazenadas no banco de dados de forma segura usando o algoritmo de hash `bcrypt`. Isso impede que as senhas sejam expostas em caso de acesso não autorizado ao banco de dados.
*   **Controle de Acesso Baseado em Função (RBAC):** A aplicação implementa um sistema de RBAC para garantir que os usuários só possam acessar as funcionalidades e dados permitidos para sua função.
*   **Variáveis de Ambiente:** Informações sensíveis, como credenciais de banco de dados e chaves de JWT, são armazenadas em variáveis de ambiente (`.env`) e não são expostas no código-fonte.
*   **Middleware de Tratamento de Erros:** Um middleware centralizado é usado para capturar e tratar erros, evitando o vazamento de informações detalhadas de erros para o cliente.
