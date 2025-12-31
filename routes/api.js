/**
 * ARQUIVO: routes/api.js
 * VERSÃO: V.60 (CORREÇÃO TOTAL + ROTAS PRESERVADAS)
 * DESCRIÇÃO: 
 * 1. Corrige erro crítico 'syntax error' (ANY($1)) em Gestantes.
 * 2. Corrige parâmetro de filtro de equipe ($).
 * 3. Restaura todas as rotas (Infantil, Mais Acesso, Diabetes, Hipertensão).
 * 4. Remove código duplicado/corrompido do final do arquivo.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db.js');
const pool = db.pool || db;
const NodeCache = require('node-cache');

// Configuração de Cache
const myCache = new NodeCache({ stdTTL: 600, useClones: false, deleteOnExpire: true });
const schemaCache = new NodeCache({ stdTTL: 3600 });
const gestantesProcedimentoCache = new NodeCache({ stdTTL: 4 * 60 * 60, useClones: false });

// Middleware de Autenticação
const authenticateToken = require('../middleware/auth.js');
const authRoutes = require('./auth.js');

router.use('/auth', authRoutes);
router.use('/indicadores', authenticateToken);

// ==========================================================
// ROTA DE TESTE
// ==========================================================
router.get('/teste', async (req, res) => {
    try {
        const consulta = await pool.query('SELECT NOW() AS hora_do_banco');
        res.json({ mensagem: "API Online", dados: consulta.rows[0] });
    } catch (err) { res.status(500).json({ erro: 'Erro no banco' }); }
});

// Helper: Introspecção
const getColunasTabela = async (tabela) => {
    const cacheKey = `schema_${tabela}`;
    const cached = schemaCache.get(cacheKey);
    if (cached) return cached;
    try {
        const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [tabela]);
        const cols = res.rows.map(r => r.column_name);
        schemaCache.set(cacheKey, cols);
        return cols;
    } catch (err) { return []; }
};

// ==========================================================
// FUNÇÃO AUXILIAR GENÉRICA (PAGINAÇÃO) - CORRIGIDA V.61
// ==========================================================
const executarConsultaPaginada = async (req, res, sqlDados, sqlContagem, paramsDados = [], paramsContagem = [], colunas) => {
    const isExport = req.query.exportar === 'true';
    const limit = isExport ? 1000000 : 15;
    let pagina = parseInt(req.query.pagina, 10);
    if (isNaN(pagina) || pagina < 1) pagina = 1;
    const offset = (pagina - 1) * limit;

    const paramsFinal = [...paramsDados, limit, offset];
    const paramsCount = paramsContagem.length > 0 ? paramsContagem : paramsDados;

    try {
        if (isExport) {
            const resDados = await pool.query(sqlDados, paramsFinal);
            // CORREÇÃO: Mapeia 'columns: colunas' corretamente
            return res.json({ data: resDados.rows, columns: colunas, fullExport: true });
        }

        const [resDados, resTotal] = await Promise.all([
            pool.query(sqlDados, paramsFinal),
            pool.query(sqlContagem, paramsCount)
        ]);

        const total = parseInt(resTotal.rows[0]?.count || resTotal.rows[0]?.total || 0, 10);
        
        return res.json({
            data: resDados.rows,
            pagination: { 
                page: pagina, 
                totalPages: Math.ceil(total / limit), 
                totalRows: total 
            },
            // CORREÇÃO: Mapeia 'columns: colunas' corretamente
            columns: colunas 
        });
    } catch (err) {
        console.error(`ERRO SQL (${req.path}):`, err.message);
        res.status(500).json({ error: 'Erro interno', details: err.message });
    }
};

// ==========================================================
// ROTA: LISTAR MICROÁREAS (FILTRO AUXILIAR)
// ==========================================================
router.get('/indicadores/microareas', async (req, res) => {
    const { equipe } = req.query;
    let sql;
    let params = [];

    try {
        if (equipe && equipe.trim()) {
            // Se uma equipe for fornecida, a query usa JOIN para filtrar pelas microáreas daquela equipe.
            sql = `
                SELECT DISTINCT tt.nu_micro_area
                FROM tb_fat_cidadao_territorio tt
                JOIN tb_fat_cidadao_pec pec ON tt.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec
                JOIN tb_dim_equipe te ON pec.co_dim_equipe_vinc = te.co_seq_dim_equipe
                WHERE tt.nu_micro_area IS NOT NULL
            `;
            
            params.push(equipe.trim());
            const ph = `$1`; // O parâmetro será sempre $1
            // Aceita tanto INE (número) quanto Nome da Equipe (string)
            sql += /^\d+$/.test(equipe) 
                ? ` AND te.nu_ine = ${ph}` 
                : ` AND te.no_equipe = ${ph}`;
        } else {
            // Se nenhuma equipe for fornecida, busca todas as microáreas distintas diretamente.
            sql = `
                SELECT DISTINCT nu_micro_area 
                FROM tb_fat_cidadao_territorio
                WHERE nu_micro_area IS NOT NULL
            `;
        }
        
        sql += ' ORDER BY 1 ASC';
        
        const result = await pool.query(sql, params);
        // Mapeia para um array de strings, removendo espaços em branco, que é o que o front-end espera.
        const microareas = result.rows.map(row => String(row.nu_micro_area).trim());
        res.json(microareas);

    } catch (err) {
        console.error('ERRO AO BUSCAR MICROÁREAS:', err.message);
        res.status(500).json({ error: 'Erro ao buscar microáreas.', details: err.message });
    }
});

// ==========================================================
// FUNÇÕES CORE: GESTANTES (CORRIGIDAS)
// ==========================================================

// --- C3: GESTANTES BASE (COM DATA REF E MICROAREA FIX) ---
async function extrairDadosGestantesBase(filtros = {}, paginacao = {}) {
    const { equipe, microarea, competencia } = filtros;
    const { limit = 15, offset = 0 } = paginacao;

    // 1. Data de Referência
    const dataRef = (competencia && competencia.trim()) 
      ? new Date(competencia.split(',')[0] + '-28') 
      : new Date();
    if (competencia) dataRef.setDate(new Date(dataRef.getFullYear(), dataRef.getMonth() + 1, 0).getDate());
    const dataRefSql = dataRef.toISOString().split('T')[0];

    const params = [dataRefSql];
    let whereEquipe = '';
    let whereMicroarea = '';

    if (equipe && equipe.trim()) {
        params.push(equipe.trim());
        whereEquipe = `AND (TRIM(te.nu_ine::text) = $${params.length} OR TRIM(te.no_equipe) = $${params.length})`;
    }

    if (microarea && microarea.trim()) {
        params.push(microarea.trim());
        // Lógica LTRIM igual ao C2
        whereMicroarea = `AND EXISTS (SELECT 1 FROM tb_fat_cidadao_territorio tt WHERE tt.co_fat_cidadao_pec = ponte.co_seq_fat_cidadao_pec AND LTRIM(tt.nu_micro_area, '0') = LTRIM($${params.length}, '0'))`;
    }

    // CTE para identificar as gestantes ativas na data de referência
    const cteGestantes = `
        WITH ultimos_registros AS (
            SELECT DISTINCT ON (ap.co_fat_cidadao_pec)
                ap.co_fat_cidadao_pec, 
                ap.nu_idade_gestacional_semanas, 
                t_atend.dt_registro AS data_dum_recente, 
                ap.co_dim_equipe_1
            FROM tb_fat_atendimento_individual ap
            JOIN tb_dim_tempo t_atend ON ap.co_dim_tempo = t_atend.co_seq_dim_tempo
            LEFT JOIN tb_dim_equipe te ON ap.co_dim_equipe_1 = te.co_seq_dim_equipe
            WHERE t_atend.dt_registro <= $1 
              AND t_atend.dt_registro >= ($1::date - INTERVAL '14 months') 
              AND ap.nu_idade_gestacional_semanas > 0 
              ${whereEquipe}
            ORDER BY ap.co_fat_cidadao_pec, t_atend.dt_registro DESC
        ),
        gestantes_validas AS ( 
            -- Regra: A data da DUM + 330 dias (aprox 11 meses) deve ser maior que a data de referência
            -- Ou seja, na data de referência, a gravidez ainda não "venceu"
            SELECT * FROM ultimos_registros 
            WHERE (data_dum_recente + INTERVAL '330 days') >= $1::date 
        )
    `;

    // 2. QUERY CONTAGEM
    const sqlCount = `
        ${cteGestantes}
        SELECT COUNT(*) as total FROM gestantes_validas gv
        JOIN tb_fat_cidadao_pec ponte ON gv.co_fat_cidadao_pec = ponte.co_seq_fat_cidadao_pec
        WHERE 1=1 ${whereMicroarea}
    `;

    const resTotal = await pool.query(sqlCount, params);
    const total = parseInt(resTotal.rows[0]?.total || 0, 10);

    if (total === 0) return { dados: [], total: 0, dataRef };

    // 3. QUERY DADOS (Paginada)
    // Precisamos incluir LIMIT e OFFSET nos parâmetros
    const paramsDados = [...params, limit, offset];
    const sqlDados = `
        ${cteGestantes}
        SELECT 
            gv.co_fat_cidadao_pec, 
            gv.data_dum_recente, 
            (SELECT no_equipe FROM tb_dim_equipe WHERE co_seq_dim_equipe = gv.co_dim_equipe_1) as nome_equipe,
            c.no_cidadao, c.nu_cpf, c.nu_cns, c.dt_nascimento
        FROM gestantes_validas gv
        JOIN tb_fat_cidadao_pec ponte ON gv.co_fat_cidadao_pec = ponte.co_seq_fat_cidadao_pec
        JOIN tb_cidadao c ON ponte.co_cidadao = c.co_seq_cidadao
        WHERE 1=1 ${whereMicroarea}
        ORDER BY c.no_cidadao ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const resDados = await pool.query(sqlDados, paramsDados);
    return { dados: resDados.rows, total, dataRef };
}

// --- VERSÃO CORRIGIDA (C3) ---
async function processarRegrasGestantes(listaCidadaos, dataRef) {
    if (!listaCidadaos || listaCidadaos.length === 0) return [];

    const idsGestantes = listaCidadaos.map(g => String(g.co_fat_cidadao_pec));
    
    // Data de Referência
    const dataRefObj = dataRef instanceof Date ? dataRef : new Date(dataRef || Date.now());
    dataRefObj.setHours(0,0,0,0);
    const dataRefSql = dataRefObj.toISOString().split('T')[0];
    const hoje = dataRefObj;

    const params = [idsGestantes, dataRefSql];
    const filtroTempo = "AND t.dt_registro <= $2::date"; 

    // SQL Unificado e Destravado
    const sqlEventos = `
        -- Consultas
        SELECT co_fat_cidadao_pec, 'CONSULTA' as tipo, t.dt_registro, cbo.nu_cbo, ai.nu_pressao_sistolica as pa, ai.nu_peso as peso, ai.nu_altura as altura, null as procedimento, null as vacina
        FROM tb_fat_atendimento_individual ai JOIN tb_dim_tempo t ON ai.co_dim_tempo = t.co_seq_dim_tempo LEFT JOIN tb_dim_cbo cbo ON ai.co_dim_cbo_1 = cbo.co_seq_dim_cbo WHERE ai.co_fat_cidadao_pec = ANY($1) ${filtroTempo}
        
        UNION ALL
        
        -- Visitas
        SELECT co_fat_cidadao_pec, 'VISITA_ACS' as tipo, t.dt_registro, cbo.nu_cbo, null, vd.nu_peso, vd.nu_altura, null, null
        FROM tb_fat_visita_domiciliar vd JOIN tb_dim_tempo t ON vd.co_dim_tempo = t.co_seq_dim_tempo JOIN tb_dim_cbo cbo ON vd.co_dim_cbo = cbo.co_seq_dim_cbo WHERE vd.co_fat_cidadao_pec = ANY($1) AND cbo.nu_cbo IN ('515105', '322255') ${filtroTempo}
        
        UNION ALL
        
        -- Odonto
        SELECT co_fat_cidadao_pec, 'ODONTO' as tipo, t.dt_registro, null, null, null, null, null, null
        FROM tb_fat_atendimento_odonto ao JOIN tb_dim_tempo t ON ao.co_dim_tempo = t.co_seq_dim_tempo WHERE ao.co_fat_cidadao_pec = ANY($1) ${filtroTempo}
        
        UNION ALL
        
        -- Vacina (Filtro mais amplo para 57)
        SELECT co_fat_cidadao_pec, 'VACINA' as tipo, t.dt_registro, null, null, null, null, null, vac.ds_filtro_imunobiologico
        FROM tb_fat_vacinacao vac JOIN tb_dim_tempo t ON vac.co_dim_tempo = t.co_seq_dim_tempo WHERE vac.co_fat_cidadao_pec = ANY($1) AND (vac.ds_filtro_imunobiologico LIKE '%|57|%' OR vac.ds_filtro_imunobiologico LIKE '%57%') ${filtroTempo}

        UNION ALL

        -- Exames (Forçado, sem verificação de schema)
        SELECT pa.co_fat_cidadao_pec, 'EXAME' as tipo, t.dt_registro, null, null, null, null, pa.ds_filtro_procedimento as procedimento, null
        FROM tb_fat_proced_atend pa JOIN tb_dim_tempo t ON pa.co_dim_tempo = t.co_seq_dim_tempo
        WHERE pa.co_fat_cidadao_pec = ANY($1) ${filtroTempo}
        AND (
            pa.ds_filtro_procedimento ILIKE '%0202010479%' OR pa.ds_filtro_procedimento ILIKE '%0202010118%' OR 
            pa.ds_filtro_procedimento ILIKE '%0214010066%' OR pa.ds_filtro_procedimento ILIKE '%0214010049%' OR 
            pa.ds_filtro_procedimento ILIKE '%0202010460%' OR pa.ds_filtro_procedimento ILIKE '%0202010380%' OR 
            pa.ds_filtro_procedimento ILIKE '%0214010040%' OR pa.ds_filtro_procedimento ILIKE '%0214010082%' OR 
            pa.ds_filtro_procedimento ILIKE '%0202030100%' OR pa.ds_filtro_procedimento ILIKE '%0214010104%' OR 
            pa.ds_filtro_procedimento ILIKE '%0202030070%'
        )
    `;

    try {
        const resGeral = await pool.query(sqlEventos, params);
        const mapEventos = {};
        resGeral.rows.forEach(ev => {
            const id = String(ev.co_fat_cidadao_pec);
            if (!mapEventos[id]) mapEventos[id] = [];
            mapEventos[id].push(ev);
        });

        // Debug Counter
        let debugCount = 0;

        return listaCidadaos.map(row => {
            const dumDate = new Date(row.data_dum_recente);
            // Ajuste Fuso Horário DUM
            dumDate.setMinutes(dumDate.getMinutes() + dumDate.getTimezoneOffset());
            
            const diffDias = Math.floor((hoje - dumDate) / (1000 * 60 * 60 * 24));
            const igSemanas = Math.floor(diffDias / 7);
            const dumFormatada = dumDate.toLocaleDateString('pt-BR');
            
            const rawEvents = mapEventos[String(row.co_fat_cidadao_pec)] || [];
            // Filtra eventos APÓS a DUM
            const events = rawEvents.filter(e => new Date(e.dt_registro) >= dumDate);

            // Definições de Prazos
            const dataProvavelParto = new Date(dumDate); dataProvavelParto.setDate(dataProvavelParto.getDate() + 280);
            const dataFimPuerperio = new Date(dataProvavelParto); dataFimPuerperio.setDate(dataFimPuerperio.getDate() + 42);
            const dataLimite12sem = new Date(dumDate); dataLimite12sem.setDate(dataLimite12sem.getDate() + 84);
            const dataLimite1Tri = new Date(dumDate); dataLimite1Tri.setDate(dataLimite1Tri.getDate() + 91); // Aprox 13 sem
            const dataInicio3Tri = new Date(dumDate); dataInicio3Tri.setDate(dataInicio3Tri.getDate() + 189); // 27 sem
            const dataMinVac = new Date(dumDate); dataMinVac.setDate(dataMinVac.getDate() + 140); // 20 sem

            // Helpers
            const isMedEnf = (cbo) => cbo && /^(2251|2252|2253|2231|2235)/.test(String(cbo));
            const isACS = (cbo) => cbo === '515105' || cbo === '322255';

            // --- CÁLCULO REGRAS ---
            const consultas = events.filter(e => e.tipo === 'CONSULTA' && isMedEnf(e.nu_cbo)).map(e => new Date(e.dt_registro)).sort((a, b) => a - b);
            
            const statusA = (consultas.length > 0 && consultas[0] <= dataLimite12sem) ? "Sim" : "Não";
            const statusB = consultas.length >= 6 ? "Sim" : `Falta (${consultas.length}/6)`;
            
            const qtdPA = events.filter(e => e.tipo === 'CONSULTA' && Number(e.pa) > 0).length;
            const statusC = qtdPA >= 6 ? "Sim" : `Falta (${qtdPA}/6)`;
            
            const qtdPesoAltura = events.filter(e => (e.tipo === 'CONSULTA' || e.tipo === 'VISITA_ACS') && Number(e.peso) > 0 && Number(e.altura) > 0).length;
            const statusD = qtdPesoAltura >= 6 ? "Sim" : `Falta (${qtdPesoAltura}/6)`;
            
            // E: Visitas ACS
            let statusE = "Falta (0/3)";
            if (consultas.length > 0) {
               const visitasACS = events.filter(e => e.tipo === 'VISITA_ACS').map(e => new Date(e.dt_registro));
               const visitasValidas = visitasACS.filter(v => v > consultas[0]).length; // Apenas após 1a consulta (Captação)
               statusE = visitasValidas >= 3 ? "Sim" : `Falta (${visitasValidas}/3)`;
            }

            // F: Vacina
            let statusF = "Não";
            const vacinaDTpa = events.find(e => e.tipo === 'VACINA' && (e.vacina||'').includes('57'));
            if (vacinaDTpa && new Date(vacinaDTpa.dt_registro) >= dataMinVac) statusF = "Sim";

            // G & H: Exames
            const codsSif = ['0202010479', '0202010118', '0214010066']; 
            const codsHIV = ['0202010460', '0214010049', '0202010380', '0214010040'];
            const codsHB = ['0214010082', '0202030100', 'ABPG025']; 
            const codsHC = ['0214010104', '0202030070'];
            
            const exames = events.filter(e => e.tipo === 'EXAME');
            
            // Regra G (1 Tri)
            let g = { sif: false, hiv: false, hb: false, hc: false };
            exames.forEach(e => {
                const d = new Date(e.dt_registro);
                const p = e.procedimento || '';
                if (d <= dataLimite1Tri) {
                    if (codsSif.some(c => p.includes(c))) g.sif = true;
                    if (codsHIV.some(c => p.includes(c))) g.hiv = true;
                    if (codsHB.some(c => p.includes(c))) g.hb = true;
                    if (codsHC.some(c => p.includes(c))) g.hc = true;
                }
            });
            let faltasG = [];
            if (!g.sif) faltasG.push("SÍF"); if (!g.hiv) faltasG.push("HIV"); if (!g.hb) faltasG.push("HB"); if (!g.hc) faltasG.push("HC");
            const statusG = faltasG.length === 0 ? "Sim" : "Não"; // Simplificado para Ranking

            // Regra H (3 Tri)
            let statusH = "Aguardando"; // Se IG < 27
            if (hoje >= dataInicio3Tri) {
                let h = { sif: false, hiv: false };
                exames.forEach(e => {
                    const d = new Date(e.dt_registro);
                    const p = e.procedimento || '';
                    if (d >= dataInicio3Tri) {
                        if (codsSif.some(c => p.includes(c))) h.sif = true;
                        if (codsHIV.some(c => p.includes(c))) h.hiv = true;
                    }
                });
                statusH = (h.sif && h.hiv) ? "Sim" : "Não";
            }

            // I & J: Puerpério
            const dataPartoLimite = new Date(dataProvavelParto); dataPartoLimite.setDate(dataPartoLimite.getDate() + 14); 
            const janelaInicioPuerperio = new Date(dataProvavelParto); janelaInicioPuerperio.setDate(janelaInicioPuerperio.getDate() - 14); 

            let statusI = "Gestante";
            const fezConsultaPuerperio = events.some(e => e.tipo === 'CONSULTA' && isMedEnf(e.nu_cbo) && new Date(e.dt_registro) >= janelaInicioPuerperio && new Date(e.dt_registro) <= dataFimPuerperio);
            if (fezConsultaPuerperio) statusI = "Sim"; else if (hoje > dataPartoLimite) statusI = "Falta";

            let statusJ = "Gestante";
            const fezVisitaPuerperio = events.some(e => e.tipo === 'VISITA_ACS' && isACS(e.nu_cbo) && new Date(e.dt_registro) >= janelaInicioPuerperio && new Date(e.dt_registro) <= dataFimPuerperio);
            if (fezVisitaPuerperio) statusJ = "Sim"; else if (hoje > dataPartoLimite) statusJ = "Falta";

            const statusK = events.some(e => e.tipo === 'ODONTO') ? "Sim" : "Não";

            // DEBUG LOG (Apenas para as 3 primeiras)
            if (debugCount < 3) {
                console.log(`🔎 C3 DEBUG [${row.no_cidadao}]:`);
                console.log(`   DUM: ${dumFormatada} | DPP: ${dataProvavelParto.toLocaleDateString()}`);
                console.log(`   Exames Encontrados: ${exames.length}`);
                console.log(`   Vacinas Encontradas: ${events.filter(e=>e.tipo==='VACINA').length}`);
                console.log(`   Resultados -> G: ${statusG} | F: ${statusF} | I: ${statusI}`);
                debugCount++;
            }

            return { 
                ...row, dum: dumFormatada, ig: igSemanas,
                ind_1_a: statusA, ind_1_b: statusB, ind_1_c: statusC, ind_1_d: statusD, ind_1_e: statusE,
                ind_1_f: statusF, ind_1_g: statusG, ind_1_h: statusH, ind_1_i: statusI, ind_1_j: statusJ, ind_3: statusK
            };
        });
    } catch (err) {
        console.error("Erro C3:", err);
        return [];
    }
}

// ==========================================================
// ROTA: RANKING GESTANTES (CORRIGIDA - COM DATA REF)
// ==========================================================
router.get('/indicadores/ranking-gestantes', async (req, res) => {
    // Cache curto para refletir mudanças rápido
    const cacheKey = 'ranking_gestantes_v62_all_teams';
    const cachedData = myCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
        // 1. BUSCA TODAS AS EQUIPES ATIVAS PRIMEIRO
        // Garante que equipes sem gestantes também apareçam no ranking com zeros
        const sqlEquipes = `
            SELECT DISTINCT no_equipe 
            FROM tb_dim_equipe 
            WHERE no_equipe IS NOT NULL 
            AND no_equipe != ''
            -- Filtros básicos para remover lixo, ajuste conforme seu banco
            AND (no_equipe ILIKE 'ESF%' OR no_equipe ILIKE 'PSF%' OR no_equipe ILIKE 'UBS%' OR no_equipe ILIKE 'EAP%')
        `;
        const resEquipes = await pool.query(sqlEquipes);
        
        // Inicializa o mapa com TODAS as equipes encontradas
        const rankingMap = {};
        resEquipes.rows.forEach(r => {
            const nome = r.no_equipe.trim();
            // Filtro de exclusão (Bucal, Nasf, etc)
            const eqUpper = nome.toUpperCase();
            if (eqUpper.includes('BUCAL') || eqUpper.startsWith('ESB') || eqUpper.startsWith('SB ') || eqUpper.includes('NASF')) return;

            rankingMap[nome] = { equipe: nome, a:0,b:0,c:0,d:0,e:0,f:0,g:0,h:0,i:0,j:0,k:0, nm:0, dn:0, percentual: '0.00' };
        });

        // 2. BUSCA OS DADOS DAS GESTANTES (Reaproveita a função base corrigida)
        const { dados, dataRef } = await extrairDadosGestantesBase({}, { limit: 1000000 }); 
        
        // Se tiver dados, processa e preenche o mapa
        if (dados && dados.length > 0) {
            const dadosProcessados = await processarRegrasGestantes(dados, dataRef);

            dadosProcessados.forEach(g => {
                const equipe = g.nome_equipe ? g.nome_equipe.trim() : 'Sem Equipe';
                
                // Se a equipe da gestante não estava na lista inicial (ex: nome diferente), cria agora
                if (!rankingMap[equipe]) {
                     // Verifica filtro de exclusão novamente para segurança
                     const eqUpper = equipe.toUpperCase();
                     if (!(eqUpper.includes('BUCAL') || eqUpper.startsWith('ESB'))) {
                        rankingMap[equipe] = { equipe: equipe, a:0,b:0,c:0,d:0,e:0,f:0,g:0,h:0,i:0,j:0,k:0, nm:0, dn:0, percentual: '0.00' };
                     }
                }

                // Se a equipe existe no mapa (foi criada ou já existia), soma os pontos
                if (rankingMap[equipe]) {
                    const r = rankingMap[equipe];
                    r.dn++;
                    
                    let pts = 0;
                    if (g.ind_1_a === 'Sim') { r.a++; pts += 10; }
                    if (g.ind_1_b === 'Sim') { r.b++; pts += 10; }
                    if (g.ind_1_c === 'Sim') { r.c++; pts += 10; }
                    if (g.ind_1_d === 'Sim') { r.d++; pts += 10; }
                    if (g.ind_1_e === 'Sim') { r.e++; pts += 10; }
                    if (g.ind_1_f === 'Sim') { r.f++; pts += 10; }
                    if (g.ind_1_g === 'Sim') { r.g++; pts += 10; }
                    if (g.ind_1_h === 'Sim') { r.h++; pts += 10; }
                    if (g.ind_1_i === 'Sim') { r.i++; pts += 10; }
                    if (g.ind_1_j === 'Sim') { r.j++; pts += 10; }
                    if (g.ind_3 === 'Sim')   { r.k++; } 
                    r.nm += pts;
                }
            });
        }

        // 3. CALCULA PERCENTUAIS FINAIS
        const rankingFinal = Object.values(rankingMap).map(r => {
            const pontuacao = r.dn > 0 ? (r.nm / (r.dn * 100)) * 100 : 0; 
            r.percentual = pontuacao.toFixed(2);
            return r;
        });

        rankingFinal.sort((a, b) => parseFloat(b.percentual) - parseFloat(a.percentual));
        
        myCache.set(cacheKey, rankingFinal, 1200);
        res.json(rankingFinal);

    } catch (err) {
        console.error("ERRO RANKING GESTANTES:", err);
        res.status(500).json({ error: 'Erro no cálculo do ranking.' });
    }
});

// ==========================================================
// ROTA: LISTA GESTANTES PAGINADA
// ==========================================================
// ATUALIZAR ROTA '/indicadores/gestantes' PARA PASSAR DADOS
router.get('/indicadores/gestantes', async (req, res) => {
    try {
        const page = parseInt(req.query.pagina) || 1;
        const { equipe, microarea, exportar, competencia } = req.query;
        const limit = exportar === 'true' ? 1000000 : 15;
        const offset = (page - 1) * limit;

        const { dados, total, dataRef } = await extrairDadosGestantesBase(
            { equipe, microarea, competencia }, 
            { limit, offset }
        );

        // Passa 'dataRef' para o processamento de regras
        const dadosProcessados = await processarRegrasGestantes(dados, dataRef);

        res.json({
            data: dadosProcessados,
            pagination: {
                page: page,
                limit: limit,
                totalRows: parseInt(total),
                totalPages: Math.ceil(parseInt(total) / limit)
            },
            columns: []
        });
    } catch (err) {
        console.error("ERRO LISTA GESTANTES:", err);
        res.status(500).json({ error: "Erro ao buscar gestantes." });
    }
});

// ==========================================================
// ROTA: MAIS ACESSO (PRESERVADA)
// ==========================================================
router.get('/indicadores/mais-acesso', async (req, res) => {
    const { equipe, microarea, competencia } = req.query; // Adicionado 'competencia'
    let params = [];
    
    let whereClauses = [
        `cbo.nu_cbo IN ('225142', '225170', '225130', '223565', '223505')`
    ];

    // LÓGICA ATUALIZADA PARA MÚLTIPLOS MESES (versão segura)
    if (competencia && competencia.trim() !== '') {
        const mesesArray = competencia.split(',').map(m => m.trim()).filter(m => m); // Limpa e filtra meses vazios
        if (mesesArray.length > 0) {
            params.push(mesesArray);
            // Usa ANY para lidar com múltiplos valores de forma segura
            whereClauses.push(`TO_CHAR(t.dt_registro, 'YYYY-MM') = ANY($${params.length})`);
        }
    } else {
        // Comportamento padrão: filtra pelo ano atual se não houver competência
        whereClauses.push(`t.nu_ano = EXTRACT(YEAR FROM CURRENT_DATE)`);
    }

    if (equipe && equipe.trim() !== '') { params.push(equipe.trim()); whereClauses.push(`te.nu_ine = $${params.length}`); }
    if (microarea && microarea.trim() !== '') { params.push(microarea.trim()); whereClauses.push(`EXISTS (SELECT 1 FROM tb_fat_cidadao_territorio tt WHERE tt.co_fat_cidadao_pec = ai.co_fat_cidadao_pec AND tt.nu_micro_area = $${params.length})`); }
    
    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
    const fromSql = `FROM tb_fat_atendimento_individual ai JOIN tb_dim_tempo t ON ai.co_dim_tempo = t.co_seq_dim_tempo JOIN tb_fat_cidadao_pec pec ON ai.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec JOIN tb_cidadao c ON pec.co_cidadao = c.co_seq_cidadao LEFT JOIN tb_dim_equipe te ON ai.co_dim_equipe_1 = te.co_seq_dim_equipe LEFT JOIN tb_dim_tipo_atendimento ta ON ai.co_dim_tipo_atendimento = ta.co_seq_dim_tipo_atendimento LEFT JOIN tb_dim_cbo cbo ON ai.co_dim_cbo_1 = cbo.co_seq_dim_cbo`;
    const sqlDados = `WITH atendimentos_agrupados AS (SELECT c.no_cidadao, c.nu_cpf, c.nu_cns, to_char(c.dt_nascimento, 'DD/MM/YYYY') as dt_nascimento, te.no_equipe, COUNT(*) FILTER (WHERE UPPER(ta.ds_tipo_atendimento) IN ('CONSULTA AGENDADA PROGRAMADA', 'CUIDADO CONTINUADO', 'CONSULTA AGENDADA', 'ESCUTA INICIAL/ORIENTAÇÃO', 'ESCUTA INICIAL / ORIENTAÇÃO', 'CONSULTA NO DIA', 'ATENDIMENTO DE URGÊNCIA', 'ATENDIMENTO DE URGENCIA')) AS total_atendimentos, COUNT(*) FILTER (WHERE UPPER(ta.ds_tipo_atendimento) IN ('CONSULTA AGENDADA PROGRAMADA', 'CUIDADO CONTINUADO', 'CONSULTA AGENDADA')) AS atendimentos_programados ${fromSql} ${whereSql} GROUP BY c.no_cidadao, c.nu_cpf, c.nu_cns, c.dt_nascimento, te.no_equipe) SELECT *, CASE WHEN total_atendimentos > 0 THEN ROUND((atendimentos_programados::numeric / total_atendimentos) * 100, 2) ELSE 0 END AS percentual FROM atendimentos_agrupados ORDER BY no_cidadao LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const sqlContagem = `SELECT COUNT(DISTINCT pec.co_seq_fat_cidadao_pec) as count ${fromSql} ${whereSql}`;
    
    await executarConsultaPaginada(req, res, sqlDados, sqlContagem, params, [], [{ data: 'no_cidadao', title: 'Nome do Cidadão' }, { data: 'dt_nascimento', title: 'Nascimento' }, { data: 'nu_cpf', title: 'CPF' }, { data: 'nu_cns', title: 'CNS' }, { data: 'atendimentos_programados', title: 'NM' }, { data: 'total_atendimentos', title: 'DN' }]);
});

router.get('/indicadores/ranking-mais-acesso', async (req, res) => {
    const cacheKey = 'ranking_mais_acesso_v1';
    const cachedData = myCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);
    const sql = `SELECT te.no_equipe as equipe, COUNT(*) FILTER (WHERE UPPER(ta.ds_tipo_atendimento) IN ('CONSULTA AGENDADA PROGRAMADA', 'CUIDADO CONTINUADO', 'CONSULTA AGENDADA', 'ESCUTA INICIAL/ORIENTAÇÃO', 'ESCUTA INICIAL / ORIENTAÇÃO', 'CONSULTA NO DIA', 'ATENDIMENTO DE URGÊNCIA', 'ATENDIMENTO DE URGENCIA')) AS dn, COUNT(*) FILTER (WHERE UPPER(ta.ds_tipo_atendimento) IN ('CONSULTA AGENDADA PROGRAMADA', 'CUIDADO CONTINUADO', 'CONSULTA AGENDADA')) AS nm FROM tb_fat_atendimento_individual ai JOIN tb_dim_tempo t ON ai.co_dim_tempo = t.co_seq_dim_tempo LEFT JOIN tb_dim_equipe te ON ai.co_dim_equipe_1 = te.co_seq_dim_equipe LEFT JOIN tb_dim_tipo_atendimento ta ON ai.co_dim_tipo_atendimento = ta.co_seq_dim_tipo_atendimento LEFT JOIN tb_dim_cbo cbo ON ai.co_dim_cbo_1 = cbo.co_seq_dim_cbo WHERE t.nu_ano = EXTRACT(YEAR FROM CURRENT_DATE) AND cbo.nu_cbo IN ('225142', '225170', '225130', '223565', '223505') AND te.no_equipe IS NOT NULL GROUP BY te.no_equipe`;
    try {
        const result = await pool.query(sql);
        const rowsFiltered = result.rows.filter(r => { const nome = (r.equipe || '').toUpperCase().trim(); return !['ESB', 'EMAD', 'EMAP', 'ENASF', 'EQUIPE EMULTI', 'NASF', 'CONSULTORIO NA RUA'].some(t => nome.startsWith(t)); });
        const ranking = rowsFiltered.map(r => { const num = parseInt(r.nm || 0); const den = parseInt(r.dn || 0); const pontuacao = den > 0 ? (num / den) * 100 : 0; return { equipe: r.equipe, nm: num, dn: den, pontuacao: pontuacao.toFixed(2) }; });
        ranking.sort((a, b) => parseFloat(b.pontuacao) - parseFloat(a.pontuacao));
        myCache.set(cacheKey, ranking, 1200);
        res.json(ranking);
    } catch (err) { res.status(500).json({ error: 'Erro ao calcular ranking mais acesso.' }); }
});

// =====================================================================
// INDICADOR C2: INFANTIL (CORREÇÃO DE FILTROS V.FINAL)
// =====================================================================

// =====================================================================
// FUNÇÃO C2 (INFANTIL) - FILTROS ATIVADOS (MICROÁREA + DATA)
// =====================================================================
async function extrairDadosInfantil(filtros, paginacao = {}) {
    const { equipe, microarea, competencia } = filtros;
    const { limit = 15, offset = 0 } = paginacao;

    // 1. DATA DE REFERÊNCIA
    const dataRef = (competencia && competencia.trim()) 
      ? new Date(competencia.split(',')[0] + '-28') 
      : new Date();
    if (competencia) dataRef.setDate(new Date(dataRef.getFullYear(), dataRef.getMonth() + 1, 0).getDate());
    
    const dataRefSql = dataRef.toISOString().split('T')[0];

    try {
        const params = [dataRefSql];
        let equipeClause = '';
        let microareaClause = '';

        if (equipe) {
            params.push(equipe);
            equipeClause = `AND (TRIM(te.nu_ine::text) = $${params.length} OR TRIM(te.no_equipe) = $${params.length})`;
        }
        if (microarea) {
            params.push(microarea);
            microareaClause = `AND EXISTS (SELECT 1 FROM tb_fat_cidadao_territorio tt WHERE tt.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec AND LTRIM(tt.nu_micro_area, '0') = LTRIM($${params.length}, '0'))`;
        }
        
        // 2. QUERY CONTAGEM (ISOLAMENTO TOTAL)
        // Conta apenas CPFs únicos. Impossível duplicar.
        const sqlCount = `
            SELECT COUNT(DISTINCT c.nu_cpf) as total
            FROM tb_cidadao c
            JOIN tb_fat_cidadao_pec pec ON c.co_seq_cidadao = pec.co_cidadao
            LEFT JOIN tb_dim_equipe te ON pec.co_dim_equipe_vinc = te.co_seq_dim_equipe
            WHERE c.st_ativo = 1 AND c.st_faleceu = 0
            AND c.dt_nascimento <= $1
            AND ($1::date - c.dt_nascimento) <= 730
            ${equipeClause}
            ${microareaClause}
        `;
        
        const totalRes = await pool.query(sqlCount, params);
        const total = parseInt(totalRes.rows[0]?.total || 0, 10);

        if (total === 0) return { dados: [], total: 0 };

        // 3. QUERY LISTAGEM (MESMOS FILTROS)
        const paramsIds = [...params, limit, offset];
        const sqlIds = `
            SELECT DISTINCT ON (pec.co_seq_fat_cidadao_pec) 
                pec.co_seq_fat_cidadao_pec, c.no_cidadao, c.nu_cpf, c.dt_nascimento
            FROM tb_cidadao c
            JOIN tb_fat_cidadao_pec pec ON c.co_seq_cidadao = pec.co_cidadao
            LEFT JOIN tb_dim_equipe te ON pec.co_dim_equipe_vinc = te.co_seq_dim_equipe
            WHERE c.st_ativo = 1 AND c.st_faleceu = 0
            AND c.dt_nascimento <= $1
            AND ($1::date - c.dt_nascimento) <= 730
            ${equipeClause}
            ${microareaClause}
            ORDER BY pec.co_seq_fat_cidadao_pec, c.no_cidadao ASC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        const idsRes = await pool.query(sqlIds, paramsIds);
        const populacao = idsRes.rows;

        // 4. BUSCA DE EVENTOS (SEM FILTRO SQL DE CBO PARA GARANTIR DADOS)
        const idsUnicos = populacao.map(p => p.co_seq_fat_cidadao_pec);
        const paramsEventos = [idsUnicos, dataRefSql];
        const filtroTempo = `AND t.dt_registro <= $2`; 

        const sqlConsultas = `
            SELECT ai.co_fat_cidadao_pec, t.dt_registro, cbo.nu_cbo, ai.nu_peso, ai.nu_altura
            FROM tb_fat_atendimento_individual ai
            JOIN tb_dim_tempo t ON ai.co_dim_tempo = t.co_seq_dim_tempo
            LEFT JOIN tb_dim_cbo cbo ON ai.co_dim_cbo_1 = cbo.co_seq_dim_cbo
            WHERE ai.co_fat_cidadao_pec = ANY($1) ${filtroTempo}`;

        // VISITAS: Removido filtro de CBO no SQL para debug
        const sqlVisitas = `
            SELECT vd.co_fat_cidadao_pec, t.dt_registro, cbo.nu_cbo
            FROM tb_fat_visita_domiciliar vd
            JOIN tb_dim_tempo t ON vd.co_dim_tempo = t.co_seq_dim_tempo
            LEFT JOIN tb_dim_cbo cbo ON vd.co_dim_cbo = cbo.co_seq_dim_cbo
            WHERE vd.co_fat_cidadao_pec = ANY($1) ${filtroTempo}`;

        const sqlVacinas = `
            SELECT vac.co_fat_cidadao_pec, t.dt_registro, vac.ds_filtro_imunobiologico
            FROM tb_fat_vacinacao vac
            JOIN tb_dim_tempo t ON vac.co_dim_tempo = t.co_seq_dim_tempo
            WHERE vac.co_fat_cidadao_pec = ANY($1) ${filtroTempo}`;
            
        const [resConsultas, resVisitas, resVacinas] = await Promise.all([
            pool.query(sqlConsultas, paramsEventos),
            pool.query(sqlVisitas, paramsEventos),
            pool.query(sqlVacinas, paramsEventos)
        ]);
        
        // Mapeamento
        const eventosMap = {};
        populacao.forEach(p => eventosMap[p.co_seq_fat_cidadao_pec] = { consultas: [], visitas: [], vacinas: [] });
        
        resConsultas.rows.forEach(r => eventosMap[r.co_fat_cidadao_pec]?.consultas.push(r));
        resVisitas.rows.forEach(r => eventosMap[r.co_fat_cidadao_pec]?.visitas.push(r));
        resVacinas.rows.forEach(r => eventosMap[r.co_fat_cidadao_pec]?.vacinas.push(r));

        const diffDias = (d1, d2) => Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));

        const dadosFinais = populacao.map(cidadao => {
            const id = cidadao.co_seq_fat_cidadao_pec;
            const dtNasc = new Date(cidadao.dt_nascimento); dtNasc.setHours(0,0,0,0);
            
            let idadeMeses = (dataRef.getFullYear() - dtNasc.getFullYear()) * 12 + (dataRef.getMonth() - dtNasc.getMonth());
            if (dataRef.getDate() < dtNasc.getDate()) idadeMeses--;

            const evs = eventosMap[id];

            // Regra A (Consultas Med/Enf)
            const isMedEnf = c => c && /^(2251|2235|2252|2253|2231)/.test(c);
            const consValidas = evs.consultas
                .filter(c => isMedEnf(c.nu_cbo))
                .map(c => new Date(c.dt_registro))
                .sort((a,b) => a - b);
            
            let regraA = 'Não';
            if (consValidas.length > 0) {
                const diff = diffDias(consValidas[0], dtNasc);
                if (diff >= 0 && diff <= 30) regraA = 'Sim';
            }

            // Regra C (Peso/Altura)
            const regraC = evs.consultas.filter(a => Number(a.nu_peso) > 0 || Number(a.nu_altura) > 0).length;

            // Regra D (Visitas ACS) - Filtragem no JS agora
            const visitasValidas = evs.visitas.filter(v => {
                // Aceita nulos ou CBOs de ACS
                return !v.nu_cbo || v.nu_cbo === '515105' || v.nu_cbo === '322255';
            });

            const datasVisita = new Set();
            let v30d = 0, v6m = 0;
            
            visitasValidas.forEach(v => {
                const dataV = new Date(v.dt_registro); dataV.setHours(0,0,0,0);
                const diff = diffDias(dataV, dtNasc);
                
                // Evita duplicidade de dia
                const diaIso = dataV.toISOString().split('T')[0];
                if (!datasVisita.has(diaIso)) {
                    datasVisita.add(diaIso);
                    if (diff >= 0 && diff <= 30) v30d++;
                    if (diff >= 0 && diff <= 180) v6m++;
                }
            });

            // Regra E (Vacinas)
            const temPenta = evs.vacinas.some(v => (v.ds_filtro_imunobiologico||'').includes('42') || (v.ds_filtro_imunobiologico||'').includes('9'));
            const temPolio = evs.vacinas.some(v => (v.ds_filtro_imunobiologico||'').includes('22'));

            return { 
                ...cidadao, 
                idade_meses: idadeMeses,
                dt_nascimento: dtNasc.toLocaleDateString('pt-BR'),
                regra_a: regraA,
                regra_b: consValidas.length,
                qtd_afericoes_c: regraC,
                visitas_d_formatado: `${v30d} / ${v6m}`,
                regra_e: (temPenta && temPolio) ? 'Sim' : 'Pendente' 
            };
        });

        return { dados: dadosFinais, total };

    } catch (e) { console.error('Erro C2:', e); throw e; }
}

// 2. Rota C2 (Conectada)
router.get('/indicadores/infantil', async (req, res) => {
    try {
        const { equipe, microarea, competencia, pagina, exportar } = req.query;
        
        const page = parseInt(pagina) || 1;
        const limit = exportar === 'true' ? 10000 : 15;
        const offset = (page - 1) * limit;

        const { dados, total } = await extrairDadosInfantil(
            { equipe, microarea, competencia },
            { limit, offset }
        );

        res.json({
            data: dados,
            pagination: { 
                page, 
                totalPages: Math.ceil(total / limit), 
                totalRows: total 
            },
            columns: []
        });
    } catch (err) {
        console.error("Erro Rota C2:", err);
        res.status(500).json({ error: "Erro interno C2" });
    }
});

router.get('/indicadores/ranking-infantil', async (req, res) => {
    const cacheKey = 'ranking_infantil_v20_fixed';
    const cachedData = myCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);
    const sql = `
        WITH criancas_alvo AS (
            SELECT pec.co_seq_fat_cidadao_pec, pec.co_dim_equipe_vinc, c.dt_nascimento, c.co_seq_cidadao
            FROM tb_cidadao c JOIN tb_fat_cidadao_pec pec ON c.co_seq_cidadao = pec.co_cidadao
            WHERE c.st_ativo = 1 AND (CURRENT_DATE - c.dt_nascimento) <= 730
        ),
        sub_ab AS (
            SELECT ai.co_fat_cidadao_pec, MAX(CASE WHEN (t.dt_registro::date - ca.dt_nascimento) <= 30 THEN 1 ELSE 0 END) as fez_a, COUNT(DISTINCT t.dt_registro::date) as qtd_consultas 
            FROM tb_fat_atendimento_individual ai JOIN criancas_alvo ca ON ai.co_fat_cidadao_pec = ca.co_seq_fat_cidadao_pec JOIN tb_dim_tempo t ON ai.co_dim_tempo = t.co_seq_dim_tempo LEFT JOIN tb_dim_cbo cbo ON ai.co_dim_cbo_1 = cbo.co_seq_dim_cbo 
            WHERE cbo.nu_cbo LIKE ANY(ARRAY['2251%', '2252%', '2253%', '2231%', '2235%']) GROUP BY ai.co_fat_cidadao_pec
        ),
        sub_c AS (
            SELECT ca.co_seq_cidadao AS co_seq_cidadao_mestre, COUNT(*) AS qtd_afericoes 
            FROM (SELECT ai.co_fat_cidadao_pec FROM tb_fat_atendimento_individual ai JOIN criancas_alvo ca ON ai.co_fat_cidadao_pec = ca.co_seq_fat_cidadao_pec WHERE ai.nu_peso > 0 AND ai.nu_altura > 0 UNION ALL SELECT vd.co_fat_cidadao_pec FROM tb_fat_visita_domiciliar vd JOIN criancas_alvo ca ON vd.co_fat_cidadao_pec = ca.co_seq_fat_cidadao_pec WHERE vd.nu_peso > 0 AND vd.nu_altura > 0) AS uniao_bruta 
            JOIN criancas_alvo ca ON uniao_bruta.co_fat_cidadao_pec = ca.co_seq_fat_cidadao_pec GROUP BY ca.co_seq_cidadao
        ),
        sub_d AS (
            SELECT vd.co_fat_cidadao_pec, COUNT(DISTINCT tempo.dt_registro::date) FILTER (WHERE (tempo.dt_registro::date - ca.dt_nascimento) <= 30) AS qtd_visitas_30d, COUNT(DISTINCT tempo.dt_registro::date) FILTER (WHERE (tempo.dt_registro::date - ca.dt_nascimento) <= 180) AS qtd_visitas_6m 
            FROM tb_fat_visita_domiciliar vd JOIN criancas_alvo ca ON vd.co_fat_cidadao_pec = ca.co_seq_fat_cidadao_pec JOIN tb_dim_tempo tempo ON vd.co_dim_tempo = tempo.co_seq_dim_tempo LEFT JOIN tb_dim_cbo cbo ON vd.co_dim_cbo = cbo.co_seq_dim_cbo WHERE cbo.nu_cbo IN ('515105', '322255') GROUP BY vd.co_fat_cidadao_pec
        ),
        sub_e AS (
            SELECT vac.co_fat_cidadao_pec, COUNT(DISTINCT t.dt_registro) FILTER (WHERE vac.ds_filtro_imunobiologico ~ '(?:^|[|])(?:9|09|17|29|39|42|43|46|47|58)(?:[|]|$)') as doses_penta, COUNT(DISTINCT t.dt_registro) FILTER (WHERE vac.ds_filtro_imunobiologico ~ '(?:^|[|])(?:22|29|43|58)(?:[|]|$)') as doses_polio, COUNT(DISTINCT t.dt_registro) FILTER (WHERE vac.ds_filtro_imunobiologico ~ '(?:^|[|])(?:26|59|106|107)(?:[|]|$)') as doses_pneumo, COUNT(DISTINCT t.dt_registro) FILTER (WHERE vac.ds_filtro_imunobiologico ~ '(?:^|[|])(?:24|56)(?:[|]|$)') as doses_scr 
            FROM tb_fat_vacinacao vac JOIN criancas_alvo ca ON vac.co_fat_cidadao_pec = ca.co_seq_fat_cidadao_pec JOIN tb_dim_tempo t ON vac.co_dim_tempo = t.co_seq_dim_tempo GROUP BY vac.co_fat_cidadao_pec
        ),
        dados_consolidados AS (
            SELECT ca.co_dim_equipe_vinc as id_equipe, COUNT(DISTINCT ca.co_seq_cidadao) AS denominador, COUNT(DISTINCT CASE WHEN sub_ab.fez_a = 1 THEN ca.co_seq_cidadao END) AS a_count, COUNT(DISTINCT CASE WHEN sub_ab.qtd_consultas >= 9 THEN ca.co_seq_cidadao END) AS b_count, COUNT(DISTINCT CASE WHEN sub_c.qtd_afericoes >= 9 THEN ca.co_seq_cidadao END) AS c_count, COUNT(DISTINCT CASE WHEN sub_d.qtd_visitas_30d >= 1 AND sub_d.qtd_visitas_6m >= 2 THEN ca.co_seq_cidadao END) AS d_count, COUNT(DISTINCT CASE WHEN sub_e.doses_penta >= 3 AND sub_e.doses_polio >= 3 AND sub_e.doses_pneumo >= 2 AND sub_e.doses_scr >= 2 THEN ca.co_seq_cidadao END) AS e_count 
            FROM criancas_alvo ca LEFT JOIN sub_ab ON ca.co_seq_fat_cidadao_pec = sub_ab.co_fat_cidadao_pec LEFT JOIN sub_c ON ca.co_seq_cidadao = sub_c.co_seq_cidadao_mestre LEFT JOIN sub_d ON ca.co_seq_fat_cidadao_pec = sub_d.co_fat_cidadao_pec LEFT JOIN sub_e ON ca.co_seq_fat_cidadao_pec = sub_e.co_fat_cidadao_pec GROUP BY ca.co_dim_equipe_vinc
        )
        SELECT te.no_equipe AS equipe, COALESCE(dados.denominador, 0) AS denominador, COALESCE(dados.a_count, 0) AS a_count, COALESCE(dados.b_count, 0) AS b_count, COALESCE(dados.c_count, 0) AS c_count, COALESCE(dados.d_count, 0) AS d_count, COALESCE(dados.e_count, 0) AS e_count 
        FROM tb_dim_equipe te LEFT JOIN dados_consolidados dados ON te.co_seq_dim_equipe = dados.id_equipe WHERE te.no_equipe IS NOT NULL ORDER BY te.no_equipe ASC
    `;
    try {
        const result = await pool.query(sql, []);
        const rankingFiltrado = result.rows.filter(row => { const nome = (row.equipe || '').toUpperCase().trim(); return !['ESB', 'EMAD', 'EMAP', 'ENASF', 'EQUIPE EMULTI', 'NASF', 'CONSULTORIO NA RUA'].some(t => nome.startsWith(t)); });
        const rankingFinal = rankingFiltrado.map(row => {
            const dn = parseInt(row.denominador || 0); const a = parseInt(row.a_count || 0); const b = parseInt(row.b_count || 0); const c = parseInt(row.c_count || 0); const d = parseInt(row.d_count || 0); const e = parseInt(row.e_count || 0);
            const numeradorTotal = (a + b + c + d + e) * 20; const percentual = dn > 0 ? (numeradorTotal / dn) : 0;
            return { equipe: row.equipe, a: String(a), b: String(b), c: String(c), d: String(d), e: String(e), nm: numeradorTotal.toFixed(0), dn: dn, percentual: percentual.toFixed(2) };
        });
        myCache.set(cacheKey, rankingFinal, 600);
        res.json(rankingFinal);
    } catch (err) { console.error("ERRO RANKING INFANTIL:", err.message); res.status(500).json({ error: "Erro interno." }); }
});

// ==========================================================
// OUTRAS ROTAS PRESERVADAS (DIABETES, HIPERTENSÃO, ETC)
// ==========================================================
router.get('/detalhes/crianca/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const sqlCrianca = `SELECT c.no_cidadao, c.nu_cpf, c.nu_cns, c.dt_nascimento FROM public.tb_fat_cidadao_pec pec JOIN public.tb_cidadao c ON pec.co_cidadao = c.co_seq_cidadao WHERE pec.co_seq_fat_cidadao_pec = $1`;
        const resCrianca = await pool.query(sqlCrianca, [id]);
        if (resCrianca.rows.length === 0) return res.status(404).json({ error: 'Criança não encontrada.' });
        const sqlVacinas = `SELECT t.dt_registro, vac.ds_filtro_imunobiologico, vac.nu_dose, te.no_equipe FROM public.tb_fat_vacinacao vac JOIN public.tb_dim_tempo t ON vac.co_dim_tempo = t.co_seq_dim_tempo LEFT JOIN public.tb_dim_equipe te ON vac.co_dim_equipe = te.co_seq_dim_equipe WHERE vac.co_fat_cidadao_pec = $1 ORDER BY t.dt_registro ASC`;
        const resVacinas = await pool.query(sqlVacinas, [id]);
        res.json({ cidadao: resCrianca.rows[0], vacinas: resVacinas.rows });
    } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.get('/fix-admin-agora', async (req, res) => {
    try {
        const { authPool } = require('../db.js');
        const client = await authPool.connect();
        try {
            await client.query('BEGIN'); 
            let userId;
            const userRes = await client.query("SELECT id FROM public.users WHERE email = 'admin@esus.com'");
            if (userRes.rows.length === 0) {
                const hashedPassword = await bcrypt.hash('123mudar', 10);
                const newUser = await client.query("INSERT INTO public.users (nome, email, password_hash, is_active) VALUES ($1, $2, $3, true) RETURNING id", ['Super Admin', 'admin@esus.com', hashedPassword]);
                userId = newUser.rows[0].id;
            } else { userId = userRes.rows[0].id; }
            await client.query("DELETE FROM auth.user_roles WHERE user_id = $1", [userId]); 
            let roleRes = await client.query("SELECT id FROM auth.roles WHERE name = 'admin'");
            let roleId = roleRes.rows.length ? roleRes.rows[0].id : (await client.query("INSERT INTO auth.roles (name) VALUES ('admin') RETURNING id")).rows[0].id;
            await client.query("INSERT INTO auth.user_roles (user_id, role_id) VALUES ($1, $2)", [userId, roleId]); 
            await client.query('COMMIT'); 
            res.send("Admin restaurado.");
        } catch (error) { await client.query('ROLLBACK'); res.send("Erro: " + error.message); } finally { client.release(); }
    } catch (e) { res.send("Erro conexão: " + e.message); }
});

// --- C4: DIABETES BASE (Com Data Ref e Microárea LTRIM) ---
async function extrairDadosDiabetesBase(filtros = {}, paginacao = {}) {
    const { equipe, microarea, competencia } = filtros;
    const { limit = 15, offset = 0 } = paginacao;

    // 1. DATA DE REFERÊNCIA (Viagem no Tempo)
    const dataRef = (competencia && competencia.trim()) 
      ? new Date(competencia.split(',')[0] + '-28') 
      : new Date();
    if (competencia) dataRef.setDate(new Date(dataRef.getFullYear(), dataRef.getMonth() + 1, 0).getDate());
    
    const dataRefSql = dataRef.toISOString().split('T')[0];

    try {
        const params = [dataRefSql];
        let whereClauses = [
            `c.st_ativo = 1`, 
            `c.st_faleceu = 0`
        ];

        // Filtro de Equipe
        if (equipe && equipe.trim()) {
            params.push(equipe.trim());
            const ph = `$${params.length}`;
            whereClauses.push(`(TRIM(te.nu_ine::text) = ${ph} OR TRIM(te.no_equipe) = ${ph})`);
        }
        
        // Filtro de Microárea (LTRIM para ignorar zeros à esquerda)
        if (microarea && microarea.trim()) {
            params.push(microarea.trim());
            const ph = `$${params.length}`;
            whereClauses.push(`EXISTS (SELECT 1 FROM tb_fat_cidadao_territorio tt WHERE tt.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec AND LTRIM(tt.nu_micro_area, '0') = LTRIM(${ph}, '0'))`);
        }

        // Filtro de Diagnóstico (Diabetes)
        // Busca diagnósticos feitos ATÉ a data de referência
        whereClauses.push(`EXISTS (
            SELECT 1 FROM tb_fat_atendimento_individual ai 
            JOIN tb_dim_tempo t ON ai.co_dim_tempo = t.co_seq_dim_tempo 
            WHERE ai.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec 
            AND t.dt_registro <= $1
            AND (
                ai.ds_filtro_ciaps ILIKE '%T89%' OR ai.ds_filtro_ciaps ILIKE '%T90%' OR 
                ai.ds_filtro_cids ILIKE '%E10%' OR ai.ds_filtro_cids ILIKE '%E11%' OR 
                ai.ds_filtro_cids ILIKE '%E12%' OR ai.ds_filtro_cids ILIKE '%E13%' OR 
                ai.ds_filtro_cids ILIKE '%E14%'
            )
        )`);

        const whereSql = whereClauses.join(' AND ');

        // 2. QUERY CONTAGEM (Blindada)
        const sqlCount = `
            SELECT COUNT(DISTINCT pec.co_seq_fat_cidadao_pec) as total
            FROM tb_cidadao c
            JOIN tb_fat_cidadao_pec pec ON c.co_seq_cidadao = pec.co_cidadao
            LEFT JOIN tb_dim_equipe te ON pec.co_dim_equipe_vinc = te.co_seq_dim_equipe
            WHERE ${whereSql}
        `;
        
        const totalRes = await pool.query(sqlCount, params);
        const total = parseInt(totalRes.rows[0]?.total || 0, 10);

        if (total === 0) return { dados: [], total: 0, dataRef };

        // 3. QUERY DADOS (Paginada)
        const paramsIds = [...params, limit, offset];
        const sqlDados = `
            SELECT DISTINCT ON (pec.co_seq_fat_cidadao_pec) 
                pec.co_seq_fat_cidadao_pec, c.no_cidadao, c.nu_cpf, c.nu_cns, c.dt_nascimento, te.no_equipe
            FROM tb_cidadao c
            JOIN tb_fat_cidadao_pec pec ON c.co_seq_cidadao = pec.co_cidadao
            LEFT JOIN tb_dim_equipe te ON pec.co_dim_equipe_vinc = te.co_seq_dim_equipe
            WHERE ${whereSql}
            ORDER BY pec.co_seq_fat_cidadao_pec, c.no_cidadao ASC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        const dadosRes = await pool.query(sqlDados, paramsIds);
        return { dados: dadosRes.rows, total, dataRef };

    } catch (e) { console.error('Erro Diabetes Base:', e); throw e; }
}

// --- PROCESSAMENTO DE REGRAS (Com Data Ref) ---
async function processarRegrasDiabetes(listaCidadaos, dataRef) {
    if (!listaCidadaos || listaCidadaos.length === 0) return [];

    // IDs como String
    const ids = listaCidadaos.map(c => String(c.co_seq_fat_cidadao_pec));
    
    // Data de Referência
    const dataRefObj = dataRef instanceof Date ? dataRef : new Date(dataRef || Date.now());
    dataRefObj.setHours(0,0,0,0); 
    const dataRefSql = dataRefObj.toISOString().split('T')[0];
    const refTime = dataRefObj.getTime();
    
    const params = [ids, dataRefSql];
    // Filtro SQL: Pega tudo até a data de referência
    const filtroTempo = `AND t.dt_registro::date <= $2::date`;

    const sqlEventos = `
        SELECT ai.co_fat_cidadao_pec, t.dt_registro, 'CONSULTA' as tipo, 
               ai.nu_pressao_sistolica as pa, ai.nu_peso, ai.nu_altura, cbo.nu_cbo, null as proc
        FROM tb_fat_atendimento_individual ai
        JOIN tb_dim_tempo t ON ai.co_dim_tempo = t.co_seq_dim_tempo
        LEFT JOIN tb_dim_cbo cbo ON ai.co_dim_cbo_1 = cbo.co_seq_dim_cbo
        WHERE ai.co_fat_cidadao_pec = ANY($1) ${filtroTempo}

        UNION ALL

        SELECT vd.co_fat_cidadao_pec, t.dt_registro, 'VISITA' as tipo, 
               null as pa, vd.nu_peso, vd.nu_altura, cbo.nu_cbo, null as proc
        FROM tb_fat_visita_domiciliar vd
        JOIN tb_dim_tempo t ON vd.co_dim_tempo = t.co_seq_dim_tempo
        LEFT JOIN tb_dim_cbo cbo ON vd.co_dim_cbo = cbo.co_seq_dim_cbo
        WHERE vd.co_fat_cidadao_pec = ANY($1) ${filtroTempo}

        UNION ALL

        SELECT pa.co_fat_cidadao_pec, t.dt_registro, 'PROCEDIMENTO' as tipo,
               null, null, null, null, pa.ds_filtro_procedimento
        FROM tb_fat_proced_atend pa
        JOIN tb_dim_tempo t ON pa.co_dim_tempo = t.co_seq_dim_tempo
        WHERE pa.co_fat_cidadao_pec = ANY($1) ${filtroTempo}
          AND (
              pa.ds_filtro_procedimento ILIKE '%0202010509%' 
              OR pa.ds_filtro_procedimento ILIKE '%ABPG033%'
              OR pa.ds_filtro_procedimento ILIKE '%0301040095%'
              OR pa.ds_filtro_procedimento ILIKE '%ABEX008%'
          )
    `;

    try {
        const resEventos = await pool.query(sqlEventos, params);
        
        const mapEventos = {};
        resEventos.rows.forEach(ev => {
            const idString = String(ev.co_fat_cidadao_pec);
            if (!mapEventos[idString]) mapEventos[idString] = [];
            mapEventos[idString].push(ev);
        });

        // Helpers
        const safeNum = (val) => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            let str = String(val).replace(',', '.').trim();
            if (str.includes('/')) str = str.split('/')[0]; 
            return parseFloat(str) || 0;
        };

        const isMedEnf = (cbo) => /^(2251|2252|2253|2231|2235)/.test(String(cbo||'').trim());
        
        const isVisitaValida = (ev) => {
            if (ev.tipo !== 'VISITA') return false;
            if (!ev.nu_cbo) return true; 
            const s = String(ev.nu_cbo).trim();
            return s === '515105' || s === '322255';
        };

        // Constantes de Tempo (Milissegundos)
        const MS_6M = 180 * 24 * 60 * 60 * 1000;
        const MS_12M = 365 * 24 * 60 * 60 * 1000;

        // Função de checagem de data genérica
        const checkPrazo = (dtRegistro, prazoMS) => {
            const dEvento = new Date(dtRegistro);
            dEvento.setHours(0,0,0,0);
            const diff = refTime - dEvento.getTime();
            // Aceita se estiver no passado (diff > 0) e dentro do prazo, ou se for hoje (diff=0)
            return diff >= 0 && diff <= prazoMS;
        };

        return listaCidadaos.map(cidadao => {
            const id = String(cidadao.co_seq_fat_cidadao_pec);
            const eventos = mapEventos[id] || [];
            
            // --- REGRA A: CONSULTA (6 Meses) ---
            const fezConsulta6m = eventos.some(e => e.tipo === 'CONSULTA' && isMedEnf(e.nu_cbo) && checkPrazo(e.dt_registro, MS_6M));

            // --- REGRA B: PA (6 Meses) ---
            const fezPA6m = eventos.some(e => e.tipo === 'CONSULTA' && safeNum(e.pa) > 0 && checkPrazo(e.dt_registro, MS_6M));

            // --- REGRA C: ANTROPOMETRIA (12 Meses) ---
            // Nota: Peso E Altura no mesmo atendimento (simplificado aqui para 'no prazo')
            const fezAntro12m = eventos.some(e => safeNum(e.nu_peso) > 0 && safeNum(e.nu_altura) > 0 && checkPrazo(e.dt_registro, MS_12M));
            
            // --- REGRA D: VISITAS (12 Meses) ---
            // Lógica: 2 visitas com 30 dias de intervalo
            const visitas = eventos.filter(e => isVisitaValida(e) && checkPrazo(e.dt_registro, MS_12M))
                                   .map(e => new Date(e.dt_registro).getTime()).sort((a,b) => a-b);
            let fezVisitas = false;
            if (visitas.length >= 2) {
                const diff = (visitas[visitas.length - 1] - visitas[0]) / (1000 * 60 * 60 * 24);
                if (diff >= 30) fezVisitas = true;
            }

            // --- REGRA E: HEMOGLOBINA (12 Meses) ---
            const fezHemo = eventos.some(e => e.tipo === 'PROCEDIMENTO' && ((e.proc||'').includes('0202010509') || (e.proc||'').includes('ABEX008')) && checkPrazo(e.dt_registro, MS_12M));

            // --- REGRA F: PÉ DIABÉTICO (12 Meses) ---
            const fezPe12m = eventos.some(e => e.tipo === 'PROCEDIMENTO' && ((e.proc||'').includes('ABPG033') || (e.proc||'').includes('0301040095')) && checkPrazo(e.dt_registro, MS_12M));

            // --- RETORNO BLINDADO ---
            return {
                ...cidadao,
                ind_a: fezConsulta6m ? 'Sim' : 'Não',
                ind_b: fezPA6m ? 'Sim' : 'Não',
                ind_c: fezAntro12m ? 'Sim' : 'Não',
                ind_d: fezVisitas ? 'Sim' : 'Não',
                ind_e: fezHemo ? 'Sim' : 'Não',
                ind_f: fezPe12m ? 'Sim' : 'Não'
            };
        });
    } catch (err) {
        console.error("Erro Debug C4:", err);
        return [];
    }
}

// --- ROTA RANKING DIABETES (Atualizada com DataRef) ---
router.get('/indicadores/ranking-diabetes', async (req, res) => {
    const cacheKey = 'ranking_diabetes_v62_fixed';
    const cachedData = myCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
        // 1. Busca todas as equipes para o esqueleto (garante zeros)
        const sqlEquipes = `SELECT DISTINCT no_equipe FROM tb_dim_equipe WHERE no_equipe IS NOT NULL AND no_equipe != '' AND (no_equipe ILIKE 'ESF%' OR no_equipe ILIKE 'PSF%' OR no_equipe ILIKE 'UBS%' OR no_equipe ILIKE 'EAP%')`;
        const resEquipes = await pool.query(sqlEquipes);
        
        const rankingMap = {};
        resEquipes.rows.forEach(r => {
            const nome = r.no_equipe.trim();
            const eqUpper = nome.toUpperCase();
            if (eqUpper.includes('BUCAL') || eqUpper.startsWith('ESB') || eqUpper.startsWith('SB ') || eqUpper.includes('NASF')) return;
            rankingMap[nome] = { equipe: nome, a:0, b:0, c:0, d:0, e:0, f:0, nm:0, dn:0, percentual: '0.00' };
        });

        // 2. Busca dados reais
        const { dados, dataRef } = await extrairDadosDiabetesBase({}, { limit: 1000000 });
        
        if (dados && dados.length > 0) {
            const processados = await processarRegrasDiabetes(dados, dataRef);
            
            processados.forEach(p => {
                const eq = p.no_equipe ? p.no_equipe.trim() : 'Sem Equipe';
                
                // Cria se não existir (caso nome divirja)
                if (!rankingMap[eq]) {
                     const eqUpper = eq.toUpperCase();
                     if (!(eqUpper.includes('BUCAL') || eqUpper.startsWith('ESB'))) {
                        rankingMap[eq] = { equipe: eq, a:0, b:0, c:0, d:0, e:0, f:0, nm:0, dn:0, percentual: '0.00' };
                     }
                }

                if (rankingMap[eq]) {
                    const r = rankingMap[eq];
                    r.dn++;
                    let pts = 0;
                    if (p.ind_a === 'Sim') { r.a++; pts += 20; }
                    if (p.ind_b === 'Sim') { r.b++; pts += 15; }
                    if (p.ind_c === 'Sim') { r.c++; pts += 15; }
                    if (p.ind_d === 'Sim') { r.d++; pts += 20; }
                    if (p.ind_e === 'Sim') { r.e++; pts += 15; }
                    if (p.ind_f === 'Sim') { r.f++; pts += 15; }
                    r.nm += pts;
                }
            });
        }

        const final = Object.values(rankingMap).map(r => {
            const nota = r.dn > 0 ? (r.nm / (r.dn * 100)) * 100 : 0;
            r.percentual = nota.toFixed(2);
            return r;
        });

        final.sort((a,b) => parseFloat(b.percentual) - parseFloat(a.percentual));
        myCache.set(cacheKey, final, 1200);
        res.json(final);

    } catch (err) {
        console.error("ERRO RANKING DIABETES:", err);
        res.status(500).json({ error: 'Erro ao calcular ranking.' });
    }
});

// --- ROTA LISTA DIABETES (Atualizada) ---
router.get('/indicadores/diabetes', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private'); // <--- ADICIONAR ISSO
    try {
        const page = parseInt(req.query.pagina) || 1;
        const { equipe, microarea, exportar, competencia } = req.query;
        const limit = exportar === 'true' ? 1000000 : 15;
        const offset = (page - 1) * limit;

        const { dados, total, dataRef } = await extrairDadosDiabetesBase({ equipe, microarea, competencia }, { limit, offset });
        
        // Passa dataRef para o processamento correto
        const processados = await processarRegrasDiabetes(dados, dataRef);

        res.json({
            data: processados,
            pagination: {
                page: page,
                limit: limit,
                totalRows: parseInt(total),
                totalPages: Math.ceil(parseInt(total) / limit)
            },
            columns: []
        });
    } catch (err) {
        console.error("ERRO LISTA DIABETES:", err);
        res.status(500).json({ error: "Erro ao buscar lista diabetes." });
    }
});

 /**
 * IMPLEMENTAÇÃO: INDICADOR C5 - HIPERTENSÃO (routes/api.js)
 * Fonte: Nota Metodológica C5 - Ministério da Saúde
 */

