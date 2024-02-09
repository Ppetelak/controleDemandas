let btnsEditarStatus = document.querySelectorAll('.editar-status-button')
var myModal;

btnsEditarStatus.forEach(btn => {
    btn.addEventListener('click', function () {
        let numeroSolicitacao = this.dataset.numerosolicitacao;
        console.log(btn);
        document.getElementById('numeroSolicitacaoInput').value = numeroSolicitacao;
        document.getElementById('numeroSolicitacaoTitulo').textContent = numeroSolicitacao;
        abrirModal();

        console.log('Número da Solicitação:', numeroSolicitacao);
    })
});

console.log(btnsEditarStatus);

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

    fetch(`/mudarStatus/${numeroSolicitacao}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ novoStatus: novoStatus })
    })
    .then(response => {
        if (response.ok) {
            // Se a solicitação for bem-sucedida, atualize a linha na tabela
            // com o novo status (você pode fazer isso diretamente no front-end
            // ou recarregando a página para obter os dados atualizados)
            console.log('Entrou aqui no then')
            fecharModal ()
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

