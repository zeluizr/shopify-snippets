// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { CATALOGO, snippetsDeSettings } = require("../lib/settings");
const { validador, BASE } = require("../lib/schema");
const { resolver, camposBemFormados } = require("./auxiliares");

const RAIZ = path.join(__dirname, "..");
const esquema = JSON.parse(fs.readFileSync(path.join(RAIZ, "schemas/theme/setting.json"), "utf8"));

/** Todos os valores de `type` que o esquema oficial aceita. */
function tiposDoEsquema() {
	const tipos = new Set();
	(function andar(/** @type {any} */ no) {
		if (!no || typeof no !== "object") return;
		const tipo = no.properties && no.properties.type;
		if (tipo && tipo.const) tipos.add(tipo.const);
		if (tipo && Array.isArray(tipo.enum)) tipo.enum.forEach((/** @type {string} */ t) => tipos.add(t));
		Object.values(no).forEach(andar);
	})(esquema);
	return tipos;
}

const validarSetting = validador().getSchema(`${BASE}setting.json`);
const snippets = snippetsDeSettings();

test("o catálogo cobre todos os tipos do esquema oficial, e só eles", () => {
	const doEsquema = [...tiposDoEsquema()].sort();
	assert.deepEqual(Object.keys(CATALOGO).sort(), doEsquema);
});

test("cada exemplo do catálogo é válido no esquema oficial", () => {
	assert.ok(validarSetting);
	for (const [tipo, { exemplo }] of Object.entries(CATALOGO)) {
		assert.equal(exemplo.type, tipo);
		const ok = validarSetting(exemplo);
		assert.ok(ok, `${tipo}: ${JSON.stringify(validarSetting.errors && validarSetting.errors.filter((e) => e.keyword !== "if").slice(0, 3))}`);
	}
});

test("cada snippet, aceito como está, vira o próprio exemplo", () => {
	for (const [tipo, { exemplo }] of Object.entries(CATALOGO)) {
		const s = snippets[`setting ${tipo}`];
		assert.equal(s.prefix, `setting-${tipo}`);
		assert.ok(camposBemFormados(s.body), tipo);
		assert.deepEqual(JSON.parse(resolver(s.body)), exemplo, tipo);
	}
});

test("o Tab percorre os campos na ordem em que aparecem", () => {
	const numeros = snippets["setting range"].body.join("\n").match(/\$\{(\d+):/g) || [];
	assert.deepEqual(numeros.map((n) => Number(n.slice(2, -1))), [1, 2, 3, 4, 5, 6]);
});

test("o arquivo gerado está em dia com o catálogo", () => {
	const gravado = JSON.parse(fs.readFileSync(path.join(RAIZ, "snippets/settings.code-snippets"), "utf8"));
	assert.deepEqual(gravado, JSON.parse(JSON.stringify(snippets)), "rode node scripts/gerar.js");
});