// --- C5: HIPERTENSÃO BASE ---
async function extrairDadosHipertensaoBase(filtros = {}, paginacao = {}) {
    const { equipe, microarea } = filtros;
    const { limit, offset } = paginacao;
    let params = [];
    let whereClauses = [`c.st_ativo = 1`, `c.st_faleceu = 0`];

    if (equipe && equipe.trim()) {
        params.push(equipe.trim());
        const ph = `$${params.length}`;
        whereClauses.push(/^\d+$/.test(equipe) ? `te.nu_ine = ${ph}` : `te.no_equipe = ${ph}`);
    }
    
    if (microarea && microarea.trim()) {
        params.push(microarea.trim());
        const ph = `$${params.length}`;
        whereClauses.push(`EXISTS (SELECT 1 FROM tb_fat_cidadao_territorio tt WHERE tt.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec AND tt.nu_micro_area = ${ph})`);
    }

    whereClauses.push(`EXISTS (SELECT 1 FROM tb_fat_atendimento_individual ai JOIN tb_dim_tempo t ON ai.co_dim_tempo = t.co_seq_dim_tempo WHERE ai.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec AND t.nu_ano >= 2013 AND (ai.ds_filtro_ciaps ILIKE '%K86%' OR ai.ds_filtro_ciaps ILIKE '%K87%' OR ai.ds_filtro_cids ILIKE '%I10%' OR ai.ds_filtro_cids ILIKE '%I11%' OR ai.ds_filtro_cids ILIKE '%I12%' OR ai.ds_filtro_cids ILIKE '%I13%' OR ai.ds_filtro_cids ILIKE '%I15%' OR ai.ds_filtro_cids ILIKE '%O10%' OR ai.ds_filtro_cids ILIKE '%O11%'))`);

    const sqlBase = `SELECT pec.co_seq_fat_cidadao_pec, c.no_cidadao, c.nu_cpf, c.nu_cns, c.dt_nascimento, te.no_equipe, COUNT(*) OVER() as total_geral FROM tb_cidadao c JOIN tb_fat_cidadao_pec pec ON c.co_seq_cidadao = pec.co_cidadao LEFT JOIN tb_dim_equipe te ON pec.co_dim_equipe_vinc = te.co_seq_dim_equipe WHERE ${whereClauses.join(' AND ')} ORDER BY c.no_cidadao ASC ${limit ? `LIMIT ${limit}` : ''} ${offset ? `OFFSET ${offset}` : ''}`;

    const res = await pool.query(sqlBase, params);
    return { dados: res.rows, total: res.rows[0]?.total_geral || 0 };
}

