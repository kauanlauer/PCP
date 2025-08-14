// =================================================================================
// SETOR: GESTÃO DE USUÁRIO (APONTADOR)
// =================================================================================
// DESCRIÇÃO: Este arquivo contém toda a lógica relacionada ao gerenciamento
// de usuários (apontadores), incluindo login, verificação de senha, cadastro,
// remoção e troca de operador.
// =================================================================================

// ---------------------------------------------------------------------------------
// Funções de Login e Sessão
// ---------------------------------------------------------------------------------

/**
 * Verifica se um usuário já está logado ao carregar a página.
 * Se sim, esconde o card de login e mostra os de importação e busca.
 */
function checkUserLogin() {
    if (currentUser) {
        document.getElementById('loginCard').classList.add('hidden');
        document.getElementById('fileCard').classList.remove('hidden');
        document.getElementById('searchCard').classList.remove('hidden');
    }
}

/**
 * Realiza o login do usuário (apontador).
 */
function loginUser() {
    const matricula = document.getElementById('userMatricula').value.trim();
    const nome = document.getElementById('userName').value.trim();

    // Validação dos campos
    if (!matricula || matricula.length < 4 || !/^\d+$/.test(matricula)) {
        showAlert('Por favor, digite uma matrícula válida com pelo menos 4 dígitos.', 'danger');
        return;
    }

    const operator = operators.find(op => op.matricula === matricula);
    if (!operator) {
        showAlert('Matrícula não cadastrada. Por favor, cadastre o apontador primeiro.', 'danger');
        return;
    }

    if (nome !== operator.nome) {
        showAlert('Nome não corresponde à matrícula informada.', 'danger');
        return;
    }

    // Define o usuário atual e salva no localStorage
    currentUser = {
        matricula: matricula,
        nome: nome,
        loginTime: new Date().toISOString()
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Atualiza a interface
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('fileCard').classList.remove('hidden');
    document.getElementById('searchCard').classList.remove('hidden');

    showAlert(`Bem-vindo, ${nome}!`, 'success');
}

/**
 * Permite trocar o apontador logado, reiniciando o processo de login.
 */
function changeOperator() {
    if (confirm('Deseja realmente alterar o apontador de OP?')) {
        // Limpa os dados da sessão atual
        localStorage.removeItem('currentUser');
        currentUser = null;

        // Reseta a interface para o estado inicial
        document.getElementById('loginCard').classList.remove('hidden');
        document.getElementById('fileCard').classList.add('hidden');
        document.getElementById('searchCard').classList.add('hidden');
        document.getElementById('opInfoCard').classList.add('hidden');
        document.getElementById('productionCard').classList.add('hidden');
        document.getElementById('palletsCard').classList.add('hidden');
        document.getElementById('laudoCard').classList.add('hidden');

        // Limpa os campos de login
        document.getElementById('userMatricula').value = '';
        document.getElementById('userName').value = '';
        document.getElementById('userMatricula').focus();

        showAlert('Por favor, identifique o novo apontador de OP.', 'info');
    }
}

// ---------------------------------------------------------------------------------
// Funções de Gerenciamento de Apontadores (CRUD)
// ---------------------------------------------------------------------------------

/**
 * Verifica a senha para acessar o modal de gerenciamento de apontadores.
 */
function verifyOperatorsPassword() {
    const password = document.getElementById('operatorsPassword').value.trim();

    if (password === 'Manu123') {
        closeOperatorsPasswordModal();
        openOperatorsModal();
    } else {
        showAlert('Senha incorreta!', 'danger');
    }
}

/**
 * Adiciona um novo apontador à lista.
 */
function addOperator() {
    const matricula = document.getElementById('newMatricula').value.trim();
    const nome = document.getElementById('newName').value.trim();

    // Validações
    if (!matricula || matricula.length < 4 || !/^\d+$/.test(matricula)) {
        showAlert('Por favor, digite uma matrícula válida com pelo menos 4 dígitos.', 'danger');
        return;
    }
    if (!nome) {
        showAlert('Por favor, digite o nome do apontador.', 'danger');
        return;
    }
    if (operators.some(op => op.matricula === matricula)) {
        showAlert('Esta matrícula já está cadastrada.', 'danger');
        return;
    }

    // Adiciona o novo operador e salva no localStorage
    operators.push({ matricula, nome });
    localStorage.setItem('operators', JSON.stringify(operators));

    // Limpa os campos do formulário
    document.getElementById('newMatricula').value = '';
    document.getElementById('newName').value = '';

    updateOperatorsList();
    showAlert('Apontador adicionado com sucesso!', 'success');
}

/**
 * Remove um apontador da lista.
 * @param {number} index - O índice do apontador a ser removido no array 'operators'.
 */
function removeOperator(index) {
    if (confirm('Tem certeza que deseja remover este apontador?')) {
        operators.splice(index, 1);
        localStorage.setItem('operators', JSON.stringify(operators));
        updateOperatorsList();
        showAlert('Apontador removido com sucesso!', 'success');
    }
}

// ---------------------------------------------------------------------------------
// Funções de Verificação de Senha para Ações Críticas
// ---------------------------------------------------------------------------------

/**
 * Verifica a senha para permitir a limpeza de todos os dados da aplicação.
 */
function verifyClearDataPassword() {
    const password = document.getElementById('clearDataPassword').value.trim();

    if (password === 'Manu123') {
        closeClearDataPasswordModal();
        clearAllData(); // Esta função estará no arquivo data.js
    } else {
        showAlert('Senha incorreta!', 'danger');
    }
}
