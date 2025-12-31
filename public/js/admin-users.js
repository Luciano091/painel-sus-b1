console.log('🚀 VERSÃO NOVA CARREGADA: ' + new Date().toLocaleTimeString()); // Log de Versão

// Variáveis globais ou de escopo superior para elementos DOM
let profileSelect;
let userTableBody;
let newUserButton;
let userForm;
let userIdInput;
let userNameInput;
let userEmailInput;
let userPasswordInput;
let userUnitInput;
let userTeamInput;
let modalTitle;
let passwordHelp;
let userPermissions = new Set();
let apiHeaders;

// Função de inicialização da página
async function initPage() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    apiHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // Obtenção robusta dos elementos DOM
    profileSelect = document.getElementById('userProfile') ||
                    document.getElementById('perfil') ||
                    document.getElementById('role') ||
                    document.getElementById('inputPerfil');

    userTableBody = document.getElementById('user-table-body');
    newUserButton = document.getElementById('btn-new-user');
    userForm = document.getElementById('user-form');
    userIdInput = document.getElementById('user-id');
    userNameInput = document.getElementById('user-name');
    userEmailInput = document.getElementById('user-email');
    userPasswordInput = document.getElementById('user-password');
    userUnitInput = document.getElementById('user-unit');
    userTeamInput = document.getElementById('user-team');
    modalTitle = document.getElementById('user-modal-label');
    passwordHelp = document.getElementById('password-help');

    // Configura os event listeners
    setupEventListeners();

    // Carrega dados essenciais com isolamento de erros
    try { await loadPermissions(); } catch (e) { console.error("Erro ao carregar permissões:", e); }
    try { checkPermissions(); } catch (e) { console.error("Erro ao verificar permissões:", e); }
    try { await loadRoles(); } catch (e) { console.error("Erro ao carregar perfis:", e); }
    try { await loadUnits(); } catch (e) { console.error("Erro ao carregar unidades:", e); }
    try { await loadUsers(); } catch (e) { console.error("Erro ao carregar usuários:", e); }
}

// Configura os event listeners da página
function setupEventListeners() {
    if (newUserButton) {
        newUserButton.addEventListener('click', openModalForCreate);
    }
    
    if (userUnitInput) {
        userUnitInput.addEventListener('change', (event) => {
            const unitId = event.target.value;
            fetchTeams(unitId);
        });
    }

    if (userTableBody) {
        userTableBody.addEventListener('click', (event) => {
            const target = event.target.closest('button');
            if (!target) return;

            const id = target.dataset.id;
            if (target.classList.contains('btn-edit')) {
                openModalForEdit(parseInt(id, 10));
            } else if (target.classList.contains('btn-delete')) {
                deleteUser(id);
            }
        });
    }

    if (userForm) {
        userForm.addEventListener('submit', saveUser);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        });
    }
}

// Carrega as permissões do usuário logado
async function loadPermissions() {
    try {
        const response = await fetch('/api/auth/me/permissions', { headers: apiHeaders });
        if (!response.ok) throw new Error('Falha ao buscar permissões');
        const permissions = await response.json();
        userPermissions = new Set(permissions);
    } catch (error) {
        console.error('Erro ao buscar permissões:', error);
    }
}

// Verifica e aplica permissões na UI
function checkPermissions() {
    if (newUserButton && !userPermissions.has('users.create')) {
        newUserButton.style.display = 'none';
    }
}
    
// Carrega os usuários para a tabela
async function loadUsers() {
    if (!userTableBody) return;
    if (!userPermissions.has('users.read')) {
        userTableBody.innerHTML = '<tr><td colspan="7">Você não tem permissão para visualizar usuários.</td></tr>';
        return;
    }
    try {
        const response = await fetch('/api/admin/users', { headers: apiHeaders });
        if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
        const users = await response.json();
        renderUsers(users);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        userTableBody.innerHTML = '<tr><td colspan="7">Erro ao carregar usuários.</td></tr>';
    }
}

