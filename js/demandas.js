let btnsEditarStatus = document.querySelectorAll('.editar-status-button')
var myModal;


document.getElementById('statusSelect').addEventListener('change', function() {
    var selectedOption = this.value;
    var dataEntregaInput = document.getElementById('dataEntregaInput');
    var motivoRecusaInput = document.getElementById('motivoRecusaInput');

    if (selectedOption === 'RECEBIDA') {
        dataEntregaInput.style.display = 'block';
        motivoRecusaInput.style.display = 'none';
    } else if (selectedOption === 'RECUSADA') {
        dataEntregaInput.style.display = 'none';
        motivoRecusaInput.style.display = 'block';
    } else {
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

    console.log(novoStatus, dataEntrega, motivoRecusa);

    fetch(`/mudarStatus/${numeroSolicitacao}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ novoStatus: novoStatus, dataEntrega, motivoRecusa })
    })
    .then(response => {
        if (response.ok) {
            console.log('Entrou aqui no then')
            const numeroSolicitacao = document.getElementById('numeroSolicitacaoInput').value;
            const statusAtualizado = document.getElementById('statusSelect').value;
            const statusCell = document.querySelector(`.numeroDemanda[data-numero="${numeroSolicitacao}"]`).closest('tr').querySelector('.status-cell');
            
            statusCell.textContent = statusAtualizado;
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

