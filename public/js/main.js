function formatarDataBR(dataISO) {
   if (!dataISO) return '-';
   if (dataISO.includes('/')) return dataISO;
   const data = new Date(dataISO);
   data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
   const dia = String(data.getDate()).padStart(2, '0');
   const mes = String(data.getMonth() + 1).padStart(2, '0');
   const ano = data.getFullYear();
   return `${dia}/${mes}/${ano}`;
}

/**
 * ARQUIVO: public/js/main.js
 * VERSÃO: 6.5 (RANKING GESTANTES - ABA PERCENTUAL)
 * DESCRIÇÃO:
 * 1. Implementa a lógica da aba "Percentual" para Gestantes.
 * 2. Adiciona função 'carregarRankingGestantes' que consome a API /ranking-gestantes.
 * 3. Adiciona função 'construirTabelaRankingGestantes' para renderizar a tabela com colunas A-K + Pontuação,
 * seguindo o estilo visual do indicador infantil.
 */
// *****************************************************************
// ** 1. FUNÇÕES GLOBAIS DE CONSTRUÇÃO & VISUAL **
// *****************************************************************
// Dicionário de descrições das regras do Indicador 1 (Gestantes)
   function getDescricaoRegraGestante(letra) {
       const regras = {
           'A': '1ª Consulta até a 12ª semana (Captação Precoce)',
           'B': 'Mínimo de 6 Consultas (Meta: >= 6)',
           'C': 'Aferição de Pressão Arterial (PA) - Semestral',
           'D': 'Aferição de Peso e Altura - Semestral',
           'E': 'Mínimo de 3 Visitas Domiciliares (ACS)',
           'F': 'Vacina dTpa (A partir da 20ª semana)',
           'G': 'Exames Iniciais (Sífilis e HIV solicitados)',
           'H': 'Exames 3º Trimestre (Sífilis e HIV solicitados)',
           'I': 'Consulta Puerperal (Até 42 dias pós-parto)',
           'J': 'Visita Puerperal (ACS - Até 42 dias pós-parto)',
           'K': 'Atendimento Odontológico (Indicador 3)'
       };
       return regras[letra] || 'Regra do Indicador';
   }

function getDescricaoGestante(letra) {
    const dic = {
        'A': '1ª Consulta até a 12ª semana (Captação Precoce)',
        'B': 'Mínimo de 6 Consultas',
        'C': 'Aferição de Pressão Arterial (PA)',
        'D': 'Aferição de Peso e Altura',
        'E': 'Mínimo de 3 Visitas Domiciliares (ACS)',
        'F': 'Vacina dTpa (após 20ª semana)',
        'G': 'Exames Iniciais (Sífilis/HIV/Hepatites)',
        'H': 'Exames 3º Tri (Sífilis/HIV)',
        'I': 'Consulta Puerperal (Até 42 dias)',
        'J': 'Visita Puerperal (Até 42 dias)',
        'K': 'Atendimento Odontológico'
    };
    return dic[letra] || 'Indicador';
}