// --- 2. PROCESSAMENTO DAS REGRAS (A, B, C, D) ---
async function processarRegrasHipertensao(listaCidadaos, filtros = {}) {
    if (!listaCidadaos || listaCidadaos.length === 0) return [];

    const { competencia } = filtros;
    const ids = listaCidadaos.map(c => c.co_seq_fat_cidadao_pec);
    let params = [ids];
    let filtroDataSql = `AND t.dt_registro >= (CURRENT_DATE - INTERVAL '12 months')`; // Padrão

    if (competencia && competencia.trim() !== '') {
        const mesesArray = competencia.split(',').map(m => m.trim()).filter(m => m);
        if (mesesArray.length > 0) {
            params.push(mesesArray);
            filtroDataSql = `AND TO_CHAR(t.dt_registro, 'YYYY-MM') = ANY($${params.length})`;
        }
    }

    // Busca eventos abrangendo os últimos 12 meses (ou competência)
    const sqlEventos = `
        SELECT ai.co_fat_cidadao_pec, t.dt_registro, 'CONSULTA' as tipo, 
               ai.nu_pressao_sistolica as pa, ai.nu_peso, ai.nu_altura, cbo.nu_cbo
        FROM tb_fat_atendimento_individual ai
        JOIN tb_dim_tempo t ON ai.co_dim_tempo = t.co_seq_dim_tempo
        LEFT JOIN tb_dim_cbo cbo ON ai.co_dim_cbo_1 = cbo.co_seq_dim_cbo
        WHERE ai.co_fat_cidadao_pec = ANY($1) 
          ${filtroDataSql}

        UNION ALL

        SELECT vd.co_fat_cidadao_pec, t.dt_registro, 'VISITA' as tipo, 
               null, null, null, cbo.nu_cbo
        FROM tb_fat_visita_domiciliar vd
        JOIN tb_dim_tempo t ON vd.co_dim_tempo = t.co_seq_dim_tempo
        LEFT JOIN tb_dim_cbo cbo ON vd.co_dim_cbo = cbo.co_seq_dim_cbo
        WHERE vd.co_fat_cidadao_pec = ANY($1)
          ${filtroDataSql}
          AND cbo.nu_cbo IN ('515105', '322255') -- CBOs de ACS
    `;

    const resEventos = await pool.query(sqlEventos, params);
    
    // Agrupamento de eventos por cidadão
    const mapEventos = {};
    resEventos.rows.forEach(ev => {
        if (!mapEventos[ev.co_fat_cidadao_pec]) mapEventos[ev.co_fat_cidadao_pec] = [];
        mapEventos[ev.co_fat_cidadao_pec].push(ev);
    });

    const isMedEnf = (cbo) => cbo && /^(2251|2252|2253|2231|2235)/.test(cbo);

    return listaCidadaos.map(cidadao => {
        const eventos = mapEventos[cidadao.co_seq_fat_cidadao_pec] || [];
        const hoje = new Date();
        const data6Meses = new Date(); data6Meses.setDate(hoje.getDate() - 180);
        
        let dataNascFormatada = '-';
        if (cidadao.dt_nascimento) {
            const dataPura = new Date(cidadao.dt_nascimento);
            dataPura.setMinutes(dataPura.getMinutes() + dataPura.getTimezoneOffset());
            dataNascFormatada = dataPura.toLocaleDateString('pt-BR');
        }

        // REGRA A: Consulta (Médico/Enfermeiro) nos últimos 6 meses (25 pontos)
        const fezConsulta6m = eventos.some(e => 
            e.tipo === 'CONSULTA' && isMedEnf(e.nu_cbo) && new Date(e.dt_registro) >= data6Meses
        );

        // REGRA B: Aferição de PA nos últimos 6 meses (25 pontos)
        const fezPA6m = eventos.some(e => 
            e.tipo === 'CONSULTA' && Number(e.pa) > 0 && new Date(e.dt_registro) >= data6Meses
        );

        // REGRA C: Peso e Altura simultâneos nos últimos 12 meses (25 pontos)
        const fezAntro12m = eventos.some(e => 
            (e.tipo === 'CONSULTA') && Number(e.nu_peso) > 0 && Number(e.nu_altura) > 0
        );

        // REGRA D: 2 Visitas Domiciliares (ACS) com intervalo >= 30 dias nos últimos 12 meses (25 pontos)
        const visitas = eventos.filter(e => e.tipo === 'VISITA')
                               .map(e => new Date(e.dt_registro).getTime())
                               .sort((a,b) => a-b);
        let fezVisitas = false;
        if (visitas.length >= 2) {
            const min = visitas[0];
            const max = visitas[visitas.length - 1];
            const diffDias = (max - min) / (1000 * 60 * 60 * 24);
            if (diffDias >= 30) fezVisitas = true;
        }

        return {
            ...cidadao,
            dt_nascimento: dataNascFormatada,
            ind_a: fezConsulta6m ? 'Sim' : 'Não',
            ind_b: fezPA6m ? 'Sim' : 'Não',
            ind_c: fezAntro12m ? 'Sim' : 'Não',
            ind_d: fezVisitas ? 'Sim' : 'Não'
        };
    });
}

