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
let excelData = [];             // Armazena os dados da planilha de programação.
let guiaDatabase = [];          // Armazena os dados da planilha GUIA (Fita).
let guiaStretchDatabase = [];   // Armazena os dados da planilha GUIA (Stretch).
let currentOP = null;           // Guarda os dados da Ordem de Produção atualmente selecionada.
let currentLaudoData = null;    // Guarda os dados do Laudo de Inspeção atualmente em edição.
let productionData = {};        // Objeto que armazena todos os apontamentos de produção, salvos por OP.
let pallets = [];               // Array que armazena os pallets da OP atual.
let currentUser = null;         // Guarda os dados do usuário (apontador) logado.
let operators = [];             // Array com todos os operadores (apontadores) cadastrados.
let currentWorkbook = null;     // Armazena o objeto da planilha Excel carregada para futuras manipulações.
let exportDataForNetwork = null;// Buffer de dados para exportação para a rede.
let laudosSalvos = {};          // Objeto que armazena todos os laudos salvos, por OP ou código.
let searchTimeout = null;       // Variável para controlar o tempo da busca automática da OP.


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
        clearTimeout(searchTimeout); // Cancela a busca anterior se o usuário continuar digitando.
        if (e.key === 'Enter') {
            searchOP(); // Busca imediata se o usuário pressionar Enter.
        } else {
            // Inicia um temporizador para buscar 500ms após o usuário parar de digitar.
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
