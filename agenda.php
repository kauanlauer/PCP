<?php
// puxa o config.php pra conectar no bd
require_once 'config.php';
$db = conectarDB();

// essa parte aqui é tipo uma api, o javascript chama essas merd aqui de baixo
if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    
    // aqui busca o historico do vendedor, pra mostrar ali do lado
    if ($_GET['action'] == 'get_historico' && isset($_GET['vendedorId'])) {
        $vendedorId = filter_var($_GET['vendedorId'], FILTER_SANITIZE_STRING);
        $stmt = $db->prepare("SELECT token, data_agendamento, hora_agendamento, nome_cliente, status, motivo_recusa FROM agendamentos WHERE id_vendedora = :id_vendedora ORDER BY id DESC LIMIT 10");
        $stmt->execute([':id_vendedora' => $vendedorId]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }
    
    // aqui é quando o vendedora clica pra agendar de verdade
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] == 'agendar') {
        $dados = json_decode(file_get_contents('php://input'), true);
        if (!isset($dados['data'], $dados['hora'], $dados['idVendedora'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Dados incompletos.']);
            exit;
        }
        // ve se alguem ja nao pego esse horario
        $stmtCheck = $db->prepare("SELECT COUNT(*) FROM agendamentos WHERE data_agendamento = :data AND hora_agendamento = :hora AND status != 'Recusado'");
        $stmtCheck->execute([':data' => $dados['data'], ':hora' => $dados['hora']]);
        if ($stmtCheck->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'Este horário já foi agendado. Por favor, atualize a página.']);
            exit;
        }
        // cria o token novo, aquele RETIRA-LOG mais um numero
        $stmt = $db->prepare("SELECT COUNT(*) FROM agendamentos");
        $stmt->execute();
        $token = 'RETIRA-LOG' . str_pad($stmt->fetchColumn() + 1, 4, '0', STR_PAD_LEFT);
        // finalmente, joga tudo no banco de dados agenda.db
        $stmtInsert = $db->prepare("INSERT INTO agendamentos (token, id_vendedora, nome_vendedora, data_agendamento, hora_agendamento, nf_cliente, nome_cliente, observacao) VALUES (:token, :id_vendedora, :nome_vendedora, :data, :hora, :nf_cliente, :nome_cliente, :observacao)");
        $stmtInsert->execute([':token' => $token, ':id_vendedora' => $dados['idVendedora'], ':nome_vendedora' => $dados['nomeVendedora'], ':data' => $dados['data'], ':hora' => $dados['hora'], ':nf_cliente' => $dados['nfCliente'], ':nome_cliente' => $dados['nomeCliente'], ':observacao' => $dados['observacao'] ?? '']);
        echo json_encode(['status' => 'success', 'message' => 'Solicitação de agendamento enviada com sucesso!']);
        exit;
    }
}

// --- AQUI COMEÇA A LOGICA DAS DATAS E BLOQUEIOS ---
// busca la na logistica se eles liberaram o mes ou a semana
$stmtConfig = $db->query("SELECT config_key, config_value FROM configuracoes");
$configuracoes = $stmtConfig->fetchAll(PDO::FETCH_KEY_PAIR);
$modoLiberacao = $configuracoes['modo_liberacao'] ?? 'nenhum';
$periodoLiberado = $configuracoes['periodo_liberado'] ?? '';

// pega todos os horarios que ja tao ocupado pra nao mostrar
$stmtOcupados = $db->query("SELECT data_agendamento, hora_agendamento FROM agendamentos WHERE status != 'Recusado'");
$horariosOcupados = [];
foreach ($stmtOcupados->fetchAll(PDO::FETCH_ASSOC) as $ag) {
    $horariosOcupados[$ag['data_agendamento']][$ag['hora_agendamento']] = true;
}

// arrumei os horario aqui, de meia em meia hora ate as 11
$horariosDisponiveis = [];
$inicio = new DateTime('08:00');
$fim = new DateTime('11:01'); // botei 11:01 pra ele incluir o das 11:00 na lista
$periodo = new DatePeriod($inicio, new DateInterval('PT30M'), $fim);
foreach ($periodo as $hora) $horariosDisponiveis[] = $hora->format('H:i');

