import http from 'node:http';
import { Resend } from 'resend';

const port = Number(process.env.PORT || 3001);
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const recipient = process.env.BUDGET_EMAIL || 'p2tdigitaltech@gmail.com';
const sender = process.env.RESEND_FROM;

const escapeHtml = (value = '') => String(value)
	.replaceAll('&', '&amp;')
	.replaceAll('<', '&lt;')
	.replaceAll('>', '&gt;')
	.replaceAll('"', '&quot;')
	.replaceAll("'", '&#039;');

const readJsonBody = (request) => new Promise((resolve, reject) => {
	let body = '';

	request.on('data', (chunk) => {
		body += chunk;
		if (body.length > 100_000) {
			reject(new Error('Payload muito grande.'));
			request.destroy();
		}
	});

	request.on('end', () => {
		try {
			resolve(JSON.parse(body || '{}'));
		} catch {
			reject(new Error('JSON inválido.'));
		}
	});

	request.on('error', reject);
});

const requiredFields = ['nome', 'whatsapp'];

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

const server = http.createServer(async (request, response) => {
	response.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || 'http://localhost:5173');
	response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

	if (request.method === 'OPTIONS') {
		response.writeHead(204).end();
		return;
	}

	if (request.method !== 'POST' || request.url !== '/api/orcamento') {
		response.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Rota não encontrada.' }));
		return;
	}

	if (!resend || !sender) {
		response.writeHead(503, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Serviço de e-mail não configurado.' }));
		return;
	}

	try {
		const data = await readJsonBody(request);
		const missingField = requiredFields.find((field) => !String(data[field] || '').trim());

		if (missingField) {
			response.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: `O campo ${missingField} é obrigatório.` }));
			return;
		}

		const email = buildEmail(data);
		const { error } = await resend.emails.send({
			from: sender,
			to: [recipient],
			replyTo: data.email || undefined,
			subject: `Novo orçamento: ${data.nome}${data.negocio ? ` - ${data.negocio}` : ''}`,
			...email,
		});

		if (error) {
			console.error('Resend error:', error);
			response.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'O provedor de e-mail recusou o envio.' }));
			return;
		}

		response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true }));
	} catch (error) {
		console.error('Budget request error:', error);
		response.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message || 'Não foi possível processar o orçamento.' }));
	}
});

server.listen(port, () => {
	console.log(`P2T API ouvindo em http://localhost:${port}`);
});
