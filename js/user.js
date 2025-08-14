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
 * VERSÃO CORRIGIDA E MAIS ROBUSTA.
 */
function loginUser() {
    const matricula = document.getElementById('userMatricula').value.trim();
    // O campo nome é apenas para feedback visual, não precisamos mais ler o valor dele para o login.

    // Validação da matrícula continua a mesma.
    if (!matricula || matricula.length < 4 || !/^\d+$/.test(matricula)) {
        showAlert('Por favor, digite uma matrícula válida com pelo menos 4 dígitos.', 'danger');
        return;
    }

    // Busca o operador no banco de dados de operadores.
    const operator = operators.find(op => op.matricula === matricula);
    
    if (!operator) {
        // Se a matrícula digitada não for encontrada, exibe o erro correto.
        showAlert('Matrícula não cadastrada. Por favor, cadastre o apontador primeiro.', 'danger');
        return;
    }

    // CORREÇÃO: A verificação do nome foi removida.
    // Se a matrícula foi encontrada, o login é considerado bem-sucedido.
    // O nome correto é pego diretamente do objeto 'operator' que encontramos.
    currentUser = {
        matricula: operator.matricula,
        nome: operator.nome, // Usamos o nome correto que está salvo.
        loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Libera a interface principal do sistema.
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('fileCard').classList.remove('hidden');
    document.getElementById('searchCard').classList.remove('hidden');

    showAlert(`Bem-vindo, ${operator.nome}!`, 'success');
}


/**
 * Permite trocar o apontador logado, reiniciando o processo de login.
 */
function changeOperator() {
    if (confirm('Deseja realmente alterar o apontador de OP?')) {
        localStorage.removeItem('currentUser');
        currentUser = null;

        document.getElementById('loginCard').classList.remove('hidden');
        document.getElementById('fileCard').classList.add('hidden');
        document.getElementById('searchCard').classList.add('hidden');
        document.getElementById('opInfoCard').classList.add('hidden');
        document.getElementById('productionCard').classList.add('hidden');
        document.getElementById('palletsCard').classList.add('hidden');
        
        // Limpa o modal do laudo se ele estiver aberto
        if (laudoModal && laudoModal._isShown) {
            laudoModal.hide();
        }
        clearLaudo();

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
 * Adiciona um novo apontador à lista.
 */
function addOperator() {
    const matricula = document.getElementById('newMatricula').value.trim();
    const nome = document.getElementById('newName').value.trim();

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

    operators.push({ matricula, nome });
    localStorage.setItem('operators', JSON.stringify(operators));

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
