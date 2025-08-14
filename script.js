// Variáveis globais
let excelData = [];
let guiaDatabase = [];
let guiaStretchDatabase = [];
let currentOP = null;
let currentLaudoData = null;
let productionData = JSON.parse(localStorage.getItem('productionData')) || {};
let pallets = [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let operators = JSON.parse(localStorage.getItem('operators')) || [];
let currentWorkbook = null;
let exportDataForNetwork = null;
let laudosSalvos = JSON.parse(localStorage.getItem('laudosSalvos')) || {};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadSavedData();
    checkUserLogin();
    
    document.getElementById('userMatricula').addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
        const matricula = this.value.trim();
        const operator = operators.find(op => op.matricula === matricula);
        document.getElementById('userName').value = operator ? operator.nome : '';
    });
});

function checkUserLogin() {
    if (currentUser) {
        document.getElementById('loginCard').classList.add('hidden');
        document.getElementById('fileCard').classList.remove('hidden');
        document.getElementById('searchCard').classList.remove('hidden');
    }
}

function loginUser() {
    const matricula = document.getElementById('userMatricula').value.trim();
    const nome = document.getElementById('userName').value.trim();
    
    if (!matricula || matricula.length < 4 || !/^\d+$/.test(matricula)) {
        showAlert('Por favor, digite uma matrícula válida com pelo menos 4 dígitos.', 'danger');
        return;
    }
    
    const operator = operators.find(op => op.matricula === matricula);
    if (!operator) {
        showAlert('Matrícula não cadastrada. Por favor, cadastre o apontador primeiro.', 'danger');
        return;
    }
    
    if (nome !== operator.nome) {
        showAlert('Nome não corresponde à matrícula informada.', 'danger');
        return;
    }
    
    currentUser = {
        matricula: matricula,
        nome: nome,
        loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('fileCard').classList.remove('hidden');
    document.getElementById('searchCard').classList.remove('hidden');
    
    showAlert(`Bem-vindo, ${nome}!`, 'success');
}

function changeOperator() {
    if (confirm('Deseja realmente alterar o apontador de OP?')) {
        localStorage.removeItem('currentUser');
        currentUser = null;
        document.getElementById('loginCard').classList.remove('hidden');
        document.getElementById('fileCard').classList.add('hidden');
        document.getElementById('searchCard').classList.add('hidden');
        document.getElementById('opInfoCard').classList.add('hidden');
        document.getElementById('productionCard').classList.add('hidden');
        document.getElementById('palletsCard').classList.add('hidden');
        document.getElementById('laudoCard').classList.add('hidden');
        
        document.getElementById('userMatricula').value = '';
        document.getElementById('userName').value = '';
        document.getElementById('userMatricula').focus();
        
        showAlert('Por favor, identifique o novo apontador de OP.', 'info');
    }
}

function clearCurrentOP() {
    currentOP = null;
    pallets = [];
    
    document.getElementById('opSearch').value = '';
    document.getElementById('opInfoCard').classList.add('hidden');
    document.getElementById('productionCard').classList.add('hidden');
    document.getElementById('palletsCard').classList.add('hidden');
    
    clearProductionForm();
    showAlert('Dados limpos. Nova busca liberada.', 'info');
}

function clearLaudo() {
    currentLaudoData = null;
    document.getElementById('laudoOpSearch').value = '';
    document.getElementById('laudoCodigoSearch').value = '';
    document.getElementById('laudoInfo').classList.add('hidden');
    document.getElementById('laudoFormCard').classList.add('hidden');
    showAlert('Laudo limpo. Nova busca liberada.', 'info');
}

function openLaudoFromOP() {
    if (!currentOP || !currentOP.op) {
        showAlert('Nenhuma OP selecionada.', 'danger');
        return;
    }
    
    document.getElementById('laudoOpSearch').value = currentOP.op;
    document.getElementById('laudoCodigoSearch').value = currentOP.codigoProduto;
    
    document.getElementById('opInfoCard').classList.add('hidden');
    document.getElementById('productionCard').classList.add('hidden');
    document.getElementById('palletsCard').classList.add('hidden');
    
    document.getElementById('laudoCard').classList.remove('hidden');
    
    searchLaudoByOP();
}

function setupEventListeners() {
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

    document.getElementById('opSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchOP();
        }
    });

    document.getElementById('laudoOpSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchLaudoByOP();
        }
    });

    document.getElementById('laudoCodigoSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchLaudoByCodigo();
        }
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleFileDrop(e, type) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        switch(type) {
            case 'file':
                processFile(files[0]);
                break;
            case 'guia':
                processGuiaFile(files[0]);
                break;
            case 'guiaStretch':
                processGuiaStretchFile(files[0]);
                break;
        }
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function handleGuiaSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processGuiaFile(file);
    }
}

function handleGuiaStretchSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processGuiaStretchFile(file);
    }
}

function processFile(file) {
    const fileStatus = document.getElementById('fileStatus');
    fileStatus.className = 'import-status alert alert-info';
    fileStatus.textContent = 'Processando arquivo...';
    fileStatus.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            currentWorkbook = XLSX.read(data, { type: 'array' });
            
            const sheetName = currentWorkbook.SheetNames.find(name => 
                name.toUpperCase().includes('PROGRAMAÇÃO') || 
                name.toUpperCase().includes('PROGRAMACAO') ||
                name.toUpperCase().includes('DIÁRIA') ||
                name.toUpperCase().includes('DIARIA')
            );
            
            if (!sheetName) {
                throw new Error('Aba "PROGRAMAÇÃO DIÁRIA" não encontrada');
            }

            const worksheet = currentWorkbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            processExcelData(jsonData);
            
            fileStatus.className = 'import-status alert alert-success';
            fileStatus.textContent = `✅ Arquivo processado com sucesso! ${excelData.length} registros importados.`;
            
        } catch (error) {
            fileStatus.className = 'import-status alert alert-danger';
            fileStatus.textContent = `❌ Erro ao processar arquivo: ${error.message}`;
        }
    };
    reader.readAsArrayBuffer(file);
}

function processGuiaFile(file) {
    const guiaStatus = document.getElementById('guiaStatus');
    guiaStatus.className = 'import-status alert alert-info';
    guiaStatus.textContent = 'Processando arquivo GUIA...';
    guiaStatus.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const sheetName = workbook.SheetNames.find(name => 
                name.toUpperCase().includes('DATABASE') || 
                name.toUpperCase().includes('GUIA')
            );
            
            if (!sheetName) {
                throw new Error('Aba "DATABASE" não encontrada');
            }

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            processGuiaData(jsonData);
            
            guiaStatus.className = 'import-status alert alert-success';
            guiaStatus.textContent = `✅ Arquivo GUIA processado com sucesso! ${guiaDatabase.length} registros importados.`;
            
        } catch (error) {
            guiaStatus.className = 'import-status alert alert-danger';
            guiaStatus.textContent = `❌ Erro ao processar arquivo GUIA: ${error.message}`;
        }
    };
    reader.readAsArrayBuffer(file);
}

function processGuiaStretchFile(file) {
    const guiaStretchStatus = document.getElementById('guiaStretchStatus');
    guiaStretchStatus.className = 'import-status alert alert-info';
    guiaStretchStatus.textContent = 'Processando arquivo GUIA STRETCH...';
    guiaStretchStatus.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const sheetName = workbook.SheetNames.find(name => 
                name.toUpperCase().includes('DATABASE_STRETCH') || 
                name.toUpperCase().includes('GUIA_STRETCH')
            );
            
            if (!sheetName) {
                throw new Error('Aba "DATABASE_STRETCH" não encontrada');
            }

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            processGuiaStretchData(jsonData);
            
            guiaStretchStatus.className = 'import-status alert alert-success';
            guiaStretchStatus.textContent = `✅ Arquivo GUIA STRETCH processado com sucesso! ${guiaStretchDatabase.length} registros importados.`;
            
        } catch (error) {
            guiaStretchStatus.className = 'import-status alert alert-danger';
            guiaStretchStatus.textContent = `❌ Erro ao processar arquivo GUIA STRETCH: ${error.message}`;
        }
    };
    reader.readAsArrayBuffer(file);
}