// --- 3. ROTA DE RANKING (ABA PERCENTUAL) ---
router.get('/indicadores/ranking-hipertensao', async (req, res) => {
    const cacheKey = 'ranking_hipertensao_v1';
    const cachedData = myCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
        const raw = await extrairDadosHipertensaoBase({});
        if (!raw.dados || raw.dados.length === 0) return res.json([]);

        const processados = await processarRegrasHipertensao(raw.dados);
        const rankingMap = {};

        processados.forEach(p => {
            const eq = p.no_equipe || 'Sem Equipe';
            if (!rankingMap[eq]) {
                rankingMap[eq] = { equipe: eq, a:0, b:0, c:0, d:0, nm:0, dn:0 };
            }
            const r = rankingMap[eq];
            r.dn++;
            
            // Cada regra vale 25 pontos
            let pts = 0;
            if (p.ind_a === 'Sim') { r.a++; pts += 25; }
            if (p.ind_b === 'Sim') { r.b++; pts += 25; }
            if (p.ind_c === 'Sim') { r.c++; pts += 25; }
            if (p.ind_d === 'Sim') { r.d++; pts += 25; }
            r.nm += pts;
        });

        const final = Object.values(rankingMap).map(r => {
            // Nota Técnica: Soma dos Pontos / Total de Pessoas
            const nota = r.dn > 0 ? (r.nm / r.dn) : 0;
            return { ...r, pontuacao: nota.toFixed(2) };
        });

        final.sort((a,b) => parseFloat(b.pontuacao) - parseFloat(a.pontuacao));
        myCache.set(cacheKey, final, 1200);
        res.json(final);

    } catch (err) {
        console.error("ERRO RANKING HIPERTENSÃO:", err);
        res.status(500).json({ error: 'Erro ao calcular ranking.' });
    }
});

