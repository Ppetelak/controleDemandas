/* INICIALIZADORES DE ESTADO */

let etapaAtual = 1
var nomeUsuario = null;
var tipoMaterial = null;

let anexosObjeto = {}

var fileInput = document.querySelector('.file-input');
fileInput.removeAttribute('multiple');

/* ALTERAR ETAPAS E VALIDAR FORM A CADA ETAPA */

function validarFormulario(etapa) {
    let form = document.getElementById(`formEtapa${etapa}`);

    const attachmentRequiredElements = form.querySelectorAll('.attachment-required');
    if (attachmentRequiredElements.length > 0) {
        // Se houver, verificar se pelo menos um deles possui anexos
        let hasAttachments = false;
        attachmentRequiredElements.forEach(element => {
            const fileItems = element.querySelectorAll('.file-list');
            if (fileItems.length > 0) {
                hasAttachments = true;
            }
        });

        if (!hasAttachments) {
            exibirAlerta('É necessário pelo menos um anexo.');
            return false;
        }
    }

    if (etapa === 7) {
        var checkboxes = form.querySelectorAll('input[name="qualPublico"]:checked');
        if (checkboxes.length < 1) {
            exibirAlerta("Selecione pelo menos uma opção.");
            return false;
        }
    }

    if (form.checkValidity()) {
        if(etapa === 1){ // captura do nome do usuário para exibir nas próximas etapas
            nomeUsuario = $('#nome').val();
        }
    
        if(etapa === 3 && tipoMaterial === 'digital') {
            document.getElementById(`formEtapa${etapa}`).style.display = 'none';
            etapaAtual = etapaAtual + 2;
            document.getElementById(`formEtapa${etapa + 2}`).style.display = 'block';
            $('.nomeUsuario').text(nomeUsuario);
            return false; 
        } else {
            document.getElementById(`formEtapa${etapa}`).style.display = 'none';
            etapaAtual++;
            document.getElementById(`formEtapa${etapa + 1}`).style.display = 'block';
            $('.nomeUsuario').text(nomeUsuario);
            return false; 
        }       
    } else {
        form.reportValidity();
        return false; 
    }
};

function voltar() {
    if (etapaAtual > 1) {
        if(etapaAtual === 5 && tipoMaterial === 'digital'){
            document.getElementById(`formEtapa${etapaAtual}`).style.display = 'none';
            etapaAtual = etapaAtual - 2;
            document.getElementById(`formEtapa${etapaAtual}`).style.display = 'block';
        } else {
            document.getElementById(`formEtapa${etapaAtual}`).style.display = 'none';
            etapaAtual--;
            document.getElementById(`formEtapa${etapaAtual}`).style.display = 'block';
        }
    }
}

