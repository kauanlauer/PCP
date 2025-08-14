// =================================================================================
// SETOR: GERENCIAMENTO DE LAUDOS DE INSPEÇÃO (VERSÃO COMPLETA)
// =================================================================================
// DESCRIÇÃO: Este arquivo contém a lógica completa para o Laudo de Inspeção Final,
// restaurando todos os campos e a geração de PDF do script original,
// adaptado para funcionar dentro de um modal do Bootstrap.
// =================================================================================

// ---------------------------------------------------------------------------------
// Funções de Busca e Preparação do Laudo
// ---------------------------------------------------------------------------------

/**
 * Busca os dados para o laudo com base no número da OP.
 * Lógica original mantida.
 */
function searchLaudoByOP() {
    const opNumber = document.getElementById('laudoOpSearch').value.trim();
    if (!opNumber) {
        showAlert('Por favor, digite o número da OP.', 'danger');
        return;
    }

    const foundOP = excelData.find(item => item.op.toString() === opNumber);
    if (foundOP) {
        document.getElementById('laudoCodigoSearch').value = foundOP.codigoProduto;
        const isStretch = foundOP.descricao.toUpperCase().includes('STRETCH');
        const guia = isStretch ? guiaStretchDatabase : guiaDatabase;
        const foundInGuia = guia.find(item => item.codigo.toString() === foundOP.codigoProduto.toString());

        if (foundInGuia) {
            prepareLaudoData(foundOP, foundInGuia, isStretch);
        } else {
            showAlert('Código do produto não encontrado na GUIA correspondente.', 'danger');
        }
    } else {
        showAlert('OP não encontrada na planilha de programação.', 'danger');
    }
}

/**
 * Busca os dados para o laudo com base no código do produto.
 * Lógica original mantida.
 */
function searchLaudoByCodigo() {
    const codigo = document.getElementById('laudoCodigoSearch').value.trim();
    if (!codigo) {
        showAlert('Por favor, digite o código do produto.', 'danger');
        return;
    }

    let foundInGuia = guiaDatabase.find(item => item.codigo.toString() === codigo);
    let isStretch = false;
    if (!foundInGuia) {
        foundInGuia = guiaStretchDatabase.find(item => item.codigo.toString() === codigo);
        isStretch = true;
    }

    if (foundInGuia) {
        const opsComEsteCodigo = excelData.filter(item => item.codigoProduto.toString() === codigo);
        prepareLaudoData(opsComEsteCodigo[0] || null, foundInGuia, isStretch, opsComEsteCodigo);
    } else {
        showAlert('Código não encontrado em nenhuma GUIA (DATABASE ou DATABASE_STRETCH).', 'danger');
    }
}

/**
 * Prepara o objeto `currentLaudoData` e atualiza a interface do modal.
 * Lógica original mantida.
 */
function prepareLaudoData(opData, guiaData, isStretch, relatedOPs = []) {
    const laudoKey = opData?.op || guiaData.codigo;
    currentLaudoData = {
        op: opData?.op,
        codigo: opData?.codigoProduto || guiaData.codigo,
        descricao: opData?.descricao || guiaData.descricao,
        isStretch: isStretch,
        guia: guiaData,
        ops: relatedOPs,
        savedData: laudosSalvos[laudoKey] || null
    };

    displayLaudoInfo(currentLaudoData);
    fillLaudoForm(guiaData, isStretch);

    document.getElementById('laudoInfo').classList.remove('hidden');
    document.getElementById('laudoFormCard').classList.remove('hidden');
}

/**
 * Abre a seção de laudo a partir da tela de apontamento de OP.
 * Lógica original mantida.
 */
function openLaudoFromOP() {
    if (!currentOP || !currentOP.op) {
        showAlert('Nenhuma OP selecionada.', 'danger');
        return;
    }
    document.getElementById('laudoOpSearch').value = currentOP.op;
    document.getElementById('laudoCodigoSearch').value = currentOP.codigoProduto;
    searchLaudoByOP();
}

