// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { MANUAIS } = require("../lib/manuais");
const { camposBemFormados } = require("./auxiliares");

const RAIZ = path.join(__dirname, "..");
const pacote = JSON.parse(fs.readFileSync(path.join(RAIZ, "package.json"), "utf8"));

test("todo arquivo citado no package.json existe e é JSON válido", () => {
	const c = pacote.contributes;
	const caminhos = [
		pacote.main,
		...c.snippets.map((/** @type {{path: string}} */ s) => s.path),
		...c.jsonValidation.map((/** @type {{url: string}} */ j) => j.url),
		...c.languages.map((/** @type {{configuration: string}} */ l) => l.configuration)
	];
	for (const relativo of caminhos) {
		const arquivo = path.join(RAIZ, relativo);
		assert.ok(fs.existsSync(arquivo), relativo);
		if (relativo.endsWith(".json") || relativo.endsWith(".code-snippets")) JSON.parse(fs.readFileSync(arquivo, "utf8"));
	}
});

test("as referências entre esquemas apontam para arquivos que existem", () => {
	const pasta = path.join(RAIZ, "schemas/theme");
	for (const arquivo of fs.readdirSync(pasta)) {
		const texto = fs.readFileSync(path.join(pasta, arquivo), "utf8");
		for (const [, ref] of texto.matchAll(/"\$ref":\s*"(\.\/[^"#]+)/g)) assert.ok(fs.existsSync(path.join(pasta, ref)), `${arquivo} → ${ref}`);
	}
});

test("prefixos não se repetem entre os arquivos de snippets", () => {
	/** @type {Map<string, string>} */
	const vistos = new Map();
	for (const arquivo of ["liquid", "shopify", "settings"]) {
		const snippets = JSON.parse(fs.readFileSync(path.join(RAIZ, `snippets/${arquivo}.code-snippets`), "utf8"));
		for (const [nome, s] of Object.entries(snippets)) {
			// O content_for tem duas formas de propósito, com o mesmo prefixo.
			if (vistos.has(s.prefix) && !nome.startsWith("tag content_for")) assert.fail(`prefixo ${s.prefix} em ${vistos.get(s.prefix)} e ${nome}`);
			vistos.set(s.prefix, nome);
		}
	}
});

test("snippets escritos à mão têm campos bem formados e link", () => {
	for (const [nome, s] of Object.entries(MANUAIS)) {
		assert.ok(camposBemFormados(s.body), nome);
		assert.match(s.description, /https:\/\/shopify\.dev\//, nome);
	}
});

test("o arquivo gerado dos manuais está em dia", () => {
	const gravado = JSON.parse(fs.readFileSync(path.join(RAIZ, "snippets/shopify.code-snippets"), "utf8"));
	assert.deepEqual(Object.keys(gravado), Object.keys(MANUAIS), "rode node scripts/gerar.js");
	for (const [nome, { arquivo, ...s }] of Object.entries(MANUAIS)) assert.deepEqual(gravado[nome], s, nome);
});

test("a fonte oficial está fixada num commit", () => {
	const fonte = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/fonte.json"), "utf8"));
	assert.match(fonte.commit, /^[0-9a-f]{40}$/);
});