// --- CONSTRUTOR DE TABELA AZUL (PARA GESTANTES - LISTA NOMINAL) ---
function construirTabelaAzul(data, columns, container) {
    if (!container) return;
    if (!data || data.length === 0) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#777;"><i class="fas fa-inbox fa-2x"></i><p>Nenhum registro encontrado.</p></div>';
        return;
    }
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.background = '#fff';
    table.style.borderRadius = '8px 8px 0 0';
    table.style.overflow = 'hidden';
    table.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
    
    // Header Azul
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    trHead.style.backgroundColor = '#005aaa';
    trHead.style.color = '#ffffff';
    trHead.style.textAlign = 'left';
    
    columns.forEach(col => {
        const th = document.createElement('th');
        th.style.padding = '15px 12px';
        th.style.fontSize = '0.85rem';
        th.style.textTransform = 'uppercase';
        th.style.fontWeight = '600';
        th.style.border = 'none';
        th.style.textAlign = col.title.length < 3 ? 'center' : 'left';
        
        if (col.tooltip) {
            th.innerHTML = `${col.title} <i class="fas fa-info-circle" data-bs-toggle="tooltip" title="${col.tooltip}" style="font-size:0.8em; opacity:0.7; cursor:help;"></i>`;
        } else {
            th.textContent = col.title;
        }
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);
    
    // Body
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e9ecef';
        tr.style.transition = 'background 0.2s';
        tr.onmouseover = () => tr.style.background = '#f8f9fa';
        tr.onmouseout = () => tr.style.background = '#fff';
        
        columns.forEach(col => {
            const td = document.createElement('td');
            td.style.padding = '12px';
            td.style.fontSize = '0.85rem';
            td.style.color = '#333';
            td.style.textAlign = col.title.length < 3 ? 'center' : 'left';
            
            // --- LÓGICA GENÉRICA (CORREÇÃO AQUI) ---
            // Usa o valor mapeado na coluna (ex: 'Sim', 'Não', '14/01/1968')
            let val = row[col.data];
            const isIndicator = col.title.length === 1 && /[A-K]/.test(col.title);

            if (isIndicator) {
                td.style.textAlign = 'center';
                td.style.fontWeight = 'bold';
                td.setAttribute('data-bs-toggle', 'tooltip');
                
                let content = '';
                let color = '#8898aa'; // Cinza (Neutro/N/A)
                
                // Normaliza para string segura
                const valStr = String(val || '').trim();

                if (valStr === 'Sim') {
                    content = '<i class="fas fa-check"></i>';
                    color = '#15803d'; // Verde
                } else if (valStr === 'Não' || valStr === 'X') {
                    content = '<i class="fas fa-times"></i>';
                    color = '#b91c1c'; // Vermelho
                } else if (valStr.includes('Falta')) {
                    content = valStr; // Ex: Falta (1/3)
                    color = '#c2410c'; // Laranja
                } else {
                    content = valStr || '-';
                }
                
                // Tooltip Genérico
                td.setAttribute('title', `${col.tooltip || ('Regra ' + col.title)}: ${valStr}`);
                td.innerHTML = content;
                td.style.color = color;

            } else {
                td.textContent = (val === null || val === undefined) ? '-' : val;
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
    
    try {
        var tooltipTriggerList = [].slice.call(container.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (el) { return new bootstrap.Tooltip(el); });
    } catch (e) {}
}
// =================================================================
// 2. NOVA TABELA GESTANTES (Colunas A até K com Tooltips Oficiais)
// =================================================================
function construirTabelaRankingGestantes(data, container) {
    if (!container) return;
    container.innerHTML = '';
    if (!data || data.length === 0) {
        container.innerHTML = '<div style="padding:30px; text-align:center; color:#777;">Nenhum dado disponível.</div>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'tabela-ranking';
    table.style.width = '100%';
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    
    const colunas = [
        { title: 'EQUIPE', width: '20%', align: 'left' },
        { title: 'A', tooltip: '1ª consulta (médico/enfermeiro) até a 12ª semana.' },
        { title: 'B', tooltip: 'Mínimo de 07 consultas (médico/enfermeiro) na gestação.' },
        { title: 'C', tooltip: 'Mínimo de 07 aferições de PA na gestação.' },
        { title: 'D', tooltip: 'Mínimo de 07 registros de peso e altura na gestação.' },
        { title: 'E', tooltip: 'Mínimo de 03 visitas domiciliares por ACS/TACS.' },
        { title: 'F', tooltip: 'Vacina dTpa a partir da 20ª semana.' },
        { title: 'G', tooltip: 'Testes rápidos/exames (Síf/HIV/Hep) no 1º trimestre.' },
        { title: 'H', tooltip: 'Testes rápidos/exames (Síf/HIV) no 3º trimestre.' },
        { title: 'I', tooltip: 'Consulta puerperal (médico/enfermeiro) até 42 dias.' },
        { title: 'J', tooltip: 'Visita domiciliar (ACS/TACS) no puerpério.' },
        { title: 'K', tooltip: 'Atendimento odontológico na gestação.' },
        { title: 'NM', tooltip: 'Numerador' },
        { title: 'DN', tooltip: 'Denominador' },
        { title: 'NOTA', tooltip: 'Pontuação Final' }
    ];
    colunas.forEach(col => {
        const th = document.createElement('th');
        if (col.tooltip) {
            th.innerHTML = `${col.title} <i class="fas fa-info-circle" data-bs-toggle="tooltip" title="${col.tooltip}" style="cursor:help; margin-left:2px; opacity:0.8; font-size:0.8em;"></i>`;
        } else {
            th.textContent = col.title;
        }
        if(col.align) th.style.textAlign = col.align;
        if(col.width) th.style.width = col.width;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        
        const addCell = (text, align='center', color='#333', weight='normal', bg='transparent') => {
            const td = document.createElement('td');
            td.textContent = text !== null && text !== undefined ? text : '0';
            td.style.textAlign = align;
            td.style.color = color;
            td.style.fontWeight = weight;
            td.style.backgroundColor = bg;
            tr.appendChild(td);
        };
        addCell(row.equipe, 'left', '#000', '600');
        ['a','b','c','d','e','f','g','h','i','j','k'].forEach(key => addCell(row[key]));
        addCell(row.nm, 'center', '#005aaa', 'bold', '#eef2ff');
        addCell(row.dn, 'center', '#005aaa', 'bold', '#eef2ff');
        
        const nota = parseFloat(row.pontuacao || 0);
        const corNota = nota >= 100 ? '#198754' : (nota < 50 ? '#dc3545' : '#d35400');
        addCell(row.pontuacao || '0.00', 'center', corNota, 'bold', '#f0fdf4');
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
    try {
        var tooltipTriggerList = [].slice.call(container.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (el) { return new bootstrap.Tooltip(el); });
    } catch (e) {}
}
// =================================================================
// NOVA TABELA ESPECÍFICA PARA INFANTIL (Colunas A até E)
// Adicione esta função ao main.js
// =================================================================
// =================================================================
// NOVA TABELA DE RANKING INFANTIL (Colunas A até E)
// =================================================================
// --- CÓDIGO PARA SUBSTITUIÇÃO ---
function construirTabelaRankingInfantil(data, container) {
    if (!container) return;
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = '<div style="padding:30px; text-align:center; color:#777;">Nenhum dado disponível.</div>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'tabela-ranking';
    table.style.width = '100%';

    // Cabeçalho mantendo colunas A, B, C, D, E
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th style="text-align:left;">EQUIPE</th>
            <th style="text-align:center;">A <i class="fas fa-info-circle" title="Indicador A"></i></th>
            <th style="text-align:center;">B <i class="fas fa-info-circle" title="Indicador B"></i></th>
            <th style="text-align:center;">C <i class="fas fa-info-circle" title="Indicador C"></i></th>
            <th style="text-align:center;">D <i class="fas fa-info-circle" title="Indicador D"></i></th>
            <th style="text-align:center;">E <i class="fas fa-info-circle" title="Indicador E"></i></th>
            <th style="text-align:center;">NM <i class="fas fa-info-circle" title="Numerador"></i></th>
            <th style="text-align:center;">DN <i class="fas fa-info-circle" title="Denominador"></i></th>
            <th style="text-align:center;">NOTA <i class="fas fa-info-circle" title="Nota Final"></i></th>
        </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    data.forEach(row => {
        const tr = document.createElement('tr');
        
        const nm = parseFloat(row.nm || 0);
        const dn = parseFloat(row.dn || 0);
        
        // Define a nota
        let nota = row.pontuacao !== undefined ? parseFloat(row.pontuacao) : (row.percentual !== undefined ? parseFloat(row.percentual) : 0);

        // --- REGRA DE CORES APLICADA ---
        let corTexto = '#e65100'; 
        let corFundo = '#fff3e0';
        
        if (nota > 75) {
            corTexto = '#4a148c'; // Roxo (Ótimo)
            corFundo = '#f3e5f5';
        } else if (nota > 50) {
            corTexto = '#2e7d32'; // Verde (Bom)
            corFundo = '#e8f5e9';
        } else if (nota > 25) {
            corTexto = '#fbc02d'; // Amarelo (Suficiente)
            corFundo = '#fffde7';
        } else {
            corTexto = '#e65100'; // Laranja (Regular)
            corFundo = '#fff3e0';
        }

        // Helper para células simples
        const td = (val) => `<td style="text-align:center; color:#555;">${val || 0}</td>`;

        tr.innerHTML = `
            <td style="text-align:left; color:#000;">${row.equipe || row.no_equipe || 'Sem Equipe'}</td>
            ${td(row.a)}
            ${td(row.b)}
            ${td(row.c)}
            ${td(row.d)}
            ${td(row.e)}
            <td style="text-align:center; font-weight:bold; color:#005aaa;">${nm}</td>
            <td style="text-align:center; font-weight:bold; color:#005aaa;">${dn}</td>
            <td style="text-align:center;">
                <span style="display:inline-block; padding:4px 12px; border-radius:15px; font-weight:bold; color:${corTexto}; background-color:${corFundo};">
                    ${nota.toFixed(2)}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}
// =================================================================
// 1. ATUALIZAÇÃO DA FUNÇÃO DE TABELA (Suporte a Tooltips Dinâmicos)
// =================================================================
// =================================================================
// FUNÇÃO CONSTRUTORA DE TABELA GENÉRICA (Visual Azul no Cabeçalho)
// Substitua a função 'construirTabela' existente por esta versão:
// =================================================================
// =================================================================
// 1. TABELA COM CABEÇALHO AZUL (Forçado)
// Substitua a função 'construirTabela' atual por esta:
// =================================================================
// =================================================================
// FUNÇÃO CONSTRUTORA DE TABELA (Alinhamento Corrigido: Nome à Esquerda)
// Substitua a função 'construirTabela' existente por esta versão:
// ================================================================= ================ 
function construirTabela(data, columns, container) {
    if (!container) return;
    container.innerHTML = '';
    if (!data || data.length === 0) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#777;"><i class="fas fa-inbox fa-2x"></i><p>Nenhum registro encontrado.</p></div>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'table table-hover align-middle mb-0'; 
    table.style.width = '100%';
    table.style.fontSize = '0.9rem';
    table.style.borderCollapse = 'separate'; 
    table.style.borderSpacing = '0';
    // Cabeçalho
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    
    // Configuração da Barra Azul
    const azulSus = '#005aaa';
    
    columns.forEach((col, index) => {
        const th = document.createElement('th');
        th.style.backgroundColor = azulSus;
        th.style.color = '#ffffff';
        th.style.fontWeight = '600';
        th.style.padding = '12px 15px';
        th.style.borderBottom = 'none';
        th.style.whiteSpace = 'nowrap';
        th.style.verticalAlign = 'middle';
        // Arredondamento dos cantos
        if (index === 0) th.style.borderRadius = '8px 0 0 0';
        if (index === columns.length - 1) th.style.borderRadius = '0 8px 0 0';
        // Conteúdo + Tooltip
        if (col.tooltip) {
            th.innerHTML = `${col.title} <i class="fas fa-info-circle" data-bs-toggle="tooltip" title="${col.tooltip}" style="cursor:help; margin-left:5px; color: #fff; opacity: 0.8;"></i>`;
        } else {
            th.textContent = col.title;
        }
        
        // LÓGICA DE ALINHAMENTO (CABEÇALHO)
        // Se o título tiver 3 letras ou menos (ex: CPF, CNS, NM, DN, A, B), centraliza.
        // Se for maior (ex: NOME, NASCIMENTO), alinha à esquerda.
        if (col.title.length <= 3) {
            th.style.textAlign = 'center';
        } else {
            th.style.textAlign = 'left';
        }
        
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);
    // Corpo
    const tbody = document.createElement('tbody');
    data.forEach((rowData, rowIndex) => {
        const tr = document.createElement('tr');
        if (rowIndex % 2 !== 0) tr.style.backgroundColor = '#f8f9fa';
        columns.forEach(col => {
            const td = document.createElement('td');
            td.style.padding = '12px 15px';
            td.style.borderBottom = '1px solid #e9ecef';
            
            let valor = rowData[col.data];
            if (valor === null || valor === undefined || valor === '') {
                valor = '<span class="text-muted small">---</span>';
            }
            // LÓGICA DE ALINHAMENTO (CORPO)
            // Segue a mesma regra do cabeçalho para manter a coluna alinhada
            if (col.title.length <= 3) {
                td.style.textAlign = 'center';
                td.style.fontWeight = 'bold'; // Destaca números/siglas
            } else {
                td.style.textAlign = 'left';
                td.style.fontWeight = 'normal'; // Texto normal para nomes
            }
            td.innerHTML = valor;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'table-responsive shadow-sm';
    wrapper.style.borderRadius = '8px';
    wrapper.style.border = '1px solid #e9ecef';
    wrapper.style.backgroundColor = '#fff';
    wrapper.appendChild(table);
    container.appendChild(wrapper);
    // Tooltips
    try {
        var tooltipTriggerList = [].slice.call(container.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) { return new bootstrap.Tooltip(tooltipTriggerEl); });
    } catch (e) {}
}
// *****************************************************************
// ** 2. FUNÇÕES DE EXPORTAÇÃO **
// *****************************************************************
function baixarCSV(dados, colunas, nomeArquivo) {
    if (!dados || !dados.length) { alert('Sem dados para exportar.'); return; }
    let csv = "\ufeff" + colunas.map(c => c.title).join(";") + "\n";
    dados.forEach(row => {
        csv += colunas.map(c => {
            let val = row[c.data];
            val = (val === null || val === undefined) ? "" : String(val).replace(/(\r\n|\n|\r)/gm, " ");
            return `"${val.replace(/"/g, '""')}"`; 
        }).join(";") + "\n";
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8;"}));
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function baixarRelatorioCompleto(tipoIndicador, idSufixo, colunas, nomeArquivo) {
    const btn = document.getElementById(`btn-export-${idSufixo}`);
    const textoOriginal = btn ? btn.innerHTML : '';
    if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Baixando...'; }

    try {
        const eq = document.getElementById(`filtro-equipe-${idSufixo}`)?.value || '';
        const micro = document.getElementById(`filtro-microarea-${idSufixo}`)?.value || '';
        const idDrop = idSufixo === 'mais-acesso' ? 'c1' : idSufixo;
        const checks = document.querySelectorAll(`#dropdown-options-${idDrop} input:checked`);
        const comp = Array.from(checks).map(c => c.value).join(',');

        const params = new URLSearchParams({ equipe: eq, microarea: micro, competencia: comp, exportar: 'true', limit: 1000000 });
        const res = await fetch(`/api/indicadores/${tipoIndicador}?${params}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        if(!res.ok) throw new Error('Erro na API');
        const json = await res.json();
        baixarCSV(json.data, colunas, nomeArquivo);
    } catch (e) { console.error(e); alert('Erro: ' + e.message); } 
    finally { if(btn) { btn.disabled = false; btn.innerHTML = textoOriginal; } }
}
// *****************************************************************
// ** 3. BLOCO PRINCIPAL (DOM LOADED) **
// *****************************************************************
// =================================================================
// 1. INICIALIZAÇÃO E SEGURANÇA (Com Logout Funcional)
// Substitua o bloco 'document.addEventListener' inicial por este:
// =================================================================
function configurarLogout() {
    // 1. Tenta achar o botão pelo texto "Sair" na sidebar (método mais garantido)
    const botoesSidebar = document.querySelectorAll('#sidebar button, #sidebar a');
    botoesSidebar.forEach(btn => {
        if (btn.innerText.includes('Sair')) {
            btn.style.cursor = 'pointer';
            btn.onclick = (e) => {
                e.preventDefault(); // Evita navegação padrão se for link
                executarLogout();
            };
        }
    });
    // 2. Garante a função global acessível
    window.logout = executarLogout;
}
function executarLogout() {
    if(confirm('Tem certeza que deseja sair do sistema?')) { 
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.clear(); // Limpa tudo por garantia
        window.location.href = '/login.html'; 
    }
}
// =================================================================
// EXIBIÇÃO DO USUÁRIO NO HEADER
// Adicione esta função para mostrar "Olá, Nome" no topo direito
// =================================================================
// =================================================================
// EXIBIÇÃO DO USUÁRIO NO HEADER (Correção de Renderização)
// Substitua a função 'setupHeader' existente por esta:
// =================================================================
function setupHeader() {
    // 1. Recupera dados do usuário
    let user = {};
    try { 
        user = JSON.parse(localStorage.getItem('user') || '{}'); 
    } catch (e) { console.error('Erro ao ler usuário', e); }
    
    const nome = user.nome ? user.nome.split(' ')[0] : 'Usuário';
    // 2. Tenta encontrar o elemento Header
    const header = document.querySelector('header') || 
                   document.querySelector('.main-header') || 
                   document.querySelector('.navbar');
    // 3. Remove elemento antigo se existir
    const oldInfo = document.getElementById('user-info-display');
    if (oldInfo) oldInfo.remove();
    // 4. Cria o container principal
    const userInfo = document.createElement('div');
    userInfo.id = 'user-info-display';
    
    // Estilo do Container
    userInfo.style.cssText = `
        position: absolute;
        top: 15px;
        right: 30px;
        font-weight: bold;
        color: #005aaa; 
        cursor: pointer;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255,255,255,0.95);
        padding: 6px 16px;
        border-radius: 20px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        border: 1px solid #e9ecef;
        transition: transform 0.2s;
    `;
    // 5. CRIAÇÃO DOS ELEMENTOS INTERNOS (Seguro contra erro de texto bruto)
    // Ícone de Usuário
    const icon = document.createElement('i');
    icon.className = 'fas fa-user-circle fa-lg';
    
    // Texto de Saudação
    const textSpan = document.createElement('span');
    textSpan.textContent = `Olá, ${nome}`; // Insere apenas o texto limpo
    // Monta o componente
    userInfo.appendChild(icon);
    userInfo.appendChild(textSpan);
    
    // Efeito Hover
    userInfo.onmouseover = () => userInfo.style.transform = 'scale(1.02)';
    userInfo.onmouseout = () => userInfo.style.transform = 'scale(1)';
    // Ação de Logout
    userInfo.onclick = function() {
        if (typeof executarLogout === 'function') executarLogout();
        else if (window.logout) window.logout();
    };
    // 6. Injeta na página
    if (header) {
        const headerPosition = window.getComputedStyle(header).position;
        if (headerPosition === 'static') header.style.position = 'relative';
        header.appendChild(userInfo);
    } else {
        userInfo.style.position = 'fixed';
        document.body.appendChild(userInfo);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sistema Iniciado');

    
    // Verifica Token
    const token = localStorage.getItem('token');
    const isLogin = window.location.pathname.includes('login.html');
    if (!token && !isLogin) {
        window.location.href = '/login.html';
        return;
    }
    if (isLogin) return;
        setupHeader();
        setupPrivacyPolicy();
                configurarLogout(); // Nova função dedicada ao Logout
                setupDashboardC1();
           
    garantirEstilosAbas();
    // --- Seletores Globais ---
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const pageTitle = document.getElementById('page-title');
    const pageDescription = document.getElementById('page-description');
    const filtrosContainer = document.getElementById('filtros-container-global');
    const tabelaContainer = document.getElementById('tabela-container-global');
    const paginacaoContainer = document.getElementById('paginacao-controles-global');
    // --- Lógica da Sidebar ---
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            const linkClicado = e.target.closest('.menu-link, .submenu-link');
            if (linkClicado) {
                e.preventDefault();
                const parentLi = linkClicado.parentElement;
                if (!parentLi.classList.contains('has-submenu')) return;
                const irmaos = parentLi.parentElement.children;
                for (let irmao of irmaos) {
                    if (irmao !== parentLi && irmao.classList.contains('active')) irmao.classList.remove('active');
                }
                parentLi.classList.toggle('active');
            }
            if (e.target.closest('.sidebar-link') && window.innerWidth <= 992) document.body.classList.remove('sidebar-visible');
        });
    }
    if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', () => document.body.classList.toggle('sidebar-visible'));
    if (mainContent) mainContent.addEventListener('click', () => { if (document.body.classList.contains('sidebar-visible')) document.body.classList.remove('sidebar-visible'); });
    // --- Lógica Principal de Carregamento de Dados ---
    let filtrosAtuais = {};
    let linkAtivo = null;
    const linksDeDados = document.querySelectorAll('.sidebar-link');
    linksDeDados.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if(linkAtivo) linkAtivo.classList.remove('active');
            linkAtivo = link;
            linkAtivo.classList.add('active');
            const config = {
                api: link.dataset.api,
                tipo: link.dataset.tipo,
                titulo: link.dataset.titulo,
                descricao: link.dataset.descricao
            };
            filtrosAtuais = {};
            if(pageTitle) pageTitle.textContent = config.titulo;
            if(pageDescription) pageDescription.textContent = config.descricao;
           
            if(filtrosContainer) {
                filtrosContainer.innerHTML = '';
                filtrosContainer.classList.add('hidden');
                filtrosContainer.style.display = '';
            }
            // Roteador de Layouts (Versão Corrigida)
            // Normaliza o texto para minúsculo e remove acentos para evitar erros
            const tipoNormalizado = config.tipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (tipoNormalizado.includes('hipertensao') || tipoNormalizado === 'c5') {
                carregarLayoutHipertensao();
            }
            else if (tipoNormalizado.includes('diabetes') || tipoNormalizado === 'c4') {
                carregarLayoutDiabetes();
            }
            else if (tipoNormalizado.includes('gestante') || tipoNormalizado === 'c3') {
                carregarLayoutGestantes();
            }
            else if (tipoNormalizado.includes('infantil') || tipoNormalizado === 'c2') {
                carregarLayoutInfantil();
            }
            else if (tipoNormalizado.includes('acesso') || tipoNormalizado === 'c1') {
                carregarLayoutMaisAcesso();
            }
            // AQUI ESTÁ A CORREÇÃO PRINCIPAL PARA O IDOSO
            else if (tipoNormalizado.includes('idoso') || tipoNormalizado === 'c6') {
                carregarLayoutIdoso();
            }
            else if (tipoNormalizado.includes('mulher') || tipoNormalizado === 'c7') {
                carregarLayoutMulher();
            }
            else if (tipoNormalizado.includes('b1') || tipoNormalizado === 'b1') {
                carregarLayoutB1();
            }
            else {
                console.warn('Rota genérica acionada para:', config.tipo);
                // Evita chamar buscarDadosPaginados se não tiver certeza da rota, para não dar 401
            }
        });
    });
    // --- Funções Genéricas de Carregamento ---
    async function buscarDadosPaginados(api, pagina = 1, filtros = {}) {
        mostrarCarregando();
        const params = new URLSearchParams(filtrosAtuais); // Usa os filtros atuais
        params.append('pagina', pagina); // Adiciona a página
       
        try {
            const response = await fetch(`/api/${api}?${params.toString()}`); // Usa a API correta
            if (!response.ok) throw new Error('Erro na API');
            const resultado = await response.json();
            construirTabela(resultado.data, resultado.columns, tabelaContainer);
            construirPaginacao(api, resultado.pagination, filtros);
        } catch (error) {
            console.error(error);
            if(tabelaContainer) tabelaContainer.innerHTML = '<p class="erro">Erro ao carregar dados.</p>';
        }
    }
    function mostrarCarregando() {
        const container = document.getElementById('container-lista-infantil') || tabelaContainer;
        if(container) container.innerHTML = '<p class="carregando">Carregando dados...</p>';
        if(paginacaoContainer) paginacaoContainer.innerHTML = '';
    }
    // =================================================================
    // FUNÇÃO GLOBAL DE PAGINAÇÃO (ESTILO PADRONIZADO AZUL)
    // Substitua a função 'construirPaginacao' existente por esta:
    // =================================================================
    
    // =================================================================
    
    // 2. PAGINAÇÃO COM BOTÕES AZUIS
    
    // Substitua a função 'construirPaginacao' atual por esta:
    
    // =================================================================
    
    // As funções construirPaginacao e navegarPagina foram movidas para o escopo global (`window.`)
    // e unificadas para evitar duplicação. Este bloco foi removido para evitar conflitos.
    // =================================================================
    // --- FUNÇÕES GESTANTES (ATUALIZADAS PARA V.6.5) ---
    // =================================================================
// 1. LAYOUT GESTANTES (Limpo e Padronizado)
// =================================================================
// C3
function carregarLayoutGestantes() {
    injetarEstilosMultiselect();
    const container = document.getElementById('filtros-container-global');
    const tabelaContainer = document.getElementById('tabela-container-global');
    if(!container || !tabelaContainer) return;
    
    const cols = [
        {data:'no_cidadao',title:'NOME'}, {data:'dum',title:'DUM'}, {data:'ig',title:'IG'},
        {data:'ind_1_a',title:'A'}, {data:'ind_1_b',title:'B'}, {data:'ind_1_c',title:'C'},
        {data:'ind_1_d',title:'D'}, {data:'ind_1_e',title:'E'}, {data:'ind_1_f',title:'F'},
        {data:'ind_1_g',title:'G'}, {data:'ind_1_h',title:'H'}, {data:'ind_1_i',title:'I'},
        {data:'ind_1_j',title:'J'}, {data:'ind_3',title:'K'}
    ];
    const callExport = `baixarRelatorioCompleto('gestantes', 'gestantes', ${JSON.stringify(cols).replace(/"/g, "'")}, 'C3_Gestantes.csv')`;

    container.style.display = 'flex';
    container.innerHTML = `<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; width:100%;"><select id="filtro-equipe-gestantes" class="filtro-select"><option value="">Todas as Equipes</option></select><select id="filtro-microarea-gestantes" class="filtro-select"><option value="">Todas as Microáreas</option></select>${typeof gerarHtmlMultiselect === 'function' ? gerarHtmlMultiselect('gestantes') : ''}<button onclick="carregarDadosTelaGestantes(1)" class="btn-buscar-filtros" style="background-color:#005aaa; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; height:38px;"><i class="fas fa-search"></i> Buscar</button></div>`;

    tabelaContainer.innerHTML = `
        <nav class="tab-nav"><button class="tab-btn active" data-tab="gestantes-lista">Lista Nominal</button><button class="tab-btn" data-tab="gestantes-percentual">Percentual</button></nav>
        <div class="tab-content-wrapper">
            <div id="tab-content-gestantes-lista" class="tab-content active">
                <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
                    <button id="btn-export-gestantes" onclick="${callExport}" style="background-color:#2e7d32; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-file-csv"></i> Exportar CSV</button>
                </div>
                <div id="container-lista-gestantes"><div class="loading-clean">Selecione os filtros.</div></div>
                <div id="paginacao-gestantes"></div>
            </div>
            <div id="tab-content-gestantes-percentual" class="tab-content">
                <div id="container-ranking-gestantes"></div>
                <div id="legenda-gestantes" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                     <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                         <div style="flex: 1; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                            <h5>Pontuação</h5>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 0.8rem;">
                                <div style="border-left: 4px solid #e65100; padding-left: 5px;">Regular<br><b>0 a 25</b></div>
                                <div style="border-left: 4px solid #fbc02d; padding-left: 5px;">Suficiente<br><b>>25 a 50</b></div>
                                <div style="border-left: 4px solid #2e7d32; padding-left: 5px;">Bom<br><b>>50 a 75</b></div>
                                <div style="border-left: 4px solid #4a148c; padding-left: 5px;">Ótimo<br><b>>75 a 100</b></div>
                            </div>
                        </div>
                        <div style="flex: 1; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                            <p><span style="background:#5e35b1; color:white; padding:2px;">NM</span> Boas práticas</p>
                            <p><span style="background:#005aaa; color:white; padding:2px;">DN</span> Total gestantes</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    if(typeof configurarAbas === 'function') configurarAbas(tabelaContainer, 'gestantes', carregarRankingGestantes);
    if(typeof preencherFiltroEquipes === 'function') preencherFiltroEquipes('filtro-equipe-gestantes', 'filtro-microarea-gestantes');
    const selectEquipe = document.getElementById('filtro-equipe-gestantes');
    if (selectEquipe) { selectEquipe.addEventListener('change', (e) => { if(typeof preencherFiltroMicroareas === 'function') preencherFiltroMicroareas(e.target.value, 'filtro-microarea-gestantes'); }); }
}
    function carregarRankingGestantes() {
    const container = document.getElementById('container-ranking-gestantes');
    if(!container) return;
    
    container.innerHTML = `
        <div style="text-align:center; padding:40px;">
            <div class="spinner-border text-primary" role="status"><span class="visually-hidden">...</span></div>
            <p style="margin-top: 10px; color: #666;">Calculando indicadores C3...</p>
        </div>
    `;
    garantirEstilosAbas();
    const token = localStorage.getItem('token');
    fetch('/api/indicadores/ranking-gestantes', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.status === 401) { window.location.href = '/login.html'; return; }
        if (!res.ok) throw new Error('Erro na API');
        return res.json();
    })
    .then(data => {
        // Mapeamento: Backend 'percentual' -> Frontend 'pontuacao'
        const dadosFormatados = data.map(row => ({
            ...row, // Mantém A, B, C... originais
            pontuacao: row.percentual // Garante que a nota apareça
        }));
        construirTabelaRankingGestantes(dadosFormatados, container);
    })
    .catch(err => {
        container.innerHTML = `<div class="alert alert-danger">Erro: ${err.message}</div>`;
    });
}
    // =================================================================
// 4. LISTA NOMINAL GESTANTES (Com Exportação Completa)
// =================================================================
// --- BUSCA C3: GESTANTES ---
function carregarDadosTelaGestantes(pagina = 1) {
    const container = document.getElementById('container-lista-gestantes');
    const paginacao = document.getElementById('paginacao-gestantes');
    if(container) container.innerHTML = '<div style="text-align:center; padding:30px;"><div class="spinner-border text-primary"></div><p>Buscando...</p></div>';
    if(paginacao) paginacao.innerHTML = '';

    const equipe = document.getElementById('filtro-equipe-gestantes')?.value || '';
    const microarea = document.getElementById('filtro-microarea-gestantes')?.value || '';

    let competencia = '';
    const checks = document.querySelectorAll('#dropdown-options-gestantes input:checked');
    if (checks.length > 0) competencia = Array.from(checks).map(c => c.value).join(',');

    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ equipe, microarea, competencia, pagina });

    fetch(`/api/indicadores/gestantes?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(res => {
        if(!container) return;
        container.innerHTML = '';
        if (!res.data || res.data.length === 0) { container.innerHTML = '<div style="padding:40px; text-align:center;">Nenhum registro.</div>'; return; }

        const colunas = [
            { data: 'no_cidadao', title: 'GESTANTE', width: '30%' }, 
            { data: 'dum', title: 'DUM' }, 
            { data: 'ig', title: 'IG' },
            { data: 'ind_1_a', title: 'A', tooltip: '1ª Consulta (até 12ª semana)' }, 
            { data: 'ind_1_b', title: 'B', tooltip: 'Mínimo de 6 Consultas' }, 
            { data: 'ind_1_c', title: 'C', tooltip: 'Aferição de PA' }, 
            { data: 'ind_1_d', title: 'D', tooltip: 'Peso e Altura' }, 
            { data: 'ind_1_e', title: 'E', tooltip: 'Visitas ACS (Min 3)' }, 
            { data: 'ind_1_f', title: 'F', tooltip: 'Vacina dTpa (após 20ª sem)' }, 
            { data: 'ind_1_g', title: 'G', tooltip: 'Exames Iniciais (Sífilis/HIV)' }, 
            { data: 'ind_1_h', title: 'H', tooltip: 'Exames 3º Tri (Sífilis/HIV)' },
            { data: 'ind_1_i', title: 'I', tooltip: 'Consulta Puerpério' }, 
            { data: 'ind_1_j', title: 'J', tooltip: 'Visita Puerpério' }, 
            { data: 'ind_3',   title: 'K', tooltip: 'Atendimento Odontológico' }
        ];
        
        if(typeof construirTabelaAzul === 'function') construirTabelaAzul(res.data, colunas, container);
        if(typeof construirPaginacao === 'function') construirPaginacao('indicadores/gestantes', res.pagination, { equipe, microarea, competencia }, paginacao);
    });
}
    // =================================================================
    // 2. MÓDULO MAIS ACESSO (Abas + Lista Nominal Configuradas)
    // =================================================================
    
// C1
function carregarLayoutMaisAcesso() {
    injetarEstilosMultiselect();
    const container = document.getElementById('filtros-container-global');
    const tabelaContainer = document.getElementById('tabela-container-global');
    if(!container || !tabelaContainer) return;
    
    const cols = [
        {data:'no_cidadao', title:'NOME'}, {data:'dt_nascimento', title:'NASCIMENTO'},
        {data:'nu_cpf', title:'CPF'}, {data:'nu_cns', title:'CNS'},
        {data:'atendimentos_programados', title:'NM (Programado)'}, {data:'total_atendimentos', title:'DN (Total)'}
    ];
    const callExport = `baixarRelatorioCompleto('mais-acesso', 'mais-acesso', ${JSON.stringify(cols).replace(/"/g, "'")}, 'C1_MaisAcesso.csv')`;

    container.style.display = 'flex';
    container.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; width:100%;">
            <select id="filtro-equipe-mais-acesso" class="filtro-select"><option value="">Todas as Equipes</option></select>
            <select id="filtro-microarea-mais-acesso" class="filtro-select"><option value="">Todas as Microáreas</option></select>
            ${typeof gerarHtmlMultiselect === 'function' ? gerarHtmlMultiselect('c1') : ''} 
            <button class="btn-buscar-filtros" onclick="carregarDadosTelaMaisAcesso(1)" style="background-color:#005aaa; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; height:38px;"><i class="fas fa-search"></i> Buscar</button>
        </div>`;

    tabelaContainer.innerHTML = `
        <nav class="tab-nav"><button class="tab-btn active" data-tab="mais-acesso-lista">Lista Nominal</button><button class="tab-btn" data-tab="mais-acesso-percentual">Percentual</button></nav>
        <div class="tab-content-wrapper">
            <div id="tab-content-mais-acesso-lista" class="tab-content active">
                <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
                    <button id="btn-export-mais-acesso" onclick="${callExport}" style="background-color:#2e7d32; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-file-csv"></i> Exportar CSV</button>
                </div>
                <div id="container-dados-mais-acesso"><div class="loading-clean"><i class="fas fa-chevron-up"></i> Selecione os filtros.</div></div>
                <div id="paginacao-mais-acesso" style="margin-top:20px; display:flex; justify-content:center; gap:10px;"></div>
            </div>
            <div id="tab-content-mais-acesso-percentual" class="tab-content">
                <div id="container-ranking-mais-acesso" style="padding:20px;"></div>
                <div id="legenda-mais-acesso" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div style="flex: 1; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background: #fff;">
                            <h5 style="color: #5e35b1; margin-bottom: 20px;">Pontuação</h5>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 15px; font-size: 0.8rem;">
                                <div style="border-left: 4px solid #e65100; padding-left: 10px;">Regular<br><b>< 10 ou > 70</b></div>
                                <div style="border-left: 4px solid #fbc02d; padding-left: 10px;">Suficiente<br><b>> 10 e <= 30</b></div>
                                <div style="border-left: 4px solid #2e7d32; padding-left: 10px;">Bom<br><b>> 30 e <= 50</b></div>
                                <div style="border-left: 4px solid #4a148c; padding-left: 10px;">Ótimo<br><b>> 50 e <= 70</b></div>
                            </div>
                        </div>
                         <div style="flex: 1; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background: #fff;">
                            <p><span style="background:#5e35b1; color:white; padding:2px;">NM</span> Demanda Programada</p>
                            <p><span style="background:#005aaa; color:white; padding:2px;">DN</span> Total de Demandas</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    
    if(typeof configurarAbas === 'function') configurarAbas(tabelaContainer, 'mais-acesso', carregarRankingMaisAcesso);
    if(typeof preencherFiltroEquipes === 'function') preencherFiltroEquipes('filtro-equipe-mais-acesso', 'filtro-microarea-mais-acesso');
    const selectEquipe = document.getElementById('filtro-equipe-mais-acesso');
    if (selectEquipe) { selectEquipe.addEventListener('change', (e) => { if(typeof preencherFiltroMicroareas === 'function') preencherFiltroMicroareas(e.target.value, 'filtro-microarea-mais-acesso'); }); }
}

function toggleCheckboxC1(event, div) {
    // CORREÇÃO DE BUG: 
    // Se o usuário clicou direto na "caixinha" (INPUT), o navegador já altera o estado sozinho.
    // Se clicou no texto (DIV), nós alteramos manualmente.
    
    if (event.target.tagName === 'INPUT') {
        // Apenas atualiza o contador de texto, pois o check já ocorreu nativamente
        atualizarTextoC1();
        return; 
    }

    // Se clicou fora da caixinha (no texto), fazemos a troca manual
    const checkbox = div.querySelector('input');
    checkbox.checked = !checkbox.checked;
    atualizarTextoC1();
}

function atualizarTextoC1() {
    const checks = document.querySelectorAll('#dropdown-options-c1 input:checked');
    const display = document.getElementById('display-texto-c1');
    if(!display) return;

    if(checks.length === 0) display.innerText = "Selecione os Meses...";
    else if(checks.length === 1) display.innerText = "1 Mês selecionado";
    else display.innerText = `${checks.length} Meses selecionados`;
}
    
    
    function adicionarListenersMaisAcesso() {
        // Botão Buscar
        const btnBuscar = document.getElementById('btn-buscar-mais-acesso');
        if(btnBuscar) btnBuscar.addEventListener('click', () => carregarDadosTelaMaisAcesso(1));
    
        // Filtro Dinâmico
        const filtroEquipe = document.getElementById('filtro-equipe-mais-acesso');
        if(filtroEquipe) filtroEquipe.addEventListener('change', (e) => preencherFiltroMicroareas(e.target.value, 'filtro-microarea-mais-acesso'));
    
        // Navegação entre Abas
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        const filtros = document.getElementById('filtros-container-global');
    
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                
                // Controle visual da aba ativa
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(`tab-content-${tabId}`).classList.add('active');
    
                // Controle de funcionalidade
                if (tabId === 'mais-acesso-percentual') {
                    if(filtros) filtros.style.display = 'none'; // Ranking geralmente mostra todas as equipes
                    carregarRankingMaisAcesso();
                } else {
                    if(filtros) filtros.style.display = 'flex'; // Lista nominal precisa de filtros
                }
            });
        });
    }
    
    // =================================================================
// CARREGAR DADOS MAIS ACESSO (Com Exportação Completa)
// =================================================================
window.carregarDadosTelaMaisAcesso = function(pagina = 1) {
    const container = document.getElementById('container-dados-mais-acesso');
    const paginacao = document.getElementById('paginacao-mais-acesso');
    
    if(container) container.innerHTML = '<div style="text-align:center; padding:30px;"><div class="spinner-border text-primary"></div><p>Buscando dados...</p></div>';
    if(paginacao) paginacao.innerHTML = '';

    const equipe = document.getElementById('filtro-equipe-mais-acesso')?.value || '';
    const microarea = document.getElementById('filtro-microarea-mais-acesso')?.value || '';
    
    let competencia = '';
    const checks = document.querySelectorAll('#dropdown-options-c1 input:checked');
    if (checks.length > 0) competencia = Array.from(checks).map(c => c.value).join(',');

    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ equipe, microarea, competencia, pagina });

    fetch(`/api/indicadores/mais-acesso?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(res => {
        if(!container) return;
        container.innerHTML = ''; 
        if (!res.data || res.data.length === 0) {
            container.innerHTML = '<div style="padding:40px; text-align:center;">Nenhum registro encontrado.</div>';
            return;
        }

        const colunas = [
            { data: 'no_cidadao', title: 'NOME' },
            { data: 'dt_nascimento', title: 'NASCIMENTO' },
            { data: 'nu_cpf', title: 'CPF' },
            { data: 'nu_cns', title: 'CNS' },
            { data: 'atendimentos_programados', title: 'NM', tooltip: 'Consultas Agendadas' },
            { data: 'total_atendimentos', title: 'DN', tooltip: 'Total de Atendimentos' }
        ];

        // Usa a tabela genérica ou azul se disponível
        if(typeof construirTabelaAzul === 'function') construirTabelaAzul(res.data, colunas, container);
        else if(typeof construirTabela === 'function') construirTabela(res.data, colunas, container);
        
        // Constrói paginação passando o nome da rota correta
        if(typeof construirPaginacao === 'function') construirPaginacao('indicadores/mais-acesso', res.pagination, { equipe, microarea, competencia }, paginacao);
    });
};
    
    function carregarRankingMaisAcesso() {
    const container = document.getElementById('container-ranking-mais-acesso');
    if(!container) return;
    
    container.innerHTML = '<div style="text-align:center; padding:30px;"><div class="spinner-border text-primary" role="status"></div><p>Calculando Percentuais...</p></div>';
    const token = localStorage.getItem('token');
    
    fetch('/api/indicadores/ranking-mais-acesso', {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (res.status === 401 || res.status === 403) {
            localStorage.clear();
            window.location.href = '/login.html';
            throw new Error('Sessão expirada');
        }
        return res.json();
    })
    .then(data => {
        // Chama a nova função de construção de tabela específica para o C1
        construirTabelaRankingMaisAcesso(data, container);
    })
    .catch(err => {
        console.error(err);
        if (err.message !== 'Sessão expirada') {
            container.innerHTML = `<div class="alert alert-danger">Erro ao carregar ranking: ${err.message}</div>`;
        }
    });
}

function construirTabelaRankingMaisAcesso(data, container) {
    if (!container) return;
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = '<div style="padding:30px; text-align:center; color:#777;">Nenhum dado disponível.</div>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'tabela-ranking';
    table.style.width = '100%';

    // Cabeçalho
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th style="text-align:left; width: 40%;">EQUIPE</th>
            <th style="text-align:center;">NM <i class="fas fa-info-circle" title="Demanda Programada"></i></th>
            <th style="text-align:center;">DN <i class="fas fa-info-circle" title="Total de Atendimentos"></i></th>
            <th style="text-align:center;">RESULTADO <i class="fas fa-info-circle" title="Percentual de Acesso"></i></th>
        </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    data.forEach(row => {
        const tr = document.createElement('tr');
        
        // Garante números
        const nm = parseInt(row.nm || 0);
        const dn = parseInt(row.dn || 0);
        
        // Cálculo percentual seguro
        let percentual = 0;
        if(dn > 0) percentual = (nm / dn) * 100;

        // --- LÓGICA DE CORES CONFORME NOTA TÉCNICA C1 ---
        let cor = '#e65100'; // Regular (Laranja/Vermelho) - Padrão
        let label = 'Regular';
        
        if (percentual > 50 && percentual <= 70) {
            cor = '#4a148c'; // Roxo (Ótimo)
            label = 'Ótimo';
        } else if (percentual > 30 && percentual <= 50) {
            cor = '#2e7d32'; // Verde (Bom)
            label = 'Bom';
        } else if (percentual > 10 && percentual <= 30) {
            cor = '#fbc02d'; // Amarelo (Suficiente)
            label = 'Suficiente';
        } else {
            // Caso <= 10 OU > 70 mantém o Regular
            cor = '#e65100';
            label = 'Regular';
        }

        tr.innerHTML = `
            <td style="text-align:left; color:#000;">${row.equipe || row.no_equipe || 'Sem Equipe'}</td>
            <td style="text-align:center; font-weight:bold; color:#005aaa;">${nm}</td>
            <td style="text-align:center; font-weight:bold; color:#005aaa;">${dn}</td>
            <td style="text-align:center; font-weight:bold; color:${cor}; background-color:${cor}15;">
                ${percentual.toFixed(2)}%
            </td>
        `;
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}
// =========================================================
// INDICADOR C2: DESENVOLVIMENTO INFANTIL (BLOCO COMPLETO)
// =========================================================

// C2
function carregarLayoutInfantil() {
    injetarEstilosMultiselect();
    const container = document.getElementById('filtros-container-global');
    const tabelaContainer = document.getElementById('tabela-container-global');
    if(!container || !tabelaContainer) return;
    
    const cols = [
        {data:'no_cidadao',title:'NOME'}, {data:'idade_meses',title:'IDADE'}, {data:'nu_cpf',title:'CPF'},
        {data:'regra_a',title:'A'}, {data:'regra_b',title:'B'}, {data:'qtd_afericoes_c',title:'C'}, 
        {data:'visitas_d_formatado',title:'D'}, {data:'regra_e',title:'E'}
    ];
    const callExport = `baixarRelatorioCompleto('infantil', 'infantil', ${JSON.stringify(cols).replace(/"/g, "'")}, 'C2_Infantil.csv')`;

    container.style.display = 'flex';
    container.innerHTML = `<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; width:100%;"><select id="filtro-equipe-infantil" class="filtro-select"><option value="">Todas as Equipes</option></select><select id="filtro-microarea-infantil" class="filtro-select"><option value="">Todas as Microáreas</option></select>${typeof gerarHtmlMultiselect === 'function' ? gerarHtmlMultiselect('infantil') : ''}<button onclick="carregarDadosTelaInfantil(1)" class="btn-buscar-filtros" style="background-color:#005aaa; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; height:38px;"><i class="fas fa-search"></i> Buscar</button></div>`;

    tabelaContainer.innerHTML = `
        <nav class="tab-nav"><button class="tab-btn active" data-tab="infantil-lista">Lista Nominal</button><button class="tab-btn" data-tab="infantil-percentual">Percentual</button></nav>
        <div class="tab-content-wrapper">
            <div id="tab-content-infantil-lista" class="tab-content active">
                <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
                    <button id="btn-export-infantil" onclick="${callExport}" style="background-color:#2e7d32; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-file-csv"></i> Exportar CSV</button>
                </div>
                <div id="container-lista-infantil"><div class="loading-clean">Selecione os filtros.</div></div>
                <div id="paginacao-infantil"></div>
            </div>
            <div id="tab-content-infantil-percentual" class="tab-content">
                <div id="container-ranking-infantil"></div>
                <div id="legenda-infantil" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div style="flex: 1; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                            <h5>Pontuação</h5>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 0.8rem;">
                                <div style="border-left: 4px solid #e65100; padding-left: 5px;">Regular<br><b>0 a 25</b></div>
                                <div style="border-left: 4px solid #fbc02d; padding-left: 5px;">Suficiente<br><b>>25 a 50</b></div>
                                <div style="border-left: 4px solid #2e7d32; padding-left: 5px;">Bom<br><b>>50 a 75</b></div>
                                <div style="border-left: 4px solid #4a148c; padding-left: 5px;">Ótimo<br><b>>75 a 100</b></div>
                            </div>
                        </div>
                        <div style="flex: 1; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                            <p><span style="background:#5e35b1; color:white; padding:2px;">NM</span> Boas práticas</p>
                            <p><span style="background:#005aaa; color:white; padding:2px;">DN</span> Total crianças</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    if(typeof configurarAbas === 'function') configurarAbas(tabelaContainer, 'infantil', carregarRankingInfantil);
    if(typeof preencherFiltroEquipes === 'function') preencherFiltroEquipes('filtro-equipe-infantil', 'filtro-microarea-infantil');
    const selectEquipe = document.getElementById('filtro-equipe-infantil');
    if (selectEquipe) { selectEquipe.addEventListener('change', (e) => { if(typeof preencherFiltroMicroareas === 'function') preencherFiltroMicroareas(e.target.value, 'filtro-microarea-infantil'); }); }
}

// Define a função explicitamente no window para evitar erros de referência no onclick
window.carregarDadosTelaInfantil = function(pagina = 1) {
    const container = document.getElementById('container-lista-infantil');
    const paginacao = document.getElementById('paginacao-infantil');
    
    if(container) container.innerHTML = '<div style="text-align:center; padding:30px;"><div class="spinner-border text-primary"></div><p>A carregar dados...</p></div>';
    if(paginacao) paginacao.innerHTML = '';

    const equipe = document.getElementById('filtro-equipe-infantil')?.value || '';
    const microarea = document.getElementById('filtro-microarea-infantil')?.value || '';
    
    // Captura Competência
    let competencia = '';
    const checks = document.querySelectorAll('#dropdown-options-infantil input:checked');
    if (checks.length > 0) competencia = Array.from(checks).map(c => c.value).join(',');

    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ equipe, microarea, competencia, pagina });

    fetch(`/api/indicadores/infantil?${params.toString()}`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
    })
    .then(res => res.json())
    .then(res => {
        if(!container) return;
        container.innerHTML = '';
        
        if (!res.data || res.data.length === 0) { 
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;"><i class="fas fa-child fa-2x"></i><p>Nenhum registo encontrado.</p></div>'; 
            return; 
        }
        
        // Colunas Alinhadas com a API V.61
        const colunas = [
            { data: 'no_cidadao', title: 'NOME', width: '30%' },
            { data: 'idade_meses', title: 'IDADE (Meses)' },
            { data: 'nu_cpf', title: 'CPF' },
            { data: 'regra_a', title: 'A', tooltip: '1ª Consulta (até 30 dias)' },
            { data: 'regra_b', title: 'B', tooltip: 'Qtd Consultas (Min. 6)' },
            { data: 'qtd_afericoes_c', title: 'C', tooltip: 'Peso/Altura (Min. 6)' },
            { data: 'visitas_d_formatado', title: 'D', tooltip: 'Visitas ACS (1ª sem / 6º mês)' },
            { data: 'regra_e', title: 'E', tooltip: 'Vacinas Completas' }
        ];
        
        
        if(typeof construirTabelaAzul === 'function') construirTabelaAzul(res.data, colunas, container);
        else construirTabela(res.data, colunas, container);

        if(typeof construirPaginacao === 'function') construirPaginacao('indicadores/infantil', res.pagination, { equipe, microarea, competencia }, paginacao);
    })
    .catch(err => {
        if(container) container.innerHTML = `<div class="alert alert-danger">Erro: ${err.message}</div>`;
    });
};
// =================================================================
// 3. RANKING (Aba Percentual - C2 Infantil)
// Correção: Adiciona Token de Autenticação para evitar erro 401
// =================================================================
// 3. LÓGICA DE CARREGAMENTO (Correção de Token e Mapeamento de Dados)
// 3. Função corrigida para buscar dados e usar a tabela nova
function carregarRankingInfantil() {
    const container = document.getElementById('container-ranking-infantil');
    if(!container) return;
    
    container.innerHTML = `
        <div style="text-align:center; padding:40px;">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
            </div>
            <p style="margin-top: 10px; color: #666;">Calculando indicadores...</p>
        </div>
    `;
    garantirEstilosAbas(); // Garante CSS
    const token = localStorage.getItem('token'); // Pega o token
    fetch('/api/indicadores/ranking-infantil', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (res.status === 401) { window.location.href = '/login.html'; return; }
        return res.json();
    })
    .then(data => {
        // Mapeia os dados: Backend manda 'percentual', Frontend usa 'pontuacao'
        const dadosFormatados = data.map(row => ({
            equipe: row.equipe,
            a: row.a, b: row.b, c: row.c, d: row.d, e: row.e,
            nm: row.nm, 
            dn: row.dn,
            pontuacao: row.percentual // &lt;--- CORREÇÃO IMPORTANTE
        }));
        construirTabelaRankingInfantil(dadosFormatados, container);
    })
    .catch(err => {
        container.innerHTML = `<p style="color:red; text-align:center;">Erro: ${err.message}</p>`;
    });
}
        // =================================================================
        // 3. FUNÇÕES GLOBAIS DE FILTRO (Com Autenticação Corrigida)
        // SUBSTITUIR AS FUNÇÕES EXISTENTES NO FINAL DO ARQUIVO POR ESTAS:
        // =================================================================
    
        async function preencherFiltroEquipes(idSelectEquipe, idSelectMicroarea) {
            const select = document.getElementById(idSelectEquipe);
            if (!select) return;
            
            select.innerHTML = '<option value="">Carregando...</option>';
            
            try {
                const token = localStorage.getItem('token');
                if (!token) { window.location.href = '/login.html'; return; }
        
                const response = await fetch('/api/equipes', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
        
                // SE O TOKEN VENCEU, SAI DO SISTEMA
                if (response.status === 401 || response.status === 403) {
                    localStorage.clear();
                    window.location.href = '/login.html';
                    return;
                }
        
                if (!response.ok) throw new Error('Erro ao buscar equipes');
                
                const equipes = await response.json();
                
                select.innerHTML = '<option value="">Todas as Equipes</option>';
                if (Array.isArray(equipes)) {
                    equipes.forEach(equipe => {
                        const option = document.createElement('option');
                        option.value = equipe.nu_ine;
                        option.textContent = equipe.no_equipe;
                        select.appendChild(option);
                    });
                }
            } catch (error) { 
                console.error('Erro equipes:', error);
                select.innerHTML = '<option value="">Erro ao carregar</option>';
            }
        }
    
        // =================================================================
// FUNÇÃO CORRIGIDA: Preencher Microáreas e Destravar Campo
// =================================================================
window.preencherFiltroMicroareas = async function(ineEquipe, idSelectMicroarea) {
    const select = document.getElementById(idSelectMicroarea);
    if (!select) return;

    // 1. Estado de Carregamento
    select.innerHTML = '<option value="">Carregando...</option>';
    select.disabled = true; // Trava enquanto carrega

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Se não tiver equipe selecionada, limpa e mantém travado
        if (!ineEquipe) {
            select.innerHTML = '<option value="">Selecione a equipe</option>';
            select.disabled = true;
            return;
        }

        // 2. Busca na API
        // Nota: A API deve retornar as microáreas vinculadas à eSF (INE) informada
        const url = `/api/indicadores/microareas?equipe=${ineEquipe}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro na API');

        const microareas = await response.json();
        
        select.innerHTML = '<option value="">Todas as Microáreas</option>';
        
        // 3. Preenche e DESTRAVA
        if (Array.isArray(microareas) && microareas.length > 0) {
            microareas.forEach(ma => {
                if (ma) { // Ignora nulos
                    const option = document.createElement('option');
                    option.value = ma;
                    option.textContent = `Microárea ${ma}`;
                    select.appendChild(option);
                }
            });
            // O PULO DO GATO: Habilita o campo para o usuário clicar
            select.disabled = false; 
            console.log(`✅ Microáreas carregadas para equipe ${ineEquipe}: ${microareas.length}`);
        } else {
            select.innerHTML = '<option value="">Nenhuma microárea encontrada</option>';
            select.disabled = true;
        }

    } catch (error) {
        console.error('Erro microáreas:', error);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
        select.disabled = true;
    }
};
    
        // Garante que as funções estejam acessíveis no escopo global
        window.preencherFiltroEquipes = preencherFiltroEquipes;
        window.preencherFiltroMicroareas = preencherFiltroMicroareas;
    
                // Torna as funções acessíveis globalmente
                window.carregarDadosTelaGestantes = carregarDadosTelaGestantes;
    
        // =================================================================
        // 4. POLÍTICA DE PRIVACIDADE (MODAL)
        // Adicione estas funções no final do arquivo e chame setupPrivacyPolicy() no início
        // =================================================================
        
        function setupPrivacyPolicy() {
    // Tenta encontrar qualquer elemento que pareça ser o botão de política
    // Procura por ID específico, Classes comuns ou Texto
    const candidatos = document.querySelectorAll('a, button, span, div, p, small');
    let encontrou = false;
    candidatos.forEach(el => {
        const texto = el.innerText ? el.innerText.trim().toLowerCase() : '';
        // Verifica se o texto contém "política de privacidade"
        if (texto.includes('política de privacidade')) {
            el.style.cursor = 'pointer';
            // Garante que pareça clicável (caso não seja um link)
            if (el.tagName !== 'A') el.style.textDecoration = 'underline'; 
            
            el.onclick = (e) => {
                e.preventDefault(); // Impede o # na URL
                abrirModalPrivacidade();
            };
            encontrou = true;
        }
    });
    if (encontrou) {
        console.log('✅ Botão de Política de Privacidade ativado.');
    } else {
        console.warn('⚠️ Botão de política não encontrado no HTML.');
    }
}
    
        
        function abrirModalPrivacidade() {
            // Remove modal anterior se houver
            const antigo = document.getElementById('modal-privacy-overlay');
            if (antigo) antigo.remove();
        
            // Texto da Política (Formatado)
            const textoPolitica = `
                <h4 style="color:#005aaa; margin-bottom:15px;">1. Introdução e Escopo</h4>
                <p>Esta Política de Privacidade descreve como a <strong>Painel e-SUS APS</strong> coleta, usa, armazena e protege os dados pessoais e dados sensíveis de saúde processados em nossa plataforma de indicadores.</p>
                <p>Ao utilizar nosso sistema, você concorda com os termos aqui descritos. Nosso compromisso é garantir a confidencialidade e integridade das informações, seguindo as diretrizes da Lei Geral de Proteção de Dados (LGPD).</p>
        
                <h4 style="color:#005aaa; margin-top:20px; margin-bottom:15px;">2. Definições Importantes</h4>
                <ul>
                    <li><strong>Usuário:</strong> Profissional de saúde, gestor ou administrativo que acessa o sistema.</li>
                    <li><strong>Titular dos Dados:</strong> O paciente cujos dados de saúde são processados para gerar indicadores.</li>
                    <li><strong>Dado Pessoal:</strong> Informação que identifica uma pessoa (ex: Nome, CPF, Email).</li>
                    <li><strong>Dado Sensível:</strong> Dado sobre saúde, vida sexual, dado genético ou biométrico (Art. 5º, II da LGPD).</li>
                </ul>
        
                <h4 style="color:#005aaa; margin-top:20px; margin-bottom:15px;">3. Quais Dados Coletamos?</h4>
                <p><strong>A. Dados dos Usuários:</strong> Nome, CPF, Registro Profissional, E-mail e Logs de acesso.</p>
                <p><strong>B. Dados de Saúde (Pacientes):</strong> Demográficos, Histórico de atendimentos, Diagnósticos (CID/CIAP), Resultados de exames e Condições específicas.</p>
        
                <h4 style="color:#005aaa; margin-top:20px; margin-bottom:15px;">4. Finalidade do Uso dos Dados</h4>
                <p>Geração de Indicadores (Previne Brasil), Gestão Clínica, Auditoria e Cumprimento Legal. <strong>Nós NÃO vendemos dados de saúde.</strong></p>
        
                <h4 style="color:#005aaa; margin-top:20px; margin-bottom:15px;">5. Armazenamento e Segurança</h4>
                <p>Utilizamos Criptografia, Controle de Acesso (RBAC), Anonimização em dashboards gerenciais e Backups regulares.</p>
        
                <h4 style="color:#005aaa; margin-top:20px; margin-bottom:15px;">6. Compartilhamento de Dados</h4>
                <p>Apenas com órgãos governamentais (MS), infraestrutura de nuvem segura ou mediante ordem judicial.</p>
        
                <h4 style="color:#005aaa; margin-top:20px; margin-bottom:15px;">7. Direitos dos Titulares (LGPD)</h4>
                <p>Confirmação, Acesso, Correção e Anonimização de dados podem ser solicitados conforme a lei.</p>
        
                <h4 style="color:#005aaa; margin-top:20px; margin-bottom:15px;">8. Cookies</h4>
                <p>Utilizamos cookies apenas para autenticação e sessão. Não há rastreamento publicitário.</p>
        
                <h4 style="color:#005aaa; margin-top:20px; margin-bottom:15px;">9. Contato (DPO)</h4>
                <p>Para dúvidas, contate o setor responsável.</p>
                
                <hr style="margin: 20px 0;">
                <p style="font-size:0.85rem; color:#666;">Última atualização: ${new Date().toLocaleDateString()}</p>
            `;
        
            // Criação do Overlay (Fundo Escuro)
            const overlay = document.createElement('div');
            overlay.id = 'modal-privacy-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); z-index: 9999;
                display: flex; justify-content: center; align-items: center;
                backdrop-filter: blur(3px);
            `;
        
            // Criação do Modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white; width: 90%; max-width: 800px; max-height: 85vh;
                border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                display: flex; flex-direction: column; overflow: hidden;
                animation: fadeIn 0.3s ease;
            `;
        
            // Header do Modal
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa;
            `;
            header.innerHTML = `<h3 style="margin:0; color:#333; font-size:1.2rem;"><i class="fas fa-shield-alt" style="color:#005aaa;"></i> Política de Privacidade</h3>`;
            
            // Botão Fechar (X)
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = 'background:none; border:none; font-size:2rem; cursor:pointer; color:#666; line-height:1;';
            closeBtn.onclick = () => overlay.remove();
            header.appendChild(closeBtn);
        
            // Corpo do Modal (Conteúdo com Scroll)
            const body = document.createElement('div');
            body.style.cssText = 'padding: 30px; overflow-y: auto; line-height: 1.6; color: #444; font-size: 0.95rem;';
            body.innerHTML = textoPolitica;
        
            // Footer do Modal
            const footer = document.createElement('div');
            footer.style.cssText = 'padding: 15px 30px; border-top: 1px solid #eee; text-align: right; background: #fff;';
            const btnEntendi = document.createElement('button');
            btnEntendi.innerText = 'Entendi e Concordo';
            btnEntendi.style.cssText = 'background: #005aaa; color: white; border: none; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold;';
            btnEntendi.onclick = () => overlay.remove();
            footer.appendChild(btnEntendi);
            // Montagem
            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(footer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            // Fecha ao clicar fora
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        }
        }); // Fim do DOMContentLoaded
async function setupDashboardC1() {
    // 1. Busca os dados PRIMEIRO (apenas uma vez para não pesar)
    let percentualTexto = "---";
    let corTexto = "#d35400";
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/indicadores/ranking-mais-acesso', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            let totalNM = 0, totalDN = 0;
            if (Array.isArray(data)) {
                data.forEach(d => { totalNM += parseInt(d.nm || 0); totalDN += parseInt(d.dn || 0); });
            }
            const perc = totalDN > 0 ? ((totalNM / totalDN) * 100).toFixed(0) : 0;
            percentualTexto = `${perc}%`;
            corTexto = perc >= 100 ? '#198754' : (perc < 50 ? '#dc3545' : '#d35400');
        }
    } catch (e) { console.error('Erro ao calcular C1:', e); return; }
    // 2. FUNÇÃO QUE APLICA O VISUAL (Pode ser chamada várias vezes)
    const atualizarVisualCard = () => {
        const cards = Array.from(document.querySelectorAll('.card, .kpi-card'));
        const cardC1 = cards.find(c => c.innerText.includes('Mais Acesso') || c.innerText.includes('C1'));
        if (!cardC1) return;
        // Garante o clique (Navegação)
        cardC1.style.cursor = 'pointer';
        cardC1.onclick = function() {
            const mainContent = document.getElementById('main-content') || document.querySelector('.container-fluid');
            if (!mainContent) return;
            mainContent.innerHTML = `
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <div><h1 class="h2" style="color:#333;">Mais Acesso</h1><p class="lead text-muted">Monitoramento de Cidadãos</p></div>
                </div>
                <div id="filtros-container-global" class="mb-4"></div>
                <div id="tabela-container-global"></div>
                <div id="paginacao-controles-global"></div>
            `;
            if (window.carregarLayoutMaisAcesso) window.carregarLayoutMaisAcesso();
        };
        // Garante o Texto (Substitui o 85% pelo Real)
        const elementos = cardC1.querySelectorAll('h1, h2, h3, strong, span, div');
        elementos.forEach(el => {
            const texto = el.innerText.trim();
            // Substitui se for número ou porcentagem, mas protege o título "Mais Acesso"
            if ((texto.includes('%') || /^WD$/.test(texto)) && !texto.toLowerCase().includes('acesso')) {
                // SÓ ATUALIZA SE O VALOR AINDA ESTIVER ERRADO
                if (el.innerText !== percentualTexto) {
                    el.innerText = percentualTexto;
                    el.style.color = corTexto;
                    // console.log('\u279B Card C1 atualizado para:', percentualTexto);
                }
            }
        });
        
        const legenda = cardC1.querySelector('p, small, .text-muted');
        if (legenda) legenda.innerText = "Média Municipal (Real)";
    };
    // 3. ESTRATÉGIA DE PERSISTÊNCIA (Executa agora e depois de um tempo)
    atualizarVisualCard(); // 1ª Tentativa (Imediata) 
    
    setTimeout(atualizarVisualCard, 500);  // 2ª Tentativa (0.5 seg depois)
    setTimeout(atualizarVisualCard, 1500); // 3ª Tentativa (1.5 seg depois - Garante que venceu o dashboard.js)
}
// =================================================================
// ESTILOS GLOBAIS (Abas + Tabela + Tooltip Azul Padrão)
// =================================================================
function garantirEstilosAbas() {
    // Verifica se já existe para não duplicar
    if (document.getElementById('estilos-globais-fix')) return;
    
    const style = document.createElement('style');
    style.id = 'estilos-globais-fix';
    style.textContent = `
        /* 1. COMPORTAMENTO DAS ABAS */
        .tab-content { display: none !important; }
        .tab-content.active { display: block !important; animation: fadeIn 0.3s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        /* 2. TABELAS DE RANKING (Visual Azul) */
        .tabela-ranking { width: 100%; border-collapse: collapse; background: #fff; }
        .tabela-ranking th { background-color: #005aaa; color: white; padding: 12px; text-align: center; }
        .tabela-ranking td { padding: 10px; border-bottom: 1px solid #eee; text-align: center; color: #333; }
        .tabela-ranking tr:hover { background-color: #f8f9fa; }
        /* 3. TOOLTIP PADRÃO (AZUL COM TEXTO BRANCO) - OBRIGATÓRIO */
        .tooltip-inner {
            background-color: #005aaa !important; /* Fundo Azul */
            color: #ffffff !important;             /* Texto Branco */
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 0.9rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        /* Cor da setinha do Tooltip (para acompanhar o azul) */
        .tooltip.bs-tooltip-top .tooltip-arrow::before { border-top-color: #005aaa !important; }
        .tooltip.bs-tooltip-bottom .tooltip-arrow::before { border-bottom-color: #005aaa !important; }
        .tooltip.bs-tooltip-start .tooltip-arrow::before { border-left-color: #005aaa !important; }
        .tooltip.bs-tooltip-end .tooltip-arrow::before { border-right-color: #005aaa !important; }
    `;
    document.head.appendChild(style);
}
// Executa imediatamente para garantir o visual
garantirEstilosAbas();

// =================================================================
// 1. LAYOUT DIABETES (Isso cria a estrutura das Abas e da Paginação)
// =================================================================
// 4. C4 - DIABETES
function carregarLayoutDiabetes() {
    injetarEstilosMultiselect();
    const container = document.getElementById('filtros-container-global');
    const tabelaContainer = document.getElementById('tabela-container-global');
    if(!container || !tabelaContainer) return;

    const cols = [
        {data:'no_cidadao',title:'NOME'}, {data:'dt_nascimento',title:'NASCIMENTO'}, {data:'nu_cpf',title:'CPF'},
        {data:'ind_a',title:'A'}, {data:'ind_b',title:'B'}, {data:'ind_c',title:'C'},
        {data:'ind_d',title:'D'}, {data:'ind_e',title:'E'}, {data:'ind_f',title:'F'}
    ];
    const callExport = `baixarRelatorioCompleto('diabetes', 'diabetes', ${JSON.stringify(cols).replace(/"/g, "'")}, 'C4_Diabetes.csv')`;

    container.style.display = 'flex';
    container.innerHTML = `<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; width:100%;"><select id="filtro-equipe-diabetes" class="filtro-select"><option value="">Todas as Equipes</option></select><select id="filtro-microarea-diabetes" class="filtro-select"><option value="">Todas as Microáreas</option></select>${typeof gerarHtmlMultiselect === 'function' ? gerarHtmlMultiselect('diabetes') : ''}<button onclick="carregarDadosTelaDiabetes(1)" class="btn-buscar-filtros" style="background-color:#005aaa; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; height:38px;"><i class="fas fa-search"></i> Buscar</button></div>`;

    tabelaContainer.innerHTML = `
        <nav class="tab-nav"><button class="tab-btn active" data-tab="diabetes-lista">Lista Nominal</button><button class="tab-btn" data-tab="diabetes-percentual">Percentual</button></nav>
        <div class="tab-content-wrapper">
            <div id="tab-content-diabetes-lista" class="tab-content active">
                <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
                    <button id="btn-export-diabetes" onclick="${callExport}" style="background-color:#2e7d32; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-file-csv"></i> Exportar CSV</button>
                </div>
                <div id="container-lista-diabetes"><div class="loading-clean">Selecione os filtros.</div></div>
                <div id="paginacao-diabetes"></div>
            </div>
            <div id="tab-content-diabetes-percentual" class="tab-content">
                <div id="container-ranking-diabetes"></div>
                <div id="legenda-diabetes" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                         <div style="flex: 1; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                            <h5>Pontuação</h5>
                             <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 0.8rem;">
                                <div style="border-left: 4px solid #e65100; padding-left: 5px;">Regular<br><b>0 a 25</b></div>
                                <div style="border-left: 4px solid #fbc02d; padding-left: 5px;">Suficiente<br><b>>25 a 50</b></div>
                                <div style="border-left: 4px solid #2e7d32; padding-left: 5px;">Bom<br><b>>50 a 75</b></div>
                                <div style="border-left: 4px solid #4a148c; padding-left: 5px;">Ótimo<br><b>>75 a 100</b></div>
                            </div>
                        </div>
                        <div style="flex: 1; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                            <p><span style="background:#5e35b1; color:white; padding:2px;">NM</span> Boas práticas</p>
                            <p><span style="background:#005aaa; color:white; padding:2px;">DN</span> Total diabéticos</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    if(typeof configurarAbas === 'function') configurarAbas(tabelaContainer, 'diabetes', carregarRankingDiabetes);
    if(typeof preencherFiltroEquipes === 'function') preencherFiltroEquipes('filtro-equipe-diabetes', 'filtro-microarea-diabetes');
    const selectEquipe = document.getElementById('filtro-equipe-diabetes');
    if (selectEquipe) { selectEquipe.addEventListener('change', (e) => { if(typeof preencherFiltroMicroareas === 'function') preencherFiltroMicroareas(e.target.value, 'filtro-microarea-diabetes'); }); }
}
// =================================================================
// 2. LISTA NOMINAL DIABETES (Com Paginação e CSV Corrigidos)
// =================================================================
// --- BUSCA C4: DIABETES ---
function carregarDadosTelaDiabetes(pagina = 1) {
    const container = document.getElementById('container-lista-diabetes');
    const paginacao = document.getElementById('paginacao-diabetes');
    
    if(container) container.innerHTML = '<div style="text-align:center; padding:30px;"><div class="spinner-border text-primary"></div><p>Buscando...</p></div>';
    if(paginacao) paginacao.innerHTML = '';

    const equipe = document.getElementById('filtro-equipe-diabetes')?.value || '';
    const microarea = document.getElementById('filtro-microarea-diabetes')?.value || '';

    let competencia = '';
    const checks = document.querySelectorAll('#dropdown-options-diabetes input:checked');
    if (checks.length > 0) competencia = Array.from(checks).map(c => c.value).join(',');

    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
        equipe,
        microarea,
        competencia,
        pagina,
        _t: new Date().getTime() // <--- Cache Buster
    });

    fetch(`/api/indicadores/diabetes?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(res => {
        if(!container) return;
        container.innerHTML = '';
        if (!res.data || res.data.length === 0) { 
            container.innerHTML = '<div style="padding:40px; text-align:center;">Nenhum registro encontrado.</div>'; 
            return; 
        }

        const colunas = [
            { data: 'no_cidadao', title: 'NOME', width: '30%' }, 
            { data: 'dt_nascimento', title: 'NASCIMENTO' }, 
            { data: 'nu_cpf', title: 'CPF' },
            { data: 'ind_a', title: 'A', tooltip: 'Ter pelo menos 01 (uma) consulta presencial ou remota realizadas por médica(o) ou enfermeira(o), nos últimos 06 (seis) meses.' }, 
            { data: 'ind_b', title: 'B', tooltip: 'Ter pelo menos 01 (um) registro de aferição de pressão arterial realizado nos últimos 06 (seis) meses.' }, 
            { data: 'ind_c', title: 'C', tooltip: 'Ter pelo menos 01 (um) registro simultâneos de peso e altura realizado nos últimos 12 (doze) meses.' }, 
            { data: 'ind_d', title: 'D', tooltip: 'Ter pelo menos 02 (duas) visitas domiciliares realizadas por ACS/TACS, com intervalo mínimo de 30 (trinta) dias, nos últimos 12 (doze) meses.' }, 
            { data: 'ind_e', title: 'E', tooltip: 'Ter pelo menos 01 (um) registro de solicitação de hemoglobina glicada realizada ou avaliada, nos últimos 12 (doze) meses.' }, 
            { data: 'ind_f', title: 'F', tooltip: 'Ter pelo menos 01 (uma) avaliação dos pés realizada nos últimos 12 (doze) meses.' }
        ];
        
        const dadosFormatados = res.data.map(d => ({
            ...d,
            dt_nascimento: formatarDataBR(d.dt_nascimento)
        }));
        
        if(typeof construirTabelaAzul === 'function') construirTabelaAzul(dadosFormatados, colunas, container);
        else construirTabela(dadosFormatados, colunas, container);
        
        if(typeof construirPaginacao === 'function') construirPaginacao('indicadores/diabetes', res.pagination, { equipe, microarea, competencia }, paginacao);
    });
}
// =================================================================
// 3. RANKING DIABETES
// =================================================================
function carregarRankingDiabetes() {
    const container = document.getElementById('container-ranking-diabetes');
    if(!container) return;
    
    container.innerHTML = `<div style="text-align:center; padding:40px;"><div class="spinner-border text-primary"></div><p>Calculando ranking C4...</p></div>`;
    const token = localStorage.getItem('token');

    // Adicionado timestamp para evitar cache no ranking também
    fetch(`/api/indicadores/ranking-diabetes?_t=${new Date().getTime()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        // --- CORREÇÃO AQUI ---
        // Mapeia 'percentual' (do backend) para 'pontuacao' (do frontend)
        const dadosFormatados = data.map(row => ({
            ...row,
            pontuacao: row.percentual // Conecta a variável correta
        }));
        construirTabelaRankingDiabetes(dadosFormatados, container);
    })
    .catch(err => {
        container.innerHTML = `<div class="alert alert-danger">Erro: ${err.message}</div>`;
    });
}
function construirTabelaRankingDiabetes(data, container) {
    if (!container) return;
    
    // Log para diagnóstico real no navegador
    console.log('📊 [Ranking Diabetes] Dados recebidos para renderizar:', data);

    container.innerHTML = '';
    if (!data || data.length === 0) {
        container.innerHTML = '<div style="padding:30px; text-align:center; color:#777;">Nenhum dado disponível.</div>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'tabela-ranking';
    table.style.width = '100%';
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    
    const colunas = [
        { title: 'EQUIPE', width: '20%', align: 'left' },
        { title: 'A', tooltip: 'Consulta (6 meses) - 20 pts' },
        { title: 'B', tooltip: 'PA (6 meses) - 15 pts' },
        { title: 'C', tooltip: 'Peso/Altura (12 meses) - 15 pts' },
        { title: 'D', tooltip: 'Visitas (12 meses) - 20 pts' },
        { title: 'E', tooltip: 'H. Glicada (12 meses) - 15 pts' },
        { title: 'F', tooltip: 'Pé Diabético (12 meses) - 15 pts' },
        { title: 'NM', tooltip: 'Pontuação Acumulada' },
        { title: 'DN', tooltip: 'Total Pacientes' },
        { title: 'NOTA', tooltip: 'Nota Final (0-100)' }
    ];
    colunas.forEach(col => {
        const th = document.createElement('th');
        if (col.tooltip) th.innerHTML = `${col.title} <i class="fas fa-info-circle" title="${col.tooltip}"></i>`;
        else th.textContent = col.title;
        if(col.align) th.style.textAlign = col.align;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        
        const addCell = (text, align='center', color='#333', bg='transparent') => {
            const td = document.createElement('td');
            td.textContent = (text !== undefined && text !== null) ? text : '0';
            td.style.textAlign = align;
            td.style.color = color;
            td.style.backgroundColor = bg;
            tr.appendChild(td);
        };
        
        // Coluna Equipe
        addCell(row.equipe || row.no_equipe || 'Sem Equipe', 'left', '#000');
        
        // Indicadores
        ['a','b','c','d','e','f'].forEach(k => addCell(row[k]));
        
        // Totais
        addCell(row.nm, 'center', '#005aaa', '#eef2ff');
        addCell(row.dn, 'center', '#005aaa', '#eef2ff');
        
        // --- CORREÇÃO DE LEITURA DA NOTA ---
        // Tenta ler 'pontuacao', se não der, tenta 'percentual', se não, assume 0
        let rawNota = row.pontuacao !== undefined ? row.pontuacao : row.percentual;
        let nota = parseFloat(rawNota || 0);
        
        const cor = nota >= 100 ? '#198754' : (nota < 50 ? '#dc3545' : '#d35400');
        
        // Formata para 2 casas decimais
        addCell(nota.toFixed(2), 'center', cor, '#f0fdf4');
        
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
}
// =================================================================
// 👑 CORREÇÃO DEFINITIVA: PAGINAÇÃO E ROTEAMENTO (V.7.0)
// Este bloco substitui as versões duplicadas anteriores.
// =================================================================
// 1. Roteador de Paginação Global (Controla o clique dos botões)
window.navegarPagina = function(api, novaPagina) {
    // Garante que a página seja um número inteiro para evitar erros de soma (ex: "1"+1 = "11")
    const paginaAlvo = parseInt(novaPagina, 10);
    if (isNaN(paginaAlvo)) return;

    console.log(`[Router] Navegando ${api} -> Página ${paginaAlvo}`);
    // Verifica qual módulo chamou a paginação e executa a função correspondente
    if (api.includes('hipertensao')) {
        if (typeof carregarDadosTelaHipertensao === 'function') {
            carregarDadosTelaHipertensao(paginaAlvo);
        } else {
            console.error("Erro Crítico: A função 'carregarDadosTelaHipertensao' não foi encontrada.");
        }
    }
    else if (api.includes('diabetes')) {
        if (typeof carregarDadosTelaDiabetes === 'function') {
            carregarDadosTelaDiabetes(paginaAlvo);
        } else {
            console.error("Erro Crítico: A função 'carregarDadosTelaDiabetes' não foi encontrada.");
        }
    }
    else if (api.includes('gestantes')) {
        if (typeof carregarDadosTelaGestantes === 'function') carregarDadosTelaGestantes(paginaAlvo);
    }
    else if (api.includes('infantil')) {
        if (typeof carregarDadosTelaInfantil === 'function') carregarDadosTelaInfantil(paginaAlvo);
    }
    else if (api.includes('mais-acesso')) {
        if (typeof carregarDadosTelaMaisAcesso === 'function') carregarDadosTelaMaisAcesso(paginaAlvo);
    }
    else if (api.includes('idoso')) {
        if (typeof carregarDadosTelaIdoso === 'function') {
            carregarDadosTelaIdoso(paginaAlvo);
        } else {
            console.error("Erro Crítico: A função 'carregarDadosTelaIdoso' não foi encontrada.");
        }
    }
    else if (api.includes('mulher')) {
        if (typeof carregarDadosTelaMulher === 'function') {
            carregarDadosTelaMulher(paginaAlvo);
        } else {
            console.error("Erro Crítico: A função 'carregarDadosTelaMulher' não foi encontrada.");
        }
    }
    else {
        console.warn('Rota de paginação desconhecida:', api);
    }
};
// 2. Construtor dos Botões (Desenha Anterior/Próximo)
window.construirPaginacao = function(api, pagination, filtros, container) {
    // Tenta localizar o container correto automaticamente se não for passado
    if (!container) {
        if (api.includes('diabetes')) container = document.getElementById('paginacao-diabetes');
        else if (api.includes('gestantes')) container = document.getElementById('paginacao-gestantes');
        else if (api.includes('infantil')) container = document.getElementById('paginacao-infantil');
        else if (api.includes('mais-acesso')) container = document.getElementById('paginacao-mais-acesso');
        else if (api.includes('hipertensao')) container = document.getElementById('paginacao-hipertensao');
        else if (api.includes('idoso')) container = document.getElementById('paginacao-idoso');
        else if (api.includes('mulher')) container = document.getElementById('paginacao-mulher');
        else container = document.getElementById('paginacao-controles-global');
    }
    if (!container) return; // Se não achar o lugar para desenhar, para.
    container.innerHTML = '';
    
    // Converte dados para inteiros por segurança
    const page = parseInt(pagination.page, 10);
    const totalPages = parseInt(pagination.totalPages, 10);
    const totalRows = pagination.totalRows;
    // Se tiver apenas 1 página, mostra apenas o total (sem botões)
    if (totalPages <= 1) {
        container.innerHTML = `<div style="text-align:center; padding:10px; color:#666; font-size:0.9em; width:100%;">Total: <strong>${totalRows}</strong> registros</div>`;
        return;
    }
    // Estilos dos botões
    const btnStyle = "background:#005aaa; color:#fff; border:none; padding:8px 16px; border-radius:4px; margin:0 5px; cursor:pointer; font-weight:600; display:inline-flex; align-items:center; gap:5px;";
    const btnDisabled = "background:#e0e0e0; color:#999; border:none; padding:8px 16px; border-radius:4px; margin:0 5px; cursor:not-allowed; display:inline-flex; align-items:center; gap:5px;";
    // Botão ANTERIOR
    const btnPrev = document.createElement('button');
    btnPrev.innerHTML = '<i class="fas fa-chevron-left"></i> Anterior';
    btnPrev.style.cssText = (page <= 1) ? btnDisabled : btnStyle;
    btnPrev.disabled = (page <= 1);
    // Ação: Chama o roteador com a página anterior
    btnPrev.onclick = function() { window.navegarPagina(api, page - 1); };
    // Texto Central
    const info = document.createElement('span');
    info.innerHTML = `Página <strong>${page}</strong> de ${totalPages}`;
    info.style.cssText = "margin: 0 15px; color:#333; font-size: 0.95rem;";
    // Botão PRÓXIMO
    const btnNext = document.createElement('button');
    btnNext.innerHTML = 'Próximo <i class="fas fa-chevron-right"></i>';
    btnNext.style.cssText = (page >= totalPages) ? btnDisabled : btnStyle;
    btnNext.disabled = (page >= totalPages);
    // Ação: Chama o roteador com a próxima página
    btnNext.onclick = function() { window.navegarPagina(api, page + 1); };
    // Montagem Visual
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'center';
    wrapper.style.alignItems = 'center';
    wrapper.style.width = '100%';
    
    wrapper.appendChild(btnPrev);
    wrapper.appendChild(info);
    wrapper.appendChild(btnNext);
    
    container.appendChild(wrapper);
};

// =================================================================
// 1. LAYOUT B1 - VERSÃO AUTOSSUFICIENTE (Filtros + Lógica Integrados)
// =================================================================
// =================================================================
// 1. LAYOUT B1 - LIMPO E MANUAL (Sem Auto-Seleção)
// =================================================================
window.carregarLayoutB1 = function() {
    console.log("🚀 B1: Carregando layout (Modo Manual)...");

    const filtrosContainer = document.getElementById('filtros-container-global');
    const tabelaContainer = document.getElementById('tabela-container-global');

    if (filtrosContainer) {
        filtrosContainer.style.display = 'block';
        filtrosContainer.classList.remove('hidden');

        // Gera HTML dos Meses (Sem marcar nada)
        let htmlMeses = '';
        [2026, 2025].forEach(ano => {
            htmlMeses += `<li class="p-2 border-bottom bg-light"><small class="fw-bold text-muted ps-2">ANO ${ano}</small></li>`;
            ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].forEach((m, i) => {
                const val = `${ano}-${String(i+1).padStart(2,'0')}`;
                htmlMeses += `<li><label class="dropdown-item py-2"><input type="checkbox" class="form-check-input me-2 check-mes-b1" value="${val}"> ${m}/${ano}</label></li>`;
            });
        });

        filtrosContainer.innerHTML = `
            <div class="card mb-3 shadow-sm" style="border-left: 5px solid #0d6efd;">
                <div class="card-body py-3">
                    <div class="row g-3 align-items-end">
                        <div class="col-md-4">
                            <label class="form-label fw-bold small text-muted">Equipe (eSF Recomendado)</label>
                            <select id="filtro-equipe-b1" class="form-select">
                                <option value="">Carregando...</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label fw-bold small text-muted">Microárea</label>
                            <select id="filtro-microarea-b1" class="form-select" disabled>
                                <option value="">Selecione a equipe</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label fw-bold small text-muted">Competências</label>
                            <div class="dropdown">
                                <button class="btn bg-white border w-100 d-flex justify-content-between align-items-center" type="button" data-bs-toggle="dropdown" data-bs-auto-close="outside">
                                    <span id="txt-meses-b1">Selecione os meses...</span> 
                                    <i class="fas fa-chevron-down small"></i>
                                </button>
                                <ul class="dropdown-menu p-0 shadow w-100" style="max-height:250px; overflow-y:auto;">
                                    ${htmlMeses}
                                </ul>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-primary w-100" onclick="window.carregarDadosTelaB1(1)">
                                <i class="fas fa-search"></i> Buscar
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;

        // Eventos
        document.querySelectorAll('.check-mes-b1').forEach(chk => {
            chk.addEventListener('change', () => {
                const n = document.querySelectorAll('.check-mes-b1:checked').length;
                const txt = document.getElementById('txt-meses-b1');
                if(txt) txt.innerText = n > 0 ? `${n} selecionado(s)` : 'Selecione os meses...';
            });
        });

        // Conecta à API de Equipes (Existente)
        if (typeof window.preencherFiltroEquipes === 'function') {
            window.preencherFiltroEquipes('filtro-equipe-b1', 'filtro-microarea-b1');
            const sel = document.getElementById('filtro-equipe-b1');
            if(sel) {
                sel.addEventListener('change', function() {
                    if (typeof window.preencherFiltroMicroareas === 'function') {
                        window.preencherFiltroMicroareas(this.value, 'filtro-microarea-b1');
                    }
                });
            }
        }
    }

    if (tabelaContainer) {
        const cols = [
            {data:'no_cidadao', title:'NOME'}, {data:'dt_nascimento', title:'NASCIMENTO'},
            {data:'nu_cpf', title:'CPF'}, {data:'dt_ultima_consulta', title:'1ª CONSULTA'}, 
            {data:'status', title:'SITUAÇÃO'}
        ];
        const callExport = `baixarRelatorioCompleto('b1', 'b1', ${JSON.stringify(cols).replace(/"/g, "'")}, 'B1.csv')`;

        tabelaContainer.innerHTML = `
            <nav class="tab-nav"><button class="tab-btn active" data-tab="b1-lista">Lista Nominal</button><button class="tab-btn" data-tab="b1-percentual">Percentual</button></nav>
            <div class="tab-content-wrapper">
                <div id="tab-content-b1-lista" class="tab-content active">
                    <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
                        <button onclick="${callExport}" class="btn-export-csv-dinamico" style="background-color:#2e7d32; color:white; border:none; padding:8px 15px; border-radius:4px;"><i class="fas fa-file-csv"></i> Exportar CSV</button>
                    </div>
                    <div id="container-lista-b1"><div class="loading-clean"><i class="fas fa-filter"></i> Selecione Equipe e Meses para buscar.</div></div>
                    <div id="paginacao-b1" style="margin-top:20px; display:flex; justify-content:center; gap:10px;"></div>
                </div>
                <div id="tab-content-b1-percentual" class="tab-content">
                    <div id="container-ranking-b1" style="padding:20px;"></div>
                </div>
            </div>`;
            
        if(typeof configurarAbas === 'function') configurarAbas(tabelaContainer, 'b1', carregarRankingB1);
    }
};

// =================================================================
// 2. BUSCA DE DADOS B1 (Com Validação)
// =================================================================
window.carregarDadosTelaB1 = function(pagina = 1) {
    const container = document.getElementById('container-lista-b1');
    const paginacao = document.getElementById('paginacao-b1');
    
    if(container) container.innerHTML = '<div style="text-align:center; padding:30px;"><div class="spinner-border text-primary"></div><p>Buscando dados...</p></div>';
    if(paginacao) paginacao.innerHTML = '';

    const equipe = document.getElementById('filtro-equipe-b1')?.value || '';
    const microarea = document.getElementById('filtro-microarea-b1')?.value || '';
    
    // Captura múltiplos meses
    const meses = Array.from(document.querySelectorAll('.check-mes-b1:checked')).map(c => c.value);
    const competencia = meses.join(',');

    console.log("🔍 DEBUG B1 - Enviando para API:", { equipe, microarea, competencia, pagina });

    if (!competencia) {
        if(container) container.innerHTML = '<div class="alert alert-warning text-center">⚠️ Por favor, selecione ao menos um mês (competência).</div>';
        return;
    }

    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ equipe, microarea, competencia, pagina });

    fetch(`/api/indicadores/b1?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(res => {
        if(!container) return;
        container.innerHTML = '';
        
        if (!res.data || res.data.length === 0) {
            container.innerHTML = '<div style="padding:40px; text-align:center;">Nenhum registro encontrado.</div>';
            return;
        }

        const colunas = [
            { data: 'no_cidadao', title: 'NOME', width: '35%' },
            { data: 'dt_nascimento', title: 'NASCIMENTO' },
            { data: 'nu_cpf', title: 'CPF' },
            { data: 'dt_ultima_consulta', title: '1ª CONSULTA' },
            { data: 'status', title: 'SITUAÇÃO' }
        ];

        // Usa a tabela genérica que já funciona para os outros
        if(typeof construirTabelaAzul === 'function') construirTabelaAzul(res.data, colunas, container);
        else construirTabela(res.data, colunas, container);
        
        if(typeof construirPaginacao === 'function') construirPaginacao('indicadores/b1', res.pagination, { equipe, microarea, competencia }, paginacao);
    })
    .catch(err => {
        if(container) container.innerHTML = `<div class="alert alert-danger">Erro ao buscar: ${err.message}</div>`;
    });
};

// =================================================================
// 3. RANKING B1 (Correção do Erro ReferenceError)
// =================================================================
window.carregarRankingB1 = function() {
    const container = document.getElementById('container-ranking-b1');
    if(!container) return;
    
    container.innerHTML = `
        <div style="text-align:center; padding:40px;">
            <div class="spinner-border text-primary"></div>
            <p>Calculando ranking...</p>
        </div>`;

    // Usa a tabela genérica para evitar erros
    const token = localStorage.getItem('token');
    fetch('/api/indicadores/ranking-b1', { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(data => {
        // Se a função genérica existir, usa ela. Se não, mostra mensagem simples.
        if(typeof construirTabelaRankingGenerica === 'function') {
            construirTabelaRankingGenerica(data, container, ['dt_ultima_consulta'], 100, 0);
        } else {
            container.innerHTML = '<div class="alert alert-warning">Tabela de ranking indisponível no momento.</div>';
        }
    })
    .catch(err => {
        console.warn("Ranking B1:", err);
        container.innerHTML = '<div class="alert alert-info">Sem dados de ranking para exibir.</div>';
    });
};

// ==========================================================
// MÓDULO C5 - HIPERTENSÃO (INSERIDO CIRURGICAMENTE)
// ==========================================================

// 5. C5 - HIPERTENSÃO
function carregarLayoutHipertensao() {
    injetarEstilosMultiselect();
    const container = document.getElementById('filtros-container-global');
    const tabelaContainer = document.getElementById('tabela-container-global');
    if(!container || !tabelaContainer) return;

    const cols = [
        {data:'no_cidadao',title:'NOME'}, {data:'dt_nascimento',title:'NASCIMENTO'}, {data:'nu_cpf',title:'CPF'},
        {data:'ind_a',title:'A'}, {data:'ind_b',title:'B'}, {data:'ind_c',title:'C'}, {data:'ind_d',title:'D'}
    ];
    const callExport = `baixarRelatorioCompleto('hipertensao', 'hipertensao', ${JSON.stringify(cols).replace(/"/g, "'")}, 'C5_Hipertensao.csv')`;

    container.style.display = 'flex';
    container.innerHTML = `<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; width:100%;"><select id="filtro-equipe-hipertensao" class="filtro-select"><option value="">Todas as Equipes</option></select><select id="filtro-microarea-hipertensao" class="filtro-select"><option value="">Todas as Microáreas</option></select>${typeof gerarHtmlMultiselect === 'function' ? gerarHtmlMultiselect('hipertensao') : ''}<button onclick="carregarDadosTelaHipertensao(1)" class="btn-buscar-filtros" style="background-color:#005aaa; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; height:38px;"><i class="fas fa-search"></i> Buscar</button></div>`;

    tabelaContainer.innerHTML = `
        <nav class="tab-nav"><button class="tab-btn active" data-tab="hipertensao-lista">Lista Nominal</button><button class="tab-btn" data-tab="hipertensao-percentual">Percentual</button></nav>
        <div class="tab-content-wrapper">
            <div id="tab-content-hipertensao-lista" class="tab-content active">
                <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
                    <button id="btn-export-hipertensao" onclick="${callExport}" style="background-color:#2e7d32; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-file-csv"></i> Exportar CSV</button>
                </div>
                <div id="container-lista-hipertensao"><div class="loading-clean">Selecione os filtros.</div></div>
                <div id="paginacao-hipertensao"></div>
            </div>
            <div id="tab-content-hipertensao-percentual" class="tab-content">
                <div id="container-ranking-hipertensao"></div>
                <div id="legenda-hipertensao" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                         <div style="flex: 1; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                            <h5>Pontuação</h5>
                             <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 0.8rem;">
                                <div style="border-left: 4px solid #e65100; padding-left: 5px;">Regular<br><b>0 a 25</b></div>
                                <div style="border-left: 4px solid #fbc02d; padding-left: 5px;">Suficiente<br><b>>25 a 50</b></div>
                                <div style="border-left: 4px solid #2e7d32; padding-left: 5px;">Bom<br><b>>50 a 75</b></div>
                                <div style="border-left: 4px solid #4a148c; padding-left: 5px;">Ótimo<br><b>>75 a 100</b></div>
                            </div>
                        </div>
                        <div style="flex: 1; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                            <p><span style="background:#5e35b1; color:white; padding:2px;">NM</span> Boas práticas</p>
                            <p><span style="background:#005aaa; color:white; padding:2px;">DN</span> Total hipertensos</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    if(typeof configurarAbas === 'function') configurarAbas(tabelaContainer, 'hipertensao', carregarRankingHipertensao);
    if(typeof preencherFiltroEquipes === 'function') preencherFiltroEquipes('filtro-equipe-hipertensao', 'filtro-microarea-hipertensao');
    const selectEquipe = document.getElementById('filtro-equipe-hipertensao');
    if (selectEquipe) { selectEquipe.addEventListener('change', (e) => { if(typeof preencherFiltroMicroareas === 'function') preencherFiltroMicroareas(e.target.value, 'filtro-microarea-hipertensao'); }); }
}

// --- BUSCA C5: HIPERTENSÃO ---
function carregarDadosTelaHipertensao(pagina = 1) {
    const container = document.getElementById('container-lista-hipertensao');
    const paginacao = document.getElementById('paginacao-hipertensao');
    if(container) container.innerHTML = '<div style="text-align:center; padding:30px;"><div class="spinner-border text-primary"></div><p>Buscando...</p></div>';
    if(paginacao) paginacao.innerHTML = '';

    const equipe = document.getElementById('filtro-equipe-hipertensao')?.value || '';
    const microarea = document.getElementById('filtro-microarea-hipertensao')?.value || '';

    let competencia = '';
    const checks = document.querySelectorAll('#dropdown-options-hipertensao input:checked');
    if (checks.length > 0) competencia = Array.from(checks).map(c => c.value).join(',');

    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ equipe, microarea, competencia, pagina });

    fetch(`/api/indicadores/hipertensao?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(res => {
        if(!container) return;
        container.innerHTML = '';
        if (!res.data || res.data.length === 0) { container.innerHTML = '<div style="padding:40px; text-align:center;">Nenhum registro.</div>'; return; }

        const colunas = [
            { data: 'no_cidadao', title: 'NOME' }, { data: 'dt_nascimento', title: 'NASCIMENTO' }, { data: 'nu_cpf', title: 'CPF' },
            { data: 'ind_a', title: 'A' }, { data: 'ind_b', title: 'B' }, { data: 'ind_c', title: 'C' }, { data: 'ind_d', title: 'D' }
        ];

        if(typeof construirTabelaAzul === 'function') construirTabelaAzul(res.data, colunas, container);
        if(typeof construirPaginacao === 'function') construirPaginacao('indicadores/hipertensao', res.pagination, { equipe, microarea, competencia }, paginacao);
    });
}

function carregarRankingHipertensao() {
    const container = document.getElementById('container-ranking-hipertensao');
    if(!container) return;
    
    container.innerHTML = `<div style="text-align:center; padding:40px;"><div class="spinner-border text-primary"></div><p>Calculando ranking C5...</p></div>`;
    const token = localStorage.getItem('token');

    fetch('/api/indicadores/ranking-hipertensao', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        construirTabelaRankingHipertensao(data, container);
    })
    .catch(err => {
        container.innerHTML = `<div style="color:red; padding:20px;">Erro: ${err.message}</div>`;
    });
}

function construirTabelaRankingHipertensao(data, container) {
    if (!container) return;
    container.innerHTML = '';
    if (!data || data.length === 0) {
        container.innerHTML = '<div style="padding:30px; text-align:center; color:#777;">Nenhum dado disponível.</div>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'tabela-ranking';
    table.style.width = '100%';
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    
    const colunas = [
        { title: 'EQUIPE', width: '30%', align: 'left' },
        { title: 'A', tooltip: 'Consulta (6m) - 25 pts' },
        { title: 'B', tooltip: 'PA (6m) - 25 pts' },
        { title: 'C', tooltip: 'Peso/Altura (12m) - 25 pts' },
        { title: 'D', tooltip: '2 Visitas (12m) - 25 pts' },
        { title: 'NM', tooltip: 'Pontuação Acumulada' },
        { title: 'DN', tooltip: 'Total Hipertensos' },
        { title: 'NOTA', tooltip: 'Nota Final (0-100)' }
    ];
    
    colunas.forEach(col => {
        const th = document.createElement('th');
        if (col.tooltip) th.innerHTML = `${col.title} <i class="fas fa-info-circle" title="${col.tooltip}"></i>`;
        else th.textContent = col.title;
        if(col.align) th.style.textAlign = col.align;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        
        const addCell = (text, align='center', color='#333', bg='transparent') => {
            const td = document.createElement('td');
            td.textContent = text !== undefined ? text : '0';
            td.style.textAlign = align;
            td.style.color = color;
            td.style.backgroundColor = bg;
            tr.appendChild(td);
        };

        addCell(row.equipe, 'left', '#000');
        ['a','b','c','d'].forEach(k => addCell(row[k]));
        addCell(row.nm, 'center', '#005aaa', '#eef2ff');
        addCell(row.dn, 'center', '#005aaa', '#eef2ff');
        
        const nota = parseFloat(row.pontuacao || 0);
        // Meta C5: Geralmente similar aos outros, usando 75% como corte verde
        const cor = nota >= 75 ? '#198754' : (nota <= 25 ? '#dc3545' : '#d35400');
        addCell(row.pontuacao, 'center', cor, '#f0fdf4');
        
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
}


// ==========================================================
// MÓDULO C6 - PESSOA IDOSA
// ==========================================================

// 6. C6 - IDOSO
function carregarLayoutIdoso() {
    injetarEstilosMultiselect();
    const container = document.getElementById('filtros-container-global');
    const tabelaContainer = document.getElementById('tabela-container-global');
    if(!container || !tabelaContainer) return;

    const cols = [
        {data:'no_cidadao',title:'NOME'}, {data:'dt_nascimento',title:'NASCIMENTO'}, {data:'nu_cpf',title:'CPF'},
        {data:'ind_a',title:'A'}, {data:'ind_b',title:'B'}, {data:'ind_c',title:'C'}, {data:'ind_d',title:'D'}
    ];
    const callExport = `baixarRelatorioCompleto('idoso', 'idoso', ${JSON.stringify(cols).replace(/"/g, "'")}, 'C6_Idoso.csv')`;

    container.style.display = 'flex';
    container.innerHTML = `<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; width:100%;"><select id="filtro-equipe-idoso" class="filtro-select"><option value="">Todas as Equipes</option></select><select id="filtro-microarea-idoso" class="filtro-select"><option value="">Todas as Microáreas</option></select>${typeof gerarHtmlMultiselect === 'function' ? gerarHtmlMultiselect('idoso') : ''}<button onclick="carregarDadosTelaIdoso(1)" class="btn-buscar-filtros" style="background-color:#005aaa; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; height:38px;"><i class="fas fa-search"></i> Buscar</button></div>`;

    tabelaContainer.innerHTML = `
        <nav class="tab-nav"><button class="tab-btn active" data-tab="idoso-lista">Lista Nominal</button><button class="tab-btn" data-tab="idoso-percentual">Percentual</button></nav>
        <div class="tab-content-wrapper">
            <div id="tab-content-idoso-lista" class="tab-content active">
                <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
                    <button id="btn-export-idoso" onclick="${callExport}" style="background-color:#2e7d32; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-file-csv"></i> Exportar CSV</button>
                </div>
                <div id="container-lista-idoso"><div class="loading-clean">Selecione os filtros.</div></div>
                <div id="paginacao-idoso"></div>
            </div>
            <div id="tab-content-idoso-percentual" class="tab-content">
                <div id="container-ranking-idoso"></div>
                <div id="legenda-idoso" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                         <div style="flex: 1; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                            <h5>Pontuação</h5>
                             <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 0.8rem;">
                                <div style="border-left: 4px solid #e65100; padding-left: 5px;">Regular<br><b>0 a 25</b></div>
                                <div style="border-left: 4px solid #fbc02d; padding-left: 5px;">Suficiente<br><b>>25 a 50</b></div>
                                <div style="border-left: 4px solid #2e7d32; padding-left: 5px;">Bom<br><b>>50 a 75</b></div>
                                <div style="border-left: 4px solid #4a148c; padding-left: 5px;">Ótimo<br><b>>75 a 100</b></div>
                            </div>
                        </div>
                        <div style="flex: 1; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                            <p><span style="background:#5e35b1; color:white; padding:2px;">NM</span> Boas práticas</p>
                            <p><span style="background:#005aaa; color:white; padding:2px;">DN</span> Total idosos</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    if(typeof configurarAbas === 'function') configurarAbas(tabelaContainer, 'idoso', carregarRankingIdoso);
    if(typeof preencherFiltroEquipes === 'function') preencherFiltroEquipes('filtro-equipe-idoso', 'filtro-microarea-idoso');
    const selectEquipe = document.getElementById('filtro-equipe-idoso');
    if (selectEquipe) { selectEquipe.addEventListener('change', (e) => { if(typeof preencherFiltroMicroareas === 'function') preencherFiltroMicroareas(e.target.value, 'filtro-microarea-idoso'); }); }
}

// --- BUSCA C6: IDOSO ---
function carregarDadosTelaIdoso(pagina = 1) {
    const container = document.getElementById('container-lista-idoso');
    const paginacao = document.getElementById('paginacao-idoso');
    if(container) container.innerHTML = '<div style="text-align:center; padding:30px;"><div class="spinner-border text-primary"></div><p>Buscando...</p></div>';
    if(paginacao) paginacao.innerHTML = '';

    const equipe = document.getElementById('filtro-equipe-idoso')?.value || '';
    const microarea = document.getElementById('filtro-microarea-idoso')?.value || '';

    let competencia = '';
    const checks = document.querySelectorAll('#dropdown-options-idoso input:checked');
    if (checks.length > 0) competencia = Array.from(checks).map(c => c.value).join(',');

    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ equipe, microarea, competencia, pagina });

    fetch(`/api/indicadores/idoso?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(res => {
        if(!container) return;
        container.innerHTML = '';
        if (!res.data || res.data.length === 0) { container.innerHTML = '<div style="padding:40px; text-align:center;">Nenhum registro.</div>'; return; }

        const colunas = [
            { data: 'no_cidadao', title: 'NOME' }, { data: 'dt_nascimento', title: 'NASCIMENTO' }, { data: 'nu_cpf', title: 'CPF' },
            { data: 'ind_a', title: 'A' }, { data: 'ind_b', title: 'B' }, { data: 'ind_c', title: 'C' }, { data: 'ind_d', title: 'D' }
        ];

        if(typeof construirTabelaAzul === 'function') construirTabelaAzul(res.data, colunas, container);
        if(typeof construirPaginacao === 'function') construirPaginacao('indicadores/idoso', res.pagination, { equipe, microarea, competencia }, paginacao);
    });
}

function carregarRankingIdoso() {
    const container = document.getElementById('container-ranking-idoso');
    if(!container) return;
    container.innerHTML = 'Calculando...';
    fetch('/api/indicadores/ranking-idoso', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
    .then(res => res.json())
    .then(data => {
        construirTabelaRankingGenerica(data, container, ['a','b','c','d'], 75, 25);
    });
}


// ==========================================================
// FUNÇÕES AUXILIARES GLOBAIS (CORREÇÃO DE ERROS DE REFERÊNCIA)
// ==========================================================

function configurarAbas(container, prefixo, callbackRanking) {
    const tabButtons = container.querySelectorAll('.tab-btn');
    const tabContents = container.querySelectorAll('.tab-content');
    const filtrosGlobais = document.getElementById('filtros-container-global');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(`tab-content-${tabId}`).classList.add('active');

            if (tabId === `${prefixo}-percentual`) {
                if(filtrosGlobais) filtrosGlobais.style.display = 'none';
                if(typeof callbackRanking === 'function') callbackRanking();
            } else {
                if(filtrosGlobais) filtrosGlobais.style.display = 'flex';
            }
        });
    });
}

function adicionarBotaoExportar(container, api, filtros, colunas, nomeArquivo) {
    // Remove botão anterior se existir para não duplicar
    const btnExistente = container.querySelector('.btn-export-csv-dinamico');
    if(btnExistente) btnExistente.remove();

    const btnDiv = document.createElement('div');
    btnDiv.className = 'btn-export-csv-dinamico';
    btnDiv.style.cssText = "display:flex; justify-content:flex-end; margin-bottom:15px; width:100%;";
    
    const btn = document.createElement('button');
    btn.className = 'btn btn-success btn-sm';
    btn.innerHTML = '<i class="fas fa-file-csv"></i> Exportar CSV';
    
    btn.onclick = async () => {
        const textoOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Baixando...';
        btn.disabled = true;
        try {
            const params = new URLSearchParams({ ...filtros, limit: 1000000, exportar: 'true' });
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/indicadores/${api}?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            
            if(!json.data || json.data.length === 0) throw new Error('Sem dados para exportar.');
            
            if(typeof baixarCSV === 'function') {
                baixarCSV(json.data, colunas, nomeArquivo);
            } else {
                alert('Erro: Função baixarCSV não encontrada.');
            }
        } catch(e) { 
            alert('Erro: ' + e.message); 
        } finally { 
            btn.innerHTML = textoOriginal; 
            btn.disabled = false; 
        }
    };
    btnDiv.appendChild(btn);
    
    // Insere no topo do container
    if (container.firstChild) {
        container.insertBefore(btnDiv, container.firstChild);
    } else {
        container.appendChild(btnDiv);
    }
}

function construirTabelaRankingGenerica(data, container, chavesIndicadores, metaVerde, metaVermelha) {
    if(!container) return;
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'tabela-ranking';
    table.style.width = '100%';
    
    let htmlHeader = '<thead><tr><th style="text-align:left; background:#005aaa; color:#fff; padding:10px;">EQUIPE</th>';
    chavesIndicadores.forEach(k => htmlHeader += `<th style="background:#005aaa; color:#fff; text-align:center;">${k.toUpperCase()}</th>`);
    htmlHeader += '<th style="background:#005aaa; color:#fff; text-align:center;">NM</th><th style="background:#005aaa; color:#fff; text-align:center;">DN</th><th style="background:#005aaa; color:#fff; text-align:center;">NOTA</th></tr></thead>';
    table.innerHTML = htmlHeader;

    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        let htmlRow = `<td style="text-align:left; padding:10px;">${row.equipe || row.no_equipe || 'Sem Equipe'}</td>`;
        chavesIndicadores.forEach(k => htmlRow += `<td style="text-align:center;">${row[k] || 0}</td>`);
        
        htmlRow += `<td style="text-align:center; font-weight:bold; color:#005aaa;">${row.nm || 0}</td>`;
        htmlRow += `<td style="text-align:center; font-weight:bold; color:#005aaa;">${row.dn || 0}</td>`;
        
        const nota = parseFloat(row.pontuacao || 0);
        const cor = nota >= metaVerde ? '#198754' : (nota <= metaVermelha ? '#dc3545' : '#d35400');
        htmlRow += `<td style="text-align:center; font-weight:bold; color:${cor};">${row.pontuacao}</td>`;
        
        tr.innerHTML = htmlRow;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
}

// ==========================================================
// MÓDULO C7 - SAÚDE DA MULHER
// ==========================================================

// 7. C7 - MULHER
function carregarLayoutMulher() {
    injetarEstilosMultiselect();
    const container = document.getElementById('filtros-container-global');
    const tabelaContainer = document.getElementById('tabela-container-global');
    if(!container || !tabelaContainer) return;

    const cols = [
        {data:'no_cidadao',title:'NOME'}, {data:'idade',title:'IDADE'}, {data:'nu_cpf',title:'CPF'},
        {data:'ind_a',title:'A'}, {data:'ind_b',title:'B'}, {data:'ind_c',title:'C'}, {data:'ind_d',title:'D'}
    ];
    const callExport = `baixarRelatorioCompleto('mulher', 'mulher', ${JSON.stringify(cols).replace(/"/g, "'")}, 'C7_SaudeMulher.csv')`;

    container.style.display = 'flex';
    container.innerHTML = `<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; width:100%;"><select id="filtro-equipe-mulher" class="filtro-select"><option value="">Todas as Equipes</option></select><select id="filtro-microarea-mulher" class="filtro-select"><option value="">Todas as Microáreas</option></select>${typeof gerarHtmlMultiselect === 'function' ? gerarHtmlMultiselect('mulher') : ''}<button onclick="carregarDadosTelaMulher(1)" class="btn-buscar-filtros" style="background-color:#005aaa; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; height:38px;"><i class="fas fa-search"></i> Buscar</button></div>`;

    tabelaContainer.innerHTML = `
        <nav class="tab-nav"><button class="tab-btn active" data-tab="mulher-lista">Lista Nominal</button><button class="tab-btn" data-tab="mulher-percentual">Percentual</button></nav>
        <div class="tab-content-wrapper">
            <div id="tab-content-mulher-lista" class="tab-content active">
                <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
                    <button id="btn-export-mulher" onclick="${callExport}" style="background-color:#2e7d32; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-file-csv"></i> Exportar CSV</button>
                </div>
                <div id="container-lista-mulher"><div class="loading-clean">Selecione os filtros.</div></div>
                <div id="paginacao-mulher"></div>
            </div>
            <div id="tab-content-mulher-percentual" class="tab-content">
                <div id="container-ranking-mulher"></div>
                <div id="legenda-mulher" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                     <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div style="flex: 0 0 300px; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                            <h5>Pontuação</h5>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 0.8rem;">
                                <div style="border-left: 4px solid #e65100; padding-left: 5px;">Regular<br><b>0 a 25</b></div>
                                <div style="border-left: 4px solid #fbc02d; padding-left: 5px;">Suficiente<br><b>>25 a 50</b></div>
                                <div style="border-left: 4px solid #2e7d32; padding-left: 5px;">Bom<br><b>>50 a 75</b></div>
                                <div style="border-left: 4px solid #4a148c; padding-left: 5px;">Ótimo<br><b>>75 a 100</b></div>
                            </div>
                        </div>
                        <div style="flex: 1; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                            <h5 style="color:#005aaa;">Boas Práticas</h5>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px; font-size:0.85rem;">
                                <div style="background:#f9f9f9; padding:10px; border-left:3px solid #005aaa;"><b>NM.A (20pts) / DN.A</b><br>Citopatológico</div>
                                <div style="background:#f9f9f9; padding:10px; border-left:3px solid #005aaa;"><b>NM.B (30pts) / DN.B</b><br>Vacina HPV</div>
                                <div style="background:#f9f9f9; padding:10px; border-left:3px solid #005aaa;"><b>NM.C (30pts) / DN.C</b><br>Saúde Sexual</div>
                                <div style="background:#f9f9f9; padding:10px; border-left:3px solid #005aaa;"><b>NM.D (20pts) / DN.D</b><br>Mamografia</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    if(typeof configurarAbas === 'function') configurarAbas(tabelaContainer, 'mulher', carregarRankingMulher);
    if(typeof preencherFiltroEquipes === 'function') preencherFiltroEquipes('filtro-equipe-mulher', 'filtro-microarea-mulher');
    const selectEquipe = document.getElementById('filtro-equipe-mulher');
    if (selectEquipe) { selectEquipe.addEventListener('change', (e) => { if(typeof preencherFiltroMicroareas === 'function') preencherFiltroMicroareas(e.target.value, 'filtro-microarea-mulher'); }); }
}

// --- BUSCA C7: MULHER ---
function carregarDadosTelaMulher(pagina = 1) {
    const container = document.getElementById('container-lista-mulher');
    const paginacao = document.getElementById('paginacao-mulher');
    if(container) container.innerHTML = '<div style="text-align:center; padding:30px;"><div class="spinner-border text-primary"></div><p>Buscando...</p></div>';
    if(paginacao) paginacao.innerHTML = '';

    const equipe = document.getElementById('filtro-equipe-mulher')?.value || '';
    const microarea = document.getElementById('filtro-microarea-mulher')?.value || '';

    let competencia = '';
    const checks = document.querySelectorAll('#dropdown-options-mulher input:checked');
    if (checks.length > 0) competencia = Array.from(checks).map(c => c.value).join(',');

    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ equipe, microarea, competencia, pagina });

    fetch(`/api/indicadores/mulher?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(res => {
        if(!container) return;
        container.innerHTML = '';
        if (!res.data || res.data.length === 0) { container.innerHTML = '<div style="padding:40px; text-align:center;">Nenhum registro.</div>'; return; }

        const colunas = [
            { data: 'no_cidadao', title: 'NOME' }, { data: 'idade', title: 'IDADE' }, { data: 'nu_cpf', title: 'CPF' },
            { data: 'ind_a', title: 'A' }, { data: 'ind_b', title: 'B' }, { data: 'ind_c', title: 'C' }, { data: 'ind_d', title: 'D' }
        ];

        if(typeof construirTabelaAzul === 'function') construirTabelaAzul(res.data, colunas, container);
        if(typeof construirPaginacao === 'function') construirPaginacao('indicadores/mulher', res.pagination, { equipe, microarea, competencia }, paginacao);
    });
}

function carregarRankingMulher() {
    const container = document.getElementById('container-ranking-mulher');
    if(!container) return;
    container.innerHTML = 'Calculando...';
    fetch('/api/indicadores/ranking-mulher', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
    .then(res => res.json())
    .then(data => {
        construirTabelaRankingMulherDetalhada(data, container);
    });
}

function construirTabelaRankingMulherDetalhada(data, container) {
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'tabela-ranking';
    table.style.width = '100%';
    table.style.fontSize = '0.85rem';

    // Header Complexo
    let thead = `
        <thead>
            <tr>
                <th rowspan="2" style="text-align:left; background:#005aaa; color:#fff; vertical-align:middle;">EQUIPE</th>
                <th colspan="3" style="background:#004a8d; color:#fff; text-align:center;">A (Cito - 20pts)</th>
                <th colspan="3" style="background:#004a8d; color:#fff; text-align:center;">B (HPV - 30pts)</th>
                <th colspan="3" style="background:#004a8d; color:#fff; text-align:center;">C (Cons - 30pts)</th>
                <th colspan="3" style="background:#004a8d; color:#fff; text-align:center;">D (Mama - 20pts)</th>
                <th rowspan="2" style="background:#005aaa; color:#fff; vertical-align:middle;">TOTAL</th>
            </tr>
            <tr>
                ${'<th style="background:#005aaa; color:#fff;">NM</th><th style="background:#005aaa; color:#fff;">DN</th><th style="background:#005aaa; color:#fff;">NOTA</th>'.repeat(4)}
            </tr>
        </thead>
    `;
    table.innerHTML = thead;

    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        
        let html = `<td style="text-align:left; font-weight:600;">${row.equipe}</td>`;
        
        // Regra A
        html += `<td>${row.nm_a}</td><td>${row.dn_a}</td><td style="font-weight:bold; color:#005aaa;">${row.nota_a}</td>`;
        // Regra B
        html += `<td>${row.nm_b}</td><td>${row.dn_b}</td><td style="font-weight:bold; color:#005aaa;">${row.nota_b}</td>`;
        // Regra C
        html += `<td>${row.nm_c}</td><td>${row.dn_c}</td><td style="font-weight:bold; color:#005aaa;">${row.nota_c}</td>`;
        // Regra D
        html += `<td>${row.nm_d}</td><td>${row.dn_d}</td><td style="font-weight:bold; color:#005aaa;">${row.nota_d}</td>`;
        
        // Total
        const total = parseFloat(row.pontuacao_final);
        const cor = total >= 100 ? '#198754' : (total < 50 ? '#dc3545' : '#d35400');
        html += `<td style="font-weight:bold; font-size:1.1em; color:${cor}; background:#f8f9fa;">${row.pontuacao_final}</td>`;

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
}



// ==========================================================
// ESTILOS DO MULTI-SELECT (C1)
// ==========================================================
function injetarEstilosMultiselect() {
    if (document.getElementById('style-multiselect')) return;
    const style = document.createElement('style');
    style.id = 'style-multiselect';
    style.innerHTML = `
        .multiselect { position: relative; display: inline-block; min-width: 160px; font-family: sans-serif; }
        .select-box { 
            position: relative; width: 100%; cursor: pointer; background: #fff; 
            border: 1px solid #ccc; border-radius: 4px; padding: 8px 10px; 
            display: flex; align-items: center; justify-content: space-between; 
            font-size: 0.9em; color: #555; height: 38px;
        }
        .select-box:after { content: "▼"; font-size: 0.7em; margin-left: 10px; }
        .options-container { 
            display: none; position: absolute; top: 100%; left: 0; right: 0; 
            background: #fff; border: 1px solid #ccc; border-top: none; 
            border-radius: 0 0 4px 4px; z-index: 1000; max-height: 250px; 
            overflow-y: auto; box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
        }
        .options-container.active { display: block; }
        .option-group { font-weight: bold; background: #f0f0f0; padding: 5px 10px; font-size: 0.85em; color: #005aaa; }
        .option-item { 
            padding: 8px 10px; cursor: pointer; border-bottom: 1px solid #eee; 
            display: flex; align-items: center; gap: 8px; font-size: 0.9em; 
        }
        .option-item:hover { background: #eef5ff; }
        .option-item input { transform: scale(1.2); cursor: pointer; }
    `;
    document.head.appendChild(style);
}

// ==========================================================
// FUNÇÕES AUXILIARES DO FILTRO C1 (DOPDOWN CUSTOMIZADO)
// Coloque isto no final do arquivo public/js/main.js
// ==========================================================

function toggleDropdownC1() {
    const d = document.getElementById("dropdown-options-c1");
    if(d) d.classList.toggle("active");
}

function toggleCheckboxC1(div) {
    const checkbox = div.querySelector('input');
    checkbox.checked = !checkbox.checked;
    atualizarTextoC1();
}

function atualizarTextoC1() {
    const checks = document.querySelectorAll('#dropdown-options-c1 input:checked');
    const display = document.getElementById('display-texto-c1');
    if(!display) return;

    if(checks.length === 0) display.innerText = "Selecione os Meses...";
    else if(checks.length === 1) display.innerText = "1 Mês selecionado";
    else display.innerText = `${checks.length} Meses selecionados`;
}

// Fecha o dropdown se clicar fora (Listener Global)
window.addEventListener('click', function(e) {
    if (!e.target.closest('.multiselect')) {
        const dropdown = document.getElementById("dropdown-options-c1");
        if (dropdown && dropdown.classList.contains('active')) {
            dropdown.classList.remove('active');
        }
    }
});


// --- GERADOR DE HTML DO MULTI-SELECT (Reutilizável) ---
function gerarHtmlMultiselect(idSuffix) {
    let htmlOptions = '';
    const meses = [
        {v:'01', n:'Jan'}, {v:'02', n:'Fev'}, {v:'03', n:'Mar'}, {v:'04', n:'Abr'},
        {v:'05', n:'Mai'}, {v:'06', n:'Jun'}, {v:'07', n:'Jul'}, {v:'08', n:'Ago'},
        {v:'09', n:'Set'}, {v:'10', n:'Out'}, {v:'11', n:'Nov'}, {v:'12', n:'Dez'}
    ];
    [2025, 2026].forEach(ano => {
        htmlOptions += `<div class="option-group">${ano}</div>`;
        meses.forEach(mes => {
            // Nota: Passamos o ID Suffix para o evento saber quem atualizar
            htmlOptions += `
                <div class="option-item" onclick="toggleCheckboxGeneral(event, '${idSuffix}')">
                    <input type="checkbox" value="${ano}-${mes.v}"> ${mes.n}/${ano}
                </div>`;
        });
    });

    return `
        <div class="multiselect" id="multiselect-${idSuffix}">
            <div class="select-box" onclick="toggleDropdownGeneral('${idSuffix}')">
                <span id="display-texto-${idSuffix}">Selecione os Meses...</span>
            </div>
            <div class="options-container" id="dropdown-options-${idSuffix}">
                ${htmlOptions}
            </div>
        </div>
    `;
}

// --- FUNÇÕES DE LÓGICA GENÉRICAS ---
function toggleDropdownGeneral(idSuffix) {
    const d = document.getElementById(`dropdown-options-${idSuffix}`);
    if(d) d.classList.toggle("active");
}

function toggleCheckboxGeneral(event, idSuffix) {
    if (event.target.tagName === 'INPUT') {
        atualizarTextoGeneral(idSuffix);
        return; 
    }
    const checkbox = event.currentTarget.querySelector('input');
    checkbox.checked = !checkbox.checked;
    atualizarTextoGeneral(idSuffix);
}

function atualizarTextoGeneral(idSuffix) {
    const checks = document.querySelectorAll(`#dropdown-options-${idSuffix} input:checked`);
    const display = document.getElementById(`display-texto-${idSuffix}`);
    if(!display) return;
    if(checks.length === 0) display.innerText = "Selecione os Meses...";
    else if(checks.length === 1) display.innerText = "1 Mês selecionado";
    else display.innerText = `${checks.length} Meses selecionados`;
}

// =================================================================
// NOVAS FUNÇÕES DE EXPORTAÇÃO (ADICIONADAS AQUI)
// =================================================================

function baixarCSV(dados, colunas, nomeArquivo) {
    if (!dados || !dados.length) { alert('Sem dados para exportar.'); return; }
    
    // Cria o cabeçalho (BOM \ufeff para acentos no Excel)
    let csv = "\ufeff" + colunas.map(c => c.title).join(";") + "\n";
    
    // Cria as linhas
    dados.forEach(row => {
        csv += colunas.map(c => {
            let val = row[c.data];
            // Tratamento de nulos e limpeza de quebras de linha
            val = (val === null || val === undefined) ? "" : String(val).replace(/(\r\n|\n|\r)/gm, " ");
            return `"${val.replace(/"/g, '""')}"`; // Escapa aspas duplas
        }).join(";") + "\n";
    });

    // Gera o download
    const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function baixarRelatorioCompleto(tipoIndicador, idSufixo, colunas, nomeArquivo) {
    const btn = document.getElementById(`btn-export-${idSufixo}`);
    const textoOriginal = btn ? btn.innerHTML : '';
    
    if(btn) { 
        btn.disabled = true; 
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Baixando...'; 
    }

    try {
        // Captura os filtros da tela
        const equipe = document.getElementById(`filtro-equipe-${idSufixo}`)?.value || '';
        const microarea = document.getElementById(`filtro-microarea-${idSufixo}`)?.value || '';
        
        // Captura competência (C1 usa ID diferente, os outros usam o sufixo padrão)
        const idDrop = idSufixo === 'mais-acesso' ? 'c1' : idSufixo;
        const checks = document.querySelectorAll(`#dropdown-options-${idDrop} input:checked`);
        const competencia = Array.from(checks).map(c => c.value).join(',');

        // Monta a URL com limit alto para trazer tudo
        const params = new URLSearchParams({ 
            equipe, 
            microarea, 
            competencia, 
            exportar: 'true', 
            limit: 1000000 
        });
        
        const response = await fetch(`/api/indicadores/${tipoIndicador}?${params}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if(!response.ok) throw new Error('Erro na comunicação com o servidor.');
        
        const json = await response.json();
        baixarCSV(json.data, colunas, nomeArquivo);
        
    } catch (e) {
        console.error(e);
        alert('Erro ao exportar: ' + e.message);
    } finally {
        if(btn) { 
            btn.disabled = false; 
            btn.innerHTML = textoOriginal; 
        }
    }
}


// Garante que o HTML consiga ver a função
window.carregarLayoutB1 = carregarLayoutB1;
console.log("🔓 Função B1 liberada para o HTML!");





