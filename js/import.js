// =================================================================================
// SETOR: IMPORTAÇÃO DE PLANILHAS (ARQUIVOS EXCEL)
// =================================================================================
// DESCRIÇÃO: Este arquivo contém todas as funções relacionadas à importação e
// processamento de arquivos Excel. AGORA, ele também salva os dados processados
// no sessionStorage para persistir durante a sessão do navegador.
// =================================================================================

// ---------------------------------------------------------------------------------
// Funções de Manipulação de Arquivos (Handlers)
// ---------------------------------------------------------------------------------

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleFileDrop(e, type) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        switch (type) {
            case 'file': processFile(files[0]); break;
            case 'guia': processGuiaFile(files[0]); break;
            case 'guiaStretch': processGuiaStretchFile(files[0]); break;
        }
    }
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) processFile(e.target.files[0]);
}

function handleGuiaSelect(e) {
    if (e.target.files.length > 0) processGuiaFile(e.target.files[0]);
}

function handleGuiaStretchSelect(e) {
    if (e.target.files.length > 0) processGuiaStretchFile(e.target.files[0]);
}

// ---------------------------------------------------------------------------------
// Funções de Processamento de Planilhas
// ---------------------------------------------------------------------------------

/**
 * Processa o arquivo da Programação Diária.
 * @param {File} file - O arquivo Excel a ser processado.
 */
function processFile(file) {
    showAlert('Processando Planilha de Programação...', 'info');
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            currentWorkbook = XLSX.read(data, { type: 'array' });
            const sheetName = currentWorkbook.SheetNames.find(name =>
                name.toUpperCase().includes('PROGRAMAÇÃO') || name.toUpperCase().includes('PROGRAMACAO')
            );
            if (!sheetName) throw new Error('Aba "PROGRAMAÇÃO" não encontrada');
            const worksheet = currentWorkbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            processExcelData(jsonData);
            
            // NOVO: Salva os dados da programação na memória da sessão.
            sessionStorage.setItem('excelData', JSON.stringify(excelData));
            
            showAlert(`Programação importada: ${excelData.length} registros.`, 'success');
            checkAndHideImportCard();
        } catch (error) {
            showAlert(`Erro ao processar programação: ${error.message}`, 'danger');
        }
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Processa o arquivo GUIA (Fita).
 * @param {File} file - O arquivo Excel a ser processado.
 */
function processGuiaFile(file) {
    showAlert('Processando GUIA (DATABASE)...', 'info');
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames.find(name => name.toUpperCase().includes('DATABASE'));
            if (!sheetName) throw new Error('Aba "DATABASE" não encontrada');
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            processGuiaData(jsonData);

            // NOVO: Salva os dados da GUIA Fita na memória da sessão.
            sessionStorage.setItem('guiaDatabase', JSON.stringify(guiaDatabase));

            showAlert(`GUIA (Fita) importada: ${guiaDatabase.length} registros.`, 'success');
            checkAndHideImportCard();
        } catch (error) {
            showAlert(`Erro ao processar GUIA: ${error.message}`, 'danger');
        }
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Processa o arquivo GUIA (Stretch).
 * @param {File} file - O arquivo Excel a ser processado.
 */
function processGuiaStretchFile(file) {
    showAlert('Processando GUIA (DATABASE_STRETCH)...', 'info');
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames.find(name => name.toUpperCase().includes('DATABASE_STRETCH'));
            if (!sheetName) throw new Error('Aba "DATABASE_STRETCH" não encontrada');
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            processGuiaStretchData(jsonData);

            // NOVO: Salva os dados da GUIA Stretch na memória da sessão.
            sessionStorage.setItem('guiaStretchDatabase', JSON.stringify(guiaStretchDatabase));

            showAlert(`GUIA (Stretch) importada: ${guiaStretchDatabase.length} registros.`, 'success');
            checkAndHideImportCard();
        } catch (error) {
            showAlert(`Erro ao processar GUIA STRETCH: ${error.message}`, 'danger');
        }
    };
    reader.readAsArrayBuffer(file);
}

// ---------------------------------------------------------------------------------
// Funções de Extração e Verificação
// ---------------------------------------------------------------------------------

/**
 * Verifica se todas as planilhas necessárias foram importadas e, em caso afirmativo,
 * oculta o card de importação para limpar a interface.
 */
function checkAndHideImportCard() {
    if (excelData.length > 0 && guiaDatabase.length > 0 && guiaStretchDatabase.length > 0) {
        setTimeout(() => {
            document.getElementById('fileCard').classList.add('hidden');
            showAlert('Todas as planilhas foram carregadas. Sistema pronto.', 'success');
        }, 1000); // Um pequeno atraso para o usuário ver a última notificação.
    }
}

/**
 * Extrai e formata os dados da planilha de Programação Diária.
 * ESTA FUNÇÃO NÃO FOI ALTERADA.
 * @param {Array<Array<any>>} jsonData - Os dados da planilha em formato de array.
 */
function processExcelData(jsonData) {
    excelData = [];
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[3] && row[3] !== '') {
            excelData.push({
                pedido: row[2] || '', op: row[3] || '', entNome: row[4] || '',
                codigoProduto: row[5] || '', descricao: row[6] || '', quantidade: row[7] || 0
            });
        }
    }
}

/**
 * Extrai e formata os dados da planilha GUIA (Fita).
 * ESTA FUNÇÃO NÃO FOI ALTERADA.
 * @param {Array<Array<any>>} jsonData - Os dados da planilha em formato de array.
 */
function processGuiaData(jsonData) {
    guiaDatabase = [];
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[0] && row[0] !== '') {
            guiaDatabase.push({
                codigo: row[0] || '', descricao: row[1] || '', cor: row[2] || '', largura: row[3] || '',
                espessura_total: row[4] || '', espessura_filme_bopp: row[5] || '', adesivo: row[6] || '',
                espessura_adesivo: row[7] || '', metragem: row[8] || '', diametro_interno_arruela: row[9] || '',
                rolos_por_caixa: row[10] || '', m2_por_rolo: row[11] || '', alongamento_ruptura: row[12] || '',
                adesao_aco: row[13] || '', resistencia_tracao: row[14] || ''
            });
        }
    }
}

/**
 * Extrai e formata os dados da planilha GUIA (Stretch).
 * ESTA FUNÇÃO NÃO FOI ALTERADA.
 * @param {Array<Array<any>>} jsonData - Os dados da planilha em formato de array.
 */
function processGuiaStretchData(jsonData) {
    guiaStretchDatabase = [];
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[0] && row[0] !== '') {
            guiaStretchDatabase.push({
                codigo: row[0] || '', descricao: row[1] || '', cor: row[2] || '', largura: row[3] || '',
                espessura: row[4] || '', estiramento_garantido: row[5] || '', diametro_interno_bobina: row[6] || '',
                gramatura_metro_linear: row[7] || '', peso_medio_bobina: row[8] || '', bobinas_por_piso: row[9] || '',
                peso_medio_por_piso: row[10] || '', metragem_media_bobina: row[11] || '', alongamento_longitudinal: row[12] || '',
                alongamento_transversal: row[13] || '', resistencia_impacto: row[14] || '', modulo_elastico: row[15] || ''
            });
        }
    }
}