// --- 4. ROTA DE LISTA NOMINAL (ABA LISTA) ---
router.get('/indicadores/hipertensao', async (req, res) => {
    try {
        const page = parseInt(req.query.pagina) || 1;
        const { equipe, microarea, exportar, competencia } = req.query;
        const limit = exportar === 'true' ? 1000000 : 15;
        const offset = (page - 1) * limit;

        const { dados, total } = await extrairDadosHipertensaoBase({ equipe, microarea, competencia }, { limit, offset });
        const processados = await processarRegrasHipertensao(dados, { competencia });

        res.json({
            data: processados,
            pagination: {
                page: page,
                limit: limit,
                totalRows: parseInt(total),
                totalPages: Math.ceil(parseInt(total) / limit)
            },
            columns: []
        });
    } catch (err) {
        console.error("ERRO LISTA HIPERTENSÃO:", err);
        res.status(500).json({ error: "Erro ao buscar lista hipertensão." });
    }
});

// ==========================================================
// FUNÇÕES CORE: PESSOA IDOSA (C6)
// ==========================================================

// --- C6: IDOSO BASE ---
async function extrairDadosIdosoBase(filtros = {}, paginacao = {}) {
    const { equipe, microarea } = filtros;
    const { limit, offset } = paginacao;
    let params = [];
    let whereClauses = [`c.st_ativo = 1`, `c.st_faleceu = 0`, `c.dt_nascimento <= (CURRENT_DATE - INTERVAL '60 years')`];

    if (equipe && equipe.trim()) {
        params.push(equipe.trim());
        const ph = `$${params.length}`;
        whereClauses.push(/^\d+$/.test(equipe) ? `te.nu_ine = ${ph}` : `te.no_equipe = ${ph}`);
    }
    
    if (microarea && microarea.trim()) {
        params.push(microarea.trim());
        const ph = `$${params.length}`;
        whereClauses.push(`EXISTS (SELECT 1 FROM tb_fat_cidadao_territorio tt WHERE tt.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec AND tt.nu_micro_area = ${ph})`);
    }

    const sqlBase = `SELECT pec.co_seq_fat_cidadao_pec, c.no_cidadao, c.nu_cpf, c.nu_cns, c.dt_nascimento, te.no_equipe, COUNT(*) OVER() as total_geral FROM tb_cidadao c JOIN tb_fat_cidadao_pec pec ON c.co_seq_cidadao = pec.co_cidadao LEFT JOIN tb_dim_equipe te ON pec.co_dim_equipe_vinc = te.co_seq_dim_equipe WHERE ${whereClauses.join(' AND ')} ORDER BY c.no_cidadao ASC ${limit ? `LIMIT ${limit}` : ''} ${offset ? `OFFSET ${offset}` : ''}`;

    const res = await pool.query(sqlBase, params);
    return { dados: res.rows, total: res.rows[0]?.total_geral || 0 };
}

