// =================================================================================
// SETOR: PERSISTÊNCIA E EXPORTAÇÃO DE DADOS
// =================================================================================
// DESCRIÇÃO: Este arquivo lida com o armazenamento, recuperação e exclusão de
// dados da aplicação, utilizando o localStorage do navegador. Também contém
// toda a lógica para exportar os dados para diferentes formatos (Excel, PDF).
// =================================================================================

// ---------------------------------------------------------------------------------
// Funções de Persistência de Dados (localStorage)
// ---------------------------------------------------------------------------------

/**
 * Salva os dados da produção atual no localStorage.
 * Associa os pallets e os dados da OP ao número da OP.
 */
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

/**
 * Carrega todos os dados salvos do localStorage ao iniciar a aplicação.
 */
function loadSavedData() {
    const savedProd = localStorage.getItem('productionData');
    if (savedProd) {
        productionData = JSON.parse(savedProd);
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

/**
 * Limpa todos os dados da aplicação do localStorage e reseta as variáveis globais.
 */
function clearAllData() {
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
        // Remove os dados do localStorage
        localStorage.removeItem('productionData');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('operators');
        localStorage.removeItem('laudosSalvos');

        // Reseta as variáveis globais
        productionData = {};
        pallets = [];
        currentOP = null;
        currentLaudoData = null;
        currentUser = null;
        operators = [];
        laudosSalvos = {};

        // Reseta a interface para o estado inicial
        document.getElementById('loginCard').classList.remove('hidden');
        document.getElementById('fileCard').classList.add('hidden');
        document.getElementById('searchCard').classList.add('hidden');
        document.getElementById('opInfoCard').classList.add('hidden');
        document.getElementById('productionCard').classList.add('hidden');
        document.getElementById('palletsCard').classList.add('hidden');
        document.getElementById('laudoCard').classList.add('hidden');
        document.getElementById('allOPsCard').classList.add('hidden');

        // Limpa os campos dos formulários
        document.getElementById('userMatricula').value = '';
        document.getElementById('userName').value = '';
        clearProductionForm(); // Função de pallet.js
        document.getElementById('opSearch').value = '';
        document.getElementById('laudoOpSearch').value = '';
        document.getElementById('laudoCodigoSearch').value = '';

        showAlert('Todos os dados foram limpos!', 'success');
    }
}


// ---------------------------------------------------------------------------------
// Funções de Exportação de Dados
// ---------------------------------------------------------------------------------

/**
 * Direciona a exportação para a função correta com base na seleção do usuário.
 */
function generateExport() {
    const exportType = document.getElementById('exportType').value;

    switch (exportType) {
        case 'pdf':
            generateReport();
            break;
        case 'laudo':
            if (currentLaudoData) {
                generateLaudoPDF(); // Função de laudo.js
            } else {
                showAlert('Nenhum laudo selecionado para exportar.', 'danger');
            }
            break;
        case 'excel':
            exportToExcel(false);
            break;
        case 'excelDetailed':
            exportToExcel(true);
            break;
        case 'saveToExcel':
            saveToOriginalExcel();
            break;
        case 'saveToNetwork':
            prepareForNetworkSave();
            break;
    }
}

/**
 * Exporta os dados de produção para uma planilha Excel.
 * @param {boolean} detailed - Se true, exporta dados detalhados por pallet. Se false, exporta um resumo por OP.
 */
function exportToExcel(detailed = false) {
    if (Object.keys(productionData).length === 0 && Object.keys(laudosSalvos).length === 0) {
        showAlert('Nenhum dado para exportar.', 'danger');
        return;
    }

    const wb = XLSX.utils.book_new();

    // Aba de Produção
    if (Object.keys(productionData).length > 0) {
        if (detailed) {
            const detailedData = [['OP', 'Pedido', 'Cliente', 'Sequência', 'Peso Bruto', 'Peso Tubo', 'Peso Palet', 'Peso Embalagem', 'Peso Líquido', 'Data/Hora', 'Apontador']];
            Object.keys(productionData).forEach(op => {
                const data = productionData[op];
                const pallets = data.pallets || [];
                pallets.forEach(pallet => {
                    detailedData.push([
                        op, data.opData?.pedido || '', data.opData?.entNome || '',
                        pallet.sequenciamento, pallet.pesoBruto, pallet.pesoTubo,
                        pallet.pesoPalet, pallet.pesoEmbalagem, pallet.pesoLiquido,
                        pallet.timestamp, pallet.operator || 'N/A'
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
                const isStretch = data.opData?.descricao?.toUpperCase().includes('STRETCH') || false;
                const guiaItem = isStretch ? guiaStretchDatabase.find(item => item.codigo === data.opData?.codigoProduto) : guiaDatabase.find(item => item.codigo === data.opData?.codigoProduto);
                summaryData.push([
                    op, data.opData?.pedido || '', data.opData?.entNome || '',
                    data.opData?.codigoProduto || '', data.opData?.descricao || '',
                    guiaItem ? guiaItem.cor : 'N/A', data.opData?.quantidade || '',
                    pallets.length, totalPesoBruto.toFixed(2), totalPesoLiquido.toFixed(2),
                    data.closed ? 'Fechada' : 'Aberta',
                    data.lastUpdate ? new Date(data.lastUpdate).toLocaleString('pt-BR') : '',
                    currentUser?.nome || 'N/A'
                ]);
            });
            const ws = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, ws, 'Resumo OPs');
        }
    }

    // Aba de Laudos
    if (Object.keys(laudosSalvos).length > 0) {
        const laudosData = [['OP/Código', 'Tipo', 'Descrição', 'Cor', 'Resultado', 'Observações', 'Inspetor', 'Data']];
        Object.keys(laudosSalvos).forEach(key => {
            const laudo = laudosSalvos[key];
            let cor = 'N/A', descricao = 'N/A';
            const opInfo = productionData[key]?.opData || excelData.find(item => item.op === key);
            if(opInfo) {
                 const isStretch = opInfo.descricao.toUpperCase().includes('STRETCH');
                 const guia = isStretch ? guiaStretchDatabase.find(g => g.codigo === opInfo.codigoProduto) : guiaDatabase.find(g => g.codigo === opInfo.codigoProduto);
                 cor = guia?.cor || 'N/A';
                 descricao = opInfo.descricao;
            }
            laudosData.push([
                key, laudo.tipo || 'N/A', descricao, cor,
                laudo.resultado || '', laudo.observacoes || '',
                laudo.inspetor || 'N/A', laudo.data ? new Date(laudo.data).toLocaleString('pt-BR') : ''
            ]);
        });
        const wsLaudos = XLSX.utils.aoa_to_sheet(laudosData);
        XLSX.utils.book_append_sheet(wb, wsLaudos, 'Laudos');
    }

    XLSX.writeFile(wb, `Apontamento_Producao_${new Date().toISOString().split('T')[0]}.xlsx`);
    showAlert('Dados exportados com sucesso!', 'success');
}

/**
 * Gera um relatório em PDF para a OP atualmente selecionada.
 */
function generateReport() {
    if (!currentOP || pallets.length === 0) {
        showAlert('Nenhum pallet registrado para gerar relatório.', 'danger');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Cabeçalho
    doc.setFontSize(16);
    doc.text('MANUPACKAGING', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Sistema de Apontamento de Produção', 105, 28, { align: 'center' });
    doc.setFontSize(18);
    doc.text('RELATÓRIO DE PRODUÇÃO', 105, 40, { align: 'center' });
    doc.line(20, 45, 190, 45);

    // Informações da OP
    doc.setFontSize(12);
    doc.text('DADOS DA ORDEM DE PRODUÇÃO', 20, 58);
    doc.setFontSize(9);
    let y = 68;
    const isStretch = currentOP.descricao.toUpperCase().includes('STRETCH');
    const guiaItem = isStretch ? guiaStretchDatabase.find(item => item.codigo === currentOP.codigoProduto) : guiaDatabase.find(item => item.codigo === currentOP.codigoProduto);
    doc.text(`Pedido: ${currentOP.pedido}`, 20, y);
    doc.text(`OP: ${currentOP.op}`, 20, y += 6);
    doc.text(`Cliente: ${currentOP.entNome}`, 20, y += 6);
    doc.text(`Código: ${currentOP.codigoProduto}`, 20, y += 6);
    doc.text(`Descrição: ${currentOP.descricao}`, 20, y += 6);
    doc.text(`Cor: ${guiaItem ? guiaItem.cor : 'N/A'}`, 20, y += 6);
    doc.text(`Quantidade: ${currentOP.quantidade}`, 20, y += 6);
    doc.text(`Apontador: ${currentUser?.nome || 'N/A'}`, 20, y += 6);
    doc.text(`Matrícula: ${currentUser?.matricula || 'N/A'}`, 20, y += 6);
    doc.text(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`, 20, y += 6);

    // Tabela de Pallets
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

    pallets.forEach(pallet => {
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

    // Totais
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

    // Rodapé
    doc.setFontSize(7);
    doc.line(20, 270, 190, 270);
    doc.text('Revisão: 00 | Data de Emissão: 18/07/2025 | Data de Revisão: 18/07/2025 | Elaborador: Thiago Viana | Aprovação: Alessandra Souza', 20, 278);
    doc.text('Sistema de Apontamento de Produção - Manupackaging', 105, 290, { align: 'center' });

    doc.save(`Relatório_OP_${currentOP.op}_${new Date().toISOString().split('T')[0]}.pdf`);
    showAlert('Relatório PDF gerado com sucesso!', 'success');
}


// ---------------------------------------------------------------------------------
// Funções de Salvamento em Rede (Simulação)
// ---------------------------------------------------------------------------------

/**
 * Prepara os dados para serem salvos na rede (gera o buffer do arquivo Excel).
 */
function prepareForNetworkSave() {
    if (Object.keys(productionData).length === 0) {
        showAlert('Nenhum dado para exportar.', 'danger');
        return;
    }

    const wb = XLSX.utils.book_new();
    const detailedData = [['OP', 'Pedido', 'Cliente', 'Sequência', 'Peso Bruto', 'Peso Tubo', 'Peso Palet', 'Peso Embalagem', 'Peso Líquido', 'Data/Hora', 'Apontador']];
    
    Object.keys(productionData).forEach(op => {
        const data = productionData[op];
        (data.pallets || []).forEach(pallet => {
            detailedData.push([
                op, data.opData?.pedido || '', data.opData?.entNome || '',
                pallet.sequenciamento, pallet.pesoBruto, pallet.pesoTubo,
                pallet.pesoPalet, pallet.pesoEmbalagem, pallet.pesoLiquido,
                pallet.timestamp, pallet.operator || 'N/A'
            ]);
        });
    });
    
    const ws = XLSX.utils.aoa_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, ws, 'Detalhado Pallets');
    
    // Converte o workbook para um formato que pode ser salvo
    exportDataForNetwork = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Abre o modal para o usuário inserir o caminho da rede
    document.getElementById('networkPathModal').style.display = 'block';
}

/**
 * Simula um teste de conexão com um caminho de rede.
 */
function testNetworkConnection() {
    const path = document.getElementById('networkPath').value.trim();
    if (!path) {
        showAlert('Por favor, informe o caminho da rede.', 'danger');
        return;
    }
    showAlert('Testando conexão com a rede...', 'info');
    // Simulação de uma verificação de rede
    setTimeout(() => {
        showAlert('Conexão com a rede testada com sucesso! (Simulação)', 'success');
    }, 1500);
}

/**
 * Simula o salvamento do arquivo em um caminho de rede, na prática, força o download.
 */
function saveToNetwork() {
    const path = document.getElementById('networkPath').value.trim();
    if (!path) {
        showAlert('Por favor, informe o caminho da rede.', 'danger');
        return;
    }
    if (!exportDataForNetwork) {
        showAlert('Nenhum dado preparado para salvar na rede.', 'danger');
        return;
    }
    
    showAlert('Salvando dados na rede... (Iniciando download)', 'info');
    
    // A funcionalidade de salvar diretamente em um caminho de rede é restrita
    // por segurança nos navegadores. A abordagem padrão é forçar o download.
    setTimeout(() => {
        const blob = new Blob([exportDataForNetwork], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        // Extrai o nome do arquivo do caminho para o download
        const fileName = path.split('\\').pop().split('/').pop() || `Apontamento_Producao_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.download = fileName;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('Arquivo pronto para ser salvo!', 'success');
        closeNetworkPathModal();
    }, 1000);
}

/**
 * Salva os dados de produção na planilha original que foi carregada.
 * (Funcionalidade complexa e pode não funcionar como esperado sem um backend)
 */
function saveToOriginalExcel() {
    if (!currentWorkbook) {
        showAlert('Nenhuma planilha original carregada para salvar os dados.', 'danger');
        return;
    }
    showAlert('Funcionalidade "Salvar na Planilha Original" ainda em desenvolvimento.', 'info');
    // A lógica para encontrar a linha correta e atualizar as células é complexa
    // e foi omitida nesta refatoração para simplificar. A abordagem recomendada
    // é exportar um novo arquivo com os dados atualizados.
}
