let btnsEditarStatus = document.querySelectorAll('.editar-status-button')
var myModal;


document.getElementById('statusSelect').addEventListener('change', function() {
    var selectedOption = this.value;
    var dataEntregaInput = document.getElementById('dataEntregaInput');
    var motivoRecusaInput = document.getElementById('motivoRecusaInput');
    var alteracaoInput = document.getElementById('alteracaoInput');
    var linkEntregaInput = document.getElementById('linkEntregaInput');
    var textoAprovacaoInput = document.getElementById('textoAprovacaoInput');

    if (selectedOption === 'RECEBIDA') {
        dataEntregaInput.style.display = 'block';
        textoAprovacaoInput.style.display = 'none';
        motivoRecusaInput.style.display = 'none';
        alteracaoInput.style.display = 'none';
        linkEntregaInput.style.display = 'none';
    } else if (selectedOption === 'RECUSADA') {
        dataEntregaInput.style.display = 'none';
        textoAprovacaoInput.style.display = 'none';
        alteracaoInput.style.display = 'none';
        linkEntregaInput.style.display = 'none';
        motivoRecusaInput.style.display = 'block';
    } else if (selectedOption === 'ALTERAÇÃO'){
        alteracaoInput.style.display = 'block';
        textoAprovacaoInput.style.display = 'none';
        dataEntregaInput.style.display = 'none';
        motivoRecusaInput.style.display = 'none';
        linkEntregaInput.style.display = 'none';
    } else if (selectedOption === 'ENTREGUE'){
        linkEntregaInput.style.display = 'block';
        textoAprovacaoInput.style.display = 'none';
        alteracaoInput.style.display = 'none';
        dataEntregaInput.style.display = 'none';
        motivoRecusaInput.style.display = 'none';
    } else if(selectedOption === 'APROVAÇÃO'){
        linkEntregaInput.style.display = 'none';
        textoAprovacaoInput.style.display = 'block';
        alteracaoInput.style.display = 'none';
        dataEntregaInput.style.display = 'none';
        motivoRecusaInput.style.display = 'none';
    } else {
        linkEntregaInput.style.display = 'none';
        textoAprovacaoInput.style.display = 'none';
        alteracaoInput.style.display = 'none';
        dataEntregaInput.style.display = 'none';
        motivoRecusaInput.style.display = 'none';
    }
});

btnsEditarStatus.forEach(btn => {
    btn.addEventListener('click', function () {
        let numeroSolicitacao = this.dataset.numerosolicitacao;
        console.log(btn);
        document.getElementById('numeroSolicitacaoInput').value = numeroSolicitacao;
        document.getElementById('numeroSolicitacaoTitulo').textContent = numeroSolicitacao;
        abrirModal();

    })
});

// Função para abrir o popup
function abrirModal() {
    myModal = new bootstrap.Modal(document.getElementById('myModal'), {
        keyboard: false
    });
    myModal.show();
}