async function processarRegrasIdoso(listaCidadaos, filtros = {}) {
    if (!listaCidadaos || listaCidadaos.length === 0) return [];

    const { competencia } = filtros;
    const ids = listaCidadaos.map(c => c.co_seq_fat_cidadao_pec);
    
    let params = [ids];
    let filtroDataSql = `AND t.dt_registro >= (CURRENT_DATE - INTERVAL '12 months')`; // Padrão

    if (competencia && competencia.trim() !== '') {
        const mesesArray = competencia.split(',').map(m => m.trim()).filter(m => m);
        if (mesesArray.length > 0) {
            params.push(mesesArray);
            filtroDataSql = `AND TO_CHAR(t.dt_registro, 'YYYY-MM') = ANY($${params.length})`;
        }
    }

    // Busca eventos dos últimos 12 meses ou pela competência
    const sqlEventos = `
        SELECT ai.co_fat_cidadao_pec, t.dt_registro, 'CONSULTA' as tipo, 
               ai.nu_peso, ai.nu_altura, cbo.nu_cbo, null as vacina
        FROM tb_fat_atendimento_individual ai
        JOIN tb_dim_tempo t ON ai.co_dim_tempo = t.co_seq_dim_tempo
        LEFT JOIN tb_dim_cbo cbo ON ai.co_dim_cbo_1 = cbo.co_seq_dim_cbo
        WHERE ai.co_fat_cidadao_pec = ANY($1) 
          ${filtroDataSql}

        UNION ALL

        SELECT vd.co_fat_cidadao_pec, t.dt_registro, 'VISITA' as tipo, 
               vd.nu_peso, vd.nu_altura, cbo.nu_cbo, null
        FROM tb_fat_visita_domiciliar vd
        JOIN tb_dim_tempo t ON vd.co_dim_tempo = t.co_seq_dim_tempo
        LEFT JOIN tb_dim_cbo cbo ON vd.co_dim_cbo = cbo.co_seq_dim_cbo
        WHERE vd.co_fat_cidadao_pec = ANY($1)
          ${filtroDataSql}
          AND cbo.nu_cbo IN ('515105', '322255')

        UNION ALL

        SELECT vac.co_fat_cidadao_pec, t.dt_registro, 'VACINA' as tipo,
               null, null, null, vac.ds_filtro_imunobiologico
        FROM tb_fat_vacinacao vac
        JOIN tb_dim_tempo t ON vac.co_dim_tempo = t.co_seq_dim_tempo
        WHERE vac.co_fat_cidadao_pec = ANY($1)
          ${filtroDataSql}
    `;

    const resEventos = await pool.query(sqlEventos, params);
    
    const mapEventos = {};
    resEventos.rows.forEach(ev => {
        if (!mapEventos[ev.co_fat_cidadao_pec]) mapEventos[ev.co_fat_cidadao_pec] = [];
        mapEventos[ev.co_fat_cidadao_pec].push(ev);
    });

    const isMedEnf = (cbo) => cbo && /^(2251|2252|2253|2231|2235)/.test(cbo);

    return listaCidadaos.map(cidadao => {
        const eventos = mapEventos[cidadao.co_seq_fat_cidadao_pec] || [];
        const hoje = new Date();
        const data12Meses = new Date(); data12Meses.setDate(hoje.getDate() - 365);
        
        let dataNascFormatada = '-';
        if (cidadao.dt_nascimento) {
            const dataPura = new Date(cidadao.dt_nascimento);
            dataPura.setMinutes(dataPura.getMinutes() + dataPura.getTimezoneOffset());
            dataNascFormatada = dataPura.toLocaleDateString('pt-BR');
        }

        // REGRA A: Consulta (12 meses)
        const fezConsulta = eventos.some(e => 
            e.tipo === 'CONSULTA' && isMedEnf(e.nu_cbo) && new Date(e.dt_registro) >= data12Meses
        );

        // REGRA B: Peso/Altura simultâneos (12 meses)
        const fezAntro = eventos.some(e => 
            (Number(e.nu_peso) > 0 && Number(e.nu_altura) > 0) && new Date(e.dt_registro) >= data12Meses
        );

        // REGRA C: 2 Visitas ACS com intervalo 30d (12 meses)
        const visitas = eventos.filter(e => e.tipo === 'VISITA')
                               .map(e => new Date(e.dt_registro).getTime())
                               .sort((a,b) => a-b);
        let fezVisitas = false;
        if (visitas.length >= 2) {
            const min = visitas[0];
            const max = visitas[visitas.length - 1];
            const diffDias = (max - min) / (1000 * 60 * 60 * 24);
            if (diffDias >= 30) fezVisitas = true;
        }

        // REGRA D: Vacina Influenza (Códigos 33 ou 77)
        const fezVacina = eventos.some(e => 
            e.tipo === 'VACINA' && (
                (e.vacina || '').includes('|33|') || (e.vacina || '').includes('|77|')
            )
        );

        return {
            ...cidadao,
            dt_nascimento: dataNascFormatada,
            ind_a: fezConsulta ? 'Sim' : 'Não',
            ind_b: fezAntro ? 'Sim' : 'Não',
            ind_c: fezVisitas ? 'Sim' : 'Não',
            ind_d: fezVacina ? 'Sim' : 'Não'
        };
    });
}

