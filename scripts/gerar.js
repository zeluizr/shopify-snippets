// @ts-check
"use strict";

// Gera os arquivos de snippets a partir dos dados oficiais e do catálogo próprio.
// Determinístico: o CI roda e falha se o resultado divergir do que está commitado.
//
//   node scripts/gerar.js

const fs = require("fs");
const path = require("path");
const { snippetsDeLiquid } = require("../lib/liquid");
const { snippetsDeSettings } = require("../lib/settings");
const { MANUAIS } = require("../lib/manuais");

const RAIZ = path.join(__dirname, "..");

/** @param {string} arquivo */
const ler = (arquivo) => JSON.parse(fs.readFileSync(path.join(RAIZ, arquivo), "utf8"));

/**
 * @param {string} arquivo
 * @param {Record<string, unknown>} snippets
 */
function gravar(arquivo, snippets) {
	fs.writeFileSync(path.join(RAIZ, arquivo), `${JSON.stringify(snippets, null, "\t")}\n`);
	console.log(`${arquivo}: ${Object.keys(snippets).length} snippets`);
}

/** Tira os campos internos `arquivo` e `fragmento`, que só os testes usam. */
function semInternos() {
	/** @type {Record<string, unknown>} */
	const saida = {};
	for (const [nome, { arquivo, fragmento, ...snippet }] of Object.entries(MANUAIS)) saida[nome] = snippet;
	return saida;
}

fs.mkdirSync(path.join(RAIZ, "snippets"), { recursive: true });
gravar("snippets/liquid.code-snippets", snippetsDeLiquid(ler("data/tags.json"), ler("data/filters.json")));
gravar("snippets/settings.code-snippets", snippetsDeSettings());
gravar("snippets/shopify.code-snippets", semInternos());