$(function() {

     /* ESCONDER ELEMENTOS INICIALMENTE */
    
    $('.feed, .story, .reels, .videoYoutube, .emailMarketing, .fotoPerfil, .cartaoVisita, .cartaoCorretor, .cartaoAniversario, .cartaoBoasVindas, .lps, .seMidia, #seSim, #seNao, #seSimLogo, .camiseta, .pdv, .cartaoVisita, .flyer, .folder, .banner, .papelTimbrado, #outrasLogos, #adicionarLogo, #seSimValor').hide();

     /* FIM ESCONDER ELEMENTOS INICIALMENTE */

    $(document).on('change', 'input[name="tipoMaterial"]', function() {
        let tipoMaterialSelecionado = $(this).val();
        tipoMaterial = tipoMaterialSelecionado;
        
        // Remover o atributo required de todos os campos
        $('#form3-impresso input, #form3-impresso select, #form3-digital input, #form3-digital select').prop('required', false);
    
        if (tipoMaterialSelecionado === 'impresso') {
            $('#form3-digital').hide();
            $('#form3-impresso').show();
            
            // Adicionar o atributo required aos campos do formulário impresso
            $('#form3-impresso input, #form3-impresso select').prop('required', true);
            $('#form3-digital input, #form3-digital select').prop('required', false);
        } else if (tipoMaterialSelecionado === 'digital') {
            $('#form3-impresso').hide();
            $('#form3-digital').show();
            
            // Adicionar o atributo required aos campos do formulário digital
            $('#form3-digital input, #form3-digital select').prop('required', true);
            $('#form3-impresso input, #form3-impresso select').prop('required', false);
        }
    });

    $(document).on('change', 'input[name="quemImprimi"]' , function(){
        let selecionado = $(this).val();
    
        if(selecionado ===  'Mídia Ideal') {
            $('.seMidia').show();
            $('.seMidia input, .seMidia select').prop('required', true);
    
            // Adicionar a classe attachment-required à div .list-upload dentro do escopo
            $('.seMidia .list-upload').addClass('attachment-required');
        } else if(selecionado === 'a própria unidade') {
            if ($('.seMidia').find('.btnproximo').length === 0) {
                $('.btnproximo').show(); // Se não estiver presente, mostra o botão
            }
            $('.seMidia').hide();
            $('.seMidia input, .seMidia select').prop('required', false);
    
            // Remover a classe attachment-required da div .list-upload dentro do escopo
            $('.seMidia .list-upload').removeClass('attachment-required');
        }
    });

    $(document).on('change', 'input[name="autorizacaoTem"]', function () {
        let selecionado = $(this).val();

        if(selecionado === 'sim'){
            $('.btnproximo').show();
            $('#seSim').show()
            $('#seNao').hide()
        } else if(selecionado ==='nao'){
            $('.btnproximo').hide();
            $('#seSim').hide()
            $('#seNao').show()
        }
    })

    $(document).on('change', '#qualMaterial', function () {
        // Esconder todos os grupos de exemplos
        $('.feed, .story, .reels, .videoYoutube, .emailMarketing, .fotoPerfil, .cartaoVisita, .cartaoCorretor, .cartaoAniversario, .cartaoBoasVindas, .lps ').hide();

        // Obter o valor do atributo data-exemplo da opção selecionada
        var selectedOption = $(this).find(':selected').data('exemplo');
        
        $('.' + selectedOption).show();
    });

    $(document).on('change', '#qualMaterialImpresso', function () {
        $('.camiseta, .pdv, .cartaoVisita, .flyer, .folder, .banner, .papelTimbrado').hide();

        // Obter o valor do atributo data-exemplo da opção selecionada
        var selectedOptionImpresso = $(this).find(':selected').data('exemplos');

        // Mostrar o grupo de exemplos correspondente à opção selecionada
        $('.' + selectedOptionImpresso).show();
    });

    var logoAdicionado = false;

    $(document).on('change', 'input[name="temLogo"]', function () {
        var selectedValue = $(this).val();
        var selects = document.querySelectorAll('select');
       

        if (selectedValue === 'sim') {
            $('#seSimLogo').show();
            $('#adicionarLogo').show();
            $('#outrasLogos').show();
            selects.forEach(select => {
                select.required = true;
            })
        } else if (selectedValue === 'nao') {
            selects.forEach(select => {
                select.required = false;
            })
            logoAdicionado = false
            $('#adicionarLogo').hide();
            $('#outrasLogos').hide();
            $('#seSimLogo').hide();
            $('.novaLogo').hide()
            $('#adicionarLogo').text('ADICIONAR OUTRAS');
        }
    })

    $('.addButtonCorretora').on('click', function () {
        var clonedSelect = `<div class=row>
                                <div class=col-10>
                                    <select class="form-select mb-2" name="corretoras">
                                        <option value="AllCross">AllCross</option>
                                        <option value="BRKR">BRKR</option>
                                        <option value="Canal de Negócios">Canal de Negócios</option>
                                        <option value="Classe">Classe</option>
                                        <option value="Compar">Compar</option>
                                        <option value="Espaço Assessoria">Espaço Assessoria</option>
                                        <option value="Freedom">Freedom</option>
                                        <option value="Império">Império</option>
                                        <option value="Kop Seguros">Kop Seguros</option>
                                        <option value="Mount Hermon">Mount Hermon</option>
                                        <option value="MountPay">MountPay</option>
                                        <option value="Prime Broker">Prime Broker</option>
                                        <option value="Tear">Tear</option>
                                        <option value="T. Becker">T. Becker</option>
                                        <option value="Select">Select</option>
                                    </select>
                                </div>
                                <div class=col-2>
                                    <button type="button" class="btn btn-danger btn-sm removeButton"><i class="bi bi-x-lg"></i></button>
                                </div>
                            </div>`

        $(this).parent().append(clonedSelect);
    });

    $('.addButtonAdministradora').on('click', function () {
        var clonedSelect = `<div class=row>
                                <div class=col-10>
                                    <select class="form-select mb-2" name="administradoras">
                                        <option value="Mount Hermon">Mount Hermon</option>
                                        <option value="Classe Administradora">Classe Administradora</option>
                                        <option value="Compar">Compar</option>
                                    </select>
                                </div>
                                <div class=col-2>
                                    <button type="button" class="btn btn-danger btn-sm removeButton"><i class="bi bi-x-lg"></i></button>
                                </div>
                            </div>`

        $(this).parent().append(clonedSelect);
    });

    $('.addButtonOperadora').on('click', function () {
        var clonedSelect = `<div class=row>
                                <div class=col-10>
                                    <select class="form-select mb-2" name="operadora">
                                        <option value="Amil">Amil</option>
                                        <option value="Amil Dental">Amil Dental</option>
                                        <option value="Ampla Saúde">Ampla Saúde</option>
                                        <option value="Angeli">Angeli</option>
                                        <option value="Ativia">Ativia</option>
                                        <option value="Aurora">Aurora</option>
                                        <option value="Bradesco Dental">Bradesco Dental</option>
                                        <option value="Bradesco Saúde">Bradesco Saúde</option>
                                        <option value="Cassi">Cassi</option>
                                        <option value="CedPlan">CedPlan</option>
                                        <option value="Círculo Saúde">Círculo Saúde</option>
                                        <option value="Clinipam">Clinipam</option>
                                        <option value="Cmed">Cmed</option>
                                        <option value="ConSaúde">ConSaúde</option>
                                        <option value="Creci-ce">Creci-ce</option>
                                        <option value="Dental Uni">Dental Uni</option>
                                        <option value="Dra Santa">Dra Santa</option>
                                        <option value="Fátima Saúde">Fátima Saúde</option>
                                        <option value="Grarantia Saúde">Grarantia Saúde</option>
                                        <option value="GNDI">GNDI</option>
                                        <option value="HappyMed">HappyMed</option>
                                        <option value="HapVida">HapVida</option>
                                        <option value="Hospitalar">Hospitalar</option>
                                        <option value="Humana">Humana</option>
                                        <option value="Ideal Saúde">Ideal Saúde</option>
                                        <option value="Klini">Klini</option>
                                        <option value="MedCare">MedCare</option>
                                        <option value="MedGold">MedGold</option>
                                        <option value="Medhealth">Medhealth</option>
                                        <option value="MedSenior">MedSenior</option>
                                        <option value="MedSul">MedSul</option>
                                        <option value="Nossa Saúde">Nossa Saúde</option>
                                        <option value="Nova Rio">Nova Rio</option>
                                        <option value="Odontogroup">Odontogroup</option>
                                        <option value="Odontoprev">Odontoprev</option>
                                        <option value="Paraná Clínicas">Paraná Clínicas</option>
                                        <option value="Pessoal Saúde">Pessoal Saúde</option>
                                        <option value="Porto Dias Saúde">Porto Dias Saúde</option>
                                        <option value="Select">Select</option>
                                        <option value="Sempre Vida">Sempre Vida</option>
                                        <option value="Smile">Smile</option>
                                        <option value="SulAmerica">SulAmerica</option>
                                        <option value="Sulmed">Sulmed</option>
                                        <option value="Total MedCare">Total MedCare</option>
                                        <option value="Unimed">Unimed</option>
                                        <option value="Unimed Belo Horizonte">Unimed Belo Horizonte</option>
                                        <option value="Unimed Foz">Unimed Foz</option>
                                        <option value="Unimed Guaratinguetá">Unimed Guaratinguetá</option>
                                        <option value="Verte Saúde">Verte Saúde</option>
                                    </select>
                                </div>
                                <div class=col-2>
                                    <button type="button" class="btn btn-danger btn-sm removeButton"><i class="bi bi-x-lg"></i></button>
                                </div>
                            </div>`

        $(this).parent().append(clonedSelect);
    });

    $(document).on('click', '.removeButton', function () {
        $(this).closest('.row').remove(); 
    });

    /* var logoAdicionado = false; */

    $(document).on('click', '#adicionarLogo', function () {
        if (!logoAdicionado) {
            $(this).text('CANCELAR')
            $('.novaLogo').css('display', 'block');
            $('#logosNovas').prop('required', true);
            logoAdicionado = true;
        } else {
            $(this).text('ADICIONAR OUTRAS')
            $('.novaLogo').css('display', 'none');
            $('#logosNovas').prop('required', false);
            logoAdicionado = false;
        }
    });

    $(document).on('change', 'input[name="temValor"]', function () {
        var selectedValue = $(this).val();

        if (selectedValue === 'sim') {
            $('#seSimValor').show();
            $('#infosValores').prop('required', true);
        } else if (selectedValue === 'nao') {
            $('#seSimValor').hide();
            $('#infosValores').prop('required', false);
        }
    })

    $(document).on('change', 'input[name="file-input"]', function () {
        var formularioAtual = document.getElementById(`formEtapa${etapaAtual}`)
        upload(formularioAtual);
    })
});

