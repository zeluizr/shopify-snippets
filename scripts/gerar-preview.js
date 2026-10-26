// @ts-check
"use strict";

// Gera images/preview.png (1280x720): a imagem do README com a extensão em uso,
// no estilo da do vtex-io-snippets. Monta uma janela do VS Code em SVG e rasteriza
// com o `sharp` (devDependency).
//
// O que aparece vem dos artefatos REAIS da extensão, não de texto digitado à mão:
//   - as sugestões e as descrições saem de snippets/settings.code-snippets;
//   - o erro sublinhado e a mensagem do painel de Problemas saem de
//     lib/schema.js validando o próprio arquivo da imagem.
// As cores são as do Dark Modern, o tema padrão do VS Code: a extensão não traz
// tema próprio. O código é tokenizado à mão, porque não há gramática fora do editor.
//
//   node scripts/gerar-preview.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { validarLiquid } = require("../lib/schema");

const RAIZ = path.join(__dirname, "..");
const SAIDA = path.join(RAIZ, "images", "preview.png");
const snippets = JSON.parse(fs.readFileSync(path.join(RAIZ, "snippets", "settings.code-snippets"), "utf8"));

// --- paleta (Dark Modern) -----------------------------------------------------

const COR = {
	fundo: "#1F1F1F",
	editor: "#1F1F1F",
	lateral: "#181818",
	atividade: "#181818",
	borda: "#2B2B2B",
	abaInativa: "#181818",
	abaAtiva: "#1F1F1F",
	abaRealce: "#0078D4",
	texto: "#CCCCCC",
	textoFraco: "#9D9D9D",
	numero: "#6E7681",
	numeroAtual: "#CCCCCC",
	linhaAtual: "#282828",
	selecaoArvore: "#37373D",
	sugestaoFundo: "#202020",
	sugestaoBorda: "#454545",
	sugestaoSel: "#04395E",
	sugestaoRealce: "#2AAAFF",
	status: "#181818",
	erro: "#F85149",
	badge: "#616161",
	// sintaxe
	delim: "#569CD6",
	tag: "#C586C0",
	html: "#569CD6",
	attr: "#9CDCFE",
	str: "#CE9178",
	chave: "#9CDCFE",
	num: "#B5CEA8",
	pont: "#CCCCCC",
	filtro: "#DCDCAA",
	// arquivos .liquid: azul-claro da marca (nada de cor de plataforma)
	liquid: "#7FBBD8"
};

// --- geometria ----------------------------------------------------------------

const W = 1280;
const H = 720;
const ACT = 48;
const SIDE = 290;
const TAB = 36;
const STATUS = 22;
const PANEL = 92;
const PANEL_Y = H - STATUS - PANEL;
const EDX = SIDE + 1;
const GUT = 46;
const CODE_X = EDX + GUT + 14;
const CODE_Y = TAB + 26;
const LH = 22;
const FS = 13;
const CH = 7.83;
const UI = "-apple-system, Helvetica, Arial, sans-serif";
const MONO = "Menlo, DejaVu Sans Mono, monospace";

const linhaY = (/** @type {number} */ n) => CODE_Y + (n - 1) * LH;
const colX = (/** @type {number} */ col) => CODE_X + col * CH;
const esc = (/** @type {string} */ s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rect = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ w, /** @type {number} */ h, /** @type {string} */ fill, extra = "") =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`;
/** @param {number} x @param {number} y @param {string} s @param {string} cor */
const ui = (x, y, s, cor, size = 12.5, extra = "") => `<text x="${x}" y="${y}" font-family="${UI}" font-size="${size}" fill="${cor}"${extra}>${esc(s)}</text>`;

/** @param {number} x @param {number} y @param {[string, string][]} partes */
function codigo(x, y, partes) {
	const spans = partes.map(([t, cor]) => `<tspan fill="${cor}">${esc(t)}</tspan>`).join("");
	return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${FS}" xml:space="preserve">${spans}</text>`;
}

/** @param {number} x @param {number} y @param {number} largura @param {string} cor */
function rabisco(x, y, largura, cor) {
	let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
	for (let i = 0; i * 4 < largura; i++) d += ` q 2 ${i % 2 === 0 ? -1.7 : 1.7} 4 0`;
	return `<path d="${d}" fill="none" stroke="${cor}" stroke-width="1.1" stroke-linecap="round"/>`;
}

// --- conteúdo: sections/hero.liquid de um tema Horizon ---------------------------

