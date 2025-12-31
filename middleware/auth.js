const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    // 1. Pega o token do cabeçalho da requisição
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Se não tiver token, barra na hora (401)
    if (token == null) return res.sendStatus(401);

    // 2. Verifica se a assinatura é válida
    // O SEGREDO ESTÁ AQUI: Usamos a mesma chave 'seu_segredo_super_secreto' do login
    jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_super_secreto', (err, user) => {
        if (err) {
            console.log("❌ Token rejeitado:", err.message);
            return res.sendStatus(403); // Proibido (Token inválido ou expirado)
        }

        // Se passou, anexa o usuário ao pedido e deixa entrar
        req.user = user;
        next();
    });
}

module.exports = authenticateToken;