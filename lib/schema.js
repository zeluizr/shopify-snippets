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

/** Nome em espanhol de cada tipo do JSON Schema, para as mensagens de tipo errado. */
const TIPOS = {
	string: "un texto",
	number: "un número",
	integer: "un número entero",
	boolean: "true o false",
	object: "un objeto",
	array: "una lista",
	null: "null"
};

/**
 * Tipo JSON do valor, no vocabulário do JSON Schema.
 * @param {unknown} valor
 */
function tipoDe(valor) {
	if (valor === null) return "null";
	if (Array.isArray(valor)) return "array";
	return typeof valor;
}

/**
 * "Se esperaba un número, pero hay un texto." O ajv manda o tipo esperado como
 * "string" ou, em união, "string,array".
 * @param {string | string[]} esperado
 * @param {unknown} valor
 */
function mensagemDeTipo(esperado, valor) {
	const lista = (Array.isArray(esperado) ? esperado : String(esperado).split(",")).map((t) => /** @type {Record<string, string>} */ (TIPOS)[t] || t);
	const texto = lista.length > 1 ? `${lista.slice(0, -1).join(", ")} o ${lista[lista.length - 1]}` : lista[0];
	const atual = /** @type {Record<string, string>} */ (TIPOS)[tipoDe(valor)];
	return atual ? `Se esperaba ${texto}, pero hay ${atual}.` : `Se esperaba ${texto}.`;
}

/** @type {Record<string, (e: import("ajv").ErrorObject) => string>} */
const MENSAGENS = {
	required: (e) => `Falta la propiedad obligatoria "${e.params.missingProperty}".`,
	additionalProperties: (e) => `La propiedad "${e.params.additionalProperty}" no está permitida aquí.`,
	enum: (e) => mensagemDeEnum(e.data, e.params.allowedValues),
	const: (e) => `El valor debe ser ${JSON.stringify(e.params.allowedValue)}.`,
	type: (e) => mensagemDeTipo(e.params.type, e.data),
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
 * A propriedade que identifica um objeto, para marcar no lugar dele inteiro.
 * @param {jsonc.Node} objeto
 * @returns {jsonc.Node | undefined}
 */
function identificador(objeto) {
	const props = objeto.children || [];
	for (const chave of ["type", "name", "id"]) {
		const prop = props.find((c) => c.children && c.children[0].value === chave);
		if (prop) return prop;
	}
	return props[0];
}

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
	} else if (no.type === "object") {
		// Objeto sem chave (item de lista ou a raiz do schema): marca a propriedade que
		// o identifica ("type", "name" ou "id"), ou a primeira, em vez do objeto inteiro.
		no = identificador(no) || no;
	}
	return no;
}

/**
 * @typedef {{ caminho: (string | number)[], mensagem: string, severidade: "erro" | "aviso", chave?: boolean }} Regra
 */

/** Máximo de passos de um setting `range` que o editor de temas aceita. */
const MAX_PASSOS = 101;

/** @param {unknown} v */
const ehObjeto = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

/** @param {unknown} v */
const ehNumero = (v) => typeof v === "number" && Number.isFinite(v);

/**
 * Regras da Shopify que o JSON Schema oficial não expressa: ids e tipos repetidos
 * (a Shopify recusa o tema), e valores padrão que o editor não consegue mostrar.
 * Repetição é erro; o resto é aviso, porque o editor ainda carrega o arquivo.
 * @param {unknown} valor o schema já lido
 * @returns {Regra[]}
 */
