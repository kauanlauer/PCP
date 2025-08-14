// =================================================================================
// SETOR: APONTAMENTO DE PRODUÇÃO (PALLETS)
// =================================================================================
// DESCRIÇÃO: Este arquivo contém a lógica principal do sistema: o gerenciamento
// de pallets. Inclui funções para adicionar, remover, calcular pesos, exibir
// na tabela e fechar a Ordem de Produção.
// =================================================================================

// ---------------------------------------------------------------------------------
// Funções de Carregamento e Estado da Produção
// ---------------------------------------------------------------------------------

/**
 * Carrega os dados de produção (pallets) salvos para uma OP específica.
 * @param {string} opNumber - O número da OP a ser carregada.
 */
function loadOPData(opNumber) {
    if (productionData[opNumber]) {
        pallets = productionData[opNumber].pallets || [];
        updatePalletsTable();

        if (productionData[opNumber].closed) {
            document.getElementById('productionCard').style.opacity = '0.6';
            document.getElementById('productionCard').style.pointerEvents = 'none';
            showAlert('Esta OP está fechada. Não é possível fazer novos apontamentos.', 'info');
        } else {
            document.getElementById('productionCard').style.opacity = '1';
            document.getElementById('productionCard').style.pointerEvents = 'auto';
        }
    } else {
        pallets = [];
        updatePalletsTable();
        document.getElementById('productionCard').style.opacity = '1';
        document.getElementById('productionCard').style.pointerEvents = 'auto';
    }
}

/**
 * Fecha a Ordem de Produção atual, impedindo novos apontamentos.
 */
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

// ---------------------------------------------------------------------------------
// Funções de Gerenciamento de Pallets (CRUD)
// ---------------------------------------------------------------------------------

/**
 * Adiciona um novo pallet à produção da OP atual.
 */
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
    if (pallets.some(p => p.sequenciamento === sequenciamento)) {
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
        pesoLiquido: pesoLiquido < 0 ? 0 : pesoLiquido,
        timestamp: new Date().toLocaleString('pt-BR'),
        operator: currentUser?.nome || 'N/A'
    };

    pallets.push(pallet);
    pallets.sort((a, b) => {
        const aNum = parseInt(a.sequenciamento.split('/')[0], 10);
        const bNum = parseInt(b.sequenciamento.split('/')[0], 10);
        return aNum - bNum;
    });

    updatePalletsTable();
    clearProductionForm();
    saveData();

    showAlert('Pallet adicionado com sucesso!', 'success');
}

/**
 * Remove um pallet da lista.
 * @param {number} palletId - O ID único do pallet a ser removido.
 */
function removePallet(palletId) {
    if (confirm('Tem certeza que deseja remover este pallet?')) {
        pallets = pallets.filter(p => p.id !== palletId);
        // Também remove do banco de dados de QR Codes, se existir.
        if (qrCodeDatabase[palletId]) {
            delete qrCodeDatabase[palletId];
            saveQrCodeDatabase();
        }
        updatePalletsTable();
        saveData();
        showAlert('Pallet removido com sucesso!', 'success');
    }
}

// ---------------------------------------------------------------------------------
// Funções de Interface e Cálculo
// ---------------------------------------------------------------------------------

/**
 * Atualiza a tabela de pallets na interface.
 */
function updatePalletsTable() {
    const palletsTable = document.getElementById('palletsTable');

    if (pallets.length === 0) {
        palletsTable.innerHTML = '<p class="text-center text-muted mt-3">Nenhum pallet registrado ainda.</p>';
        document.getElementById('totalSummary').classList.add('hidden');
        return;
    }

    let html = `
        <table class="table table-striped table-hover">
            <thead class="table-light">
                <tr>
                    <th>Sequência</th>
                    <th>Peso Bruto</th>
                    <th>Peso Líquido</th>
                    <th>Data/Hora</th>
                    <th>Apontador</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    pallets.forEach(pallet => {
        const palletJSON = JSON.stringify(pallet);
        html += `
            <tr>
                <td><strong>${pallet.sequenciamento}</strong></td>
                <td>${pallet.pesoBruto.toFixed(2)} kg</td>
                <td><strong>${pallet.pesoLiquido.toFixed(2)} kg</strong></td>
                <td>${pallet.timestamp}</td>
                <td>${pallet.operator || 'N/A'}</td>
                <td>
                    <!-- MELHORIA: A chamada agora é para handleQRCodeGeneration do qrcode.js -->
                    <button class="btn btn-sm btn-outline-primary" onclick='handleQRCodeGeneration(${palletJSON})' title="Gerar QR Code">
                        <i class="bi bi-qr-code"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="removePallet(${pallet.id})" title="Remover Pallet">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    palletsTable.innerHTML = html;

    updateTotalSummary();
}

/**
 * Atualiza o card de resumo com os totais de peso e quantidade.
 */
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

/**
 * Calcula o peso líquido com base nos valores inseridos no formulário.
 */
function calculatePesoLiquido() {
    const pesoBruto = parseFloat(document.getElementById('pesoBruto').value) || 0;
    const pesoTubo = parseFloat(document.getElementById('pesoTubo').value) || 0;
    const pesoPalet = parseFloat(document.getElementById('pesoPalet').value) || 0;
    const pesoEmbalagem = parseFloat(document.getElementById('pesoEmbalagem').value) || 0;

    let pesoLiquido = pesoBruto - pesoTubo - pesoPalet - pesoEmbalagem;
    pesoLiquido = pesoLiquido < 0 ? 0 : pesoLiquido;
    document.getElementById('pesoLiquido').textContent = `${pesoLiquido.toFixed(2)} kg`;
}

/**
 * Limpa os campos do formulário de apontamento de produção.
 */
function clearProductionForm() {
    document.getElementById('sequenciamento').value = '';
    document.getElementById('pesoBruto').value = '';
    document.getElementById('pesoTubo').value = '';
    document.getElementById('pesoPalet').value = '';
    document.getElementById('pesoEmbalagem').value = '';
    document.getElementById('pesoLiquido').textContent = '0.00 kg';
    document.getElementById('sequenciamento').focus();
}