// Carrega os perfis (roles) para o select
async function loadRoles() {
    if (!profileSelect) {
        console.error("ERRO CRÍTICO: Campo de perfil não encontrado no HTML.");
        return;
    }

    try {
        profileSelect.innerHTML = '<option value="">AGUARDE... (Buscando)</option>';
        profileSelect.style.color = 'black';

        if (!userPermissions.has('roles.read')) {
            throw new Error("Sem permissão para ver perfis");
        }
        
        const url = '/api/admin/users/roles?nocache=' + new Date().getTime();
        const response = await fetch(url, { headers: apiHeaders });
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

        const roles = await response.json();
        if (!Array.isArray(roles)) throw new Error("Resposta do servidor não é uma lista");

        profileSelect.innerHTML = '<option value="">Selecione um Perfil...</option>';
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = role.nome || role.name || "Sem Nome"; 
            profileSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro no loadRoles:', error);
        profileSelect.innerHTML = `<option value="">❌ ERRO: ${error.message}</option>`;
        profileSelect.style.color = 'red';
    }
}

// Carrega as unidades de saúde
async function loadUnits() {
    if (!userUnitInput) return;
    try {
        const response = await fetch('/api/admin/organization/units', { headers: apiHeaders });
        if (!response.ok) throw new Error('Erro ao buscar Unidades.');
        const units = await response.json();
        
        userUnitInput.innerHTML = '<option value="">Selecione a Unidade...</option>';
        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.id;
            option.textContent = unit.nome;
            userUnitInput.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao buscar Unidades:', error);
        userUnitInput.innerHTML = '<option value="" disabled>Erro ao carregar</option>';
    }
}

// Carrega as equipes com base na unidade
async function fetchTeams(unitId) {
    if (!userTeamInput) return;
    userTeamInput.innerHTML = '<option value="">Carregando...</option>';
    userTeamInput.disabled = true;

    if (!unitId) {
        userTeamInput.innerHTML = '<option value="">Selecione a Equipe...</option>';
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/organization/teams/${unitId}`, { headers: apiHeaders });
        if (!response.ok) throw new Error('Erro ao buscar Equipes.');
        const teams = await response.json();

        userTeamInput.innerHTML = '<option value="">Selecione a Equipe...</option>';
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.nome;
            userTeamInput.appendChild(option);
        });
        userTeamInput.disabled = false;
    } catch (error) {
        console.error('Erro ao buscar Equipes:', error);
        userTeamInput.innerHTML = '<option value="" disabled>Erro ao carregar</option>';
    }
}

// Renderiza a tabela de usuários
function renderUsers(users) {
    if (!userTableBody) return;
    userTableBody.innerHTML = '';
    const canUpdate = userPermissions.has('users.update');
    const canDelete = userPermissions.has('users.delete');

    if (users.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="7">Nenhum usuário encontrado.</td></tr>';
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        let actions = '';
        if (canUpdate) actions += `<button class="btn btn-sm btn-warning btn-edit" data-id="${user.id}" title="Editar"><i class="fas fa-pencil-alt"></i></button> `;
        if (canDelete) actions += `<button class="btn btn-sm btn-danger btn-delete" data-id="${user.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>`;

        tr.innerHTML = `
            <td>${user.id}</td>
            <td>${user.nome || 'N/A'}</td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.perfil || 'N/A'}</td>
            <td>${user.unidade || 'N/A'}</td>
            <td>${user.equipe || 'N/A'}</td>
            <td>${actions || 'Sem permissões'}</td>
        `;
        userTableBody.appendChild(tr);
    });
}

// Abre o modal para criar um novo usuário
function openModalForCreate() {
    if (!userPermissions.has('users.create')) {
        alert('Você não tem permissão para criar usuários.');
        return;
    }
    const userModal = new bootstrap.Modal(document.getElementById('user-modal'));
    if (userForm) userForm.reset();
    userIdInput.value = '';
    modalTitle.textContent = 'Novo Usuário';
    passwordHelp.classList.add('d-none');
    userPasswordInput.setAttribute('required', 'required');
    if (profileSelect) profileSelect.value = '';
    if (userUnitInput) userUnitInput.value = '';
    if (userTeamInput) {
        userTeamInput.innerHTML = '<option value="">Selecione a Equipe...</option>';
        userTeamInput.disabled = true;
    }
    userModal.show();
}