// ROTA LISTA NOMINAL IDOSO
router.get('/indicadores/idoso', async (req, res) => {
    try {
        const page = parseInt(req.query.pagina) || 1;
        const { equipe, microarea, exportar, competencia } = req.query;
        const limit = exportar === 'true' ? 1000000 : 15;
        const offset = (page - 1) * limit;

        const { dados, total } = await extrairDadosIdosoBase({ equipe, microarea, competencia }, { limit, offset });
        const processados = await processarRegrasIdoso(dados, { competencia });

        res.json({
            data: processados,
            pagination: {
                page: page,
                limit: limit,
                totalRows: parseInt(total),
                totalPages: Math.ceil(parseInt(total) / limit)
            },
            columns: []
        });
    } catch (err) {
        console.error("ERRO LISTA IDOSO:", err);
        res.status(500).json({ error: "Erro ao buscar lista idoso." });
    }
});

// ROTA RANKING IDOSO
router.get('/indicadores/ranking-idoso', async (req, res) => {
    try {
        const raw = await extrairDadosIdosoBase({});
        if (!raw.dados || raw.dados.length === 0) return res.json([]);

        const processados = await processarRegrasIdoso(raw.dados);
        const rankingMap = {};

        processados.forEach(p => {
            const eq = p.no_equipe || 'Sem Equipe';
            if (!rankingMap[eq]) rankingMap[eq] = { equipe: eq, a:0, b:0, c:0, d:0, nm:0, dn:0 };
            const r = rankingMap[eq];
            r.dn++;
            
            let pts = 0;
            if (p.ind_a === 'Sim') { r.a++; pts += 25; }
            if (p.ind_b === 'Sim') { r.b++; pts += 25; }
            if (p.ind_c === 'Sim') { r.c++; pts += 25; }
            if (p.ind_d === 'Sim') { r.d++; pts += 25; }
            r.nm += pts;
        });

        const final = Object.values(rankingMap).map(r => {
            const nota = r.dn > 0 ? (r.nm / r.dn) : 0;
            return { ...r, pontuacao: nota.toFixed(2) };
        });

        final.sort((a,b) => parseFloat(b.pontuacao) - parseFloat(a.pontuacao));
        res.json(final);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao calcular ranking.' });
    }
});

// ==========================================================
// FUNÇÕES CORE: SAÚDE DA MULHER (C7)
// Fonte: Nota Metodológica C7
// ==========================================================

// --- C7: MULHER BASE ---
async function extrairDadosMulherBase(filtros = {}, paginacao = {}) {
    const { equipe, microarea } = filtros;
    const { limit, offset } = paginacao;
    let params = [];
    let whereClauses = [`c.st_ativo = 1`, `c.st_faleceu = 0`, `c.no_sexo = 'FEMININO'`, `c.dt_nascimento <= (CURRENT_DATE - INTERVAL '9 years')`, `c.dt_nascimento >= (CURRENT_DATE - INTERVAL '69 years')`];

    if (equipe && equipe.trim()) {
        params.push(equipe.trim());
        const ph = `$${params.length}`;
        whereClauses.push(/^\d+$/.test(equipe) ? `te.nu_ine = ${ph}` : `te.no_equipe = ${ph}`);
    }
    
    if (microarea && microarea.trim()) {
        params.push(microarea.trim());
        const ph = `$${params.length}`;
        // Sem TRIM
        whereClauses.push(`EXISTS (SELECT 1 FROM tb_fat_cidadao_territorio tt WHERE tt.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec AND tt.nu_micro_area = ${ph})`);
    }

    // OBS: O filtro de competência foi removido daqui propositalmente.
    // Ele será aplicado apenas na função `processarRegrasMulher` para verificar exames.

    const sqlBase = `SELECT pec.co_seq_fat_cidadao_pec, c.no_cidadao, c.nu_cpf, c.nu_cns, c.dt_nascimento, te.no_equipe, COUNT(*) OVER() as total_geral FROM tb_cidadao c JOIN tb_fat_cidadao_pec pec ON c.co_seq_cidadao = pec.co_cidadao LEFT JOIN tb_dim_equipe te ON pec.co_dim_equipe_vinc = te.co_seq_dim_equipe WHERE ${whereClauses.join(' AND ')} ORDER BY c.no_cidadao ASC ${limit ? `LIMIT ${limit}` : ''} ${offset ? `OFFSET ${offset}` : ''}`;

    const res = await pool.query(sqlBase, params);
    return { dados: res.rows, total: res.rows[0]?.total_geral || 0 };
}

async function processarRegrasMulher(listaCidadaos, filtros = {}) {
    if (!listaCidadaos || listaCidadaos.length === 0) return [];

    const { competencia } = filtros;
    const ids = listaCidadaos.map(c => c.co_seq_fat_cidadao_pec);
    
    let params = [ids];
    let filtroDataSql36m = `AND t.dt_registro >= (CURRENT_DATE - INTERVAL '36 months')`;
    let filtroDataSql12m = `AND t.dt_registro >= (CURRENT_DATE - INTERVAL '12 months')`;
    let filtroDataSqlVacina = ``; // Vacina não tem filtro de tempo na query inicial

    if (competencia && competencia.trim() !== '') {
        const mesesArray = competencia.split(',').map(m => m.trim()).filter(m => m);
        if (mesesArray.length > 0) {
            params.push(mesesArray);
            const clause = `AND TO_CHAR(t.dt_registro, 'YYYY-MM') = ANY($${params.length})`;
            filtroDataSql36m = clause;
            filtroDataSql12m = clause;
            filtroDataSqlVacina = clause;
        }
    }
    
    // Busca eventos amplos
    const sqlEventos = `
        -- Exames (Citopatológico e Mamografia)
        SELECT pa.co_fat_cidadao_pec, t.dt_registro, 'PROCEDIMENTO' as tipo,
               pa.ds_filtro_procedimento as proc, null as vacina
        FROM tb_fat_proced_atend pa
        JOIN tb_dim_tempo t ON pa.co_dim_tempo = t.co_seq_dim_tempo
        WHERE pa.co_fat_cidadao_pec = ANY($1) 
          ${filtroDataSql36m}

        UNION ALL

        -- Vacinação (Tabela Específica)
        SELECT vac.co_fat_cidadao_pec, t.dt_registro, 'VACINA' as tipo,
               null, vac.ds_filtro_imunobiologico
        FROM tb_fat_vacinacao vac
        JOIN tb_dim_tempo t ON vac.co_dim_tempo = t.co_seq_dim_tempo
        WHERE vac.co_fat_cidadao_pec = ANY($1) ${filtroDataSqlVacina}

        UNION ALL

        -- Atendimentos (Consultas)
        SELECT ai.co_fat_cidadao_pec, t.dt_registro, 'CONSULTA' as tipo, 
               null, null
        FROM tb_fat_atendimento_individual ai
        JOIN tb_dim_tempo t ON ai.co_dim_tempo = t.co_seq_dim_tempo
        LEFT JOIN tb_dim_cbo cbo ON ai.co_dim_cbo_1 = cbo.co_seq_dim_cbo
        WHERE ai.co_fat_cidadao_pec = ANY($1) 
          ${filtroDataSql12m}
          -- Filtros de CID/CIAP de saúde sexual/reprodutiva seriam aplicados aqui se necessário
    `;

    const resEventos = await pool.query(sqlEventos, params);
    
    const mapEventos = {};
    resEventos.rows.forEach(ev => {
        if (!mapEventos[ev.co_fat_cidadao_pec]) mapEventos[ev.co_fat_cidadao_pec] = [];
        mapEventos[ev.co_fat_cidadao_pec].push(ev);
    });

    return listaCidadaos.map(cidadao => {
        const eventos = mapEventos[cidadao.co_seq_fat_cidadao_pec] || [];
        const hoje = new Date();
        
        let idadeAnos = 0;
        let dataNascFormatada = '-';
        if (cidadao.dt_nascimento) {
            const dn = new Date(cidadao.dt_nascimento);
            idadeAnos = Math.floor((hoje - dn) / (365.25 * 24 * 60 * 60 * 1000));
            dn.setMinutes(dn.getMinutes() + dn.getTimezoneOffset());
            dataNascFormatada = dn.toLocaleDateString('pt-BR');
        }

        // Datas de corte para a lógica JS (independente do filtro da query)
        const data12m = new Date(); data12m.setFullYear(data12m.getFullYear() - 1);
        const data24m = new Date(); data24m.setFullYear(data24m.getFullYear() - 2);
        const data36m = new Date(); data36m.setFullYear(data36m.getFullYear() - 3);

        // --- REGRA A: Cito (25-64 anos) - 36 meses ---
        let statusA = "N/A";
        if (idadeAnos >= 25 && idadeAnos <= 64) {
            const fezCito = eventos.some(e => 
                (e.tipo === 'PROCEDIMENTO' || e.tipo === 'EXAME') && 
                (e.proc && (e.proc.includes('0201020033') || e.proc.includes('ABEX001') || e.proc.includes('0203010086'))) &&
                new Date(e.dt_registro) >= data36m
            );
            statusA = fezCito ? "Sim" : "Não";
        }

        // --- REGRA B: HPV (9-14 anos) ---
        let statusB = "N/A";
        if (idadeAnos >= 9 && idadeAnos <= 14) {
            // Vacinas código 67 (Quadri) ou 93 (Nona)
            const fezHPV = eventos.some(e => 
                e.tipo === 'VACINA' && 
                (e.vacina && (e.vacina.includes('|67|') || e.vacina.includes('|93|')))
            );
            statusB = fezHPV ? "Sim" : "Não";
        }

        // --- REGRA C: Consulta (14-69 anos) - 12 meses ---
        let statusC = "N/A";
        if (idadeAnos >= 14 && idadeAnos <= 69) {
            const fezConsulta = eventos.some(e => 
                e.tipo === 'CONSULTA' && new Date(e.dt_registro) >= data12m
            );
            statusC = fezConsulta ? "Sim" : "Não";
        }

        // --- REGRA D: Mama (50-69 anos) - 24 meses ---
        let statusD = "N/A";
        if (idadeAnos >= 50 && idadeAnos <= 69) {
            const fezMama = eventos.some(e => 
                (e.tipo === 'PROCEDIMENTO') && 
                (e.proc && (e.proc.includes('0204030188') || e.proc.includes('0204030030'))) &&
                new Date(e.dt_registro) >= data24m
            );
            statusD = fezMama ? "Sim" : "Não";
        }

        return {
            ...cidadao,
            dt_nascimento: dataNascFormatada,
            idade: idadeAnos,
            ind_a: statusA,
            ind_b: statusB,
            ind_c: statusC,
            ind_d: statusD
        };
    });
}

