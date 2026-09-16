import './style.css';

const form = document.querySelector('#quoteForm');
const submitButton = form?.querySelector('button[type="submit"]');
const apiUrl = import.meta.env.VITE_API_URL || '/api/orcamento';

form?.addEventListener('submit', async (event) => {
	event.preventDefault();

	if (!form.checkValidity()) {
		form.reportValidity();
		return;
	}

	const originalLabel = submitButton.textContent;
	submitButton.disabled = true;
	submitButton.textContent = 'ENVIANDO...';

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(Object.fromEntries(new FormData(form))),
		});

		const responseText = await response.text();
		let result = {};

		try {
			result = responseText ? JSON.parse(responseText) : {};
		} catch {
			throw new Error('A API retornou uma resposta inválida. Verifique se o servidor está rodando.');
		}

		if (!response.ok) {
			throw new Error(result.error || `Não foi possível enviar o orçamento (HTTP ${response.status}).`);
		}

		form.reset();
		alert('Orçamento enviado! Em breve entraremos em contato.');
	} catch (error) {
		alert(error.message || 'Não foi possível enviar o orçamento. Tente novamente.');
	} finally {
		submitButton.disabled = false;
		submitButton.textContent = originalLabel;
	}
});
