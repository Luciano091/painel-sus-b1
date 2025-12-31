/**
 * Módulo de Ranking e-SUS (Versão Visual: Barra Azul + Legenda de Cores)
 * Atualização: Adicionada legenda de pontuação no rodapé e coloração dinâmica das notas.
 */

const RankingModule = (function() {
    
    let API_URL = '/api/indicadores/ranking-infantil'; // Padrão
    let containerIdAlvo = '';

    function init(containerId, apiUrl) {
        containerIdAlvo = containerId;
        if (apiUrl) API_URL = apiUrl; // Permite sobrescrever a URL
        const container = document.getElementById(containerId);
        if (!container) { console.error(`[Ranking] Container ${containerId} não encontrado.`); return; }
        
        injetarEstilosExclusivos(); // Injeta estilos da tabela, badges e legenda
        
        container.innerHTML = `
            <div class="loading-clean">
                <i class="fas fa-circle-notch fa-spin fa-2x"></i>
                <p style="margin-top:15px;">Calculando Ranking Completo...</p>
            </div>
        `;
        carregarDados();
    }

    function injetarEstilosExclusivos() {
        if (document.getElementById('ranking-badges-css')) return; 

        const style = document.createElement('style');
        style.id = 'ranking-badges-css';
        
        style.textContent = `
            .ranking-wrapper { background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #eee; margin-top: 10px; }
            
            /* --- ESTILO DA TABELA BARRA AZUL --- */
            .tabela-azul { width: 100%; border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; }
            .tabela-azul thead tr { background-color: #005aaa !important; color: #ffffff !important; }
            .tabela-azul thead th { padding: 15px 12px; font-size: 0.85rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; border: none; color: #ffffff !important; }
            .tabela-azul tbody tr { border-bottom: 1px solid #e9ecef; transition: background 0.15s; }
            .tabela-azul tbody tr:hover { background-color: #f1f8ff; }
            .tabela-azul tbody td { padding: 12px; font-size: 0.9rem; color: #333; vertical-align: middle; }
            
            .td-equipe { padding-left: 20px; color: #2c3e50; font-weight: 600; font-size: 0.9rem; text-align: left; }
            .td-center, .th-center { text-align: center; vertical-align: middle; }
            .tabela-azul thead th.th-center { text-align: center; }

            /* Badges Básicos */
            .badge-grey { background: #f1f3f5; color: #5e6c84; padding: 6px 10px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; min-width: 30px; display: inline-block; }
            .badge-pill { background: #e9ecef; color: #495057; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; }

            /* --- BADGES DINÂMICOS (PONTUAÇÃO) --- */
            .badge-score { padding: 8px 16px; border-radius: 12px; font-weight: 700; font-size: 1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: inline-block; }
            
            .score-regular { background: #fff3e0; color: #d35400; }     /* Laranja Escuro */
            .score-suficiente { background: #fcf3cf; color: #b7950b; }  /* Amarelo Escuro */
            .score-bom { background: #eafaf1; color: #27ae60; }         /* Verde */
            .score-otimo { background: #ebf5fb; color: #005aaa; }       /* Azul */

            /* --- LEGENDA NO RODAPÉ --- */
            .legend-wrapper {
                background: #fff;
                border: 1px solid #eee;
                border-radius: 8px;
                padding: 15px 20px;
                margin-top: 15px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .legend-title { font-weight: 600; color: #005aaa; font-size: 0.95rem; display: flex; align-items: center; gap: 8px; }
            .legend-grid { display: flex; gap: 30px; flex-wrap: wrap; }
            .legend-item { display: flex; align-items: center; gap: 10px; }
            .legend-bar { width: 4px; height: 35px; border-radius: 4px; }
            .legend-text { font-size: 0.85rem; line-height: 1.3; color: #555; }
            .legend-text strong { display: block; font-size: 0.9rem; color: #333; }
            
            .bar-regular { background-color: #d35400; }
            .bar-suficiente { background-color: #f1c40f; }
            .bar-bom { background-color: #27ae60; }
            .bar-otimo { background-color: #0000ff; } /* Azul forte conforme imagem */
            
            .loading-clean { text-align: center; padding: 40px; color: #005aaa; }
        `;
        document.head.appendChild(style);
    }

    async function carregarDados() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error("Erro na API de Ranking");
            const dados = await response.json();
            renderizarTabela(dados);
        } catch (error) {
            console.error(error);
            const container = document.getElementById(containerIdAlvo);
            if(container) container.innerHTML = '<div style="padding:20px; color:red; text-align:center;">Erro ao carregar Ranking.</div>';
        }
    }

    function renderizarTabela(dados) {
        const container = document.getElementById(containerIdAlvo);
        dados.sort((a, b) => parseFloat(b.percentual) - parseFloat(a.percentual));
        
        const tooltips = {
            A: "Primeira Consulta até 30º dia",
            B: "Registro de 09 (nove) consultas",
            C: "Registros de 09 (nove) medição de peso e altura",
            D: "Registro de 02 (duas) Visitas de ACS",
            E: "Vacina",
            NM: "Somatório das boas práticas pontuadas",
            DN: "Nº total de crianças vinculadas",
            PONT: "Nota Final"
        };

        let html = `
            <div class="ranking-wrapper">
            <table class="tabela-azul">
                <thead>
                    <tr>
                        <th style="text-align: left; padding-left: 20px;">EQUIPE</th>
                        <th class="th-center" data-bs-toggle="tooltip" title="${tooltips.A}">A <i class="fas fa-info-circle" style="color:rgba(255,255,255,0.6); font-size:0.8em;"></i></th>
                        <th class="th-center" data-bs-toggle="tooltip" title="${tooltips.B}">B <i class="fas fa-info-circle" style="color:rgba(255,255,255,0.6); font-size:0.8em;"></i></th>
                        <th class="th-center" data-bs-toggle="tooltip" title="${tooltips.C}">C <i class="fas fa-info-circle" style="color:rgba(255,255,255,0.6); font-size:0.8em;"></i></th>
                        <th class="th-center" data-bs-toggle="tooltip" title="${tooltips.D}">D <i class="fas fa-info-circle" style="color:rgba(255,255,255,0.6); font-size:0.8em;"></i></th>
                        <th class="th-center" data-bs-toggle="tooltip" title="${tooltips.E}">E <i class="fas fa-info-circle" style="color:rgba(255,255,255,0.6); font-size:0.8em;"></i></th>

                        <th class="th-center" data-bs-toggle="tooltip" title="${tooltips.NM}">NM <i class="fas fa-info-circle" style="color:rgba(255,255,255,0.6); font-size:0.8em;"></i></th>
                        <th class="th-center" data-bs-toggle="tooltip" title="${tooltips.DN}">DN <i class="fas fa-info-circle" style="color:rgba(255,255,255,0.6); font-size:0.8em;"></i></th>
                        <th class="th-center" data-bs-toggle="tooltip" title="${tooltips.PONT}">PONTUAÇÃO</th>
                    </tr>
                </thead>
                <tbody>
        `;

        dados.forEach(item => {
            const pontuacaoNum = parseFloat(item.percentual || 0);
            const pontuacao = pontuacaoNum.toFixed(2);
            const valA = item.a || '0'; const valB = item.b || '0'; const valC = item.c || '0'; const valD = item.d || '0'; const valE = item.e || '0';
            const valNM = item.numerador || item.nm || '0'; const valDN = item.denominador || item.dn || '0';
            
            // Lógica de Cor da Badge baseada nas Regras
            let scoreClass = 'score-regular';
            if (pontuacaoNum > 75) scoreClass = 'score-otimo';
            else if (pontuacaoNum > 50) scoreClass = 'score-bom';
            else if (pontuacaoNum > 25) scoreClass = 'score-suficiente';

            html += `
                <tr>
                    <td class="td-equipe">${item.equipe}</td>
                    <td class="td-center"><span class="badge-grey">${valA}</span></td>
                    <td class="td-center"><span class="badge-grey">${valB}</span></td>
                    <td class="td-center"><span class="badge-grey">${valC}</span></td>
                    <td class="td-center"><span class="badge-grey">${valD}</span></td>
                    <td class="td-center"><span class="badge-grey">${valE}</span></td>
                    <td class="td-center"><span class="badge-pill">${valNM}</span></td>
                    <td class="td-center"><span class="badge-pill">${valDN}</span></td>
                    <td class="td-center"><span class="badge-score ${scoreClass}">${pontuacao}</span></td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        html += `<div style="text-align:right; padding:10px 15px; font-size:12px; color:#888;">* Passe o mouse sobre as letras para ver a regra.</div>`;

        // --- ADIÇÃO DA LEGENDA NO RODAPÉ ---
        html += `
            <div class="legend-wrapper">
                <div class="legend-title"><i class="fas fa-chart-pie"></i> Pontuação</div>
                <div class="legend-grid">
                    <div class="legend-item">
                        <span class="legend-bar bar-regular"></span>
                        <div class="legend-text"><strong>Regular</strong>0 a 25</div>
                    </div>
                    <div class="legend-item">
                        <span class="legend-bar bar-suficiente"></span>
                        <div class="legend-text"><strong>Suficiente</strong>>25 e <=50</div>
                    </div>
                    <div class="legend-item">
                        <span class="legend-bar bar-bom"></span>
                        <div class="legend-text"><strong>Bom</strong>>50 e <=75</div>
                    </div>
                    <div class="legend-item">
                        <span class="legend-bar bar-otimo"></span>
                        <div class="legend-text"><strong>Ótimo</strong>>75 a 100</div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        try {
            var tooltipTriggerList = [].slice.call(container.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) { return new bootstrap.Tooltip(tooltipTriggerEl); });
        } catch (e) { }
    }

    return { init: init };
})();