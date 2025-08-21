// =================================================================================
// SETOR: LEITOR DE QR CODE (VERSÃO ATUALIZADA)
// =================================================================================
// DESCRIÇÃO: Este script foi atualizado para ler o novo formato de QR Code,
// que contém todos os dados em uma única string de texto. Ele agora "parseia"
// (interpreta) essa string para exibir os detalhes de forma organizada.
// =================================================================================

// ---------------------------------------------------------------------------------
// Elementos da DOM (Interface)
// ---------------------------------------------------------------------------------
const video = document.getElementById("video");
const loadingMessage = document.getElementById("loadingMessage");
const scanResult = document.getElementById("scan-result");
const palletDetailsContainer = document.getElementById("palletDetails");
const palletInfoDiv = document.getElementById("palletInfo");

// ---------------------------------------------------------------------------------
// Lógica Principal do Leitor
// ---------------------------------------------------------------------------------

// 1. Solicita acesso à câmera do usuário.
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(function(stream) {
        // Se o usuário permitir, a câmera é ativada.
        loadingMessage.classList.add('d-none');
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.play();
        // Inicia a função que vai escanear o vídeo.
        requestAnimationFrame(tick);
    })
    .catch(function(err) {
        // Se o usuário negar ou ocorrer um erro.
        console.error("Erro ao acessar a câmera: ", err);
        loadingMessage.textContent = "Erro ao acessar a câmera. Verifique as permissões.";
        loadingMessage.classList.remove('alert-info');
        loadingMessage.classList.add('alert-danger');
    });

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
        
        // Tenta decodificar um QR Code a partir da imagem.
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            // Se um QR Code for encontrado...
            scanResult.textContent = `QR Code lido com sucesso!`;
            
            // NOVO: Chama a função para interpretar o texto do QR Code.
            parseAndDisplayQRData(code.data);
        }
    }
    // Continua o loop para o próximo quadro.
    requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------------
// Funções de Interpretação e Exibição de Resultados
// ---------------------------------------------------------------------------------

/**
 * Interpreta a string de dados do QR Code e a exibe.
 * @param {string} qrDataString - A string de texto lida do QR Code.
 * Exemplo: "OP=54413;COD=123;SEQ=1/10;P_LIQ=452.00;..."
 */
function parseAndDisplayQRData(qrDataString) {
    try {
        // Cria um objeto para guardar os dados.
        const palletData = {};
        
        // Quebra a string em pares "CHAVE=VALOR" usando o ponto e vírgula como separador.
        const pairs = qrDataString.split(';');

        // Itera sobre cada par.
        pairs.forEach(pair => {
            if (pair) { // Garante que não processe pares vazios
                // Quebra o par em chave e valor usando o igual como separador.
                const [key, value] = pair.split('=');
                // Adiciona ao objeto. Ex: palletData['OP'] = '54413'
                palletData[key] = value;
            }
        });

        // Chama a função para mostrar os dados na tela.
        displayPalletDetails(palletData);

    } catch (error) {
        // Se o QR Code tiver um formato inesperado, mostra um erro.
        console.error("Erro ao interpretar o QR Code:", error);
        displayPalletError("O formato do QR Code lido é inválido.");
    }
}

/**
 * Exibe os detalhes completos do pallet na tela.
 * @param {object} data - O objeto com os dados já interpretados do QR Code.
 */
function displayPalletDetails(data) {
    // Monta o HTML com os dados lidos.
    palletInfoDiv.innerHTML = `
        <p><strong>Ordem de Produção (OP):</strong> ${data.OP || 'N/A'}</p>
        <p><strong>Código do Produto:</strong> ${data.COD || 'N/A'}</p>
        <p><strong>Sequenciamento:</strong> ${data.SEQ || 'N/A'}</p>
        <hr>
        <p><strong>Peso Líquido:</strong> ${data.P_LIQ ? data.P_LIQ + ' kg' : 'N/A'}</p>
        <p><strong>Peso Bruto:</strong> ${data.P_BRUTO ? data.P_BRUTO + ' kg' : 'N/A'}</p>
        <hr>
        <p><strong>Data do Apontamento:</strong> ${data.DATA || 'N/A'}</p>
        <p><strong>Apontador:</strong> ${data.OPERADOR || 'N/A'}</p>
        <p><strong>Tipo de Cliente:</strong> ${data.TIPO || 'N/A'}</p>
    `;
    // Mostra o card de detalhes.
    palletDetailsContainer.classList.remove('d-none');
}

/**
 * Exibe uma mensagem de erro genérica.
 * @param {string} message - A mensagem de erro a ser exibida.
 */
function displayPalletError(message) {
    palletInfoDiv.innerHTML = `
        <div class="alert alert-danger">
            <strong>Erro na Leitura!</strong>
            <p class="mb-0">${message}</p>
        </div>
    `;
    palletDetailsContainer.classList.remove('d-none');
}
