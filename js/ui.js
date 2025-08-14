// =================================================================================
// SETOR: CONTROLE DA INTERFACE DO USUÁRIO (UI)
// =================================================================================
// DESCRIÇÃO: Este arquivo agrupa todas as funções responsáveis por manipular
// a interface do usuário. Isso inclui exibir notificações (toasts), gerenciar
// modais do Bootstrap e gerar QR Codes.
// =================================================================================

// ---------------------------------------------------------------------------------
// Instâncias dos Modais do Bootstrap
// ---------------------------------------------------------------------------------
// É uma boa prática inicializar os modais uma vez para poder controlá-los via JS.
let operatorsModal, passwordModal, laudoModal, qrCodeModal;
let passwordModalAction = null; // Variável para saber qual ação o modal de senha deve executar.

document.addEventListener('DOMContentLoaded', () => {
    operatorsModal = new bootstrap.Modal(document.getElementById('operatorsModal'));
    passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
    laudoModal = new bootstrap.Modal(document.getElementById('laudoModal'));
    qrCodeModal = new bootstrap.Modal(document.getElementById('qrCodeModal'));
});


// ---------------------------------------------------------------------------------
// Funções de Notificação (Toast)
// ---------------------------------------------------------------------------------

/**
 * Exibe uma notificação (toast) no canto da tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de alerta ('success', 'danger', 'info').
 */
function showAlert(message, type = 'info') {
    const toastContainer = document.createElement('div');
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '9999';

    const toastEl = document.createElement('div');
    toastEl.classList.add('toast', 'show');
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    const bgColor = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : 'bg-primary';

    toastEl.innerHTML = `
        <div class="toast-header ${bgColor} text-white">
            <i class="bi bi-info-circle-fill me-2"></i>
            <strong class="me-auto">Notificação</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    document.body.appendChild(toastContainer);
    toastContainer.appendChild(toastEl);

    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();

    // Remove o elemento da DOM depois que o toast desaparecer
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastContainer.remove();
    });
}


// ---------------------------------------------------------------------------------
// Funções de Gerenciamento de Modais
// ---------------------------------------------------------------------------------

/**
 * Abre o modal de senha e define a ação a ser executada.
 * @param {string} action - A ação a ser executada após a senha ('operators' ou 'clearData').
 */
function openPasswordModal(action, message) {
    passwordModalAction = action;
    document.getElementById('passwordModalMessage').textContent = message;
    document.getElementById('passwordInput').value = '';
    passwordModal.show();
}

// Configura o botão de confirmação do modal de senha
document.getElementById('passwordSubmitBtn')?.addEventListener('click', () => {
    const password = document.getElementById('passwordInput').value;
    if (password === 'Manu123') {
        passwordModal.hide();
        if (passwordModalAction === 'operators') {
            operatorsModal.show();
        } else if (passwordModalAction === 'clearData') {
            clearAllData();
        }
    } else {
        alert('Senha incorreta!'); // Usando alert simples para feedback imediato no modal.
    }
});

// Funções específicas para abrir o modal de senha
function openOperatorsModalWithPassword() {
    openPasswordModal('operators', 'Digite a senha para gerenciar apontadores:');
}

function openClearDataModal() {
    openPasswordModal('clearData', 'Digite a senha para limpar todos os dados:');
}

/**
 * Atualiza a lista de apontadores exibida no modal de gerenciamento.
 */
function updateOperatorsList() {
    const operatorsList = document.getElementById('operatorsList');
    operatorsList.innerHTML = ''; // Limpa a lista atual

    if (operators.length === 0) {
        operatorsList.innerHTML = '<p class="text-center text-muted">Nenhum apontador cadastrado.</p>';
        return;
    }

    const listGroup = document.createElement('ul');
    listGroup.className = 'list-group';

    operators.forEach((operator, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        listItem.innerHTML = `
            <span>
                <strong class="text-primary">${operator.matricula}</strong> - ${operator.nome}
            </span>
            <button class="btn btn-sm btn-outline-danger" onclick="removeOperator(${index})"><i class="bi bi-trash"></i></button>
        `;
        listGroup.appendChild(listItem);
    });
    operatorsList.appendChild(listGroup);
}


// ---------------------------------------------------------------------------------
// Funções de QR Code
// ---------------------------------------------------------------------------------

/**
 * Gera um QR Code para um pallet específico e exibe o modal.
 * @param {object} pallet - O objeto do pallet contendo os dados.
 */
function generateQRCode(pallet) {
    const qrCodeCanvas = document.getElementById('qrCodeCanvas');
    qrCodeCanvas.innerHTML = ''; // Limpa o QR Code anterior

    // Dados a serem embutidos no QR Code
    const qrData = `OP: ${currentOP.op}\nPallet: ${pallet.sequenciamento}\nPeso Liq: ${pallet.pesoLiquido.toFixed(2)} kg\nData: ${pallet.timestamp.split(' ')[0]}`;
    
    // Gera o QR Code
    new QRCode(qrCodeCanvas, {
        text: qrData,
        width: 150,
        height: 150,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // Exibe as informações abaixo do QR Code
    document.getElementById('qrCodeInfo').innerText = `OP: ${currentOP.op} | Pallet: ${pallet.sequenciamento}`;
    
    // Abre o modal
    qrCodeModal.show();
}

/**
 * Aciona a função de impressão do navegador.
 * A formatação é controlada pelo CSS em @media print.
 */
function printQRCode() {
    window.print();
}