const C = COR;
/** @type {[string, string][][]} */
const LINHAS = [
	[["<", C.pont], ["div", C.html], [" ", C.pont], ["class", C.attr], ["=", C.pont], ["\"hero\"", C.str], [">", C.pont]],
	[["  ", C.pont], ["{%", C.delim], [" if ", C.tag], ["section.settings.imagen", C.attr], [" != ", C.pont], ["blank", C.tag], [" %}", C.delim]],
	[["    ", C.pont], ["{{", C.delim], [" section.settings.imagen ", C.attr], ["| ", C.pont], ["image_url", C.filtro], [": width: ", C.pont], ["1600", C.num], [" | ", C.pont], ["image_tag", C.filtro], [" }}", C.delim]],
	[["  ", C.pont], ["{%", C.delim], [" endif ", C.tag], ["%}", C.delim]],
	[["  ", C.pont], ["{%", C.delim], [" content_for ", C.tag], ["'blocks'", C.str], [" %}", C.delim]],
	[["</", C.pont], ["div", C.html], [">", C.pont]],
	[],
	[["{%", C.delim], [" schema ", C.tag], ["%}", C.delim]],
	[["{", C.pont]],
	[["  ", C.pont], ["\"name\"", C.chave], [": ", C.pont], ["\"Hero\"", C.str], [",", C.pont]],
	[["  ", C.pont], ["\"settings\"", C.chave], [": [", C.pont]],
	[["    { ", C.pont], ["\"type\"", C.chave], [": ", C.pont], ["\"image_picker\"", C.str], [", ", C.pont], ["\"id\"", C.chave], [": ", C.pont], ["\"imagen\"", C.str], [", ", C.pont], ["\"label\"", C.chave], [": ", C.pont], ["\"Imagen\"", C.str], [" },", C.pont]],
	[["    { ", C.pont], ["\"type\"", C.chave], [": ", C.pont], ["\"colour\"", C.str], [", ", C.pont], ["\"id\"", C.chave], [": ", C.pont], ["\"fondo\"", C.str], [", ", C.pont], ["\"label\"", C.chave], [": ", C.pont], ["\"Fondo\"", C.str], [" },", C.pont]],
	[["    ", C.pont], ["setting-ra", C.texto]],
	[["  ],", C.pont]],
	[["  ", C.pont], ["\"blocks\"", C.chave], [": [{ ", C.pont], ["\"type\"", C.chave], [": ", C.pont], ["\"@theme\"", C.str], [" }],", C.pont]],
	[["  ", C.pont], ["\"presets\"", C.chave], [": [{ ", C.pont], ["\"name\"", C.chave], [": ", C.pont], ["\"Hero\"", C.str], [" }]", C.pont]],
	[["}", C.pont]],
	[["{%", C.delim], [" endschema ", C.tag], ["%}", C.delim]]
];
const CURSOR = 14;
const DIGITADO = "setting-ra";
const textoDaLinha = (/** @type {number} */ n) => (LINHAS[n - 1] || []).map(([t]) => t).join("");

// O arquivo validado é o da imagem sem a linha que está sendo digitada (o resto é
// JSON válido); a mensagem e o trecho sublinhado saem do validador de verdade.
// Sem a linha do cursor, o último setting fica com vírgula sobrando antes do `]`.
const arquivo = LINHAS.filter((_, i) => i + 1 !== CURSOR)
	.map((l) => l.map(([t]) => t).join(""))
	.join("\n")
	.replace(/ },\n {2}\],/, " }\n  ],");
const problemas = validarLiquid("sections/hero.liquid", arquivo);
if (problemas.length !== 1) throw new Error(`esperava 1 problema do validador, veio ${problemas.length}: ${JSON.stringify(problemas)}`);
const PROBLEMA = problemas[0];
const trecho = arquivo.slice(PROBLEMA.inicio, PROBLEMA.fim);
const linhaDoErro = arquivo.slice(0, PROBLEMA.inicio).split("\n").length;
const colunaDoErro = PROBLEMA.inicio - arquivo.lastIndexOf("\n", PROBLEMA.inicio - 1) - 1;
// linhaDoErro conta o arquivo sem o cursor; na imagem, as linhas depois do cursor descem uma.
const LINHA_ERRO = linhaDoErro >= CURSOR ? linhaDoErro + 1 : linhaDoErro;

// As sugestões: os snippets reais cujo prefixo casa com o que foi digitado, na ordem
// em que o VS Code os mostra (por prefixo).
const SUGESTOES = Object.values(snippets)
	.filter((s) => s.prefix.startsWith(DIGITADO))
	.sort((a, b) => a.prefix.localeCompare(b.prefix))
	.map((s) => ({ prefixo: s.prefix, descricao: s.description.split("\n")[0] }));
if (!SUGESTOES.length) throw new Error(`nenhum snippet ${DIGITADO}* encontrado`);

// --- desenho ------------------------------------------------------------------