// Abre o modal para editar um usuário existente
async function openModalForEdit(id) {
    if (!userPermissions.has('users.update')) {
        alert('Você não tem permissão para editar usuários.');
        return;
    }
    try {
        const response = await fetch(`/api/admin/users`, { headers: apiHeaders });
        if (!response.ok) throw new Error('Erro ao buscar dados do usuário.');
        const users = await response.json();
        const user = users.find(u => u.id === id);

        if (user) {
            const userModal = new bootstrap.Modal(document.getElementById('user-modal'));
            if (userForm) userForm.reset();
            userIdInput.value = user.id;
            userNameInput.value = user.nome;
            userEmailInput.value = user.email;
            if (profileSelect) profileSelect.value = String(user.role_id);
            modalTitle.textContent = 'Editar Usuário';
            passwordHelp.classList.remove('d-none');
            userPasswordInput.removeAttribute('required');

            if (userUnitInput) userUnitInput.value = user.unidade_id || '';
            
            if (user.unidade_id) {
                await fetchTeams(user.unidade_id);
                if (userTeamInput) userTeamInput.value = user.equipe_id || '';
            } else {
                if (userTeamInput) {
                    userTeamInput.innerHTML = '<option value="">Selecione a Equipe...</option>';
                    userTeamInput.disabled = true;
                }
            }
            userModal.show();
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        alert('Não foi possível carregar os dados para edição.');
    }
}

// *** FUNÇÃO DE SALVAMENTO CORRIGIDA ***
// Salva um novo usuário ou atualiza um existente
async function saveUser(event) {
    event.preventDefault();

    // 1. Captura de Dados dos elementos já selecionados
    const id = userIdInput.value;
    const nome = userNameInput.value;
    const email = userEmailInput.value;
    const password = userPasswordInput.value;
    const perfil = profileSelect.value;
    
    // 2. Tratamento de Strings Vazias: Converte '' para null, conforme solicitado.
    const unidade_id = userUnitInput.value === '' ? null : userUnitInput.value;
    const equipe_id = userTeamInput.value === '' ? null : userTeamInput.value;
    
    // Validação de campos obrigatórios no frontend
    if (!nome || !email || !perfil || (!id && !password)) {
        alert('Por favor, preencha todos os campos obrigatórios: Nome, Email, Senha (para novos usuários) e Perfil.');
        return;
    }

    // 3. Montagem do Payload (JSON) com as chaves corretas
    const userData = {
        nome,
        email,
        perfil, // O backend espera a chave "perfil"
        unidade_id,
        equipe_id
    };

    // A senha só é enviada se um valor for digitado
    if (password) {
        userData.password = password;
    }

    const url = id ? `/api/admin/users/${id}` : '/api/admin/users';
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: apiHeaders,
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `O servidor respondeu com o status ${response.status}`);
        }
        
        // Sucesso: fecha o modal e atualiza a tabela
        const userModalEl = document.getElementById('user-modal');
        const userModal = bootstrap.Modal.getInstance(userModalEl);
        if (userModal) {
          userModal.hide();
        }

        await loadUsers();
        alert('Usuário salvo com sucesso!');

    } catch (error) {
        console.error('Falha ao salvar usuário:', error);
        alert(`Erro ao salvar usuário: ${error.message}`);
    }
}

// Exclui um usuário
async function deleteUser(id) {
    if (!userPermissions.has('users.delete')) {
        alert('Você não tem permissão para excluir usuários.');
        return;
    }
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
        const response = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: apiHeaders
        });

        if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
        
        await loadUsers();
        alert('Usuário excluído com sucesso!');
    } catch (error) { 
        console.error('Erro ao excluir:', error);
        alert(`Erro ao excluir usuário: ${error.message}`);
    }
}

// Inicializa o script
initPage();
document.addEventListener('DOMContentLoaded', () => {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) return;
    const user = JSON.parse(userRaw);

    const header = document.querySelector('#content-header');
    if (header) {
        let userInfo = document.getElementById('user-info');
        if (!userInfo) {
            userInfo = document.createElement('div');
            userInfo.id = 'user-info';
            userInfo.style.cssText = 'color: #2c3e50; font-weight: 600; display: flex; align-items: center; gap: 10px; font-size: 0.9rem;';
            
            // The header uses justify-content: space-between, so appending is fine.
            header.appendChild(userInfo);
        }
        userInfo.innerHTML = `<i class="fas fa-user-circle fa-lg"></i> Olá, ${user.nome.split(' ')[0]}`;
    }
});
