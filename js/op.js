// =================================================================================
// SETOR: GERENCIAMENTO DA ORDEM DE PRODUÇÃO (OP)
// =================================================================================
// DESCRIÇÃO: Este arquivo contém as funções para buscar, exibir, listar e
// gerenciar as Ordens de Produção (OPs).
// =================================================================================

// ---------------------------------------------------------------------------------
// Funções de Busca e Exibição de OP
// ---------------------------------------------------------------------------------

/**
 * Busca uma OP na planilha de programação carregada.
 * Esta função agora é chamada automaticamente quando o usuário digita no campo de busca.
 */
function searchOP() {
    const opNumber = document.getElementById('opSearch').value.trim();

    // MELHORIA: Se o campo de busca estiver vazio, esconde os cards de resultado
    // para não poluir a tela, mas não limpa a OP que já está selecionada.
    if (!opNumber) {
        document.getElementById('opInfoCard').classList.add('hidden');
        document.getElementById('productionCard').classList.add('hidden');
        document.getElementById('palletsCard').classList.add('hidden');
        return;
    }

    const found = excelData.find(item => item.op.toString() === opNumber);

    if (found) {
        // Evita recarregar tudo se a mesma OP já estiver na tela.
        if (currentOP && currentOP.op === found.op) {
            return;
        }
        currentOP = found;
        displayOPInfo(found);
        loadOPData(opNumber); // Função de pallet.js
        document.getElementById('opInfoCard').classList.remove('hidden');
        document.getElementById('productionCard').classList.remove('hidden');
        document.getElementById('palletsCard').classList.remove('hidden');
    } else {
        // Se não encontrar, esconde os cards.
        document.getElementById('opInfoCard').classList.add('hidden');
        document.getElementById('productionCard').classList.add('hidden');
        document.getElementById('palletsCard').classList.add('hidden');
    }
}

/**
 * Exibe as informações detalhadas da OP selecionada.
 * Lógica original mantida.
 * @param {object} op - O objeto da Ordem de Produção.
 */
function displayOPInfo(op) {
    if (!op || !op.op) return;

    const opInfo = document.getElementById('opInfo');
    const opData = productionData[op.op] || {};
    const status = opData.closed ? 'Fechada' : 'Aberta';
    const statusClass = status === 'Fechada' ? 'status-closed' : 'status-open';

    const isStretch = op.descricao.toUpperCase().includes('STRETCH');
    const guiaItem = isStretch
        ? guiaStretchDatabase.find(item => item.codigo === op.codigoProduto)
        : guiaDatabase.find(item => item.codigo === op.codigoProduto);
    const cor = guiaItem ? guiaItem.cor : 'N/A';

    opInfo.innerHTML = `
        <h3 class="card-title h5"><i class="bi bi-card-list me-2"></i>Detalhes da Ordem de Produção</h3>
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

/**
 * Limpa a OP atual e reseta a interface para uma nova busca.
 * Lógica original mantida.
 */
function clearCurrentOP() {
    currentOP = null;
    pallets = [];

    document.getElementById('opSearch').value = '';
    document.getElementById('opInfoCard').classList.add('hidden');
    document.getElementById('productionCard').classList.add('hidden');
    document.getElementById('palletsCard').classList.add('hidden');

    clearProductionForm(); // Função de pallet.js
    showAlert('Dados limpos. Nova busca liberada.', 'info');
}

// ---------------------------------------------------------------------------------
// Funções de Listagem e Gerenciamento de Múltiplas OPs
// ---------------------------------------------------------------------------------

/**
 * Exibe uma tabela com todas as OPs que possuem dados de produção salvos.
 * Lógica original mantida.
 */
function showAllOPs() {
    const allOPsCard = document.getElementById('allOPsCard');
    const allOPsTable = document.getElementById('allOPsTable');

    if (Object.keys(productionData).length === 0) {
        allOPsTable.innerHTML = '<p class="text-center text-muted mt-3">Nenhuma OP com apontamentos salvos.</p>';
        allOPsCard.classList.remove('hidden');
        return;
    }

    let html = `
        <table class="table table-hover">
            <thead class="table-light">
                <tr>
                    <th>OP</th>
                    <th>Cliente</th>
                    <th>Descrição</th>
                    <th>Pallets</th>
                    <th>Peso Líquido</th>
                    <th>Status</th>
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

        html += `
            <tr>
                <td><strong>${op}</strong></td>
                <td>${data.opData?.entNome || ''}</td>
                <td>${data.opData?.descricao || ''}</td>
                <td>${pallets.length}</td>
                <td>${totalPesoLiquido.toFixed(2)} kg</td>
                <td><span class="${statusClass}">${status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="selectOP('${op}')" title="Selecionar OP"><i class="bi bi-check-circle"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteOP('${op}')" title="Excluir Dados da OP"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    allOPsTable.innerHTML = html;
    allOPsCard.classList.remove('hidden');
}

/**
 * Seleciona uma OP a partir da lista de "Todas as OPs".
 * Lógica original mantida.
 * @param {string} opNumber - O número da OP a ser selecionada.
 */
function selectOP(opNumber) {
    if (!opNumber) {
        showAlert('Nenhuma OP selecionada.', 'danger');
        return;
    }

    document.getElementById('opSearch').value = opNumber;
    searchOP();
    document.getElementById('allOPsCard').classList.add('hidden');
}

/**
 * Exclui todos os dados de produção de uma OP específica.
 * Lógica original mantida.
 * @param {string} opNumber - O número da OP a ser excluída.
 */
function deleteOP(opNumber) {
    if (!opNumber) {
        showAlert('Nenhuma OP selecionada para exclusão.', 'danger');
        return;
    }

    if (confirm(`Tem certeza que deseja excluir todos os dados da OP ${opNumber}? Esta ação é irreversível.`)) {
        delete productionData[opNumber];
        localStorage.setItem('productionData', JSON.stringify(productionData));
        showAllOPs();
        showAlert(`OP ${opNumber} excluída com sucesso!`, 'success');
        
        // Se a OP excluída era a que estava na tela, limpa a tela.
        if (currentOP && currentOP.op === opNumber) {
            clearCurrentOP();
        }
    }
}
