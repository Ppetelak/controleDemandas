function voltarParaEtapaAnterior() {
    window.history.back(); // Isso simula o botão "Voltar" do navegador
}

/* function validarSelects(event) {
    var selects = document.querySelectorAll("select"); 
    var divToltip = document.querySelector('.messageError');
    var algumSelectInvalido = false;

    selects.forEach(function(select) {
        if (select.value === "" || select.value === "Selecione uma opção") {
            select.classList.add("is-invalid");
            select.setAttribute("data-bs-toggle", "tooltip");
            select.setAttribute("title", "Selecione uma opção");
            algumSelectInvalido = true;
        } else {
            select.classList.remove("is-invalid");
            select.removeAttribute("data-bs-toggle");
            select.removeAttribute("title");
        }
    });

    if (algumSelectInvalido) {
        event.preventDefault();
    }
} */

/* document.querySelector("form").addEventListener("submit", function(event) {
    validarSelects(event);
}); */