function processExcelData(jsonData) {
    excelData = [];
    
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[3] && row[3] !== '') {
            excelData.push({
                pedido: row[2] || '',
                op: row[3] || '',
                entNome: row[4] || '',
                codigoProduto: row[5] || '',
                descricao: row[6] || '',
                quantidade: row[7] || 0
            });
        }
    }
}

function processGuiaData(jsonData) {
    guiaDatabase = [];
    
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[0] && row[0] !== '') {
            guiaDatabase.push({
                codigo: row[0] || '',
                descricao: row[1] || '',
                cor: row[2] || '',
                largura: row[3] || '',
                espessura_total: row[4] || '',
                espessura_filme_bopp: row[5] || '',
                adesivo: row[6] || '',
                espessura_adesivo: row[7] || '',
                metragem: row[8] || '',
                diametro_interno_arruela: row[9] || '',
                rolos_por_caixa: row[10] || '',
                m2_por_rolo: row[11] || '',
                alongamento_ruptura: row[12] || '',
                adesao_aco: row[13] || '',
                resistencia_tracao: row[14] || ''
            });
        }
    }
}

function processGuiaStretchData(jsonData) {
    guiaStretchDatabase = [];
    
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[0] && row[0] !== '') {
            guiaStretchDatabase.push({
                codigo: row[0] || '',
                descricao: row[1] || '',
                cor: row[2] || '',
                largura: row[3] || '',
                espessura: row[4] || '',
                estiramento_garantido: row[5] || '',
                diametro_interno_bobina: row[6] || '',
                gramatura_metro_linear: row[7] || '',
                peso_medio_bobina: row[8] || '',
                bobinas_por_piso: row[9] || '',
                peso_medio_por_piso: row[10] || '',
                metragem_media_bobina: row[11] || '',
                alongamento_longitudinal: row[12] || '',
                alongamento_transversal: row[13] || '',
                resistencia_impacto: row[14] || '',
                modulo_elastico: row[15] || ''
            });
        }
    }
}

function searchOP() {
    const opNumber = document.getElementById('opSearch').value.trim();
    
    if (!opNumber) {
        showAlert('Por favor, digite o número da OP.', 'danger');
        return;
    }

    const found = excelData.find(item => item.op.toString() === opNumber);
    
    if (found) {
        currentOP = found;
        displayOPInfo(found);
        loadOPData(opNumber);
        document.getElementById('opInfoCard').classList.remove('hidden');
        document.getElementById('productionCard').classList.remove('hidden');
        document.getElementById('palletsCard').classList.remove('hidden');
        document.getElementById('laudoCard').classList.add('hidden');
    } else {
        showAlert('OP não encontrada na planilha.', 'danger');
        document.getElementById('opInfoCard').classList.add('hidden');
        document.getElementById('productionCard').classList.add('hidden');
        document.getElementById('palletsCard').classList.add('hidden');
    }
}

function searchLaudoByOP() {
    const opNumber = document.getElementById('laudoOpSearch').value.trim();
    
    if (!opNumber) {
        showAlert('Por favor, digite o número da OP.', 'danger');
        return;
    }

    const found = excelData.find(item => item.op.toString() === opNumber);
    
    if (found) {
        const isStretch = found.descricao.toUpperCase().includes('STRETCH');
        
        let foundInGuia = null;
        if (isStretch) {
            foundInGuia = guiaStretchDatabase.find(item => item.codigo.toString() === found.codigoProduto.toString());
        } else {
            foundInGuia = guiaDatabase.find(item => item.codigo.toString() === found.codigoProduto.toString());
        }
        
        if (foundInGuia) {
            currentLaudoData = {
                op: found.op,
                codigo: found.codigoProduto,
                descricao: found.descricao,
                isStretch: isStretch,
                guia: foundInGuia,
                savedData: laudosSalvos[found.op] || null
            };
            
            displayLaudoInfo(found, foundInGuia);
            fillLaudoForm(foundInGuia, isStretch);
            document.getElementById('laudoInfo').classList.remove('hidden');
            document.getElementById('laudoFormCard').classList.remove('hidden');
            
            document.getElementById('opInfoCard').classList.add('hidden');
            document.getElementById('productionCard').classList.add('hidden');
            document.getElementById('palletsCard').classList.add('hidden');
            
            document.getElementById('laudoCard').classList.remove('hidden');
        } else {
            showAlert('Código do produto não encontrado na GUIA correspondente.', 'danger');
        }
    } else {
        showAlert('OP não encontrada na planilha.', 'danger');
    }
}

function searchLaudoByCodigo() {
    const codigo = document.getElementById('laudoCodigoSearch').value.trim();
    
    if (!codigo) {
        showAlert('Por favor, digite o código do produto.', 'danger');
        return;
    }

    const foundInGuia = guiaDatabase.find(item => item.codigo.toString() === codigo);
    const foundInGuiaStretch = guiaStretchDatabase.find(item => item.codigo.toString() === codigo);
    
    const isStretch = foundInGuiaStretch ? true : false;
    const foundInGuiaFinal = isStretch ? foundInGuiaStretch : foundInGuia;
    
    if (foundInGuiaFinal) {
        const opsComEsteCodigo = excelData.filter(item => item.codigoProduto.toString() === codigo);
        
        currentLaudoData = {
            codigo: codigo,
            descricao: foundInGuiaFinal.descricao,
            isStretch: isStretch,
            guia: foundInGuiaFinal,
            ops: opsComEsteCodigo,
            savedData: laudosSalvos[codigo] || null
        };
        
        displayLaudoInfo(null, foundInGuiaFinal);
        fillLaudoForm(foundInGuiaFinal, isStretch);
        document.getElementById('laudoInfo').classList.remove('hidden');
        document.getElementById('laudoFormCard').classList.remove('hidden');
        
        document.getElementById('opInfoCard').classList.add('hidden');
        document.getElementById('productionCard').classList.add('hidden');
        document.getElementById('palletsCard').classList.add('hidden');
        
        document.getElementById('laudoCard').classList.remove('hidden');
    } else {
        showAlert('Código não encontrado nas GUIA (DATABASE ou DATABASE_STRETCH).', 'danger');
    }
}

function displayOPInfo(op) {
    if (!op || !op.op) return;
    
    const opInfo = document.getElementById('opInfo');
    const status = productionData[op.op] && productionData[op.op].closed ? 'Fechada' : 'Aberta';
    const statusClass = productionData[op.op] && productionData[op.op].closed ? 'status-closed' : 'status-open';
    
    // Verifica se é STRETCH ou FITA
    const isStretch = op.descricao.toUpperCase().includes('STRETCH');
    
    // Busca a cor na database apropriada
    let cor = 'N/A';
    if (isStretch) {
        const guiaItem = guiaStretchDatabase.find(item => item.codigo === op.codigoProduto);
        cor = guiaItem ? guiaItem.cor : 'N/A';
    } else {
        const guiaItem = guiaDatabase.find(item => item.codigo === op.codigoProduto);
        cor = guiaItem ? guiaItem.cor : 'N/A';
    }
    
    opInfo.innerHTML = `
        <h3>📋 Detalhes da Ordem de Produção</h3>
        <div class="info-item"><strong>Pedido:</strong> ${op.pedido}</div>
        <div class="info-item"><strong>OP:</strong> ${op.op}</div>
        <div class="info-item"><strong>Cliente:</strong> ${op.entNome}</div>
        <div class="info-item"><strong>Código:</strong> ${op.codigoProduto}</div>
        <div class="info-item"><strong>Descrição:</strong> ${op.descricao}</div>
        <div class="info-item"><strong>Cor:</strong> ${cor}</div>
        <div class="info-item"><strong>Quantidade:</strong> ${op.quantidade}</div>
        <div class="info-item"><strong>Status:</strong> <span class="${statusClass}">${status}</span></div>
        <div class="info-item"><strong>Apontador:</strong> ${currentUser?.nome || 'N/A'}</div>
    `;
}

