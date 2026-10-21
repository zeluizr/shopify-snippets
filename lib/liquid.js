// @ts-check
"use strict";

// Converte os dados oficiais de tags e filtros (Shopify/theme-liquid-docs) em
// snippets do VS Code. Lógica pura, sem `vscode`, para ser testável.

const DOCS = "https://shopify.dev/docs/api/liquid";

/**
 * Escapa o que o VS Code interpretaria no corpo de um snippet, fora de um campo.
 * Fora de campo, o `}` é literal e não precisa de escape.
 * @param {string} texto
 */
function escaparSnippet(texto) {
	return texto.replace(/\\/g, "\\\\").replace(/\$/g, "\\$");
}

/**
 * Escapa o texto padrão de um campo (`${1:texto}`), onde o `}` fecharia o campo.
 * @param {string} texto
 */
function escaparCampo(texto) {
	return escaparSnippet(texto).replace(/}/g, "\\}");
}

/**
 * Tira o markdown e as entidades HTML do resumo, para caber na descrição do snippet.
 * @param {string | undefined} texto
 */
function limparTexto(texto) {
	if (!texto) return "";
	return texto
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, "\"")
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Transforma o `syntax` de uma tag em corpo de snippet: cada palavra-chave do
 * `syntax_keywords` vira um campo editável, e a mesma palavra repetida reaproveita
 * o mesmo campo (no `paginate`, o `array` aparece duas vezes e muda junto).
 * @param {string} sintaxe
 * @param {string[]} palavras
 * @returns {string[]}
 */
function corpoDaSintaxe(sintaxe, palavras) {
	const indices = new Map();
	let proximo = 1;
	// As palavras mais longas primeiro, para `first_expression` não ser pego por `expression`.
	const ordenadas = [...palavras].filter(Boolean).sort((a, b) => b.length - a.length);
	const escapada = escaparSnippet(sintaxe);
	// Sem palavras-chave (a tag `block`, por exemplo), o template vai como está.
	const marcado = !ordenadas.length ? escapada : escapada.replace(
		new RegExp(`\\b(${ordenadas.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g"),
		(palavra) => `\u0000${palavra}\u0000`
	);
	const corpo = marcado.replace(/\u0000([^\u0000]+)\u0000/g, (_, palavra) => {
		if (!indices.has(palavra)) indices.set(palavra, proximo++);
		return `\${${indices.get(palavra)}:${palavra}}`;
	});
	// O dado oficial indenta com dois espaços; o snippet usa tab, que o VS Code
	// converte para a indentação do arquivo.
	return corpo.split("\n").map((linha) => linha.replace(/^( {2})+/, (m) => "\t".repeat(m.length / 2)));
}

/**
 * Tags que o dado oficial não descreve como um template só, e por isso ganham corpo à mão.
 * @type {Record<string, { corpo: string[], descricao?: string }[]>}
 */
const TAGS_A_MAO = {
	content_for: [
		{ corpo: ["{% content_for 'blocks' %}"], descricao: "Renderiza los bloques del tema que el comerciante agrega en el editor." },
		{ corpo: ["{% content_for 'block', type: '${1:tipo}', id: '${2:id}' %}"], descricao: "Renderiza un bloque estático, fijo en el código." }
	]
};

/**
 * @typedef {{ prefix: string, body: string[], description: string }} Snippet
 * @typedef {{ name: string, deprecated?: boolean, syntax?: string, summary?: string, syntax_keywords?: { keyword: string }[] }} Tag
 * @typedef {{ name: string, deprecated?: boolean, syntax: string, summary?: string }} Filtro
 */

/**
 * @param {Tag} tag
 * @returns {Record<string, Snippet>}
 */
function snippetsDaTag(tag) {
	const link = `${DOCS}/tags/${tag.name}`;
	const resumo = limparTexto(tag.summary);
	const especiais = TAGS_A_MAO[tag.name];
	if (especiais) {
		/** @type {Record<string, Snippet>} */
		const saida = {};
		especiais.forEach((e, i) => {
			const sufixo = especiais.length > 1 ? ` (${i + 1})` : "";
			saida[`tag ${tag.name}${sufixo}`] = {
				prefix: tag.name,
				body: e.corpo,
				description: `${e.descricao || resumo}\n${link}`
			};
		});
		return saida;
	}
	const palavras = (tag.syntax_keywords || []).map((k) => k.keyword);
	return {
		[`tag ${tag.name}`]: {
			prefix: tag.name,
			body: corpoDaSintaxe(tag.syntax || `{% ${tag.name} %}`, palavras),
			description: `${resumo}\n${link}`
		}
	};
}

/**
 * Corpo do filtro a partir do `syntax` ("variable | image_url: width: number, height: number"):
 * o que vem depois do `|`, com o tipo de cada parâmetro virando campo editável.
 * @param {Filtro} filtro
 */
function corpoDoFiltro(filtro) {
	const depoisDoPipe = filtro.syntax.split("|").slice(1).join("|").trim();
	const [nome, ...resto] = depoisDoPipe.split(":");
	if (!resto.length) return nome.trim();
	const parametros = resto.join(":").split(",").map((p) => p.trim()).filter(Boolean);
	let n = 1;
	const partes = parametros.map((p) => {
		const nomeado = p.match(/^([\w-]+):\s*(.+)$/);
		if (nomeado) return `${nomeado[1]}: \${${n++}:${escaparCampo(nomeado[2])}}`;
		return `\${${n++}:${escaparCampo(p)}}`;
	});
	return `${nome.trim()}: ${partes.join(", ")}`;
}

/**
 * @param {Filtro} filtro
 * @returns {Record<string, Snippet>}
 */
function snippetsDoFiltro(filtro) {
	return {
		[`filtro ${filtro.name}`]: {
			prefix: filtro.name,
			body: [corpoDoFiltro(filtro)],
			description: `${limparTexto(filtro.summary)}\n${filtro.syntax}\n${DOCS}/filters/${filtro.name}`
		}
	};
}

/**
 * Todos os snippets de Liquid, em ordem estável (tags e depois filtros, cada grupo por nome).
 * Os descontinuados ficam de fora.
 * @param {Tag[]} tags
 * @param {Filtro[]} filtros
 */
function snippetsDeLiquid(tags, filtros) {
	/** @type {Record<string, Snippet>} */
	const saida = {};
	const porNome = (/** @type {{name: string}} */ a, /** @type {{name: string}} */ b) => a.name.localeCompare(b.name);
	for (const tag of [...tags].filter((t) => !t.deprecated).sort(porNome)) Object.assign(saida, snippetsDaTag(tag));
	for (const filtro of [...filtros].filter((f) => !f.deprecated).sort(porNome)) Object.assign(saida, snippetsDoFiltro(filtro));
	return saida;
}

module.exports = { escaparSnippet, escaparCampo, limparTexto, corpoDaSintaxe, corpoDoFiltro, snippetsDaTag, snippetsDoFiltro, snippetsDeLiquid, TAGS_A_MAO };
