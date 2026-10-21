// @ts-check
"use strict";

// Valida o JSON dentro de {% schema %} de sections/*.liquid e blocks/*.liquid contra
// os esquemas oficiais da Shopify (schemas/theme, de Shopify/theme-liquid-docs).
// Lógica pura, sem `vscode`: devolve erros com offsets, e o extension.js converte
// para posições do editor.

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const jsonc = require("jsonc-parser");

const BASE = "https://schemas.shopify-snippets.local/theme/";
const PASTA = path.join(__dirname, "..", "schemas", "theme");

/** @type {import("ajv").default | undefined} */
let ajv;

function validador() {
	if (ajv) return ajv;
	// `strict: false` porque os esquemas da Shopify usam palavras do VS Code
	// (markdownDescription, deprecationMessage, errorMessage...) que o ajv não conhece.
	// `verbose` põe o subesquema em cada erro, de onde sai a mensagem própria da Shopify.
	ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true, verbose: true });
	for (const arquivo of fs.readdirSync(PASTA).filter((f) => f.endsWith(".json")).sort()) {
		const esquema = JSON.parse(fs.readFileSync(path.join(PASTA, arquivo), "utf8"));
		esquema.$id = BASE + arquivo;
		ajv.addSchema(esquema);
	}
	return ajv;
}

/**
 * Qual esquema vale para o arquivo, pela pasta em que ele está (como no
 * manifest_theme.json oficial). `undefined` quando o arquivo não tem esquema.
 * @param {string} caminho
 */
function esquemaDoArquivo(caminho) {
	const partes = caminho.split(/[\\/]/);
	const pasta = partes[partes.length - 2];
	if (!caminho.endsWith(".liquid")) return undefined;
	if (pasta === "sections") return "section.json";
	if (pasta === "blocks") return "theme_block.json";
	return undefined;
}

/**
 * Acha o conteúdo de {% schema %} ... {% endschema %} (com ou sem os traços de
 * controle de espaço). `inicio` é o offset do primeiro caractere do JSON.
 * @param {string} texto
 * @returns {{ inicio: number, conteudo: string } | undefined}
 */
function extrairSchema(texto) {
	const m = /{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/.exec(texto);
	if (!m) return undefined;
	return { inicio: m.index + m[0].indexOf(m[1], m[0].indexOf("%}") + 2), conteudo: m[1] };
}

/**
 * Distância de edição (Levenshtein), para sugerir a opção mais próxima.
 * @param {string} a
 * @param {string} b
 */
function distancia(a, b) {
	const linha = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let diagonal = linha[0];
		linha[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const acima = linha[j];
			linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
			diagonal = acima;
		}
	}
	return linha[b.length];
}

/** Até quantas opções a mensagem lista todas; acima disso, sugere a mais próxima. */
const MAX_OPCOES = 6;

/**
 * @param {unknown} valor o valor digitado
 * @param {unknown[]} permitidos
 */
function mensagemDeEnum(valor, permitidos) {
	if (permitidos.length <= MAX_OPCOES) return `Valor no permitido. Opciones: ${permitidos.map((v) => JSON.stringify(v)).join(", ")}.`;
	if (typeof valor === "string") {
		const candidatos = permitidos.filter((v) => typeof v === "string").map((v) => ({ v: String(v), d: distancia(valor.toLowerCase(), String(v).toLowerCase()) }));
		candidatos.sort((a, b) => a.d - b.d || a.v.localeCompare(b.v));
		const melhor = candidatos[0];
		if (melhor && melhor.d <= Math.max(2, Math.floor(valor.length / 3))) return `Valor ${JSON.stringify(valor)} no permitido. ¿Quisiste decir ${JSON.stringify(melhor.v)}?`;
	}
	return `Valor ${JSON.stringify(valor)} no permitido (hay ${permitidos.length} opciones válidas).`;
}

/** @type {Record<string, (e: import("ajv").ErrorObject) => string>} */
const MENSAGENS = {
	required: (e) => `Falta la propiedad obligatoria "${e.params.missingProperty}".`,
	additionalProperties: (e) => `La propiedad "${e.params.additionalProperty}" no está permitida aquí.`,
	enum: (e) => mensagemDeEnum(e.data, e.params.allowedValues),
	const: (e) => `El valor debe ser ${JSON.stringify(e.params.allowedValue)}.`,
	type: (e) => `Se esperaba ${e.params.type}.`,
	minimum: (e) => `Debe ser mayor o igual a ${e.params.limit}.`,
	maximum: (e) => `Debe ser menor o igual a ${e.params.limit}.`,
	minItems: (e) => `Debe tener al menos ${e.params.limit} elemento(s).`,
	maxItems: (e) => `Debe tener como máximo ${e.params.limit} elemento(s).`,
	minLength: (e) => `Debe tener al menos ${e.params.limit} carácter(es).`,
	maxLength: (e) => `Debe tener como máximo ${e.params.limit} carácter(es).`,
	pattern: () => "El valor no tiene el formato esperado.",
	uniqueItems: () => "Los elementos deben ser únicos."
};

