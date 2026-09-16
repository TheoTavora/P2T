import { Resend } from 'resend';

const requiredFields = ['nome', 'whatsapp'];

const escapeHtml = (value = '') => String(value)
	.replaceAll('&', '&amp;')
	.replaceAll('<', '&lt;')
	.replaceAll('>', '&gt;')
	.replaceAll('"', '&quot;')
	.replaceAll("'", '&#039;');

const buildEmail = (data) => {
	const labels = {
		nome: 'Nome',
		negocio: 'Negócio',
		whatsapp: 'WhatsApp',
		email: 'E-mail',
		tipo: 'Tipo de projeto',
		material: 'Identidade visual',
		prazo: 'Prazo desejado',
		detalhes: 'Detalhes',
	};

	const rows = Object.entries(labels).map(([key, label]) => (
		`<tr><td style="padding:8px 12px;font-weight:bold">${label}</td><td style="padding:8px 12px">${escapeHtml(data[key] || '-')}</td></tr>`
	)).join('');

	const text = Object.entries(labels)
		.map(([key, label]) => `${label}: ${data[key] || '-'}`)
		.join('\n');

	return {
		text,
		html: `<h2>Novo orçamento pelo site P2T Digital</h2><table border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>`,
	};
};

export default async function handler(request, response) {
	response.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || '*');
	response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

	if (request.method === 'OPTIONS') {
		return response.status(204).end();
	}

	if (request.method !== 'POST') {
		return response.status(405).json({ error: 'Método não permitido.' });
	}

	if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
		return response.status(503).json({ error: 'Serviço de e-mail não configurado.' });
	}

	try {
		const data = typeof request.body === 'string'
			? JSON.parse(request.body || '{}')
			: request.body || {};
		const missingField = requiredFields.find((field) => !String(data[field] || '').trim());

		if (missingField) {
			return response.status(400).json({ error: `O campo ${missingField} é obrigatório.` });
		}

		const resend = new Resend(process.env.RESEND_API_KEY);
		const email = buildEmail(data);
		const { error } = await resend.emails.send({
			from: process.env.RESEND_FROM,
			to: [process.env.BUDGET_EMAIL || 'p2tdigitaltech@gmail.com'],
			replyTo: data.email || undefined,
			subject: `Novo orçamento: ${data.nome}${data.negocio ? ` - ${data.negocio}` : ''}`,
			...email,
		});

		if (error) {
			console.error('Resend error:', error);
			return response.status(502).json({ error: 'O provedor de e-mail recusou o envio.' });
		}

		return response.status(200).json({ ok: true });
	} catch (error) {
		console.error('Budget request error:', error);
		return response.status(400).json({ error: error.message || 'Não foi possível processar o orçamento.' });
	}
}
