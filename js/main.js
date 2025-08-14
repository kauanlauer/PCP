// =================================================================================
// SETOR: INICIALIZAÇÃO E ESTADO GLOBAL
// =================================================================================
// DESCRIÇÃO: Este arquivo contém as variáveis globais que armazenam o estado
// da aplicação e a lógica principal de inicialização que é executada quando
// a página é carregada.
// =================================================================================

// ---------------------------------------------------------------------------------
// Variáveis Globais
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
    loadSavedData();
    setupEventListeners();
    checkUserLogin();

    document.getElementById('userMatricula').addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
        const matricula = this.value.trim();
        const operator = operators.find(op => op.matricula === matricula);
        document.getElementById('userName').value = operator ? operator.nome : '';
    });
});

// ---------------------------------------------------------------------------------
// Configuração dos Ouvintes de Eventos (Event Listeners)
// ---------------------------------------------------------------------------------
function setupEventListeners() {
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
    const weightInputs = ['pesoBruto', 'pesoTubo', 'pesoPallet', 'pesoEmbalagem'];
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

// ---------------------------------------------------------------------------------
// NOVA FUNÇÃO: Abrir Leitor de QR Code com Dados
// ---------------------------------------------------------------------------------

/**
 * Prepara os dados do banco de dados de QR Codes e abre a página do leitor
 * em uma nova aba, passando os dados pela URL.
 */
function openQRCodeReader() {
    // Pega o banco de dados de QR Codes do localStorage.
    const qrDbString = localStorage.getItem('qrCodeDatabase');

    if (!qrDbString || qrDbString === '{}') {
        showAlert('Nenhum QR Code foi gerado ainda. Adicione um pallet primeiro.', 'danger');
        return;
    }

    // Codifica os dados para serem seguros para a URL.
    // 1. JSON.stringify: Transforma o objeto em texto.
    // 2. btoa: Codifica o texto em Base64 para evitar problemas com caracteres especiais na URL.
    const encodedData = btoa(qrDbString);

    // Cria a URL final e abre em uma nova aba.
    const readerUrl = `leitor.html?data=${encodedData}`;
    window.open(readerUrl, '_blank');
}