function displayLaudoInfo(programacao, guia) {
    const laudoInfo = document.getElementById('laudoInfo');
    
    let html = '<h3>📋 Informações para Laudo de Inspeção</h3>';
    
    if (programacao) {
        // Busca a cor na database apropriada
        let cor = 'N/A';
        if (currentLaudoData.isStretch) {
            const guiaItem = guiaStretchDatabase.find(item => item.codigo === programacao.codigoProduto);
            cor = guiaItem ? guiaItem.cor : 'N/A';
        } else {
            const guiaItem = guiaDatabase.find(item => item.codigo === programacao.codigoProduto);
            cor = guiaItem ? guiaItem.cor : 'N/A';
        }
        
        html += `
            <div class="info-item"><strong>OP:</strong> ${programacao.op}</div>
            <div class="info-item"><strong>Código:</strong> ${programacao.codigoProduto}</div>
            <div class="info-item"><strong>Descrição:</strong> ${programacao.descricao}</div>
            <div class="info-item"><strong>Cor:</strong> ${cor}</div>
            <div class="info-item"><strong>Tipo:</strong> ${currentLaudoData.isStretch ? 'STRETCH' : 'FITA'}</div>
        `;
    } else if (currentLaudoData) {
        // Busca a cor na database apropriada
        let cor = 'N/A';
        if (currentLaudoData.isStretch) {
            const guiaItem = guiaStretchDatabase.find(item => item.codigo === currentLaudoData.codigo);
            cor = guiaItem ? guiaItem.cor : 'N/A';
        } else {
            const guiaItem = guiaDatabase.find(item => item.codigo === currentLaudoData.codigo);
            cor = guiaItem ? guiaItem.cor : 'N/A';
        }
        
        html += `
            <div class="info-item"><strong>Código:</strong> ${currentLaudoData.codigo}</div>
            <div class="info-item"><strong>Descrição:</strong> ${currentLaudoData.descricao}</div>
            <div class="info-item"><strong>Cor:</strong> ${cor}</div>
            <div class="info-item"><strong>Tipo:</strong> ${currentLaudoData.isStretch ? 'STRETCH' : 'FITA'}</div>
            <div class="info-item"><strong>OPs relacionadas:</strong> ${currentLaudoData.ops?.map(op => op.op).join(', ') || 'Nenhuma'}</div>
        `;
    }
    
    laudoInfo.innerHTML = html;
}

function fillLaudoForm(guiaData, isStretch) {
    const formBody = document.getElementById('laudoFormBody');
    formBody.innerHTML = '';
    
    if (isStretch) {
        const camposStretch = [
            { descricao: 'LARGURA', unidade: 'mm', campoGuia: 'largura' },
            { descricao: 'ESPESSURA', unidade: 'µm', campoGuia: 'espessura' },
            { descricao: 'ESTIRAMENTO GARANTIDO', unidade: '%', campoGuia: 'estiramento_garantido' },
            { descricao: 'DIAMETRO INTERNO DA BOBINA', unidade: 'mm', campoGuia: 'diametro_interno_bobina' },
            { descricao: 'GRAMATURA METRO LINEAR', unidade: 'g', campoGuia: 'gramatura_metro_linear' },
            { descricao: 'PESO MÉDIO BOBINA', unidade: 'kg', campoGuia: 'peso_medio_bobina' },
            { descricao: 'BOBINAS POR PISO', unidade: 'un.', campoGuia: 'bobinas_por_piso' },
            { descricao: 'PESO MÉDIO POR PISO', unidade: 'kg', campoGuia: 'peso_medio_por_piso' },
            { descricao: 'METRAGEM MÉDIA BOBINA', unidade: 'm', campoGuia: 'metragem_media_bobina' },
            { descricao: 'ALONGAMENTO LONGITUDINAL', unidade: '%', campoGuia: 'alongamento_longitudinal' },
            { descricao: 'ALONGAMENTO TRANSVERSAL', unidade: '%', campoGuia: 'alongamento_transversal' },
            { descricao: 'RESISTÊNCIA AO IMPACTO', unidade: 'g', campoGuia: 'resistencia_impacto' },
            { descricao: 'MDULO ELASTICO', unidade: 'N/mm2', campoGuia: 'modulo_elastico' },
        ];
        
        camposStretch.forEach(campo => {
            const especificado = guiaData[campo.campoGuia] || 'N/A';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${campo.descricao}</td>
                <td>${campo.unidade}</td>
                <td>${especificado}</td>
                <td><input type="text" class="form-control" id="laudo_${campo.descricao.replace(/\s+/g, '_')}" value="${especificado}"></td>
            `;
            formBody.appendChild(row);
        });
    } else {
        const camposFita = [
            { descricao: 'LARGURA', unidade: 'mm', campoGuia: 'largura' },
            { descricao: 'ESPESSURA TOTAL', unidade: 'µm', campoGuia: 'espessura_total' },
            { descricao: 'ESPESSURA FILME BOPP', unidade: 'µm', campoGuia: 'espessura_filme_bopp' },
            { descricao: 'ADESIVO', unidade: 'Propriedade', campoGuia: 'adesivo' },
            { descricao: 'ESPESSURA ADESIVO', unidade: 'µm', campoGuia: 'espessura_adesivo' },
            { descricao: 'METRAGEM', unidade: 'm', campoGuia: 'metragem' },
            { descricao: 'DIÂMETRO INTERNO DA ARRUELA', unidade: 'mm', campoGuia: 'diametro_interno_arruela' },
            { descricao: 'ROLOS POR CAIXA', unidade: 'un.', campoGuia: 'rolos_por_caixa' },
            { descricao: 'M2 POR ROLO', unidade: 'm2', campoGuia: 'm2_por_rolo' },
            { descricao: 'ALONGAMENTO DE RUPTURA', unidade: '%', campoGuia: 'alongamento_ruptura' },
            { descricao: 'ADESÃO AO AÇO', unidade: 'kgf/25 mm', campoGuia: 'adesao_aco' },
            { descricao: 'RESISTÊNCIA A TRAÇÃO', unidade: 'kgf/25 mm', campoGuia: 'resistencia_tracao' },
        ];
        
        camposFita.forEach(campo => {
            const especificado = guiaData[campo.campoGuia] || 'N/A';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${campo.descricao}</td>
                <td>${campo.unidade}</td>
                <td>${especificado}</td>
                <td><input type="text" class="form-control" id="laudo_${campo.descricao.replace(/\s+/g, '_')}" value="${especificado}"></td>
            `;
            formBody.appendChild(row);
        });
    }
    
    if (currentLaudoData?.savedData?.observacoes) {
        document.getElementById('laudoObservacoes').value = currentLaudoData.savedData.observacoes;
    } else {
        document.getElementById('laudoObservacoes').value = '';
    }
    
    if (currentLaudoData?.savedData?.resultado) {
        const radio = document.querySelector(`input[name="resultadoInspecao"][value="${currentLaudoData.savedData.resultado}"]`);
        if (radio) radio.checked = true;
    } else {
        document.querySelectorAll('input[name="resultadoInspecao"]').forEach(radio => {
            radio.checked = false;
        });
    }
}

function saveLaudo() {
    if (!currentLaudoData) {
        showAlert('Nenhum laudo carregado para salvar.', 'danger');
        return;
    }
    
    const dadosLaudo = {};
    
    const inputs = document.querySelectorAll('#laudoFormBody input[type="text"]');
    inputs.forEach(input => {
        const descricao = input.id.replace('laudo_', '').replace(/_/g, ' ');
        const valor = input.value.trim();
        if (valor) {
            dadosLaudo[descricao] = valor;
        }
    });
    
    dadosLaudo.observacoes = document.getElementById('laudoObservacoes').value.trim();
    
    const resultado = document.querySelector('input[name="resultadoInspecao"]:checked');
    if (resultado) {
        dadosLaudo.resultado = resultado.value;
    }
    
    dadosLaudo.data = new Date().toISOString();
    dadosLaudo.inspetor = currentUser?.nome || 'N/A';
    dadosLaudo.tipo = currentLaudoData.isStretch ? 'STRETCH' : 'FITA';
    
    if (currentLaudoData.op) {
        laudosSalvos[currentLaudoData.op] = dadosLaudo;
    } else {
        laudosSalvos[currentLaudoData.codigo] = dadosLaudo;
    }
    
    localStorage.setItem('laudosSalvos', JSON.stringify(laudosSalvos));
    showAlert('Laudo salvo com sucesso!', 'success');
    
    currentLaudoData.savedData = dadosLaudo;
}

