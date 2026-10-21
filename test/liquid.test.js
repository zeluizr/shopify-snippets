// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { snippetsDeLiquid, corpoDaSintaxe, corpoDoFiltro, limparTexto, TAGS_A_MAO } = require("../lib/liquid");
const { resolver, camposBemFormados } = require("./auxiliares");

const RAIZ = path.join(__dirname, "..");
const ler = (/** @type {string} */ f) => JSON.parse(fs.readFileSync(path.join(RAIZ, f), "utf8"));
const tags = ler("data/tags.json");
const filtros = ler("data/filters.json");
const snippets = snippetsDeLiquid(tags, filtros);

test("toda tag não descontinuada tem snippet com o prefixo do nome", () => {
	const prefixos = new Set(Object.values(snippets).map((s) => s.prefix));
	for (const tag of tags.filter((/** @type {any} */ t) => !t.deprecated)) assert.ok(prefixos.has(tag.name), `falta a tag ${tag.name}`);
});

test("todo filtro não descontinuado tem snippet", () => {
	for (const filtro of filtros.filter((/** @type {any} */ f) => !f.deprecated)) assert.ok(snippets[`filtro ${filtro.name}`], `falta o filtro ${filtro.name}`);
});

test("descontinuados ficam de fora", () => {
	for (const item of [...tags, ...filtros].filter((/** @type {any} */ i) => i.deprecated)) {
		assert.equal(snippets[`tag ${item.name}`], undefined);
		assert.equal(snippets[`filtro ${item.name}`], undefined);
	}
});

test("todo corpo tem campos bem formados e descrição com link da documentação", () => {
	for (const [nome, s] of Object.entries(snippets)) {
		assert.ok(camposBemFormados(s.body), `campos malformados em ${nome}: ${JSON.stringify(s.body)}`);
		assert.match(s.description, /https:\/\/shopify\.dev\/docs\/api\/liquid\//, nome);
		assert.ok(!/[\u0000-\u0008]/.test(s.body.join("")), `caractere de controle em ${nome}`);
	}
});

test("palavra repetida reaproveita o mesmo campo, e a mais longa ganha da contida", () => {
	const corpo = corpoDaSintaxe("{% paginate array by n %}\n  {% for item in array %}\n    first_expression expression\n  {% endfor %}\n{% endpaginate %}", ["array", "n", "item", "expression", "first_expression"]);
	assert.deepEqual(corpo, [
		"{% paginate ${1:array} by ${2:n} %}",
		"\t{% for ${3:item} in ${1:array} %}",
		"\t\t${4:first_expression} ${5:expression}",
		"\t{% endfor %}",
		"{% endpaginate %}"
	]);
});

test("filtro com parâmetros nomeados e posicionais", () => {
	assert.equal(corpoDoFiltro({ name: "image_url", syntax: "variable | image_url: width: number, height: number" }), "image_url: width: ${1:number}, height: ${2:number}");
	assert.equal(corpoDoFiltro({ name: "append", syntax: "string | append: string" }), "append: ${1:string}");
	assert.equal(corpoDoFiltro({ name: "money", syntax: "number | money" }), "money");
});

test("o texto resolvido do if é Liquid de verdade", () => {
	assert.equal(resolver(snippets["tag if"].body), "{% if condition %}\n\texpression\n{% endif %}");
});

test("tags feitas à mão existem nos dados oficiais", () => {
	for (const nome of Object.keys(TAGS_A_MAO)) assert.ok(tags.some((/** @type {any} */ t) => t.name === nome), `${nome} sumiu dos dados oficiais`);
});

test("limparTexto tira markdown e entidades", () => {
	assert.equal(limparTexto("Generates an HTML `&lt;form&gt;` tag. See [forms](/themes/forms)."), "Generates an HTML <form> tag. See forms.");
});

test("o arquivo gerado está em dia com os dados", () => {
	assert.deepEqual(ler("snippets/liquid.code-snippets"), JSON.parse(JSON.stringify(snippets)), "rode node scripts/gerar.js");
});
