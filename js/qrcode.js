// =================================================================================
// SETOR: GERENCIAMENTO DE QR CODE (VERSÃO PARA IMPRESSORA ZEBRA)
// =================================================================================
// DESCRIÇÃO: Este arquivo foi completamente reescrito para usar a biblioteca
// Zebra Browser Print. Ele gera comandos na linguagem ZPL e os envia
// diretamente para a impressora térmica, ignorando a caixa de diálogo de
// impressão do navegador.
// =================================================================================

// ---------------------------------------------------------------------------------
// Variáveis Globais para Impressão
// ---------------------------------------------------------------------------------
let selected_device; // Variável para guardar a impressora selecionada.
let zplDataToSend;   // Variável para guardar o comando ZPL a ser impresso.

// ---------------------------------------------------------------------------------
// Configuração Inicial da Impressora
// ---------------------------------------------------------------------------------

/**
 * Esta função é chamada assim que a página carrega.
 * Ela usa a biblioteca da Zebra para encontrar a impressora padrão
 * configurada no computador do usuário.
 */
function setupZebraPrinter() {
    // Tenta encontrar a impressora padrão
    BrowserPrint.getDefaultDevice("printer", function(device) {
        // Se encontrar, guarda a impressora na variável global
        selected_device = device;
        console.log("Impressora Zebra encontrada:", device);
    }, function(error) {
        // Se não encontrar, avisa o usuário no console.
        console.error("Erro ao encontrar impressora Zebra:", error);
        showAlert("Impressora Zebra não encontrada. Verifique se o programa Zebra Browser Print está rodando.", "danger");
    });
}

// ---------------------------------------------------------------------------------
// Funções de Geração de QR Code e ZPL
// ---------------------------------------------------------------------------------

/**
 * Função principal chamada quando o botão de QR Code é clicado.
 * Ela prepara os dados e abre o modal de visualização.
 * @param {object} pallet - O objeto completo do pallet.
 */
function handleQRCodeGeneration(pallet) {
    // 1. Gera o conteúdo de texto que será embutido no QR Code.
    const qrContent = createQRText(pallet);

    // 2. Gera o comando ZPL completo para a etiqueta.
    zplDataToSend = createZPL(pallet, qrContent);

    // 3. Gera uma pré-visualização do QR Code na tela (dentro do modal).
    // Isso não é o que será impresso, é apenas para o usuário ver.
    const qrCodeCanvas = document.getElementById('qrCodeCanvas');
    qrCodeCanvas.innerHTML = ''; // Limpa o QR Code anterior.
    new QRCode(qrCodeCanvas, {
        text: qrContent,
        width: 150,
        height: 150,
        correctLevel: QRCode.CorrectLevel.L
    });

    // 4. Abre o modal.
    qrCodeModal.show();
}

/**
 * Cria a string de texto formatada que será embutida no QR Code.
 * @param {object} pallet - O objeto do pallet.
 * @returns {string} - A string formatada.
 */
function createQRText(pallet) {
    let tipoCliente = "Cliente";
    if (currentOP && currentOP.entNome && currentOP.entNome.trim().toUpperCase() === "MANUPACKAGING FITASA DO BRASIL S/A.") {
        tipoCliente = "Estoque";
    }

    // Formato: CHAVE=VALOR;CHAVE=VALOR;...
    return `OP=${currentOP.op};` +
           `COD=${currentOP.codigoProduto};` +
           `SEQ=${pallet.sequenciamento};` +
           `P_LIQ=${pallet.pesoLiquido.toFixed(2)};` +
           `P_BRUTO=${pallet.pesoBruto.toFixed(2)};` +
           `DATA=${pallet.timestamp.split(' ')[0]};` +
           `OPERADOR=${pallet.operator};` +
           `TIPO=${tipoCliente};`;
}

/**
 * Cria o comando ZPL completo para a etiqueta.
 * @param {object} pallet - O objeto do pallet.
 * @param {string} qrContent - O texto a ser embutido no QR Code.
 * @returns {string} - O comando ZPL pronto para ser enviado à impressora.
 */
function createZPL(pallet, qrContent) {
    // --- CONFIGURAÇÕES DA ETIQUETA ---
    // Altere estes valores para ajustar ao tamanho da sua etiqueta.
    // A medida é em "dots". Uma impressora de 203 DPI tem 8 dots por mm.
    // Ex: Etiqueta de 50mm de largura = 50 * 8 = 400 dots.
    const labelWidth = 400;  // Largura da etiqueta (ex: 50mm)
    const labelHeight = 240; // Altura da etiqueta (ex: 30mm)

    // Comando ZPL
    let zpl = `
^XA
^PW${labelWidth} 
^LL${labelHeight}

^FO20,20
^BQN,2,5
^FDLA,${qrContent}^FS

^FO180,30
^A0N,24,24
^FDOP: ${currentOP.op}^FS

^FO180,65
^A0N,24,24
^FDPallet: ${pallet.sequenciamento}^FS

^FO180,100
^A0N,24,24
^FDPeso Liq: ${pallet.pesoLiquido.toFixed(2)} kg^FS

^FO20,180
^A0N,20,20
^FD${pallet.timestamp.split(' ')[0]} - ${pallet.operator}^FS

^XZ
`;
    // ^XA = Início da etiqueta
    // ^PW = Largura da etiqueta
    // ^LL = Altura da etiqueta
    // ^FOx,y = Posição do campo (x = distância da esquerda, y = distância do topo)
    // ^BQN,2,5 = Código QR, versão 2, magnificação 5
    // ^FDLA,{texto} = Dados do QR Code
    // ^A0N,h,w = Seleciona a fonte (h=altura, w=largura)
    // ^FD{texto} = Dados do campo de texto
    // ^FS = Fim do campo
    // ^XZ = Fim da etiqueta

    return zpl;
}

// ---------------------------------------------------------------------------------
// Função de Impressão
// ---------------------------------------------------------------------------------

/**
 * Envia o comando ZPL para a impressora Zebra selecionada.
 */
function printZebraQRCode() {
    if (!selected_device) {
        showAlert("Impressora Zebra não foi encontrada. Verifique a conexão e o software Zebra Browser Print.", "danger");
        return;
    }
    if (!zplDataToSend) {
        showAlert("Não há dados de etiqueta para imprimir.", "danger");
        return;
    }

    // Envia o comando ZPL para a impressora
    selected_device.send(zplDataToSend, function(success) {
        showAlert("Etiqueta enviada para a impressora com sucesso!", "success");
        qrCodeModal.hide(); // Fecha o modal após a impressão
    }, function(error) {
        showAlert("Erro ao enviar para a impressora: " + error, "danger");
    });
}

// ---------------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------------
// Roda a configuração da impressora assim que o script é carregado.
setupZebraPrinter();
