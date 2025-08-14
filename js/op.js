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
 * VERSÃO FINAL E DEFINITIVA para ser à prova de falhas.
 */
function searchOP() {
    const opNumber = document.getElementById('opSearch').value.trim();

    if (!opNumber) {
        // Se o campo de busca está vazio, esconde os cards para limpar a tela.
        document.getElementById('opInfoCard').classList.add('hidden');
        document.getElementById('productionCard').classList.add('hidden');
        document.getElementById('palletsCard').classList.add('hidden');
        return;
    }

    // CORREÇÃO DEFINITIVA: A busca agora é à prova de falhas de tipo de dado.
    // Ela compara o valor como texto E também como número, garantindo que
    // qualquer formato vindo do Excel (texto, número, geral, etc.) seja encontrado.
    const opNumberAsNumber = parseInt(opNumber, 10); // Converte a busca para número

    const found = excelData.find(item => {
        // Tentativa 1: Comparar como texto. Ideal para OPs com letras ou zeros à esquerda.
        if (String(item.op).trim() === opNumber) {
            return true;
        }
        // Tentativa 2: Comparar como número. Resolve 99% dos problemas de formatação do Excel.
        if (!isNaN(opNumberAsNumber) && Number(item.op) === opNumberAsNumber) {
            return true;
        }
        return false;
    });


    if (found) {
        // Se encontrou a OP, define como a OP atual.
        currentOP = found;
        
        // Garante que os dados de produção (pallets) sejam carregados ANTES de tentar exibir as informações.
        loadOPData(opNumber); // Função de pallet.js que carrega os pallets salvos.
        
        // Agora, com os dados carregados, exibe as informações na tela.
        displayOPInfo(found);
        
        document.getElementById('opInfoCard').classList.remove('hidden');
        document.getElementById('productionCard').classList.remove('hidden');
        document.getElementById('palletsCard').classList.remove('hidden');
    } else {
        // Se não encontrou, limpa tudo para evitar inconsistências.
        currentOP = null;
        pallets = []; // Limpa a lista de pallets em memória.
        document.getElementById('opInfoCard').classList.add('hidden');
        document.getElementById('productionCard').classList.add('hidden');
        document.getElementById('palletsCard').classList.add('hidden');
    }
}

/**
 * Exibe as informações detalhadas da OP selecionada.
 */
function displayOPInfo(op) {
    if (!op || !op.op) return;

    const opInfo = document.getElementById('opInfo');
    
    // Busca os dados de produção para a OP atual. É crucial que loadOPData já tenha sido chamado.
    const opData = productionData[op.op] || {};
    const status = opData.closed ? 'Fechada' : 'Aberta';
    const statusClass = status === 'Fechada' ? 'status-closed' : 'status-open';

    const isStretch = op.descricao.toUpperCase().includes('STRETCH');
    const guiaItem = isStretch
        ? guiaStretchDatabase.find(item => String(item.codigo).trim() === String(op.codigoProduto).trim())
        : guiaDatabase.find(item => String(item.codigo).trim() === String(op.codigoProduto).trim());
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
        
        if (currentOP && currentOP.op === opNumber) {
            clearCurrentOP();
        }
    }
}