function janela() {
	let s = rect(0, 0, W, H, COR.fundo);
	// barra de atividade
	s += rect(0, 0, ACT, H - STATUS, COR.atividade);
	s += rect(ACT, 0, 1, H - STATUS, COR.borda);
	const icones = [24, 72, 120, 168];
	icones.forEach((y, i) => {
		const cor = i === 0 ? COR.texto : COR.textoFraco;
		s += `<rect x="${ACT / 2 - 10}" y="${y - 10}" width="20" height="20" rx="3" fill="none" stroke="${cor}" stroke-width="1.6"/>`;
	});
	s += rect(0, 14, 2, 20, COR.texto);
	return s;
}

function lateral() {
	let s = rect(ACT + 1, 0, SIDE - ACT - 1, H - STATUS, COR.lateral);
	s += rect(SIDE, 0, 1, H - STATUS, COR.borda);
	s += ui(ACT + 20, 24, "EXPLORADOR", COR.textoFraco, 11, " letter-spacing=\"0.5\"");
	s += ui(ACT + 14, 52, "⌄  VINO-THEME", COR.texto, 11, " font-weight=\"600\" letter-spacing=\"0.4\"");
	/** @type {[number, string, boolean, boolean?][]} nível, nome, pasta, aberta/selecionado */
	const arvore = [
		[0, "assets", true],
		[0, "blocks", true],
		[0, "config", true],
		[0, "layout", true],
		[0, "locales", true],
		[0, "sections", true, true],
		[1, "footer-group.json", false],
		[1, "header-group.json", false],
		[1, "hero.liquid", false, true],
		[1, "main-product.liquid", false],
		[1, "product-list.liquid", false],
		[0, "snippets", true],
		[0, "templates", true]
	];
	arvore.forEach(([nivel, nome, pasta, marca], i) => {
		const y = 76 + i * 22;
		if (!pasta && marca) s += rect(ACT + 1, y - 15, SIDE - ACT - 1, 22, COR.selecaoArvore);
		const x = ACT + 22 + nivel * 16;
		if (pasta) s += ui(x, y, marca ? "⌄" : "›", COR.textoFraco, 12);
		const corIcone = pasta ? "#C09553" : nome.endsWith(".json") ? "#CBCB41" : COR.liquid;
		s += rect(x + 14, y - 10, 10, 10, corIcone, " rx=\"2\"");
		s += ui(x + 30, y, nome, COR.texto, 12.5);
	});
	return s;
}

function abas() {
	let s = rect(EDX, 0, W - EDX, TAB, COR.abaInativa);
	s += rect(EDX, TAB - 1, W - EDX, 1, COR.borda);
	const lista = [["hero.liquid", true], ["settings_schema.json", false], ["es.json", false]];
	let x = EDX;
	for (const [nome, ativa] of lista) {
		const larg = 40 + String(nome).length * 7.2;
		if (ativa) {
			s += rect(x, 0, larg, TAB, COR.abaAtiva);
			s += rect(x, 0, larg, 2, COR.abaRealce);
		}
		s += rect(x + 12, 13, 10, 10, String(nome).endsWith(".json") ? "#CBCB41" : COR.liquid, " rx=\"2\"");
		s += ui(x + 28, 23, String(nome), ativa ? COR.texto : COR.textoFraco, 12.5);
		s += rect(x + larg, 0, 1, TAB, COR.borda);
		x += larg + 1;
	}
	return s;
}

function editor() {
	let s = rect(EDX, TAB, W - EDX, PANEL_Y - TAB, COR.editor);
	s += rect(EDX, linhaY(CURSOR) - 16, W - EDX, LH, COR.linhaAtual);
	LINHAS.forEach((partes, i) => {
		const n = i + 1;
		const y = linhaY(n);
		s += `<text x="${EDX + GUT}" y="${y}" font-family="${MONO}" font-size="12" fill="${n === CURSOR ? COR.numeroAtual : COR.numero}" text-anchor="end">${n}</text>`;
		if (partes.length) s += codigo(CODE_X, y, partes);
	});
	// cursor no fim do que foi digitado
	const fim = textoDaLinha(CURSOR).length;
	s += rect(colX(fim) + 1, linhaY(CURSOR) - 14, 2, 18, "#AEAFAD");
	// erro do validador
	const col = textoDaLinha(LINHA_ERRO).indexOf(trecho);
	if (col < 0) throw new Error(`trecho do erro não está na linha ${LINHA_ERRO}: ${trecho}`);
	s += rabisco(colX(col), linhaY(LINHA_ERRO) + 4, trecho.length * CH, COR.erro);
	return s;
}

