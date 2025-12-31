async function loadIndicators() {
    try {
        const response = await fetch('/api/dashboard/indicators');
        const data = await response.json();

        // Preenche os cards pelo ID
        if(document.getElementById('val-c1')) document.getElementById('val-c1').innerText = data.c1 + '%';
        if(document.getElementById('val-c2')) document.getElementById('val-c2').innerText = data.c2;
        if(document.getElementById('val-c3')) document.getElementById('val-c3').innerText = data.c3;
        if(document.getElementById('val-c4')) document.getElementById('val-c4').innerText = data.c4 + '%';
        if(document.getElementById('val-c5')) document.getElementById('val-c5').innerText = data.c5;
        if(document.getElementById('val-c6')) document.getElementById('val-c6').innerText = data.c6;
        if(document.getElementById('val-c7')) document.getElementById('val-c7').innerText = data.c7;

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

// Executa ao carregar a página se estiver na home
document.addEventListener('DOMContentLoaded', () => {
    if(document.querySelector('.dashboard-grid')) {
        loadIndicators();
    }
});