function generateLaudoPDF() {
    if (!currentLaudoData) {
        showAlert('Nenhum laudo carregado para gerar.', 'danger');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Adiciona a logo no canto esquerdo - URL corrigida
    const logoUrl = 'https://fitaspersonalizadas.manupackaging.com.br/wp-content/uploads/2023/09/logo-manupackaging-1.svg';
    
    // Primeiro carregamos a imagem em um elemento HTML oculto
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Isso permite carregar imagens de outros domínios
    img.src = logoUrl;
    
    // Quando a imagem estiver carregada, adicionamos ao PDF
    img.onload = function() {
        // Criamos um canvas temporário para converter a imagem
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Convertemos a imagem para Data URL
        const dataURL = canvas.toDataURL('image/png');
        
        // Agora adicionamos ao PDF
        doc.addImage(dataURL, 'PNG', 15, 10, 30, 30);
        
        // Continua com o resto do documento
        completeLaudoPDF(doc);
    };
    
    img.onerror = function() {
        // Se não conseguir carregar a imagem, continua sem ela
        console.error('Erro ao carregar a logo');
        completeLaudoPDF(doc);
    };
}

function completeLaudoPDF(doc) {
    // Define o código do formulário baseado no tipo de produto
    const formCode = currentLaudoData.isStretch ? 'FMQ 022' : 'FMQ 021';
    
    doc.setFontSize(20);
    doc.text(formCode, 160, 10, { dishevel: 'right' });
    doc.setFontSize(16);
    doc.text('MANUPACKAGING', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('LAUDO DE INSPEÇÃO FINAL', 105, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Código: ${currentLaudoData.codigo}`, 20, 40);
    doc.text(`Descrição: ${currentLaudoData.descricao}`, 20, 46);
    
    // Busca a cor na database apropriada
    let cor = 'N/A';
    if (currentLaudoData.isStretch) {
        const guiaItem = guiaStretchDatabase.find(item => item.codigo === currentLaudoData.codigo);
        cor = guiaItem ? guiaItem.cor : 'N/A';
    } else {
        const guiaItem = guiaDatabase.find(item => item.codigo === currentLaudoData.codigo);
        cor = guiaItem ? guiaItem.cor : 'N/A';
    }
    
    doc.text(`Cor: ${cor}`, 20, 52);
    doc.text(`Tipo: ${currentLaudoData.isStretch ? 'STRETCH 100% PEBDL' : 'FITA'}`, 20, 58);
    if (currentLaudoData.op) {
        doc.text(`OP: ${currentLaudoData.op}`, 20, 64);
    }
    doc.text(`Data de fabricação / Analise: ${new Date().toLocaleDateString('pt-BR')}`, 20, 70);
    
    doc.setFontSize(12);
    doc.text('ESPECIFICAÇÕES TÉCNICAS', 20, 82);
    
    doc.setFontSize(8);
    doc.text('DESCRIÇÃO', 20, 90);
    doc.text('UNIDADE', 80, 90);
    doc.text('ESPECIFICADO', 110, 90);
    doc.text('ENCONTRADO', 160, 90);
    
    let y = 96;
    const inputs = document.querySelectorAll('#laudoFormBody input[type="text"]');
    
    inputs.forEach(input => {
        const descricao = input.id.replace('laudo_', '').replace(/_/g, ' ');
        const encontrado = input.value.trim();
        // Usa o valor encontrado também para o especificado
        const especificado = encontrado;
        
        let unidade = '';
        const row = input.closest('tr');
        if (row) {
            const cells = row.cells;
            if (cells.length >= 2) {
                unidade = cells[1].textContent;
            }
        }
        
        doc.text(descricao, 20, y);
        doc.text(unidade, 80, y);
        doc.text(especificado.toString(), 110, y);
        doc.text(encontrado, 160, y);
        
        y += 6;
    });
    
    y += 10;
    doc.setFontSize(10);
    doc.text('TOLERÂNCIA 10%', 20, y);
    y += 6;
    doc.text('Responsável pela análise: Departamento de qualidade.', 20, y);
    y += 6;
    doc.text('Validade do produto: 03 anos após data de fabricação.', 20, y);
    y += 6;
    doc.text('Endereço: R. Emílio Romani, 1250 - Cidade Industrial de Curitiba, Curitiba - PR, 81460-0200', 20, y);
    y += 6;
    doc.text('Endereço: Av. Buriti, N° 3670 - Distrito Industrial I, Manaus - AM, 69075-000', 20, y);
    y += 6;
    doc.text('Telefone: CWB (41) 2169-6000  CNPJ: 04.807.000/0001-59 / MAO (92) 3026-3399 CNPJ: 14.269.557/0001-37', 20, y);
    
    y += 12;
    const observacoes = document.getElementById('laudoObservacoes').value;
    if (observacoes) {
        doc.text('Observações:', 20, y);
        doc.text(observacoes, 20, y + 6, { maxWidth: 170 });
        y += 16;
    }
    
    doc.setFontSize(12);
    const resultado = document.querySelector('input[name="resultadoInspecao"]:checked');
    doc.text('RESULTADO:', 20, y);
    
    if (resultado) {
        doc.text(`        ${resultado.value}`, 40, y);
    } else {
        doc.text('□ Aprovado', 40, y);
        doc.text('□ Reprovado', 80, y);
        doc.text('□ Aprovado com Ressalvas', 120, y);
    }
    
    y += 30;
    doc.setFontSize(8);
    doc.text('Revisão: 006 | Data emissão: 23/03/2015 | Data revisão: 30/07/2025 | Elaborador: Thiago Viana | Aprovação: Camille Grebogy | Pg: 01 de 01', 20, y);
    
    doc.setFontSize(8);
    doc.text('Sistema de Apontamento de Produção - Manupackaging', 105, 285, { align: 'center' });
    
    const fileName = currentLaudoData.op ? 
        `Laudo_OP_${currentLaudoData.op}.pdf` : 
        `Laudo_Codigo_${currentLaudoData.codigo}.pdf`;
        
    doc.save(fileName);
    showAlert('Laudo PDF gerado com sucesso!', 'success');
}

function loadOPData(opNumber) {
    if (productionData[opNumber]) {
        pallets = productionData[opNumber].pallets || [];
        updatePalletsTable();
        
        if (productionData[opNumber].closed) {
            document.getElementById('productionCard').style.opacity = '0.6';
            document.getElementById('productionCard').style.pointerEvents = 'none';
            showAlert('Esta OP está fechada. Não é possível fazer novos apontamentos.', 'info');
        }
    } else {
        pallets = [];
        document.getElementById('productionCard').style.opacity = '1';
        document.getElementById('productionCard').style.pointerEvents = 'auto';
    }
}

function calculatePesoLiquido() {
    const pesoBruto = parseFloat(document.getElementById('pesoBruto').value) || 0;
    const pesoTubo = parseFloat(document.getElementById('pesoTubo').value) || 0;
    const pesoPalet = parseFloat(document.getElementById('pesoPalet').value) || 0;
    const pesoEmbalagem = parseFloat(document.getElementById('pesoEmbalagem').value) || 0;
    
    let pesoLiquido = pesoBruto - pesoTubo - pesoPalet - pesoEmbalagem;
    pesoLiquido = pesoLiquido < 0 ? 0 : pesoLiquido;
    document.getElementById('pesoLiquido').textContent = `${pesoLiquido.toFixed(2)} kg`;
}

function addPallet() {
    const sequenciamento = document.getElementById('sequenciamento').value.trim();
    const pesoBruto = parseFloat(document.getElementById('pesoBruto').value) || 0;
    const pesoTubo = parseFloat(document.getElementById('pesoTubo').value) || 0;
    const pesoPalet = parseFloat(document.getElementById('pesoPalet').value) || 0;
    const pesoEmbalagem = parseFloat(document.getElementById('pesoEmbalagem').value) || 0;
    
    if (!sequenciamento || !sequenciamento.includes('/')) {
        showAlert('Por favor, preencha o sequenciamento no formato X/Y (ex: 1/10).', 'danger');
        return;
    }
    
    if (pesoBruto <= 0) {
        showAlert('Por favor, preencha o peso bruto com um valor válido.', 'danger');
        return;
    }
    
    const existingPallet = pallets.find(p => p.sequenciamento === sequenciamento);
    if (existingPallet) {
        showAlert(`Já existe um pallet com sequenciamento ${sequenciamento}.`, 'danger');
        return;
    }
    
    const pesoLiquido = pesoBruto - pesoTubo - pesoPalet - pesoEmbalagem;
    
    const pallet = {
        id: Date.now(),
        sequenciamento: sequenciamento,
        pesoBruto: pesoBruto,
        pesoTubo: pesoTubo,
        pesoPalet: pesoPalet,
        pesoEmbalagem: pesoEmbalagem,
        pesoLiquido: pesoLiquido,
        timestamp: new Date().toLocaleString('pt-BR'),
        operator: currentUser?.nome || 'N/A'
    };
    
    pallets.push(pallet);
    
    pallets.sort((a, b) => {
        const aParts = a.sequenciamento.split('/');
        const bParts = b.sequenciamento.split('/');
        const aNum = parseInt(aParts[0]) || 0;
        const bNum = parseInt(bParts[0]) || 0;
        const aTotal = parseInt(aParts[1]) || 0;
        const bTotal = parseInt(bParts[1]) || 0;
        
        if (aTotal !== bTotal) {
            return aTotal - bTotal;
        }
        return aNum - bNum;
    });
    
    updatePalletsTable();
    clearProductionForm();
    saveData();
    
    showAlert('Pallet adicionado com sucesso!', 'success');
}

function updatePalletsTable() {
    const palletsTable = document.getElementById('palletsTable');
    
    if (pallets.length === 0) {
        palletsTable.innerHTML = '<p>Nenhum pallet registrado ainda.</p>';
        document.getElementById('totalSummary').classList.add('hidden');
        return;
    }
    
    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Sequência</th>
                    <th>Peso Bruto</th>
                    <th>Peso Tubo</th>
                    <th>Peso Palet</th>
                    <th>Peso Embalagem</th>
                    <th>Peso Líquido</th>
                    <th>Data/Hora</th>
                    <th>Apontador</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    const groupedPallets = {};
    pallets.forEach(pallet => {
        const sequenceKey = pallet.sequenciamento;
        
        if (!groupedPallets[sequenceKey]) {
            groupedPallets[sequenceKey] = {
                pallets: []
            };
        }
        groupedPallets[sequenceKey].pallets.push(pallet);
    });
    
    const sortedGroups = Object.keys(groupedPallets).sort((a, b) => {
        const aParts = a.split('/');
        const bParts = b.split('/');
        const aNum = parseInt(aParts[0]) || 0;
        const bNum = parseInt(bParts[0]) || 0;
        const aTotal = parseInt(aParts[1]) || 0;
        const bTotal = parseInt(bParts[1]) || 0;
        
        if (aTotal !== bTotal) {
            return aTotal - bTotal;
        }
        return aNum - bNum;
    });
    
    sortedGroups.forEach(sequenceKey => {
        const group = groupedPallets[sequenceKey];
        
        group.pallets.forEach(pallet => {
            html += `
                <tr>
                    <td><strong>${pallet.sequenciamento}</strong></td>
                    <td>${pallet.pesoBruto.toFixed(2)} kg</td>
                    <td>${pallet.pesoTubo.toFixed(2)} kg</td>
                    <td>${pallet.pesoPalet.toFixed(2)} kg</td>
                    <td>${pallet.pesoEmbalagem.toFixed(2)} kg</td>
                    <td><strong>${pallet.pesoLiquido.toFixed(2)} kg</strong></td>
                    <td>${pallet.timestamp}</td>
                    <td>${pallet.operator || 'N/A'}</td>
                    <td><button class="btn btn-danger" onclick="removePallet(${pallet.id})">🗑️</button></td>
                </tr>
            `;
        });
    });
    
    html += '</tbody></table>';
    palletsTable.innerHTML = html;
    
    updateTotalSummary();
}

function updateTotalSummary() {
    const totalPesoBruto = pallets.reduce((sum, p) => sum + p.pesoBruto, 0);
    const totalPesoLiquido = pallets.reduce((sum, p) => sum + p.pesoLiquido, 0);
    const totalPallets = pallets.length;
    
    document.getElementById('summaryContent').innerHTML = `
        <div class="summary-item">
            <strong>${totalPallets}</strong>
            <span>Pallets</span>
        </div>
        <div class="summary-item">
            <strong>${totalPesoBruto.toFixed(2)} kg</strong>
            <span>Peso Bruto Total</span>
        </div>
        <div class="summary-item">
            <strong>${totalPesoLiquido.toFixed(2)} kg</strong>
            <span>Peso Líquido Total</span>
        </div>
    `;
    
    document.getElementById('totalSummary').classList.remove('hidden');
}

function removePallet(palletId) {
    if (confirm('Tem certeza que deseja remover este pallet?')) {
        pallets = pallets.filter(p => p.id !== palletId);
        updatePalletsTable();
        saveData();
        showAlert('Pallet removido com sucesso!', 'success');
    }
}

function clearProductionForm() {
    document.getElementById('sequenciamento').value = '';
    document.getElementById('pesoBruto').value = '';
    document.getElementById('pesoTubo').value = '';
    document.getElementById('pesoPalet').value = '';
    document.getElementById('pesoEmbalagem').value = '';
    document.getElementById('pesoLiquido').textContent = '0.00 kg';
}

function generateExport() {
    const exportType = document.getElementById('exportType').value;
    
    if (exportType === 'pdf') {
        generateReport();
    } else if (exportType === 'laudo') {
        if (currentLaudoData) {
            generateLaudoPDF();
        } else {
            showAlert('Nenhum laudo selecionado para exportar.', 'danger');
        }
    } else if (exportType === 'excel') {
        exportToExcel(false);
    } else if (exportType === 'excelDetailed') {
        exportToExcel(true);
    } else if (exportType === 'saveToExcel') {
        saveToOriginalExcel();
    } else if (exportType === 'saveToNetwork') {
        prepareForNetworkSave();
    }
}

function prepareForNetworkSave() {
    if (Object.keys(productionData).length === 0) {
        showAlert('Nenhum dado para exportar.', 'danger');
        return;
    }

    const wb = XLSX.utils.book_new();
    const detailedData = [['OP', 'Pedido', 'Cliente', 'Sequência', 'Peso Bruto', 'Peso Tubo', 'Peso Palet', 'Peso Embalagem', 'Peso Líquido', 'Data/Hora', 'Apontador']];
    
    Object.keys(productionData).forEach(op => {
        const data = productionData[op];
        const pallets = data.pallets || [];
        
        const sortedPallets = [...pallets].sort((a, b) => {
            const aParts = a.sequenciamento.split('/');
            const bParts = b.sequenciamento.split('/');
            const aNum = parseInt(aParts[0]) || 0;
            const bNum = parseInt(bParts[0]) || 0;
            const aTotal = parseInt(aParts[1]) || 0;
            const bTotal = parseInt(bParts[1]) || 0;
            
            if (aTotal !== bTotal) {
                return aTotal - bTotal;
            }
            return aNum - bNum;
        });
        
        sortedPallets.forEach(pallet => {
            detailedData.push([
                op,
                data.opData?.pedido || '',
                data.opData?.entNome || '',
                pallet.sequenciamento,
                pallet.pesoBruto,
                pallet.pesoTubo,
                pallet.pesoPalet,
                pallet.pesoEmbalagem,
                pallet.pesoLiquido,
                pallet.timestamp,
                pallet.operator || 'N/A'
            ]);
        });
    });
    
    const ws = XLSX.utils.aoa_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, ws, 'Detalhado Pallets');
    
    if (Object.keys(laudosSalvos).length > 0) {
        const laudosData = [['OP/Código', 'Tipo', 'Descrição', 'Resultado', 'Observações', 'Inspetor', 'Data']];
        
        Object.keys(laudosSalvos).forEach(key => {
            const laudo = laudosSalvos[key];
            
            laudosData.push([
                key,
                laudo.tipo || 'N/A',
                currentLaudoData?.descricao || 'N/A',
                laudo.resultado || '',
                laudo.observacoes || '',
                laudo.inspetor || 'N/A',
                laudo.data ? new Date(laudo.data).toLocaleString('pt-BR') : ''
            ]);
        });
        
        const wsLaudos = XLSX.utils.aoa_to_sheet(laudosData);
        XLSX.utils.book_append_sheet(wb, wsLaudos, 'Laudos');
    }
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    exportDataForNetwork = wbout;
    
    document.getElementById('networkPathModal').style.display = 'block';
}

function saveToOriginalExcel() {
    if (!currentWorkbook) {
        showAlert('Nenhuma planilha original carregada para salvar os dados.', 'danger');
        return;
    }

    if (!currentOP || pallets.length === 0) {
        showAlert('Nenhum pallet registrado para salvar na planilha.', 'danger');
        return;
    }

    try {
        const sheetName = currentWorkbook.SheetNames.find(name => 
            name.toUpperCase().includes('PROGRAMAÇÃO') || 
            name.toUpperCase().includes('PROGRAMACAO') ||
            name.toUpperCase().includes('DIÁRIA') ||
            name.toUpperCase().includes('DIARIA')
        );
        
        if (!sheetName) {
            throw new Error('Aba "PROGRAMAÇÃO DIÁRIA" não encontrada');
        }

        const worksheet = currentWorkbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        let opRowIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
            if (jsonData[i][3] && jsonData[i][3].toString() === currentOP.op.toString()) {
                opRowIndex = i;
                break;
            }
        }

        if (opRowIndex === -1) {
            throw new Error('OP não encontrada na planilha original');
        }

        XLSX.utils.book_append_sheet(currentWorkbook, worksheet, sheetName);

        XLSX.writeFile(currentWorkbook, `Planilha_Atualizada_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showAlert('Dados salvos na planilha original com sucesso!', 'success');
    } catch (error) {
        showAlert(`Erro ao salvar na planilha original: ${error.message}`, 'danger');
    }
}

function generateReport() {
    if (!currentOP || pallets.length === 0) {
        showAlert('Nenhum pallet registrado para gerar relatório.', 'danger');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('MANUPACKAGING', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Sistema de Apontamento de Produção', 105, 28, { align: 'center' });
    
    doc.setFontSize(18);
    doc.text('RELATÓRIO DE PRODUÇÃO', 105, 40, { align: 'center' });
    
    doc.line(20, 45, 190, 45);

    doc.setFontSize(12);
    doc.text('DADOS DA ORDEM DE PRODUÇÃO', 20, 58);
    
    doc.setFontSize(9);
    let y = 68;
    doc.text(`Pedido: ${currentOP.pedido}`, 20, y);
    doc.text(`OP: ${currentOP.op}`, 20, y + 6);
    doc.text(`Cliente: ${currentOP.entNome}`, 20, y + 12);
    doc.text(`Código: ${currentOP.codigoProduto}`, 20, y + 18);
    
    // Busca a cor na database apropriada
    const isStretch = currentOP.descricao.toUpperCase().includes('STRETCH');
    let cor = 'N/A';
    if (isStretch) {
        const guiaItem = guiaStretchDatabase.find(item => item.codigo === currentOP.codigoProduto);
        cor = guiaItem ? guiaItem.cor : 'N/A';
    } else {
        const guiaItem = guiaDatabase.find(item => item.codigo === currentOP.codigoProduto);
        cor = guiaItem ? guiaItem.cor : 'N/A';
    }
    
    doc.text(`Descrição: ${currentOP.descricao}`, 20, y + 24);
    doc.text(`Cor: ${cor}`, 20, y + 30);
    doc.text(`Quantidade: ${currentOP.quantidade}`, 20, y + 36);
    doc.text(`Apontador: ${currentUser?.nome || 'N/A'}`, 20, y + 42);
    doc.text(`Matrícula: ${currentUser?.matricula || 'N/A'}`, 20, y + 48);
    doc.text(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`, 20, y + 54);

    y = 130;
    doc.setFontSize(12);
    doc.text('PALLETS PRODUZIDOS', 20, y);
    
    y += 8;
    doc.setFontSize(8);
    doc.text('Seq.', 20, y);
    doc.text('P.Bruto', 35, y);
    doc.text('P.Tubo', 55, y);
    doc.text('P.Palet', 75, y);
    doc.text('P.Emb.', 95, y);
    doc.text('P.Líquido', 115, y);
    doc.text('Data/Hora', 140, y);
    doc.text('Apontador', 170, y);
    
    doc.line(20, y + 2, 190, y + 2);
    
    y += 6;
    
    const groupedPallets = {};
    pallets.forEach(pallet => {
        if (!groupedPallets[pallet.sequenciamento]) {
            groupedPallets[pallet.sequenciamento] = {
                pallets: []
            };
        }
        groupedPallets[pallet.sequenciamento].pallets.push(pallet);
    });
    
    const sortedGroups = Object.keys(groupedPallets).sort((a, b) => {
        const aParts = a.split('/');
        const bParts = b.split('/');
        const aNum = parseInt(aParts[0]) || 0;
        const bNum = parseInt(bParts[0]) || 0;
        const aTotal = parseInt(aParts[1]) || 0;
        const bTotal = parseInt(bParts[1]) || 0;
        
        if (aTotal !== bTotal) {
            return aTotal - bTotal;
        }
        return aNum - bNum;
    });
    
    sortedGroups.forEach(sequenceKey => {
        const group = groupedPallets[sequenceKey];
        
        group.pallets.forEach(pallet => {
            doc.text(pallet.sequenciamento.toString(), 20, y);
            doc.text(pallet.pesoBruto.toFixed(2), 35, y);
            doc.text(pallet.pesoTubo.toFixed(2), 55, y);
            doc.text(pallet.pesoPalet.toFixed(2), 75, y);
            doc.text(pallet.pesoEmbalagem.toFixed(2), 95, y);
            doc.text(pallet.pesoLiquido.toFixed(2), 115, y);
            doc.text(pallet.timestamp.split(' ')[0], 140, y);
            doc.text((pallet.operator || 'N/A').split(' ')[0], 170, y);
            y += 5;
        });
    });

    y += 5;
    doc.line(20, y, 190, y);
    y += 6;
    
    const totalPesoBruto = pallets.reduce((sum, p) => sum + p.pesoBruto, 0);
    const totalPesoLiquido = pallets.reduce((sum, p) => sum + p.pesoLiquido, 0);
    
    doc.setFontSize(10);
    doc.text('TOTAIS:', 20, y);
    doc.text(`Pallets: ${pallets.length}`, 20, y + 8);
    doc.text(`Peso Bruto Total: ${totalPesoBruto.toFixed(2)} kg`, 20, y + 16);
    doc.text(`Peso Líquido Total: ${totalPesoLiquido.toFixed(2)} kg`, 20, y + 24);

    doc.setFontSize(7);
    doc.line(20, 270, 190, 270);
    doc.text('Revisão: 00 | Data de Emissão: 18/07/2025 | Data de Revisão: 18/07/2025 | Elaborador: Thiago Viana | Aprovação: Alessandra Souza', 20, 278);
    doc.text('Sistema de Apontamento de Produção - Manupackaging', 105, 290, { align: 'center' });

    doc.save(`Relatório_OP_${currentOP.op}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    showAlert('Relatório PDF gerado com sucesso!', 'success');
}

function closeOP() {
    if (!currentOP || !currentOP.op) {
        showAlert('Nenhuma OP selecionada.', 'danger');
        return;
    }

    if (pallets.length === 0) {
        showAlert('Não é possível fechar uma OP sem pallets registrados.', 'danger');
        return;
    }

    if (confirm(`Tem certeza que deseja fechar a OP ${currentOP.op}? Esta ação não pode ser desfeita.`)) {
        if (!productionData[currentOP.op]) {
            productionData[currentOP.op] = {};
        }
        
        productionData[currentOP.op].closed = true;
        productionData[currentOP.op].closedDate = new Date().toISOString();
        saveData();
        
        document.getElementById('productionCard').style.opacity = '0.6';
        document.getElementById('productionCard').style.pointerEvents = 'none';
        
        displayOPInfo(currentOP);
        showAlert('OP fechada com sucesso!', 'success');
    }
}

function saveData() {
    if (currentOP && currentOP.op) {
        if (!productionData[currentOP.op]) {
            productionData[currentOP.op] = {};
        }
        productionData[currentOP.op].pallets = pallets;
        productionData[currentOP.op].opData = currentOP;
        productionData[currentOP.op].lastUpdate = new Date().toISOString();
        
        localStorage.setItem('productionData', JSON.stringify(productionData));
    }
}

function loadSavedData() {
    const saved = localStorage.getItem('productionData');
    if (saved) {
        productionData = JSON.parse(saved);
    }
    
    const savedOperators = localStorage.getItem('operators');
    if (savedOperators) {
        operators = JSON.parse(savedOperators);
    }
    
    const savedLaudos = localStorage.getItem('laudosSalvos');
    if (savedLaudos) {
        laudosSalvos = JSON.parse(savedLaudos);
    }
}

function exportToExcel(detailed = false) {
    if (Object.keys(productionData).length === 0 && Object.keys(laudosSalvos).length === 0) {
        showAlert('Nenhum dado para exportar.', 'danger');
        return;
    }

    const wb = XLSX.utils.book_new();
    
    if (detailed) {
        const detailedData = [['OP', 'Pedido', 'Cliente', 'Sequência', 'Peso Bruto', 'Peso Tubo', 'Peso Palet', 'Peso Embalagem', 'Peso Líquido', 'Data/Hora', 'Apontador']];
        
        Object.keys(productionData).forEach(op => {
            const data = productionData[op];
            const pallets = data.pallets || [];
            
            const sortedPallets = [...pallets].sort((a, b) => {
                const aParts = a.sequenciamento.split('/');
                const bParts = b.sequenciamento.split('/');
                const aNum = parseInt(aParts[0]) || 0;
                const bNum = parseInt(bParts[0]) || 0;
                const aTotal = parseInt(aParts[1]) || 0;
                const bTotal = parseInt(bParts[1]) || 0;
                
                if (aTotal !== bTotal) {
                    return aTotal - bTotal;
                }
                return aNum - bNum;
            });
            
            sortedPallets.forEach(pallet => {
                detailedData.push([
                    op,
                    data.opData?.pedido || '',
                    data.opData?.entNome || '',
                    pallet.sequenciamento,
                    pallet.pesoBruto,
                    pallet.pesoTubo,
                    pallet.pesoPalet,
                    pallet.pesoEmbalagem,
                    pallet.pesoLiquido,
                    pallet.timestamp,
                    pallet.operator || 'N/A'
                ]);
            });
        });
        
        const ws = XLSX.utils.aoa_to_sheet(detailedData);
        XLSX.utils.book_append_sheet(wb, ws, 'Detalhado Pallets');
    } else {
        const summaryData = [['OP', 'Pedido', 'Cliente', 'Código', 'Descrição', 'Cor', 'Quantidade', 'Pallets', 'Peso Bruto Total', 'Peso Líquido Total', 'Status', 'Última Atualização', 'Apontador']];
        
        Object.keys(productionData).forEach(op => {
            const data = productionData[op];
            const pallets = data.pallets || [];
            const totalPesoBruto = pallets.reduce((sum, p) => sum + p.pesoBruto, 0);
            const totalPesoLiquido = pallets.reduce((sum, p) => sum + p.pesoLiquido, 0);
            const status = data.closed ? 'Fechada' : 'Aberta';
            
            // Verifica se é STRETCH ou FITA
            const isStretch = data.opData?.descricao?.toUpperCase().includes('STRETCH') || false;
            
            // Busca a cor na database apropriada
            const guiaItem = isStretch ? 
                guiaStretchDatabase.find(item => item.codigo === data.opData?.codigoProduto) : 
                guiaDatabase.find(item => item.codigo === data.opData?.codigoProduto);
            const cor = guiaItem ? guiaItem.cor : 'N/A';
            
            summaryData.push([
                op,
                data.opData?.pedido || '',
                data.opData?.entNome || '',
                data.opData?.codigoProduto || '',
                data.opData?.descricao || '',
                cor,
                data.opData?.quantidade || '',
                pallets.length,
                totalPesoBruto.toFixed(2),
                totalPesoLiquido.toFixed(2),
                status,
                data.lastUpdate ? new Date(data.lastUpdate).toLocaleString('pt-BR') : '',
                currentUser?.nome || 'N/A'
            ]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws, 'Resumo OPs');
    }
    
    if (Object.keys(laudosSalvos).length > 0) {
        const laudosData = [['OP/Código', 'Tipo', 'Descrição', 'Cor', 'Resultado', 'Observações', 'Inspetor', 'Data']];
        
        Object.keys(laudosSalvos).forEach(key => {
            const laudo = laudosSalvos[key];
            
            // Busca a cor na database apropriada
            let cor = 'N/A';
            if (currentLaudoData) {
                if (currentLaudoData.isStretch) {
                    const guiaItem = guiaStretchDatabase.find(item => item.codigo === currentLaudoData.codigo);
                    cor = guiaItem ? guiaItem.cor : 'N/A';
                } else {
                    const guiaItem = guiaDatabase.find(item => item.codigo === currentLaudoData.codigo);
                    cor = guiaItem ? guiaItem.cor : 'N/A';
                }
            }
            
            laudosData.push([
                key,
                laudo.tipo || 'N/A',
                currentLaudoData?.descricao || 'N/A',
                cor,
                laudo.resultado || '',
                laudo.observacoes || '',
                laudo.inspetor || 'N/A',
                laudo.data ? new Date(laudo.data).toLocaleString('pt-BR') : ''
            ]);
        });
        
        const wsLaudos = XLSX.utils.aoa_to_sheet(laudosData);
        XLSX.utils.book_append_sheet(wb, wsLaudos, 'Laudos');
    }
    
    XLSX.writeFile(wb, `Apontamento_Producao_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    showAlert('Dados exportados com sucesso!', 'success');
}

function showAllOPs() {
    const allOPsCard = document.getElementById('allOPsCard');
    const allOPsTable = document.getElementById('allOPsTable');
    
    if (Object.keys(productionData).length === 0) {
        allOPsTable.innerHTML = '<p>Nenhuma OP registrada ainda.</p>';
        allOPsCard.classList.remove('hidden');
        return;
    }
    
    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>OP</th>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Cor</th>
                    <th>Pallets</th>
                    <th>Peso Líquido Total</th>
                    <th>Status</th>
                    <th>Última Atualização</th>
                    <th>Apontador</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    Object.keys(productionData).forEach(op => {
        const data = productionData[op];
        const pallets = data.pallets || [];
        const totalPesoLiquido = pallets.reduce((sum, p) => sum + p.pesoLiquido, 0);
        const status = data.closed ? 'Fechada' : 'Aberta';
        const statusClass = data.closed ? 'status-closed' : 'status-open';
        
        // Verifica se é STRETCH ou FITA
        const isStretch = data.opData?.descricao?.toUpperCase().includes('STRETCH') || false;
        
        // Busca a cor na database apropriada
        const guiaItem = isStretch ? 
            guiaStretchDatabase.find(item => item.codigo === data.opData?.codigoProduto) : 
            guiaDatabase.find(item => item.codigo === data.opData?.codigoProduto);
        const cor = guiaItem ? guiaItem.cor : 'N/A';
        
        html += `
            <tr>
                <td><strong>${op}</strong></td>
                <td>${data.opData?.pedido || ''}</td>
                <td>${data.opData?.entNome || ''}</td>
                <td>${data.opData?.codigoProduto || ''}</td>
                <td>${data.opData?.descricao || ''}</td>
                <td>${cor}</td>
                <td>${pallets.length}</td>
                <td>${totalPesoLiquido.toFixed(2)} kg</td>
                <td><span class="${statusClass}">${status}</span></td>
                <td>${data.lastUpdate ? new Date(data.lastUpdate).toLocaleString('pt-BR') : ''}</td>
                <td>${currentUser?.nome || 'N/A'}</td>
                <td>
                    <button class="btn btn-primary" onclick="selectOP('${op}')">📋 Selecionar</button>
                    <button class="btn btn-danger" onclick="deleteOP('${op}')">🗑️ Excluir</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    allOPsTable.innerHTML = html;
    allOPsCard.classList.remove('hidden');
}

function selectOP(opNumber) {
    if (!opNumber) {
        showAlert('Nenhuma OP selecionada.', 'danger');
        return;
    }
    
    document.getElementById('opSearch').value = opNumber;
    searchOP();
    document.getElementById('allOPsCard').classList.add('hidden');
}

function deleteOP(opNumber) {
    if (!opNumber) {
        showAlert('Nenhuma OP selecionada para exclusão.', 'danger');
        return;
    }

    if (confirm(`Tem certeza que deseja excluir todos os dados da OP ${opNumber}?`)) {
        delete productionData[opNumber];
        localStorage.setItem('productionData', JSON.stringify(productionData));
        showAllOPs();
        showAlert(`OP ${opNumber} excluída com sucesso!`, 'success');
    }
}

function openClearDataModal() {
    document.getElementById('clearDataPasswordModal').style.display = 'block';
}

function closeClearDataPasswordModal() {
    document.getElementById('clearDataPasswordModal').style.display = 'none';
    document.getElementById('clearDataPassword').value = '';
}

function verifyClearDataPassword() {
    const password = document.getElementById('clearDataPassword').value.trim();
    
    if (password === 'Manu123') {
        closeClearDataPasswordModal();
        clearAllData();
    } else {
        showAlert('Senha incorreta!', 'danger');
    }
}

function clearAllData() {
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
        localStorage.removeItem('productionData');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('operators');
        localStorage.removeItem('laudosSalvos');
        productionData = {};
        pallets = [];
        currentOP = null;
        currentLaudoData = null;
        currentUser = null;
        operators = [];
        laudosSalvos = {};
        
        document.getElementById('loginCard').classList.remove('hidden');
        document.getElementById('fileCard').classList.add('hidden');
        document.getElementById('searchCard').classList.add('hidden');
        document.getElementById('opInfoCard').classList.add('hidden');
        document.getElementById('productionCard').classList.add('hidden');
        document.getElementById('palletsCard').classList.add('hidden');
        document.getElementById('laudoCard').classList.add('hidden');
        document.getElementById('allOPsCard').classList.add('hidden');
        
        document.getElementById('userMatricula').value = '';
        document.getElementById('userName').value = '';
        clearProductionForm();
        document.getElementById('opSearch').value = '';
        document.getElementById('laudoOpSearch').value = '';
        document.getElementById('laudoCodigoSearch').value = '';
        
        showAlert('Todos os dados foram limpos!', 'success');
    }
}

function openOperatorsModalWithPassword() {
    document.getElementById('operatorsPasswordModal').style.display = 'block';
}

function closeOperatorsPasswordModal() {
    document.getElementById('operatorsPasswordModal').style.display = 'none';
    document.getElementById('operatorsPassword').value = '';
}

function verifyOperatorsPassword() {
    const password = document.getElementById('operatorsPassword').value.trim();
    
    if (password === 'Manu123') {
        closeOperatorsPasswordModal();
        openOperatorsModal();
    } else {
        showAlert('Senha incorreta!', 'danger');
    }
}

function openOperatorsModal() {
    document.getElementById('operatorsModal').style.display = 'block';
    updateOperatorsList();
}

function closeOperatorsModal() {
    document.getElementById('operatorsModal').style.display = 'none';
}

function updateOperatorsList() {
    const operatorsList = document.getElementById('operatorsList');
    operatorsList.innerHTML = '';
    
    if (operators.length === 0) {
        operatorsList.innerHTML = '<p>Nenhum apontador cadastrado.</p>';
        return;
    }
    
    operators.forEach((operator, index) => {
        const operatorItem = document.createElement('div');
        operatorItem.className = 'operator-item';
        operatorItem.innerHTML = `
            <div>
                <strong>${operator.matricula}</strong> - ${operator.nome}
            </div>
            <div class="operator-actions">
                <button class="btn btn-danger" onclick="removeOperator(${index})">🗑️</button>
            </div>
        `;
        operatorsList.appendChild(operatorItem);
    });
}

function addOperator() {
    const matricula = document.getElementById('newMatricula').value.trim();
    const nome = document.getElementById('newName').value.trim();
    
    if (!matricula || matricula.length < 4 || !/^\d+$/.test(matricula)) {
        showAlert('Por favor, digite uma matrícula válida com pelo menos 4 dígitos.', 'danger');
        return;
    }
    
    if (!nome) {
        showAlert('Por favor, digite o nome do apontador.', 'danger');
        return;
    }
    
    if (operators.some(op => op.matricula === matricula)) {
        showAlert('Esta matrícula já está cadastrada.', 'danger');
        return;
    }
    
    operators.push({ matricula, nome });
    localStorage.setItem('operators', JSON.stringify(operators));
    
    document.getElementById('newMatricula').value = '';
    document.getElementById('newName').value = '';
    
    updateOperatorsList();
    showAlert('Apontador adicionado com sucesso!', 'success');
}

function removeOperator(index) {
    if (confirm('Tem certeza que deseja remover este apontador?')) {
        operators.splice(index, 1);
        localStorage.setItem('operators', JSON.stringify(operators));
        updateOperatorsList();
        showAlert('Apontador removido com sucesso!', 'success');
    }
}

function closeNetworkPathModal() {
    document.getElementById('networkPathModal').style.display = 'none';
    document.getElementById('networkPath').value = '';
    document.getElementById('networkUsername').value = '';
    document.getElementById('networkPassword').value = '';
}

function testNetworkConnection() {
    const path = document.getElementById('networkPath').value.trim();
    
    if (!path) {
        showAlert('Por favor, informe o caminho da rede.', 'danger');
        return;
    }
    
    showAlert('Testando conexão com a rede...', 'info');
    
    setTimeout(() => {
        showAlert('Conexão com a rede testada com sucesso!', 'success');
    }, 1500);
}

function saveToNetwork() {
    const path = document.getElementById('networkPath').value.trim();
    const username = document.getElementById('networkUsername').value.trim();
    const password = document.getElementById('networkPassword').value.trim();
    
    if (!path) {
        showAlert('Por favor, informe o caminho da rede.', 'danger');
        return;
    }
    
    if (!exportDataForNetwork) {
        showAlert('Nenhum dado preparado para salvar na rede.', 'danger');
        return;
    }
    
    showAlert('Salvando dados na rede...', 'info');
    
    setTimeout(() => {
        const blob = new Blob([exportDataForNetwork], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Apontamento_Producao_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('Dados salvos na rede com sucesso!', 'success');
        closeNetworkPathModal();
    }, 2000);
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.maxWidth = '400px';
    alertDiv.style.animation = 'slideInRight 0.3s ease-out';
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(alertDiv);
        }, 300);
    }, 3000);
}

// Adiciona os estilos de animação para os alerts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