function sugestoes() {
	const x = colX(textoDaLinha(CURSOR).indexOf(DIGITADO));
	const y = linhaY(CURSOR) + 8;
	const LARG = 520;
	const RH = 24;
	const alt = SUGESTOES.length * RH + 8;
	let s = "";
	for (let d = 6; d >= 1; d--) s += rect(x - d + 3, y - d + 4, LARG + 2 * d, alt + 2 * d, "rgba(0,0,0,0.12)", " rx=\"4\"");
	s += rect(x, y, LARG, alt, COR.sugestaoFundo, " rx=\"3\"");
	s += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${LARG - 1}" height="${alt - 1}" rx="3" fill="none" stroke="${COR.sugestaoBorda}"/>`;
	SUGESTOES.forEach(({ prefixo, descricao }, i) => {
		const ry = y + 4 + i * RH;
		if (i === 0) s += rect(x + 1, ry, LARG - 2, RH, COR.sugestaoSel);
		// ícone de snippet: retângulo com linhas
		s += `<rect x="${x + 10}" y="${ry + 6}" width="13" height="12" rx="1.5" fill="none" stroke="${COR.texto}" stroke-width="1.2"/>`;
		s += rect(x + 13, ry + 10, 7, 1.2, COR.texto) + rect(x + 13, ry + 13.5, 5, 1.2, COR.texto);
		s +=
			`<text x="${x + 32}" y="${ry + 17}" font-family="${MONO}" font-size="13" xml:space="preserve">` +
			`<tspan fill="${COR.sugestaoRealce}" font-weight="600">${esc(DIGITADO)}</tspan>` +
			`<tspan fill="${COR.texto}">${esc(prefixo.slice(DIGITADO.length))}</tspan></text>`;
		s += ui(x + LARG - 12, ry + 17, descricao, COR.textoFraco, 11.5, " text-anchor=\"end\"");
	});
	return s;
}

function painel() {
	let s = rect(EDX, PANEL_Y, W - EDX, PANEL, COR.editor);
	s += rect(EDX, PANEL_Y, W - EDX, 1, COR.borda);
	s += ui(EDX + 18, PANEL_Y + 22, "PROBLEMAS", COR.texto, 11, " letter-spacing=\"0.5\"");
	s += rect(EDX + 98, PANEL_Y + 11, 17, 14, COR.badge, " rx=\"7\"");
	s += ui(EDX + 106.5, PANEL_Y + 22, "1", "#FFFFFF", 10, " text-anchor=\"middle\"");
	s += rect(EDX + 16, PANEL_Y + 30, 102, 1, COR.texto);
	s += ui(EDX + 142, PANEL_Y + 22, "SALIDA", COR.textoFraco, 11, " letter-spacing=\"0.5\"");
	s += ui(EDX + 208, PANEL_Y + 22, "TERMINAL", COR.textoFraco, 11, " letter-spacing=\"0.5\"");
	s += ui(EDX + 24, PANEL_Y + 52, "⌄", COR.textoFraco, 12);
	s += rect(EDX + 40, PANEL_Y + 42, 10, 10, COR.liquid, " rx=\"2\"");
	s += ui(EDX + 56, PANEL_Y + 52, "hero.liquid", COR.texto, 12.5);
	s += ui(EDX + 136, PANEL_Y + 52, "sections", COR.textoFraco, 12);
	s += `<circle cx="${EDX + 50}" cy="${PANEL_Y + 72}" r="6" fill="${COR.erro}"/>`;
	s += ui(EDX + 47.3, PANEL_Y + 75.8, "×", "#FFFFFF", 10);
	s += ui(EDX + 64, PANEL_Y + 76, PROBLEMA.mensagem, COR.texto, 12.5);
	s += ui(W - 24, PANEL_Y + 76, `Snippets for Shopify  [Ln ${LINHA_ERRO}, Col ${colunaDoErro + 1}]`, COR.textoFraco, 12, " text-anchor=\"end\"");
	return s;
}

function barraDeStatus() {
	let s = rect(0, H - STATUS, W, STATUS, COR.status);
	s += rect(0, H - STATUS, W, 1, COR.borda);
	s += ui(14, H - 7, "dev", COR.textoFraco, 11.5);
	s += `<circle cx="52" cy="${H - 11}" r="5" fill="none" stroke="${COR.erro}" stroke-width="1.2"/>`;
	s += ui(62, H - 7, "1", COR.textoFraco, 11.5);
	s += ui(W - 14, H - 7, "Liquid    Snippets for Shopify", COR.textoFraco, 11.5, " text-anchor=\"end\"");
	return s;
}

function svg() {
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
		janela() +
		lateral() +
		abas() +
		editor() +
		painel() +
		barraDeStatus() +
		sugestoes() +
		"</svg>"
	);
}

fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
sharp(Buffer.from(svg()))
	.png({ compressionLevel: 9 })
	.toFile(SAIDA)
	.then((m) => console.log(`images/preview.png ${m.width}x${m.height}, ${(m.size / 1024).toFixed(0)} kB — erro: "${PROBLEMA.mensagem}"`))
	.catch((erro) => {
		console.error(erro.message);
		process.exit(1);
	});