// Função para salvar o novo status
function salvarNovoStatus() {
    const numeroSolicitacao = document.getElementById('numeroSolicitacaoInput').value;
    const novoStatus = document.getElementById('statusSelect').value;
    const dataEntrega = document.getElementById('dataEntrega').value;
    const motivoRecusa = document.getElementById('motivoRecusa').value;
    const alteracao = document.getElementById('alteracao').value;
    const linkEntrega = document.getElementById('linkEntrega').value;
    const textoAprovacao = document.getElementById('textoAprovacao').value;

    fetch(`/mudarStatus/${numeroSolicitacao}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ novoStatus: novoStatus, dataEntrega, motivoRecusa, alteracao, linkEntrega, textoAprovacao })
    })
    .then(response => {
        if (response.ok) {
            console.log('Entrou aqui no then')
            const numeroSolicitacao = document.getElementById('numeroSolicitacaoInput').value;
            const statusAtualizado = document.getElementById('statusSelect').value;
            const statusCell = document.querySelector(`.numeroDemanda[data-numero="${numeroSolicitacao}"]`).closest('tr').querySelector('.status-cell');
            const classeDoStatus = statusAtualizado.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/ç/g, 'c')
            .replace(/[ãâáà]/g, 'a')
            .replace(/[õôóò]/g, 'o')

            statusCell.innerHTML = `<span class="${classeDoStatus}">${statusAtualizado}</span>`;
            const tabelaStatus = document.getElementById('tabelaStatus');
            if (tabelaStatus) {
                atualizarTabelaStatus(numeroSolicitacao);
                fecharModal ()
            } else {
                fecharModal ()
            }
            alertas('sucesso', `Status da demanda ${numeroSolicitacao} alterado com sucesso!`);
        } else {
            console.error('Erro ao atualizar o status da solicitação');
        }
    })
    .catch(error => {
        console.error('Erro ao fazer solicitação AJAX:', error);
    });
}


// Função para fechar o modal
function fecharModal() {
    myModal.hide();
}

function atualizarTabelaStatus(solicitacao) {
    fetch(`/statusDemanda/${solicitacao}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao obter os dados da tabela de status');
            }
            return response.json();
        })
        .then(data => {
            if (data.length > 0) {
                var tabelaStatus = '';
                data.forEach(function(status) {
                    tabelaStatus += '<tr><td>' + new Date(status.dataRegistro).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</td><td>' + status.statusDemanda + '</td></tr>';
                });
                $('#tabelaStatus tbody').html(tabelaStatus);
            } else {
                $('#tabelaStatus tbody').html('<tr><td colspan="2">Sem status no sistema</td></tr>');
            }
        })
        .catch(error => {
            console.error('Erro ao obter os dados da tabela de status:', error);
        });
}

function alertas(tipo, mensagem) {
    let div;
    if(tipo === 'sucesso') {
        div = `
        <div class="alert alert-success" role="alert">
            ${mensagem}
        </div>
        `
    }
    if(tipo === 'erro') {
        div = `
        <div class="alert alert-danger" role="alert">
            ${mensagem}
        </div>
        `
    }
    $('.mensagem').html(div).show();
    setTimeout(function() {
        $('.mensagem').hide();
    }, 5000);
}


let estado = false;

function exibirEdicaoData() {
    let divDataAtual = document.getElementById('dataEntregaAtual');
    let divDataNova = document.getElementById('novaDataEntregaDiv');

    if (estado === false) {
        divDataAtual.style.display = "none";
        divDataNova.style.display = "block";
        estado = true;
    }
}

function cancelarEdicaoData() {
    let divDataAtual = document.getElementById('dataEntregaAtual');
    let divDataNova = document.getElementById('novaDataEntregaDiv');

    divDataAtual.style.display = "block";
    divDataNova.style.display = "none";
    estado = false;
}

function alterarDataEntrega(numeroSolicitacao) {
    var novaDataEntrega = document.getElementById('novaDataEntrega').value;
    console.log(novaDataEntrega);

    fetch(`/mudarDataEntrega/${numeroSolicitacao}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ novaDataEntrega })
    })
    .then(response => {
        if (response.ok) {
            let divAlterarData = document.getElementById('novaDataEntregaDiv')
            let divDataAnterior = document.getElementById('dataEntregaAtual')
            
            let partesData = novaDataEntrega.split('-');
            let dataFormatada = partesData[2] + '/' + partesData[1] + '/' + partesData[0];

            divAlterarData.style.display = 'none';
            divDataAnterior.innerHTML = `${dataFormatada}`;
            divDataAnterior.style.display = 'block';
            alertas('sucesso', `Data de entrega da demanda ${numeroSolicitacao} alterada com sucesso!`);

        } else {
            console.error('Erro ao atualizar o status da solicitação');
            alertas('erro', `Data de entrega da demanda ${numeroSolicitacao} não alterada, ERRO!`);
        }
    })
    .catch(error => {
        console.error('Erro ao fazer solicitação AJAX:', error);
        alertas('erro', `Data de entrega da demanda ${numeroSolicitacao} não alterada, ERRO!`);
    });

}

