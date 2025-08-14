// =================================================================================
// SETOR: LEITOR DE QR CODE E ARMAZENAGEM DE ESTOQUE
// =================================================================================
// DESCRIÇÃO: Este script controla a página leitor.html. Ele recebe o banco de
// dados de pallets pela URL, ativa a câmera, escaneia QR Codes, e permite
// salvar a localização do pallet em um banco de dados de estoque local.
// =================================================================================

// ---------------------------------------------------------------------------------
// Elementos da DOM e Variáveis Globais
// ---------------------------------------------------------------------------------
const video = document.getElementById("video");
const loadingMessage = document.getElementById("loadingMessage");
const palletDetailsContainer = document.getElementById("palletDetails");
const palletInfoDiv = document.getElementById("palletInfo");
const stockListDiv = document.getElementById("stockList");
const stockStreetInput = document.getElementById("stockStreet");
const stockPositionInput = document.getElementById("stockPosition");

let qrCodeDatabase = {}; // Banco de dados recebido da página principal.
let stockDatabase = {}; // Banco de dados do estoque, salvo neste dispositivo.
let currentlyScannedPallet = null; // Guarda os dados do último pallet lido.

// ---------------------------------------------------------------------------------
// Lógica de Inicialização da Página
// ---------------------------------------------------------------------------------

// Função executada assim que a página carrega.
window.onload = () => {
    // 1. Tenta pegar os dados da URL.
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('data');

    if (encodedData) {
        try {
            // Decodifica os dados (Base64 -> Texto JSON) e os carrega.
            const decodedData = atob(encodedData);
            qrCodeDatabase = JSON.parse(decodedData);
            console.log("Banco de dados de QR Codes carregado com sucesso.");
        } catch (e) {
            console.error("Erro ao decodificar os dados da URL:", e);
            loadingMessage.textContent = "Erro: Dados inválidos recebidos da página principal.";
            return;
        }
    } else {
        loadingMessage.textContent = "Erro: Nenhum dado de pallet foi recebido. Abra o leitor a partir da página principal.";
        return;
    }

    // 2. Carrega o banco de dados de estoque salvo neste dispositivo.
    stockDatabase = JSON.parse(localStorage.getItem('stockDatabase')) || {};
    displayStockList();

    // 3. Inicia a câmera.
    startCamera();
};

/**
 * Pede permissão e inicia a câmera do dispositivo.
 */
function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(function(stream) {
            loadingMessage.classList.add('d-none');
            video.srcObject = stream;
            video.play();
            requestAnimationFrame(tick); // Inicia o escaneamento.
        })
        .catch(function(err) {
            console.error("Erro ao acessar a câmera: ", err);
            loadingMessage.textContent = "Erro ao acessar a câmera. Verifique as permissões no seu navegador.";
            loadingMessage.classList.remove('alert-info');
            loadingMessage.classList.add('alert-danger');
        });
}

// ---------------------------------------------------------------------------------
// Lógica de Leitura e Processamento do QR Code
// ---------------------------------------------------------------------------------

/**
 * Função executada continuamente para escanear cada quadro do vídeo.
 */
function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvasElement = document.createElement('canvas');
        const canvas = canvasElement.getContext('2d');
        canvasElement.height = video.videoHeight;
        canvasElement.width = video.videoWidth;
        canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            const palletId = code.data;
            // Busca o pallet no banco de dados que recebemos da URL.
            const palletData = qrCodeDatabase[palletId];

            if (palletData && (!currentlyScannedPallet || currentlyScannedPallet.palletData.id !== palletId)) {
                 // Se encontrou um pallet NOVO, exibe os detalhes.
                currentlyScannedPallet = palletData;
                displayPalletDetails(palletData);
            }
        }
    }
    requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------------
// Lógica de Estoque
// ---------------------------------------------------------------------------------

/**
 * Salva o pallet lido no banco de dados de estoque local.
 */
function saveToStock() {
    if (!currentlyScannedPallet) {
        alert("Nenhum pallet foi lido para salvar.");
        return;
    }

    const street = stockStreetInput.value.trim();
    const position = stockPositionInput.value.trim();

    if (!street || !position) {
        alert("Por favor, preencha a Rua e a Posição no estoque.");
        return;
    }

    // Adiciona as informações de estoque ao pallet.
    const stockEntry = {
        ...currentlyScannedPallet, // Copia todos os dados do pallet.
        stockLocation: {
            street: street,
            position: position
        },
        storedAt: new Date().toLocaleString('pt-BR')
    };

    // Salva no banco de dados de estoque.
    stockDatabase[currentlyScannedPallet.palletData.id] = stockEntry;
    localStorage.setItem('stockDatabase', JSON.stringify(stockDatabase));

    // Atualiza a lista na tela.
    displayStockList();

    // Limpa a tela para a próxima leitura.
    palletDetailsContainer.classList.add('d-none');
    currentlyScannedPallet = null;
    stockStreetInput.value = '';
    stockPositionInput.value = '';

    alert(`Pallet ${stockEntry.palletData.sequenciamento} salvo na Rua ${street}, Posição ${position}!`);
}

/**
 * Exibe a lista de pallets já armazenados no estoque.
 */
function displayStockList() {
    const stockIds = Object.keys(stockDatabase);

    if (stockIds.length === 0) {
        stockListDiv.innerHTML = '<p class="text-muted text-center">Nenhum pallet armazenado ainda.</p>';
        return;
    }

    let html = '<ul class="list-group">';
    stockIds.forEach(id => {
        const entry = stockDatabase[id];
        html += `
            <li class="list-group-item">
                <strong>Pallet:</strong> ${entry.palletData.sequenciamento} (OP: ${entry.op})
                <br>
                <small><strong>Local:</strong> Rua ${entry.stockLocation.street}, Posição ${entry.stockLocation.position}</small>
                <br>
                <small class="text-muted">Armazenado em: ${entry.storedAt}</small>
            </li>
        `;
    });
    html += '</ul>';
    stockListDiv.innerHTML = html;
}

// ---------------------------------------------------------------------------------
// Funções de Exibição de Resultados da Leitura
// ---------------------------------------------------------------------------------

function displayPalletDetails(data) {
    const pallet = data.palletData;
    palletInfoDiv.innerHTML = `
        <p><strong>OP:</strong> ${data.op}</p>
        <p><strong>Produto:</strong> ${data.descricaoProduto}</p>
        <p><strong>Sequenciamento:</strong> ${pallet.sequenciamento}</p>
        <p><strong>Peso Líquido:</strong> ${pallet.pesoLiquido.toFixed(2)} kg</p>
    `;
    palletDetailsContainer.classList.remove('d-none');
}