/**
 * Palavras-chave que só agrupam outras (if/then, anyOf...) e repetiriam o mesmo
 * erro com outro texto. Os erros de verdade vêm junto, nas palavras de baixo.
 */
const AGRUPADORAS = new Set(["if", "anyOf", "oneOf", "allOf", "not", "then", "else"]);

/**
 * @param {import("ajv").ErrorObject} erro
 * @param {Record<string, any>} esquema o subesquema do erro, para a mensagem própria da Shopify
 */
function mensagem(erro, esquema) {
	const propria = esquema && (esquema.errorMessage || esquema.patternErrorMessage);
	if (typeof propria === "string" && erro.keyword !== "required" && erro.keyword !== "additionalProperties") return propria;
	const traduzir = MENSAGENS[erro.keyword];
	return traduzir ? traduzir(erro) : erro.message || "Valor inválido.";
}

/**
 * @typedef {{ inicio: number, fim: number, mensagem: string, severidade: "erro" | "aviso" }} Problema
 */

/**
 * Converte o instancePath do ajv ("/settings/0/type") no nó do JSON, para marcar o
 * trecho certo. Em erro de propriedade sobrando, marca a chave sobrando.
 * @param {jsonc.Node} arvore
 * @param {import("ajv").ErrorObject} erro
 */
function noDoErro(arvore, erro) {
	const caminho = erro.instancePath
		.split("/")
		.slice(1)
		.map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"))
		.map((p) => (/^\d+$/.test(p) ? Number(p) : p));
	let no = jsonc.findNodeAtLocation(arvore, caminho) || arvore;
	if (erro.keyword === "additionalProperties" && no.type === "object") {
		const prop = (no.children || []).find((c) => c.children && c.children[0].value === erro.params.additionalProperty);
		if (prop && prop.children) no = prop.children[0];
	} else if (no.parent && no.parent.type === "property" && no.parent.children && no.parent.children[1] === no && no.type !== "object" && no.type !== "array") {
		// Valor primitivo: marca o valor, que é o que está errado.
	} else if (no.type === "object" && no.parent && no.parent.type === "property" && no.parent.children) {
		// Objeto inteiro: marca só a chave, para não sublinhar dezenas de linhas.
		no = no.parent.children[0];
	}
	return no;
}

/**
 * Valida o texto de um arquivo .liquid. Devolve a lista de problemas com offsets no
 * texto inteiro; lista vazia quando está tudo certo ou quando o arquivo não tem esquema.
 * @param {string} caminho
 * @param {string} texto
 * @returns {Problema[]}
 */
function validarLiquid(caminho, texto) {
	const nome = esquemaDoArquivo(caminho);
	if (!nome) return [];
	const bloco = extrairSchema(texto);
	if (!bloco) return [];

	/** @type {jsonc.ParseError[]} */
	const errosDeSintaxe = [];
	const arvore = jsonc.parseTree(bloco.conteudo, errosDeSintaxe, { allowTrailingComma: false, disallowComments: true });
	if (errosDeSintaxe.length || !arvore) {
		return errosDeSintaxe.map((e) => ({
			inicio: bloco.inicio + e.offset,
			fim: bloco.inicio + e.offset + Math.max(e.length, 1),
			mensagem: `JSON inválido en {% schema %}: ${jsonc.printParseErrorCode(e.error)}.`,
			severidade: "erro"
		}));
	}

	const valor = jsonc.getNodeValue(arvore);
	const validar = validador().getSchema(BASE + nome);
	if (!validar || validar(valor)) return [];

	/** @type {Problema[]} */
	const problemas = [];
	const vistos = new Set();
	for (const erro of validar.errors || []) {
		if (AGRUPADORAS.has(erro.keyword)) continue;
		const no = noDoErro(arvore, erro);
		const texto = mensagem(erro, /** @type {any} */ (erro.parentSchema));
		const chave = `${no.offset}:${texto}`;
		if (vistos.has(chave)) continue;
		vistos.add(chave);
		problemas.push({ inicio: bloco.inicio + no.offset, fim: bloco.inicio + no.offset + no.length, mensagem: texto, severidade: "erro" });
	}
	return problemas;
}

module.exports = { esquemaDoArquivo, extrairSchema, validarLiquid, validador, mensagemDeEnum, BASE };