// ROTA RANKING C7 (COM FILTRO DE SAÚDE BUCAL)
router.get('/indicadores/ranking-mulher', async (req, res) => {
    try {
        // Busca sem limite para calcular o ranking total
        const raw = await extrairDadosMulherBase({}); 
        if (!raw.dados || raw.dados.length === 0) return res.json([]);

        const processados = await processarRegrasMulher(raw.dados);
        const rankingMap = {};

        processados.forEach(p => {
            const eq = (p.no_equipe || 'Sem Equipe').toUpperCase();
            
            // --- FILTRO DE EXCLUSÃO (ESB/USB) ---
            // Ignora equipes que contenham termos de saúde bucal
            if (eq.includes('BUCAL') || eq.startsWith('ESB') || eq.includes('ODONTO') || eq.startsWith('SB ')) {
                return;
            }

            // Volta ao nome original para exibição (mas mantém a chave consistente)
            const nomeEquipe = p.no_equipe || 'Sem Equipe';

            if (!rankingMap[nomeEquipe]) {
                rankingMap[nomeEquipe] = { 
                    equipe: nomeEquipe, 
                    nm_a: 0, dn_a: 0, 
                    nm_b: 0, dn_b: 0, 
                    nm_c: 0, dn_c: 0, 
                    nm_d: 0, dn_d: 0 
                };
            }
            const r = rankingMap[nomeEquipe];

            // Contabiliza apenas se for elegível (N/A não conta no denominador)
            if (p.ind_a !== 'N/A') { r.dn_a++; if (p.ind_a === 'Sim') r.nm_a++; }
            if (p.ind_b !== 'N/A') { r.dn_b++; if (p.ind_b === 'Sim') r.nm_b++; }
            if (p.ind_c !== 'N/A') { r.dn_c++; if (p.ind_c === 'Sim') r.nm_c++; }
            if (p.ind_d !== 'N/A') { r.dn_d++; if (p.ind_d === 'Sim') r.nm_d++; }
        });

        const final = Object.values(rankingMap).map(r => {
            // Cálculo Ponderado conforme Nota Técnica
            // A (20 pts), B (30 pts), C (30 pts), D (20 pts)
            const notaA = r.dn_a > 0 ? (r.nm_a / r.dn_a) * 20 : 0;
            const notaB = r.dn_b > 0 ? (r.nm_b / r.dn_b) * 30 : 0;
            const notaC = r.dn_c > 0 ? (r.nm_c / r.dn_c) * 30 : 0;
            const notaD = r.dn_d > 0 ? (r.nm_d / r.dn_d) * 20 : 0;
            
            const total = notaA + notaB + notaC + notaD;

            return {
                equipe: r.equipe,
                nm_a: r.nm_a, dn_a: r.dn_a, nota_a: notaA.toFixed(2),
                nm_b: r.nm_b, dn_b: r.dn_b, nota_b: notaB.toFixed(2),
                nm_c: r.nm_c, dn_c: r.dn_c, nota_c: notaC.toFixed(2),
                nm_d: r.nm_d, dn_d: r.dn_d, nota_d: notaD.toFixed(2),
                pontuacao_final: total.toFixed(2)
            };
        });

        final.sort((a,b) => parseFloat(b.pontuacao_final) - parseFloat(a.pontuacao_final));
        res.json(final);

    } catch (err) {
        console.error("ERRO RANKING MULHER:", err);
        res.status(500).json({ error: 'Erro ranking.' });
    }
});

// ROTA LISTA NOMINAL C7
router.get('/indicadores/mulher', async (req, res) => {
    try {
        const page = parseInt(req.query.pagina) || 1;
        const { equipe, microarea, exportar, competencia } = req.query;
        const limit = exportar === 'true' ? 1000000 : 15;
        const offset = (page - 1) * limit;

        const { dados, total } = await extrairDadosMulherBase({ equipe, microarea, competencia }, { limit, offset });
        const processados = await processarRegrasMulher(dados, { competencia });

        res.json({
            data: processados,
            pagination: { page, limit, totalRows: parseInt(total), totalPages: Math.ceil(parseInt(total) / limit) },
            columns: []
        });
    } catch (err) {
        res.status(500).json({ error: "Erro lista mulher." });
    }
});

// ==========================================================
// MÓDULO B1 - SAÚDE BUCAL (1ª CONSULTA ODONTOLÓGICA)
// ==========================================================

// 1. FUNÇÃO BASE DE EXTRAÇÃO (Query Otimizada)
async function extrairDadosB1Base(filtros = {}, paginacao = {}) {
    const { equipe, microarea, competencia } = filtros;
    const { limit, offset } = paginacao;
    
    let params = [];
    let whereClauses = [
        `c.st_ativo = 1`, 
        `c.st_faleceu = 0`
    ];

    // Filtro de Competência (Data)
    // Se não houver, pega o ano atual
    let filtroData = `AND t.nu_ano = EXTRACT(YEAR FROM CURRENT_DATE)`;
    
    if (competencia && competencia.trim() !== '') {
        const mesesArray = competencia.split(',').map(m => m.trim()).filter(m => m);
        if (mesesArray.length > 0) {
            // Adiciona aos parâmetros globais para evitar injeção
            // Nota: O índice do params deve ser dinâmico no SQL final, 
            // mas aqui simplificamos a lógica para a query principal
            filtroData = `AND TO_CHAR(t.dt_registro, 'YYYY-MM') IN ('${mesesArray.join("','")}')`; 
        }
    }

    // Filtro Equipe
    if (equipe && equipe.trim()) {
        params.push(equipe.trim());
        const ph = `$${params.length}`;
        whereClauses.push(`(TRIM(te.nu_ine::text) = ${ph} OR TRIM(te.no_equipe) = ${ph})`);
    }

    // Filtro Microárea
    if (microarea && microarea.trim()) {
        params.push(microarea.trim());
        const ph = `$${params.length}`;
        whereClauses.push(`EXISTS (SELECT 1 FROM tb_fat_cidadao_territorio tt WHERE tt.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec AND tt.nu_micro_area = ${ph})`);
    }

    const whereSql = whereClauses.join(' AND ');

    // QUERY PRINCIPAL
    // Busca cidadãos e verifica se tiveram atendimento com Dentista (CBO 2232%)
    const sqlBase = `
        SELECT 
            c.no_cidadao, 
            c.nu_cpf, 
            c.nu_cns, 
            c.dt_nascimento, 
            te.no_equipe,
            -- Subquery para buscar a última consulta odontológica no período
            (
                SELECT MAX(t.dt_registro)
                FROM tb_fat_atendimento_odonto ao
                JOIN tb_dim_tempo t ON ao.co_dim_tempo = t.co_seq_dim_tempo
                LEFT JOIN tb_dim_cbo cbo ON ao.co_dim_cbo_1 = cbo.co_seq_dim_cbo
                WHERE ao.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec
                AND cbo.nu_cbo LIKE '2232%' -- Filtra Cirurgião Dentista
                ${filtroData}
            ) as dt_ultima_consulta,
            COUNT(*) OVER() as total_geral
        FROM tb_cidadao c
        JOIN tb_fat_cidadao_pec pec ON c.co_seq_cidadao = pec.co_cidadao
        LEFT JOIN tb_dim_equipe te ON pec.co_dim_equipe_vinc = te.co_seq_dim_equipe
        WHERE ${whereSql}
        ORDER BY c.no_cidadao ASC
        ${limit ? `LIMIT ${limit}` : ''} 
        ${offset ? `OFFSET ${offset}` : ''}
    `;

    const res = await pool.query(sqlBase, params);
    return { dados: res.rows, total: res.rows[0]?.total_geral || 0 };
}

// 2. ROTA LISTA NOMINAL (B1)
router.get('/indicadores/b1', async (req, res) => {
    try {
        const page = parseInt(req.query.pagina) || 1;
        const { equipe, microarea, exportar, competencia } = req.query;
        const limit = exportar === 'true' ? 1000000 : 15;
        const offset = (page - 1) * limit;

        const { dados, total } = await extrairDadosB1Base({ equipe, microarea, competencia }, { limit, offset });

        // Processamento para formatar a saída
        const dadosFormatados = dados.map(d => {
            let dataCons = '-';
            let status = 'Não';
            
            if (d.dt_ultima_consulta) {
                const dateObj = new Date(d.dt_ultima_consulta);
                dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
                dataCons = dateObj.toLocaleDateString('pt-BR');
                status = 'Sim';
            }
            
            let nasc = '-';
            if(d.dt_nascimento) {
                 const dnObj = new Date(d.dt_nascimento);
                 dnObj.setMinutes(dnObj.getMinutes() + dnObj.getTimezoneOffset());
                 nasc = dnObj.toLocaleDateString('pt-BR');
            }

            return {
                no_cidadao: d.no_cidadao,
                nu_cpf: d.nu_cpf,
                nu_cns: d.nu_cns,
                dt_nascimento: nasc,
                dt_ultima_consulta: dataCons,
                status: status
            };
        });

        res.json({
            data: dadosFormatados,
            pagination: {
                page: page,
                limit: limit,
                totalRows: parseInt(total),
                totalPages: Math.ceil(parseInt(total) / limit)
            },
            columns: [] 
        });

    } catch (err) {
        console.error("ERRO LISTA B1:", err);
        res.status(500).json({ error: "Erro ao buscar dados B1." });
    }
});

// 3. ROTA RANKING (B1)
router.get('/indicadores/ranking-b1', async (req, res) => {
    // Cache curto
    const cacheKey = 'ranking_b1_v1';
    const cachedData = myCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
        // Query de Ranking Agregado
        // NM: Cidadãos que tiveram consulta com dentista (2232%) no ano
        // DN: Total de cidadãos vinculados à equipe
        const sqlRanking = `
            SELECT 
                te.no_equipe as equipe,
                COUNT(DISTINCT pec.co_seq_fat_cidadao_pec) as dn,
                COUNT(DISTINCT CASE WHEN EXISTS (
                    SELECT 1 FROM tb_fat_atendimento_odonto ao
                    JOIN tb_dim_tempo t ON ao.co_dim_tempo = t.co_seq_dim_tempo
                    LEFT JOIN tb_dim_cbo cbo ON ao.co_dim_cbo_1 = cbo.co_seq_dim_cbo
                    WHERE ao.co_fat_cidadao_pec = pec.co_seq_fat_cidadao_pec
                    AND cbo.nu_cbo LIKE '2232%'
                    AND t.nu_ano = EXTRACT(YEAR FROM CURRENT_DATE)
                ) THEN pec.co_seq_fat_cidadao_pec END) as nm
            FROM tb_fat_cidadao_pec pec
            JOIN tb_dim_equipe te ON pec.co_dim_equipe_vinc = te.co_seq_dim_equipe
            JOIN tb_cidadao c ON pec.co_cidadao = c.co_seq_cidadao
            WHERE c.st_ativo = 1 
            AND te.no_equipe IS NOT NULL 
            AND te.no_equipe != ''
            GROUP BY te.no_equipe
        `;

        const result = await pool.query(sqlRanking);
        
        // Filtra equipes irrelevantes e calcula nota
        const ranking = result.rows
            .filter(r => {
                const nome = (r.equipe || '').toUpperCase();
                // Filtra para mostrar apenas equipes relevantes (opcional: ajuste conforme sua base)
                return !nome.includes('NASF') && !nome.includes('CONSULTORIO');
            })
            .map(r => {
                const nm = parseInt(r.nm || 0);
                const dn = parseInt(r.dn || 0);
                const pontuacao = dn > 0 ? (nm / dn) * 100 : 0;
                
                return {
                    equipe: r.equipe,
                    nm: nm,
                    dn: dn,
                    pontuacao: pontuacao.toFixed(2)
                };
            });

        ranking.sort((a, b) => parseFloat(b.pontuacao) - parseFloat(a.pontuacao));
        
        myCache.set(cacheKey, ranking, 600); // Cache 10 min
        res.json(ranking);

    } catch (err) {
        console.error("ERRO RANKING B1:", err);
        res.status(500).json({ error: "Erro ao calcular ranking B1." });
    }
});

module.exports = router;