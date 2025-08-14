// =================================================================================
// SETOR: LEITOR DE QR CODE
// =================================================================================
// DESCRIÇÃO: Este script controla a página leitor.html. Ele ativa a câmera,
// escaneia continuamente por QR Codes e, ao encontrar um, busca seus dados
// no banco de dados local (localStorage) e os exibe na tela.
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

// 1. Carrega o banco de dados de QR Codes do localStorage.
const qrCodeDatabase = JSON.parse(localStorage.getItem('qrCodeDatabase')) || {};

// 2. Solicita acesso à câmera do usuário.
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(function(stream) {
        // Se o usuário permitir, a câmera é ativada.
        loadingMessage.classList.add('d-none'); // Esconde a mensagem de "carregando".
        video.srcObject = stream;
        video.setAttribute("playsinline", true); // Necessário para iOS.
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
    // Verifica se o vídeo tem dados suficientes para serem analisados.
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Cria um canvas "invisível" para desenhar o quadro do vídeo e analisá-lo.
        const canvasElement = document.createElement('canvas');
        const canvas = canvasElement.getContext('2d');
        canvasElement.height = video.videoHeight;
        canvasElement.width = video.videoWidth;
        canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        
        // Extrai os dados da imagem do canvas.
        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        
        // Tenta decodificar um QR Code a partir da imagem.
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            // Se um QR Code for encontrado...
            const palletId = code.data;
            scanResult.textContent = `Código lido: ${palletId}`;
            
            // Busca o ID no nosso banco de dados.
            const palletData = qrCodeDatabase[palletId];
            
            if (palletData) {
                // Se encontrar, exibe os detalhes.
                displayPalletDetails(palletData);
            } else {
                // Se não encontrar, informa o usuário.
                displayPalletNotFound();
            }
        }
    }
    // Continua o loop para o próximo quadro.
    requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------------
// Funções de Exibição de Resultados
// ---------------------------------------------------------------------------------

/**
 * Exibe os detalhes completos do pallet encontrado.
 * @param {object} data - O objeto com os dados do pallet do banco de dados.
 */
function displayPalletDetails(data) {
    const pallet = data.palletData;
    palletInfoDiv.innerHTML = `
        <p><strong>ID do Pallet:</strong> ${pallet.id}</p>
        <p><strong>Ordem de Produção (OP):</strong> ${data.op}</p>
        <p><strong>Código do Produto:</strong> ${data.codigoProduto}</p>
        <p><strong>Descrição:</strong> ${data.descricaoProduto}</p>
        <hr>
        <p><strong>Sequenciamento:</strong> ${pallet.sequenciamento}</p>
        <p><strong>Peso Líquido:</strong> ${pallet.pesoLiquido.toFixed(2)} kg</p>
        <p><strong>Peso Bruto:</strong> ${pallet.pesoBruto.toFixed(2)} kg</p>
        <p><strong>Data do Apontamento:</strong> ${pallet.timestamp}</p>
        <p><strong>Apontador:</strong> ${pallet.operator}</p>
    `;
    palletDetailsContainer.classList.remove('d-none');
}

/**
 * Exibe uma mensagem de erro quando o QR Code lido não corresponde a nenhum pallet.
 */
function displayPalletNotFound() {
    palletInfoDiv.innerHTML = `
        <div class="alert alert-danger">
            <strong>Pallet não encontrado!</strong>
            <p class="mb-0">O QR Code lido não corresponde a nenhum pallet registrado no banco de dados.</p>
        </div>
    `;
    palletDetailsContainer.classList.remove('d-none');
}