// ---------------------------------------------------------------------------------
// Funções de Interface do Laudo (dentro do Modal)
// ---------------------------------------------------------------------------------

/**
 * Exibe as informações de cabeçalho do laudo.
 * Lógica original mantida.
 */
function displayLaudoInfo(laudoData) {
    const laudoInfo = document.getElementById('laudoInfo');
    const cor = laudoData.guia?.cor || 'N/A';

    let html = `
        <h3>📋 Informações para Laudo</h3>
        <div class="info-item"><strong>Código:</strong> ${laudoData.codigo}</div>
        <div class="info-item"><strong>Descrição:</strong> ${laudoData.descricao}</div>
        <div class="info-item"><strong>Cor:</strong> ${cor}</div>
        <div class="info-item"><strong>Tipo:</strong> ${laudoData.isStretch ? 'STRETCH' : 'FITA'}</div>
    `;
    if (laudoData.op) {
        html += `<div class="info-item"><strong>OP:</strong> ${laudoData.op}</div>`;
    }
    laudoInfo.innerHTML = html;
}

/**
 * Preenche dinamicamente o formulário de inspeção com todos os campos originais.
 */
function fillLaudoForm(guiaData, isStretch) {
    const formBody = document.getElementById('laudoFormBody');
    formBody.innerHTML = '';
    const savedValues = currentLaudoData?.savedData?.valores || {};

    // LISTA DE CAMPOS COMPLETA RESTAURADA DO SCRIPT ORIGINAL
    const campos = isStretch ? [
        { desc: 'LARGURA', un: 'mm', key: 'largura' },
        { desc: 'ESPESSURA', un: 'µm', key: 'espessura' },
        { desc: 'ESTIRAMENTO GARANTIDO', un: '%', key: 'estiramento_garantido' },
        { desc: 'DIAMETRO INTERNO DA BOBINA', un: 'mm', key: 'diametro_interno_bobina' },
        { desc: 'GRAMATURA METRO LINEAR', un: 'g', key: 'gramatura_metro_linear' },
        { desc: 'PESO MÉDIO BOBINA', un: 'kg', key: 'peso_medio_bobina' },
        { desc: 'BOBINAS POR PISO', un: 'un.', key: 'bobinas_por_piso' },
        { desc: 'PESO MÉDIO POR PISO', un: 'kg', key: 'peso_medio_por_piso' },
        { desc: 'METRAGEM MÉDIA BOBINA', un: 'm', key: 'metragem_media_bobina' },
        { desc: 'ALONGAMENTO LONGITUDINAL', un: '%', key: 'alongamento_longitudinal' },
        { desc: 'ALONGAMENTO TRANSVERSAL', un: '%', key: 'alongamento_transversal' },
        { desc: 'RESISTÊNCIA AO IMPACTO', un: 'g', key: 'resistencia_impacto' },
        { desc: 'MDULO ELASTICO', un: 'N/mm2', key: 'modulo_elastico' },
    ] : [
        { desc: 'LARGURA', un: 'mm', key: 'largura' },
        { desc: 'ESPESSURA TOTAL', un: 'µm', key: 'espessura_total' },
        { desc: 'ESPESSURA FILME BOPP', un: 'µm', key: 'espessura_filme_bopp' },
        { desc: 'ADESIVO', un: 'Propriedade', key: 'adesivo' },
        { desc: 'ESPESSURA ADESIVO', un: 'µm', key: 'espessura_adesivo' },
        { desc: 'METRAGEM', un: 'm', key: 'metragem' },
        { desc: 'DIÂMETRO INTERNO DA ARRUELA', un: 'mm', key: 'diametro_interno_arruela' },
        { desc: 'ROLOS POR CAIXA', un: 'un.', key: 'rolos_por_caixa' },
        { desc: 'M2 POR ROLO', un: 'm2', key: 'm2_por_rolo' },
        { desc: 'ALONGAMENTO DE RUPTURA', un: '%', key: 'alongamento_ruptura' },
        { desc: 'ADESÃO AO AÇO', un: 'kgf/25 mm', key: 'adesao_aco' },
        { desc: 'RESISTÊNCIA A TRAÇÃO', un: 'kgf/25 mm', key: 'resistencia_tracao' },
    ];

    campos.forEach(campo => {
        const especificado = guiaData[campo.key] || 'N/A';
        const encontrado = savedValues[campo.key] || especificado;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${campo.desc}</td>
            <td>${campo.un}</td>
            <td>${especificado}</td>
            <td><input type="text" class="form-control form-control-sm" data-key="${campo.key}" value="${encontrado}"></td>
        `;
        formBody.appendChild(row);
    });

    document.getElementById('laudoObservacoes').value = currentLaudoData?.savedData?.observacoes || '';
    const resultadoSalvo = currentLaudoData?.savedData?.resultado;
    if (resultadoSalvo) {
        const radio = document.querySelector(`input[name="resultadoInspecao"][value="${resultadoSalvo}"]`);
        if (radio) radio.checked = true;
    } else {
        document.querySelectorAll('input[name="resultadoInspecao"]').forEach(r => r.checked = false);
    }
}

/**
 * Limpa a seção de laudo para uma nova busca.
 * Lógica original mantida.
 */
function clearLaudo() {
    currentLaudoData = null;
    document.getElementById('laudoOpSearch').value = '';
    document.getElementById('laudoCodigoSearch').value = '';
    document.getElementById('laudoInfo').classList.add('hidden');
    document.getElementById('laudoFormCard').classList.add('hidden');
    document.getElementById('laudoFormBody').innerHTML = '';
    document.getElementById('laudoObservacoes').value = '';
    document.querySelectorAll('input[name="resultadoInspecao"]').forEach(r => r.checked = false);
    showAlert('Laudo limpo. Nova busca liberada.', 'info');
}

// ---------------------------------------------------------------------------------
// Funções de Salvamento e Geração de PDF do Laudo
// ---------------------------------------------------------------------------------

/**
 * Salva os dados do formulário de laudo no localStorage.
 * Lógica original mantida.
 */
function saveLaudo() {
    if (!currentLaudoData) {
        showAlert('Nenhum laudo carregado para salvar.', 'danger');
        return;
    }

    const valores = {};
    document.querySelectorAll('#laudoFormBody input[type="text"]').forEach(input => {
        valores[input.dataset.key] = input.value.trim();
    });

    const dadosLaudo = {
        valores: valores,
        observacoes: document.getElementById('laudoObservacoes').value.trim(),
        resultado: document.querySelector('input[name="resultadoInspecao"]:checked')?.value || '',
        data: new Date().toISOString(),
        inspetor: currentUser?.nome || 'N/A',
        tipo: currentLaudoData.isStretch ? 'STRETCH' : 'FITA'
    };

    const laudoKey = currentLaudoData.op || currentLaudoData.codigo;
    laudosSalvos[laudoKey] = dadosLaudo;
    localStorage.setItem('laudosSalvos', JSON.stringify(laudosSalvos));
    showAlert('Laudo salvo com sucesso!', 'success');
    currentLaudoData.savedData = dadosLaudo;
}

/**
 * Gera o PDF do Laudo de Inspeção Final, com a mesma estrutura do original.
 */
function generateLaudoPDF() {
    if (!currentLaudoData) {
        showAlert('Nenhum laudo carregado para gerar.', 'danger');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const logoUrl = 'https://fitaspersonalizadas.manupackaging.com.br/wp-content/uploads/2023/09/logo-manupackaging-1.svg';

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        
        completeLaudoPDF(doc, dataURL); // Chama a função que constrói o PDF
        
        const fileName = `Laudo_${currentLaudoData.op || currentLaudoData.codigo}.pdf`;
        doc.save(fileName);
        showAlert('Laudo PDF gerado com sucesso!', 'success');
    };
    img.onerror = function() {
        console.error('Erro ao carregar a logo. Gerando PDF sem a imagem.');
        completeLaudoPDF(doc, null);
        const fileName = `Laudo_${currentLaudoData.op || currentLaudoData.codigo}.pdf`;
        doc.save(fileName);
        showAlert('Laudo PDF gerado com sucesso (sem logo)!', 'success');
    };
    img.src = logoUrl;
}

/**
 * Preenche o conteúdo do documento PDF do laudo, restaurando toda a formatação original.
 * @param {jsPDF} doc - A instância do documento jsPDF.
 * @param {string|null} logoDataUrl - A URL de dados da imagem da logo.
 */
function completeLaudoPDF(doc, logoDataUrl) {
    // Cabeçalho - LÓGICA ORIGINAL RESTAURADA
    if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 15, 10, 30, 30);
    }
    const formCode = currentLaudoData.isStretch ? 'FMQ 022' : 'FMQ 021';
    doc.setFontSize(20);
    doc.text(formCode, 190, 15, { align: 'right' });
    doc.setFontSize(16);
    doc.text('MANUPACKAGING', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('LAUDO DE INSPEÇÃO FINAL', 105, 28, { align: 'center' });

    // Informações do Produto - LÓGICA ORIGINAL RESTAURADA
    doc.setFontSize(10);
    let y = 45;
    doc.text(`Código: ${currentLaudoData.codigo}`, 20, y);
    doc.text(`Descrição: ${currentLaudoData.descricao}`, 20, y += 6);
    doc.text(`Cor: ${currentLaudoData.guia.cor}`, 20, y += 6);
    doc.text(`Tipo: ${currentLaudoData.isStretch ? 'STRETCH 100% PEBDL' : 'FITA'}`, 20, y += 6);
    if (currentLaudoData.op) {
        doc.text(`OP: ${currentLaudoData.op}`, 20, y += 6);
    }
    doc.text(`Data de fabricação / Análise: ${new Date().toLocaleDateString('pt-BR')}`, 20, y += 6);

    // Tabela de Especificações - LÓGICA ORIGINAL RESTAURADA
    y += 12;
    doc.setFontSize(12);
    doc.text('ESPECIFICAÇÕES TÉCNICAS', 20, y);
    y += 8;
    doc.setFontSize(8);
    doc.text('DESCRIÇÃO', 20, y);
    doc.text('UNIDADE', 80, y);
    doc.text('ESPECIFICADO', 110, y);
    doc.text('ENCONTRADO', 160, y);
    y += 6;

    document.querySelectorAll('#laudoFormBody tr').forEach(row => {
        const cells = row.cells;
        const descricao = cells[0].textContent;
        const unidade = cells[1].textContent;
        const especificado = cells[2].textContent;
        const encontrado = cells[3].querySelector('input').value;

        doc.text(descricao, 20, y, { maxWidth: 60 });
        doc.text(unidade, 80, y);
        doc.text(especificado, 110, y);
        doc.text(encontrado, 160, y);
        y += 6;
    });

    // Rodapé e Informações Adicionais - LÓGICA ORIGINAL RESTAURADA
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
    
    const resultado = document.querySelector('input[name="resultadoInspecao"]:checked')?.value || 'Não preenchido';
    doc.setFontSize(12);
    doc.text(`RESULTADO: ${resultado.toUpperCase()}`, 20, y);
    
    y = 280;
    doc.setFontSize(8);
    doc.text('Revisão: 006 | Data emissão: 23/03/2015 | Data revisão: 30/07/2025 | Elaborador: Thiago Viana | Aprovação: Camille Grebogy | Pg: 01 de 01', 20, y);
    doc.text('Sistema de Apontamento de Produção - Manupackaging', 105, 290, { align: 'center' });
}
