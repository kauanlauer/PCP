// =================================================================================
// SETOR: GERENCIAMENTO DE QR CODE
// =================================================================================
// DESCRIÇÃO: Este arquivo centraliza toda a lógica para a criação, armazenamento
// e impressão de QR Codes para os pallets.
// =================================================================================

// ---------------------------------------------------------------------------------
// Banco de Dados de QR Codes (armazenado em localStorage)
// ---------------------------------------------------------------------------------
let qrCodeDatabase = JSON.parse(localStorage.getItem('qrCodeDatabase')) || {};

/**
 * Salva o banco de dados de QR Codes no localStorage.
 */
function saveQrCodeDatabase() {
    localStorage.setItem('qrCodeDatabase', JSON.stringify(qrCodeDatabase));
}

// ---------------------------------------------------------------------------------
// Funções Principais de Geração e Exibição
// ---------------------------------------------------------------------------------

/**
 * Função principal para gerar um QR Code.
 * Ela cria o visual, salva os dados e exibe o modal.
 * @param {object} pallet - O objeto completo do pallet.
 */
function handleQRCodeGeneration(pallet) {
    // 1. Salva os dados do pallet no nosso banco de dados de QR Codes.
    // O ID único do pallet (pallet.id) será a "chave" no nosso banco de dados.
    qrCodeDatabase[pallet.id] = {
        op: currentOP.op,
        codigoProduto: currentOP.codigoProduto,
        descricaoProduto: currentOP.descricao,
        palletData: pallet
    };
    saveQrCodeDatabase(); // Salva a alteração no localStorage.

    // 2. Prepara os dados que serão exibidos no QR Code e na etiqueta.
    // O conteúdo do QR Code será apenas o ID único, para ser rápido de ler.
    const qrContent = pallet.id.toString();
    const labelInfo = `OP: ${currentOP.op} | Pallet: ${pallet.sequenciamento}\nPeso Liq: ${pallet.pesoLiquido.toFixed(2)} kg | Data: ${pallet.timestamp.split(' ')[0]}`;

    // 3. Gera a imagem do QR Code.
    const qrCodeCanvas = document.getElementById('qrCodeCanvas');
    qrCodeCanvas.innerHTML = ''; // Limpa o QR Code anterior.
    new QRCode(qrCodeCanvas, {
        text: qrContent,
        width: 150,
        height: 150,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // 4. Exibe as informações na etiqueta, abaixo do QR Code.
    document.getElementById('qrCodeInfo').innerText = labelInfo;

    // 5. Mostra o modal com o QR Code pronto para impressão.
    qrCodeModal.show();

    showAlert(`QR Code para o pallet ${pallet.sequenciamento} gerado e salvo.`, 'success');
}

/**
 * Aciona a função de impressão do navegador.
 * A formatação da etiqueta é controlada pelo CSS em @media print.
 */
function printQRCode() {
    window.print();
}