function upload(etapa) {

    let allowed_mime_types = [];
    let allowed_size_mb = 100;

    var files_input = etapa.querySelector('.file-input').files;

    if(files_input.lenght == 0) {
        exibirAlerta('Nenhum arquivo selecionado')
        return;
    }

    for(i = 0; i < files_input.length; i ++) {
        let file = files_input[i];

        if(file.size > allowed_size_mb * 1024 * 1024) {
            exibirAlerta('Erro: Limite de tamanho excedido => ' +file.name);
            return;
        }

        let uniq = 'id-' + btoa(file.name).replace(/=/g, '').substring(0, 7);
        let filetype = file.type.match(/([^\/]+)\//) / allowed_mime_types;

        let li = `
            <li class="file-list ${filetype[i]}" id="${uniq}" data-filename="${file.name}" data-file-name-back>
                <div class="thumbnail">
                    <ion-icon name="document-outline"></ion-icon>
                    <ion-icon name="image-outline"></ion-icon>
                    <ion-icon name="musical-notes-outline"></ion-icon>
                    <ion-icon name="videocam-outline"></ion-icon>
                    <span class="completed">
                        <ion-icon name="checkmark"></ion-icon>
                    </span>
                </div>
                <div class="properties">
                    <span class="title"><strong></strong></span>
                    <span class="size"></span>
                    <span class="progress">
                        <span class="buffer"></span>
                        <span class="percentage">0%</span>
                    </span>
                </div>
                <input type="hidden" value="" class="urlArchive">
                <input type="hidden" value="" class="nameBack">
                <button class="remove" onclick="remove(this)" type="button"">
                    <ion-icon name="close"></ion-icon>
                </button>
            </li>
            `;

        etapa.querySelector('.list-upload ul').innerHTML = li + etapa.querySelector('.list-upload ul').innerHTML;

        let li_el = etapa.querySelector('#' + uniq);

        let name = li_el.querySelector('.title strong');
        let size = li_el.querySelector('.size');

        name.innerHTML = file.name;
        size.innerHTML = bytesToSize(file.size);

        var data = new FormData();
        data.append('file', file);

        axios.post('/upload', data, {
            onUploadProgress: function(progressEvent) {
                let percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                li_el.querySelector('.buffer').style.width = percent + '%';
                li_el.querySelector('.percentage').innerHTML = percent + '%';
                

                if (progressEvent.loaded === progressEvent.total) {
                    li_el.querySelector('.completed').style.display = li_el.querySelector('.remove').style.display = 'flex';
                }
            }
        })
        .then(response => {
            const fileData = response.data.filepaths[0];
            li_el.querySelector('.nameBack').value = fileData.modifiedName;
            li_el.querySelector('.urlArchive').value = fileData.filepath;

            anexosObjeto[fileData.modifiedName] = fileData.filepath;
        })
        .catch(error => {
            console.error(error);
        });  
    }
}

function remove(button) {
    const li = button.closest('.file-list');
    const modifiedFileName = li.querySelector('.nameBack').value;
    axios.post('/remove', { removefile: modifiedFileName })
        .then(response => {
            if(anexosObjeto.hasOwnProperty(modifiedFileName)) {
                delete anexosObjeto[modifiedFileName]
            }
            li.remove();
        })
        .catch(error => console.error(error));
}

function anexos() {
    console.log(anexosObjeto);
}

function capturarDadosEtapas(etapa) {
    let form = document.getElementById(`formEtapa${etapa}`);
    if (form.checkValidity()) {

        var forms = document.querySelectorAll('form[id^="formEtapa"]');
        const dadosFormulario = {};
        document.getElementById(`formEtapa${etapa}`).style.display = 'none';
        etapaAtual++;
        document.getElementById(`formEtapa${etapa + 1}`).style.display = 'block';
        $('.nomeUsuario').text(nomeUsuario);
        document.querySelector('.btnVoltar').style.display = 'none';

        // Iterar sobre cada formulário
        forms.forEach(form => {
            const campos = form.querySelectorAll('input, select, textarea');
            campos.forEach(campo => {
                const tipoCampo = campo.type;
                const nomeCampo = campo.getAttribute('name');
                const valorCampo = campo.value;
                
                // Verificar se o campo é um input radio
                if (tipoCampo === 'radio') {
                    // Verificar se o input radio está selecionado
                    if (campo.checked) {
                        dadosFormulario[nomeCampo] = valorCampo;
                    }
                } else if (tipoCampo === 'checkbox') {
                    // Verificar se o input checkbox está selecionado
                    if (campo.checked) {
                        // Se já existir um valor para esse campo, armazenar em um array
                        if (dadosFormulario.hasOwnProperty(nomeCampo)) {
                            if (Array.isArray(dadosFormulario[nomeCampo])) {
                                dadosFormulario[nomeCampo].push(valorCampo);
                            } else {
                                dadosFormulario[nomeCampo] = [dadosFormulario[nomeCampo], valorCampo];
                            }
                        } else {
                            dadosFormulario[nomeCampo] = valorCampo;
                        }
                    }
                } else {
                    // Se já existir um valor para esse campo, armazenar em um array
                    if (dadosFormulario.hasOwnProperty(nomeCampo)) {
                        if (Array.isArray(dadosFormulario[nomeCampo])) {
                            dadosFormulario[nomeCampo].push(valorCampo);
                        } else {
                            dadosFormulario[nomeCampo] = [dadosFormulario[nomeCampo], valorCampo];
                        }
                    } else {
                        dadosFormulario[nomeCampo] = valorCampo;
                    }
                }
            });
        });

        enviarDados(dadosFormulario, anexosObjeto);

        console.log(dadosFormulario, anexosObjeto);

    } else {
        return false
    }
}

function enviarDados(dadosFormulario, anexos) {
    // Fazer uma requisição HTTP POST para a rota /enviarDados
    fetch('/enviarDados', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dadosFormulario: dadosFormulario, anexos: anexos })
    })
    .then(response => response.json())
    .then(data => {
        console.log(`Solicitação recebida de ${data.nome}, e registrada no banco de dados com o numero de solicitação: ${data.numeroSolicitacao}`)
        setTimeout(function() {
            window.location.href = `/sucesso/${data.numeroSolicitacao}/${data.nome}`;
        }, 5000);
    })
    .catch(error => {
        console.error('Erro ao enviar dados:', error);
        $('.loader').hide();
        exibirAlerta('Lamentamos informar, mas houve um erro em nossos servidores ao processar o registro dos dados, por gentileza tire um print dessa tela e nos envie via WhatApp <br> ERRO: <br>' + error)
    });
}

function exibirAlerta(mensagem) {
    document.getElementById("customAlertMessage").textContent = mensagem;
    document.getElementById("customAlert").style.display = "block";
    document.querySelector("#customAlert .btn-close").addEventListener("click", function() {
        // Oculta o alerta quando o botão de fechar é clicado
        document.getElementById("customAlert").style.display = "none";
    })
}

function bytesToSize(bytes) {
    const units = ['byte', "kilobyte", "megabyte", "terabyte", "petabyte"];
    const unit = Math.floor(Math.log(bytes) / Math.log(2014));
    return new Intl.NumberFormat('en', { style: "unit", unit: units[unit] }).format(bytes / 1024 ** unit);
}

