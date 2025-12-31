(function() {
    // 1. Verifica se o token existe
    const token = localStorage.getItem('token');

    // 2. Se não tiver token, manda pro login imediatamente
    if (!token) {
        window.location.href = '/login.html';
    }
})();

// 3. Função Global de Logout (para usar no botão "Sair")
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}