function regrasDaShopify(valor) {
	/** @type {Regra[]} */
	const regras = [];
	if (!ehObjeto(valor)) return regras;
	const raiz = /** @type {Record<string, unknown>} */ (valor);

	/**
	 * @param {unknown} settings
	 * @param {(string | number)[]} base
	 * @param {string} onde "de la section", "del bloque \"x\""...
	 * @returns {Set<string>} os ids declarados
	 */
	function conferirSettings(settings, base, onde) {
		const ids = new Set();
		if (!Array.isArray(settings)) return ids;
		settings.forEach((setting, i) => {
			if (!ehObjeto(setting)) return;
			const s = /** @type {Record<string, unknown>} */ (setting);
			const aqui = [...base, i];
			if (typeof s.id === "string") {
				if (ids.has(s.id)) regras.push({ caminho: [...aqui, "id"], mensagem: `El id "${s.id}" está repetido en los settings ${onde}: cada setting necesita un id único.`, severidade: "erro" });
				ids.add(s.id);
			}
			if (s.type === "range") conferirRange(s, aqui);
			if ((s.type === "select" || s.type === "radio") && Array.isArray(s.options) && s.default !== undefined) {
				const valores = s.options.filter(ehObjeto).map((o) => /** @type {Record<string, unknown>} */ (o).value);
				if (valores.length && !valores.includes(s.default)) {
					regras.push({ caminho: [...aqui, "default"], mensagem: `El default ${JSON.stringify(s.default)} no es el value de ninguna opción (${valores.map((v) => JSON.stringify(v)).join(", ")}).`, severidade: "aviso" });
				}
			}
		});
		return ids;
	}

	/**
	 * @param {Record<string, unknown>} s
	 * @param {(string | number)[]} aqui
	 */
	function conferirRange(s, aqui) {
		const { min, max } = s;
		const passo = s.step === undefined ? 1 : s.step;
		if (!ehNumero(min) || !ehNumero(max) || !ehNumero(passo) || /** @type {number} */ (passo) <= 0) return;
		const [a, b, p] = /** @type {number[]} */ ([min, max, passo]);
		if (b <= a) {
			regras.push({ caminho: [...aqui, "max"], mensagem: `El max (${b}) tiene que ser mayor que el min (${a}).`, severidade: "erro" });
			return;
		}
		const passos = (b - a) / p;
		if (passos > MAX_PASSOS) regras.push({ caminho: [...aqui, "step" in s ? "step" : "max"], mensagem: `El range tiene ${Math.floor(passos)} pasos y el editor admite como máximo ${MAX_PASSOS}: aumenta el step o achica el intervalo.`, severidade: "aviso" });
		const padrao = s.default;
		if (!ehNumero(padrao)) return;
		const d = /** @type {number} */ (padrao);
		if (d < a || d > b) regras.push({ caminho: [...aqui, "default"], mensagem: `El default (${d}) está fuera del intervalo, entre ${a} y ${b}.`, severidade: "aviso" });
		else {
			const k = (d - a) / p;
			if (Math.abs(k - Math.round(k)) > 1e-9) regras.push({ caminho: [...aqui, "default"], mensagem: `El default (${d}) no cae en un paso del range (min ${a}, step ${p}).`, severidade: "aviso" });
		}
	}

	const idsDaRaiz = conferirSettings(raiz.settings, ["settings"], "de este archivo");

	// Blocos locais (com `name`): tipo e nome únicos, e settings próprios.
	/** @type {Map<string, Set<string>>} */
	const locais = new Map();
	if (Array.isArray(raiz.blocks)) {
		const tipos = new Set();
		const nomes = new Set();
		raiz.blocks.forEach((bloco, i) => {
			if (!ehObjeto(bloco)) return;
			const b = /** @type {Record<string, unknown>} */ (bloco);
			if (typeof b.type === "string") {
				if (tipos.has(b.type)) regras.push({ caminho: ["blocks", i, "type"], mensagem: `El tipo de bloque "${b.type}" está repetido: cada tipo va una sola vez en blocks.`, severidade: "erro" });
				tipos.add(b.type);
			}
			if (typeof b.name === "string") {
				if (nomes.has(b.name)) regras.push({ caminho: ["blocks", i, "name"], mensagem: `El nombre de bloque "${b.name}" está repetido: cada bloque necesita un name único.`, severidade: "erro" });
				nomes.add(b.name);
				if (typeof b.type === "string") locais.set(b.type, conferirSettings(b.settings, ["blocks", i, "settings"], `del bloque "${b.type}"`));
			}
		});
	}

	/**
	 * Chaves de `settings` de um preset que não batem com nenhum setting declarado.
	 * @param {unknown} settings
	 * @param {Set<string>} ids
	 * @param {(string | number)[]} base
	 * @param {string} onde
	 */
	function conferirChaves(settings, ids, base, onde) {
		if (!ehObjeto(settings)) return;
		for (const chave of Object.keys(/** @type {object} */ (settings))) {
			if (!ids.has(chave)) regras.push({ caminho: [...base, chave], mensagem: `El preset usa el setting "${chave}", que no existe ${onde}.`, severidade: "aviso", chave: true });
		}
	}

	/**
	 * Blocos de um preset, em lista ou em objeto por id, com o caminho de cada um.
	 * @param {unknown} blocos
	 * @param {(string | number)[]} base
	 * @returns {[Record<string, unknown>, (string | number)[]][]}
	 */
	function blocosDoPreset(blocos, base) {
		if (Array.isArray(blocos)) return blocos.map((b, i) => /** @type {[any, any]} */ ([b, [...base, i]])).filter(([b]) => ehObjeto(b));
		if (ehObjeto(blocos)) return Object.entries(/** @type {object} */ (blocos)).map(([k, b]) => /** @type {[any, any]} */ ([b, [...base, k]])).filter(([b]) => ehObjeto(b));
		return [];
	}

	const presets = Array.isArray(raiz.presets) ? raiz.presets.map((p, i) => /** @type {[unknown, (string | number)[]]} */ ([p, ["presets", i]])) : [];
	if (ehObjeto(raiz.default)) presets.push([raiz.default, ["default"]]);
	for (const [preset, base] of presets) {
		if (!ehObjeto(preset)) continue;
		const p = /** @type {Record<string, unknown>} */ (preset);
		// Só confere quando o arquivo declara settings: sem a lista não há o que comparar.
		if (Array.isArray(raiz.settings)) conferirChaves(p.settings, idsDaRaiz, [...base, "settings"], "en los settings de este archivo");
		// Bloco de preset de tipo local: as chaves vêm do próprio bloco. Os do tema
		// (outros arquivos) não são conferidos aqui.
		for (const [bloco, caminho] of blocosDoPreset(p.blocks, [...base, "blocks"])) {
			const ids = typeof bloco.type === "string" ? locais.get(bloco.type) : undefined;
			if (ids) conferirChaves(bloco.settings, ids, [...caminho, "settings"], `en el bloque "${bloco.type}"`);
		}
	}
	return regras;
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
	if (!validar) return [];
	const valido = validar(valor);

	/** @type {Problema[]} */
	const problemas = [];
	const vistos = new Set();
	for (const erro of (!valido && validar.errors) || []) {
		if (AGRUPADORAS.has(erro.keyword)) continue;
		const no = noDoErro(arvore, erro);
		const texto = mensagem(erro, /** @type {any} */ (erro.parentSchema));
		const chave = `${no.offset}:${texto}`;
		if (vistos.has(chave)) continue;
		vistos.add(chave);
		problemas.push({ inicio: bloco.inicio + no.offset, fim: bloco.inicio + no.offset + no.length, mensagem: texto, severidade: "erro" });
	}
	for (const regra of regrasDaShopify(valor)) {
		let no = jsonc.findNodeAtLocation(arvore, regra.caminho);
		if (!no) continue;
		// Quando o problema é a chave (as de settings de preset), marca a chave, não o valor.
		if (regra.chave && no.parent && no.parent.type === "property" && no.parent.children) no = no.parent.children[0];
		problemas.push({ inicio: bloco.inicio + no.offset, fim: bloco.inicio + no.offset + no.length, mensagem: regra.mensagem, severidade: regra.severidade });
	}
	return problemas;
}

module.exports = { esquemaDoArquivo, extrairSchema, validarLiquid, validador, mensagemDeEnum, mensagemDeTipo, regrasDaShopify, MAX_PASSOS, BASE };