// essa parte é pra montar o calendario, mes, ano, essas coisas
$mesAtual = $_GET['mes'] ?? date('m');
$anoAtual = $_GET['ano'] ?? date('Y');
$dataBase = new DateTime("$anoAtual-$mesAtual-01");
$linkMesAnterior = 'agenda.php?mes=' . (clone $dataBase)->modify('-1 month')->format('m') . '&ano=' . (clone $dataBase)->modify('-1 month')->format('Y');
$linkMesSeguinte = 'agenda.php?mes=' . (clone $dataBase)->modify('+1 month')->format('m') . '&ano=' . (clone $dataBase)->modify('+1 month')->format('Y');
$diasNoMes = $dataBase->format('t');
$diaDaSemanaPrimeiroDia = $dataBase->format('w');
$meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
$diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agendar Retirada - CRM Manupackaging</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --cor-primaria-crm: #3498db; --cor-verde-crm: #92c153; --cor-sidebar-crm: #2A3F54; --cor-background-crm: #F7F7F7;
            --cor-texto-sidebar: #E7E7E7; --cor-hover-sidebar: #34495E; --cor-borda-caixa: #d2d6de; --cor-bloqueado: #e74c3c;
        }
        body { font-family: 'Source Sans Pro', sans-serif; background-color: var(--cor-background-crm); }
        .wrapper { display: flex; min-height: 100vh; }
        .main-sidebar { width: 230px; background-color: var(--cor-sidebar-crm); flex-shrink: 0; display: flex; flex-direction: column; }
        .main-header { background-color: var(--cor-primaria-crm); }
        .content-wrapper { flex-grow: 1; display: flex; flex-direction: column; }
        .content { padding: 20px; }
        .sidebar-menu { list-style: none; padding: 0; margin: 0; }
        .sidebar-menu .list-header { padding: 10px 15px; font-weight: 600; color: #8aa4af; background-color: #263849; font-size: 0.8rem; text-transform: uppercase; }
        .sidebar-menu li a { display: flex; align-items: center; padding: 12px 15px; color: var(--cor-texto-sidebar); text-decoration: none; transition: background-color 0.2s, color 0.2s; font-weight: 600; }
        .sidebar-menu li a:hover { background-color: var(--cor-hover-sidebar); color: #fff; }
        .sidebar-menu li a i { width: 25px; margin-right: 10px; text-align: center; font-size: 1.1em; }
        .calendar-day { display: flex; align-items: center; justify-content: center; aspect-ratio: 1 / 1; border-radius: 4px; font-size: 0.875rem; font-weight: 600; transition: all 0.2s ease-in-out; position: relative; }
        .calendar-day.clickable { cursor: pointer; }
        .calendar-day.clickable:hover { background-color: #e7f5ff; color: var(--cor-primaria-crm); }
        .calendar-day.disabled { color: #b0b0b0; background-color: #f0f0f0; cursor: not-allowed; text-decoration: line-through; }
        .calendar-day.today { background-color: #e0e0e0; color: #333; }
        .calendar-day.selected { background-color: var(--cor-primaria-crm); color: white; transform: scale(1.05); }
        .box { background: #fff; border-radius: 3px; border: 1px solid #ccc; box-shadow: 0 1px 1px rgba(0,0,0,0.05); }
        .box-header { color: #444; padding: 10px 15px; border-bottom: 1px solid #f4f4f4; background-color: #f9f9f9; }
        .box-title { font-size: 18px; margin: 0; font-weight: 600; }
        .box-body { padding: 15px; }
        .btn-crm { font-weight: bold; border-radius: 4px; padding: 8px 16px; color: white; transition: opacity 0.2s; border: none; }
        .btn-crm:hover { opacity: 0.9; }
        .btn-crm-verde { background-color: var(--cor-verde-crm); }
        .btn-crm-azul { background-color: var(--cor-primaria-crm); }
        .btn-crm-cinza { background-color: #777; }
    </style>
</head>
<body>

<div class="wrapper">
    <aside class="main-sidebar">
        <div>
            <div class="h-12 flex items-center justify-center text-white text-xl font-bold" style="background-color: #263849;">CRM Manuli</div>
            <ul class="sidebar-menu">
                <li class="list-header">Menu</li>
                <li><a href="https://crm.manupackaging.com.br/Home.aspx?indmnu=1"><i class="fa fa-home"></i><span><strong>Home</strong></span></a></li>
            </ul>
        </div>
        <div class="flex flex-col flex-grow min-h-0">
            <div class="list-header border-t border-gray-700">Seu ID / Histórico</div>
            <div class="p-3 text-center bg-gray-800">
                <span class="text-xs text-gray-400">Seu ID de Vendedor(a):</span>
                <p id="idVendedoraDisplay" class="font-mono text-white break-all"></p>
            </div>
            <div id="conteudoHistorico" class="flex-grow p-2 space-y-2 overflow-y-auto">
                <p class="text-center text-sm p-4 text-gray-400">Carregando histórico...</p>
            </div>
        </div>
    </aside>

    <div class="content-wrapper">
        <header class="main-header h-12 flex items-center justify-between px-4"><i class="fas fa-bars text-lg text-white"></i></header>
        <main class="content flex-grow">
            <h1 class="text-2xl font-semibold text-gray-600 mb-5">Agendar Retirada de Material</h1>
            <div class="flex flex-col lg:flex-row gap-5">
                <div class="w-full lg:w-1/2">
                    <div class="box">
                        <div class="box-header"><h3 class="box-title">1. Selecione a Data</h3></div>
                        <div class="box-body">
                            <div class="flex justify-between items-center mb-4">
                                <a href="<?php echo $linkMesAnterior; ?>"><i class="fas fa-chevron-left"></i></a>
                                <h2 class="text-xl font-bold text-slate-700"><?php echo $meses[(int)$mesAtual] . ' ' . $anoAtual; ?></h2>
                                <a href="<?php echo $linkMesSeguinte; ?>"><i class="fas fa-chevron-right"></i></a>
                            </div>
                            <div class="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-slate-500">
                                <?php foreach ($diasSemana as $dia): ?><div><?php echo $dia; ?></div><?php endforeach; ?>
                            </div>
                            <div class="grid grid-cols-7 gap-2 mt-2">
                                <?php for ($i = 0; $i < $diaDaSemanaPrimeiroDia; $i++): ?><div></div><?php endfor; ?>
                                <?php for ($dia = 1; $dia <= $diasNoMes; $dia++): 
                                    $dataCompleta = new DateTime("$anoAtual-$mesAtual-$dia");
                                    $diaEstaLiberado = false;
                                    if ($modoLiberacao === 'mes' && $dataCompleta->format('Y-m') === $periodoLiberado) { $diaEstaLiberado = true; } 
                                    elseif ($modoLiberacao === 'semana' && $dataCompleta->format('o-W') === $periodoLiberado) { $diaEstaLiberado = true; }
                                    $isWeekend = in_array($dataCompleta->format('w'), [0, 6]);
                                    $isPast = ($dataCompleta->format('Y-m-d') < date('Y-m-d'));
                                    $isInventoryDay = ($dataCompleta->format('d') === '01');
                                    $isClickable = $diaEstaLiberado && !$isWeekend && !$isPast && !$isInventoryDay;
                                    $classes = ['calendar-day'];
                                    $title = '';
                                    if ($isClickable) {
                                        $classes[] = 'clickable';
                                        if ($dataCompleta->format('Y-m-d') == date('Y-m-d')) $classes[] = 'today';
                                    } else {
                                        $classes[] = 'disabled';
                                        if ($isInventoryDay) $title = 'Dia de inventário';
                                        elseif ($isWeekend) $title = 'Fim de semana';
                                        elseif ($isPast) $title = 'Data passada';
                                        else $title = 'Dia não liberado pela logística';
                                    }
                                ?><div class="<?php echo implode(' ', $classes); ?>" <?php if ($isClickable): ?> data-date="<?php echo $dataCompleta->format('Y-m-d'); ?>"<?php endif; ?> title="<?= $title ?>">
                                    <?php echo $dia; ?>
                                  </div>
                                <?php endfor; ?>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="w-full lg:w-1/2">
                    <div class="box">
                        <div class="box-header"><h3 class="box-title">2. Selecione o Horário</h3></div>
                        <div class="box-body" style="min-height: 355px;">
                            <div id="horarios-container" class="space-y-3"><div class="flex items-center justify-center h-full text-slate-500 pt-16"><p>Selecione um dia disponível no calendário.</p></div></div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</div>

<!-- MODALS -->
<div id="modalAgendamento" class="fixed inset-0 bg-black bg-opacity-60 hidden items-center justify-center p-4 z-50"><div class="bg-white rounded-md shadow-2xl p-6 w-full max-w-lg"><h2 class="text-xl font-bold mb-6 text-gray-700 border-b pb-3">Confirmar Agendamento</h2><p class="mb-4">Você está agendando para: <span id="modalDataHora" class="font-bold text-[var(--cor-primaria-crm)]"></span></p><form id="formAgendamento" class="space-y-4"><input type="hidden" id="formData"><input type="hidden" id="formHora">
<div><label for="nomeVendedora" class="block text-sm font-medium text-slate-700">Seu Nome (Vendedor/a)</label><input type="text" id="nomeVendedora" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-2 focus:ring-[var(--cor-primaria-crm)]"></div>
<div><label for="nfCliente" class="block text-sm font-medium text-slate-700">NF do Cliente</label><input type="text" id="nfCliente" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-2 focus:ring-[var(--cor-primaria-crm)]"></div><div><label for="nomeCliente" class="block text-sm font-medium text-slate-700">Nome do Cliente</label><input type="text" id="nomeCliente" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-2 focus:ring-[var(--cor-primaria-crm)]"></div><div><label for="observacao" class="block text-sm font-medium text-slate-700">Observação (Opcional)</label><textarea id="observacao" rows="3" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-2 focus:ring-[var(--cor-primaria-crm)]"></textarea></div><div class="flex justify-end pt-4 space-x-4"><button type="button" class="btn-cancelar-modal bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-md">Cancelar</button><button type="submit" id="btnConfirmar" class="btn-crm btn-crm-verde">Enviar Solicitação</button></div></form></div></div>
<div id="modalStatus" class="fixed inset-0 bg-black bg-opacity-60 hidden items-center justify-center p-4 z-50"><div class="bg-white rounded-md shadow-2xl p-8 w-full max-w-md text-center"><div id="statusIcon" class="mx-auto mb-4"></div><h2 id="statusTitulo" class="text-2xl font-bold mb-2"></h2><p id="statusMensagem" class="text-lg mb-6"></p><button class="btn-fechar-modal btn-crm btn-crm-azul">Ok</button></div></div>
<div id="modalComprovante" class="fixed inset-0 bg-black bg-opacity-60 hidden items-center justify-center p-4 z-50 no-print"><div class="bg-white rounded-lg shadow-2xl w-full max-w-2xl"><div id="comprovante-area" class="p-8"><div class="text-center mb-6 border-b pb-6"><img src="https://www.manupackaging.com/wp-content/uploads/2019/07/Manupackaging-Main-Logo-5.png" alt="Logo" class="h-12 mx-auto mb-4"><h2 class="text-3xl font-bold text-slate-800">Comprovante de Retirada</h2><p class="text-slate-500">Agendamento <span class="font-semibold text-green-600">CONFIRMADO</span> pela logística</p></div><div class="grid grid-cols-2 gap-x-8 gap-y-4 mb-8"><div class="border-b py-2"><p class="text-sm text-slate-500">TOKEN DE RETIRADA</p><p id="comp-token" class="font-bold text-2xl text-[var(--cor-primaria-crm)]"></p></div><div class="border-b py-2"><p class="text-sm text-slate-500">DATA & HORA</p><p id="comp-data-hora" class="font-semibold text-lg"></p></div><div class="border-b py-2"><p class="text-sm text-slate-500">CLIENTE</p><p id="comp-cliente" class="font-semibold text-lg"></p></div><div class="border-b py-2"><p class="text-sm text-slate-500">NOTA FISCAL</p><p id="comp-nf" class="font-semibold text-lg"></p></div></div><div class="bg-gray-50 p-6 rounded-lg"><h3 class="font-bold text-slate-700 mb-4">🏢 LOCAL DA RETIRA:</h3><p class="text-slate-600">Manupackaging Fitasa do Brasil SA<br>R. Emílio Romani, 1250 - Cidade Industrial de Curitiba<br>Curitiba - PR, 81460-020<br>📞 (41) 2169-6000</p></div><div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mt-6"><h3 class="font-bold text-yellow-800 mb-2">⚠️ INSTRUÇÕES IMPORTANTES:</h3><ul class="list-disc list-inside text-yellow-700 space-y-1"><li>Comparecer com EPIs obrigatórios (calçado de segurança).</li><li>Veículo em boas condições para transporte.</li><li>Apresentar-se na portaria com documento de identificação.</li><li>Documentação da carga (NF) deve estar em ordem.</li></ul></div></div><div class="p-4 bg-gray-100 rounded-b-lg flex gap-4"><button id="btnImprimir" class="w-full btn-crm btn-crm-azul flex items-center justify-center gap-2"><i class="fas fa-print"></i>Imprimir Comprovante</button><button class="btn-fechar-comprovante w-full btn-crm btn-crm-cinza">Fechar</button></div></div></div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    // essa parte cuida do ID do vendedor, pra nao ter que ficar digitando toda hora
    let vendedorId = localStorage.getItem('vendedorId');
    if (!vendedorId) {
        vendedorId = 'VEND-' + Math.random().toString(36).substring(2, 9).toUpperCase();
        localStorage.setItem('vendedorId', vendedorId);
    }
    document.getElementById('idVendedoraDisplay').textContent = vendedorId;
    // se o cara ja digitou o nome antes, a gente ja deixa preenchido pra ele
    document.getElementById('nomeVendedora').value = localStorage.getItem('vendedoraNome') || '';

    const horariosOcupados = <?php echo json_encode($horariosOcupados); ?>;
    const horariosDisponiveis = <?php echo json_encode($horariosDisponiveis); ?>;
    const modalAgendamento = document.getElementById('modalAgendamento');
    const modalStatus = document.getElementById('modalStatus');
    const modalComprovante = document.getElementById('modalComprovante');
    const btnConfirmar = document.getElementById('btnConfirmar');
    let isSubmitting = false; 
    let diaSelecionadoElement = null;

    document.querySelectorAll('.calendar-day.clickable').forEach(dayElement => {
        dayElement.addEventListener('click', () => {
            if (diaSelecionadoElement) diaSelecionadoElement.classList.remove('selected');
            dayElement.classList.add('selected');
            diaSelecionadoElement = dayElement;
            exibirHorarios(dayElement.dataset.date);
        });
    });

    // aqui é a magica pra bloquear os horarios que ja passaram no dia de hoje
    function exibirHorarios(data) {
        const container = document.getElementById('horarios-container');
        container.innerHTML = '';

        // pega a data e a hora de agora pra comparar
        const hoje = new Date().toISOString().split('T')[0];
        const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

        horariosDisponiveis.forEach(hora => {
            const ocupado = horariosOcupados[data] && horariosOcupados[data][hora];
            // se for hoje, ve se a hora ja passou
            const isPast = (data === hoje && hora < agora);
            const isUnavailable = ocupado || isPast;
            
            const div = document.createElement('div');
            div.className = `flex justify-between items-center p-3 rounded-md transition ${isUnavailable ? 'bg-gray-100 cursor-not-allowed' : 'bg-blue-50 hover:bg-blue-100'}`;
            
            let labelIndisponivel = 'Indisponível';
            if (isPast) labelIndisponivel = 'Horário Expirado';
            if (ocupado) labelIndisponivel = 'Já Agendado';

            div.innerHTML = `<span class="font-semibold text-base ${isUnavailable ? 'text-gray-500' : 'text-gray-800'}">${hora}</span>` + 
                            (isUnavailable ? `<span class="text-gray-500 font-medium px-4 py-2 rounded-md bg-gray-200 text-sm">${labelIndisponivel}</span>` 
                                           : `<button class="btn-agendar btn-crm btn-crm-verde text-sm" data-data="${data}" data-hora="${hora}">Agendar</button>`);
            container.appendChild(div);
        });

        document.querySelectorAll('.btn-agendar').forEach(button => {
            button.addEventListener('click', () => {
                document.getElementById('formData').value = button.dataset.data;
                document.getElementById('formHora').value = button.dataset.hora;
                const displayDate = new Date(button.dataset.data + 'T00:00:00').toLocaleDateString('pt-BR');
                document.getElementById('modalDataHora').textContent = `${displayDate} às ${button.dataset.hora}`;
                abrirModal(modalAgendamento);
            });
        });
    }

    function abrirModal(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    function fecharModal(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    
    document.querySelector('.btn-cancelar-modal').addEventListener('click', () => fecharModal(modalAgendamento));
    document.querySelector('.btn-fechar-modal').addEventListener('click', () => location.reload());
    document.querySelector('.btn-fechar-comprovante').addEventListener('click', () => fecharModal(modalComprovante));
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());

    document.getElementById('formAgendamento').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        isSubmitting = true;
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        
        // pega o nome que o vendedor digitou e salva no navegador pra proxima vez
        const nomeVendedora = document.getElementById('nomeVendedora').value;
        localStorage.setItem('vendedoraNome', nomeVendedora);

        const dadosAgendamento = { 
            data: document.getElementById('formData').value, 
            hora: document.getElementById('formHora').value, 
            idVendedora: vendedorId,
            nomeVendedora: nomeVendedora,
            nfCliente: document.getElementById('nfCliente').value, 
            nomeCliente: document.getElementById('nomeCliente').value, 
            observacao: document.getElementById('observacao').value 
        };
        
        try {
            const response = await fetch(`agenda.php?action=agendar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosAgendamento) });
            const result = await response.json();
            fecharModal(modalAgendamento);
            const isSuccess = response.ok && result.status === 'success';
            document.getElementById('statusIcon').innerHTML = isSuccess ? `<i class="fas fa-check-circle text-6xl text-green-500"></i>` : `<i class="fas fa-times-circle text-6xl text-red-500"></i>`;
            document.getElementById('statusTitulo').textContent = isSuccess ? 'Sucesso!' : 'Erro!';
            document.getElementById('statusMensagem').textContent = result.message;
            abrirModal(modalStatus);
        } catch (error) {
            console.error(error);
        } finally {
            isSubmitting = false;
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = 'Enviar Solicitação';
        }
    });

    // --- Funções do historico e do comprovante ---
    async function exibirHistorico() {
        const container = document.getElementById('conteudoHistorico');
        try {
            const response = await fetch(`agenda.php?action=get_historico&vendedorId=${vendedorId}`);
            const historico = await response.json();
            if (historico.length === 0) {
                container.innerHTML = '<p class="text-center text-sm p-4 text-gray-400">Nenhum agendamento recente.</p>';
            } else {
                container.innerHTML = historico.map(ag => {
                    let statusClass, statusText, actionButton = '', statusIcon;
                    switch(ag.status) {
                        case 'Confirmado': statusClass = 'bg-green-200 text-green-800'; statusText = 'Confirmado'; statusIcon = 'fa-check'; actionButton = `<button class="btn-ver-comprovante text-xs font-semibold bg-[var(--cor-primaria-crm)] hover:opacity-90 text-white px-3 py-1 rounded-full" data-token="${ag.token}">Ver</button>`; break;
                        case 'Recusado': statusClass = 'bg-red-200 text-red-800'; statusText = 'Recusado'; statusIcon = 'fa-times'; break;
                        default: statusClass = 'bg-yellow-200 text-yellow-800'; statusText = 'Pendente'; statusIcon = 'fa-clock';
                    }
                    return `
                    <div class="p-2.5 bg-[var(--cor-hover-sidebar)] rounded-md">
                        <div class="flex justify-between items-center">
                            <p class="font-bold text-sm text-white">${ag.nome_cliente.substring(0, 15)}</p>
                            <span class="text-xs font-bold px-2 py-0.5 rounded-full ${statusClass}"><i class="fas ${statusIcon} mr-1"></i>${statusText}</span>
                        </div>
                        <p class="text-xs text-gray-400 mt-1">${new Date(ag.data_agendamento + 'T00:00:00').toLocaleDateString('pt-BR')} - ${ag.hora_agendamento}</p>
                        <div class="text-right mt-2">${actionButton}</div>
                    </div>`;
                }).join('');
            }
            document.querySelectorAll('.btn-ver-comprovante').forEach(btn => btn.addEventListener('click', (e) => verComprovante(e.target.dataset.token)));
        } catch(e) {
            container.innerHTML = '<p class="text-center text-sm text-red-400 p-4">Erro ao carregar histórico.</p>';
        }
    }

    // essa função abre o comprovante numa pagina nova
    function verComprovante(token) {
        // da uma "embaralhada" no token pra url nao ficar tao obvia
        const encryptedToken = btoa(token);
        // e ai abre a pagina comprovante.php com o token
        window.open(`comprovante.php?token=${encryptedToken}`, '_blank');
    }

    // aqui ele fica buscando o historico a cada 10 segundos pra atualizar a lista
    exibirHistorico();
    setInterval(exibirHistorico, 10000);
});
</script>
</body>
</html>