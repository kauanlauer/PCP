// =================================================================================
// SETOR: INICIALIZAÇÃO E ESTADO GLOBAL (VERSÃO ROBUSTA)
// =================================================================================
// DESCRIÇÃO: Este arquivo foi reestruturado para ter uma lógica de inicialização
// clara e sem falhas, garantindo que a sessão do usuário e os dados das
// planilhas sejam corretamente carregados e a interface seja exibida de
// forma consistente.
// =================================================================================

// ---------------------------------------------------------------------------------
// Variáveis Globais (sem alterações)
// ---------------------------------------------------------------------------------
let excelData = [];
let guiaDatabase = [];
let guiaStretchDatabase = [];
let currentOP = null;
let currentLaudoData = null;
let productionData = {};
let pallets = [];
let currentUser = null;
let operators = [];
let currentWorkbook = null;
let exportDataForNetwork = null;
let laudosSalvos = {};
let searchTimeout = null;


// ---------------------------------------------------------------------------------
// Inicialização da Aplicação
// ---------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    // 1. Carrega TODOS os dados salvos (usuário, produção, planilhas)
    loadSavedData();
    
    // 2. Configura a interface com base nos dados carregados
    initializeUI();

    // 3. Configura todos os botões e campos interativos
    setupEventListeners();
});

/**
 * NOVO: Função central que decide o que mostrar na tela ao iniciar.
 * Esta função é a chave para a correção do problema.
 */
function initializeUI() {
    // Verifica se há um usuário logado
    if (currentUser) {
        // Se sim, esconde o login e mostra o nome do usuário no cabeçalho
        document.getElementById('loginCard').classList.add('hidden');
        displayUserInfo(currentUser); // Mostra "Bem-vindo, [Nome]!"

        // Agora, verifica se as planilhas já foram carregadas na sessão
        if (excelData.length > 0 && guiaDatabase.length > 0 && guiaStretchDatabase.length > 0) {
            // Se sim, esconde o card de importação e mostra o de busca
            document.getElementById('fileCard').classList.add('hidden');
            document.getElementById('searchCard').classList.remove('hidden');
            showAlert('Sessão restaurada com sucesso.', 'success');
        } else {
            // Se não, mostra o card de importação para o usuário carregar os arquivos
            document.getElementById('fileCard').classList.remove('hidden');
            document.getElementById('searchCard').classList.add('hidden');
        }
    } else {
        // Se não há usuário logado, mostra apenas o card de login
        document.getElementById('loginCard').classList.remove('hidden');
        document.getElementById('fileCard').classList.add('hidden');
        document.getElementById('searchCard').classList.add('hidden');
    }
}


// ---------------------------------------------------------------------------------
// Configuração dos Ouvintes de Eventos (Event Listeners)
// ---------------------------------------------------------------------------------
function setupEventListeners() {
    // Listener para auto-preenchimento do nome do usuário
    document.getElementById('userMatricula').addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
        const matricula = this.value.trim();
        const operator = operators.find(op => op.matricula === matricula);
        document.getElementById('userName').value = operator ? operator.nome : '';
    });

    // --- Eventos de Importação de Arquivos ---
    const fileUpload = document.getElementById('fileUpload');
    const fileInput = document.getElementById('fileInput');
    const guiaUpload = document.getElementById('guiaUpload');
    const guiaInput = document.getElementById('guiaInput');
    const guiaStretchUpload = document.getElementById('guiaStretchUpload');
    const guiaStretchInput = document.getElementById('guiaStretchInput');

    fileUpload.addEventListener('click', () => fileInput.click());
    fileUpload.addEventListener('dragover', handleDragOver);
    fileUpload.addEventListener('drop', (e) => handleFileDrop(e, 'file'));
    fileInput.addEventListener('change', handleFileSelect);

    guiaUpload.addEventListener('click', () => guiaInput.click());
    guiaUpload.addEventListener('dragover', handleDragOver);
    guiaUpload.addEventListener('drop', (e) => handleFileDrop(e, 'guia'));
    guiaInput.addEventListener('change', handleGuiaSelect);

    guiaStretchUpload.addEventListener('click', () => guiaStretchInput.click());
    guiaStretchUpload.addEventListener('dragover', handleDragOver);
    guiaStretchUpload.addEventListener('drop', (e) => handleFileDrop(e, 'guiaStretch'));
    guiaStretchInput.addEventListener('change', handleGuiaStretchSelect);

    // --- Eventos do Formulário de Produção ---
    const weightInputs = ['pesoBruto', 'pesoTubo', 'pesoPalet', 'pesoEmbalagem'];
    weightInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calculatePesoLiquido);
    });

    document.getElementById('sequenciamento').addEventListener('focus', function() {
        if (!this.value && pallets.length > 0) {
            const maxSequence = Math.max(...pallets.map(p => {
                const parts = p.sequenciamento.split('/');
                return parseInt(parts[0]) || 0;
            }));
            this.value = (maxSequence + 1) + '/';
        }
    });

    // --- Eventos de Busca (Automática e por Enter) ---
    const opSearchInput = document.getElementById('opSearch');
    opSearchInput.addEventListener('keyup', function(e) {
        clearTimeout(searchTimeout);
        if (e.key === 'Enter') {
            searchOP();
        } else {
            searchTimeout = setTimeout(() => {
                searchOP();
            }, 500);
        }
    });

    document.getElementById('laudoOpSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchLaudoByOP();
    });

    document.getElementById('laudoCodigoSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchLaudoByCodigo();
    });
}
