// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { validarLiquid, extrairSchema, esquemaDoArquivo, mensagemDeEnum } = require("../lib/schema");
const { MANUAIS } = require("../lib/manuais");
const { resolver } = require("./auxiliares");

/** @param {unknown} schema */
const section = (schema) => `<div></div>\n{% schema %}\n${JSON.stringify(schema, null, 2)}\n{% endschema %}\n`;

test("o esquema vem da pasta do arquivo", () => {
	assert.equal(esquemaDoArquivo("/tema/sections/hero.liquid"), "section.json");
	assert.equal(esquemaDoArquivo("C:\\tema\\blocks\\texto.liquid"), "theme_block.json");
	assert.equal(esquemaDoArquivo("/tema/snippets/card.liquid"), undefined);
	assert.equal(esquemaDoArquivo("/tema/sections/header-group.json"), undefined);
});

test("extrai o schema com e sem traços de controle de espaço", () => {
	const texto = "a\n{%- schema -%}{\"name\":\"X\"}{%- endschema -%}";
	const bloco = extrairSchema(texto);
	assert.ok(bloco);
	assert.equal(bloco.conteudo, "{\"name\":\"X\"}");
	assert.equal(texto.slice(bloco.inicio, bloco.inicio + 1), "{");
	assert.equal(extrairSchema("<div></div>"), undefined);
});

test("section válida não gera problema", () => {
	assert.deepEqual(validarLiquid("sections/a.liquid", section({ name: "A", settings: [{ type: "text", id: "t", label: "T" }], presets: [{ name: "A" }] })), []);
});

test("arquivo fora de sections/ e blocks/ não é validado", () => {
	assert.deepEqual(validarLiquid("snippets/a.liquid", section({ nome: 1 })), []);
});

test("tipo de setting inexistente aponta o valor errado", () => {
	const texto = section({ name: "A", settings: [{ type: "colour", id: "c", label: "C" }] });
	const problemas = validarLiquid("sections/a.liquid", texto);
	assert.ok(problemas.length >= 1);
	const marcado = problemas.map((p) => texto.slice(p.inicio, p.fim));
	assert.ok(marcado.includes("\"colour\""), JSON.stringify(problemas));
	assert.ok(problemas.every((p) => p.severidade === "erro"));
});

test("enum com muitas opções sugere a mais próxima em vez de listar todas", () => {
	const texto = section({ name: "A", settings: [{ type: "colour", id: "c", label: "C" }] });
	const mensagens = validarLiquid("sections/a.liquid", texto).map((p) => p.mensagem);
	assert.ok(mensagens.includes("Valor \"colour\" no permitido. ¿Quisiste decir \"color\"?"), JSON.stringify(mensagens));
	assert.equal(mensagemDeEnum("xyzxyzxyz", ["a", "b", "c", "d", "e", "f", "g"]), "Valor \"xyzxyzxyz\" no permitido (hay 7 opciones válidas).");
	assert.equal(mensagemDeEnum("z", ["a", "b"]), "Valor no permitido. Opciones: \"a\", \"b\".");
});

test("propriedade sobrando marca a chave sobrando", () => {
	const texto = section({ name: "A", nombre: "B" });
	const problemas = validarLiquid("sections/a.liquid", texto);
	const p = problemas.find((x) => /nombre/.test(x.mensagem));
	assert.ok(p, JSON.stringify(problemas));
	assert.equal(texto.slice(p.inicio, p.fim), "\"nombre\"");
	assert.match(p.mensagem, /no está permitida/);
});

test("range sem os obrigatórios avisa em espanhol", () => {
	const problemas = validarLiquid("sections/a.liquid", section({ name: "A", settings: [{ type: "range", id: "r", label: "R" }] }));
	const mensagens = problemas.map((p) => p.mensagem).join(" ");
	assert.match(mensagens, /Falta la propiedad obligatoria "min"/);
	assert.match(mensagens, /Falta la propiedad obligatoria "max"/);
});

test("JSON quebrado vira erro de sintaxe na posição", () => {
	const texto = "{% schema %}\n{ \"name\": \"A\", }\n{% endschema %}";
	const problemas = validarLiquid("blocks/a.liquid", texto);
	assert.ok(problemas.length >= 1);
	assert.ok(problemas.every((p) => /JSON inválido/.test(p.mensagem)));
	assert.ok(problemas[0].inicio > texto.indexOf("{ "));
});

test("os snippets de section e block geram {% schema %} válido", () => {
	for (const [nome, s] of Object.entries(MANUAIS)) {
		if (!s.arquivo) continue;
		const texto = resolver(s.body);
		assert.deepEqual(validarLiquid(s.arquivo, texto), [], `${nome}:\n${texto}`);
	}
});

// Contra um tema real: SHOPIFY_TEMA=/caminho/do/tema node --test. Todo {% schema %}
// do tema tem que passar sem nenhum problema (é o teste de falso positivo).
const TEMA = process.env.SHOPIFY_TEMA;
test("todo schema de um tema real passa", { skip: !TEMA && "defina SHOPIFY_TEMA para rodar" }, () => {
	let total = 0;
	/** @type {string[]} */
	const falhas = [];
	for (const pasta of ["sections", "blocks"]) {
		const dir = path.join(/** @type {string} */ (TEMA), pasta);
		if (!fs.existsSync(dir)) continue;
		for (const arquivo of fs.readdirSync(dir).filter((f) => f.endsWith(".liquid"))) {
			const caminho = path.join(dir, arquivo);
			const texto = fs.readFileSync(caminho, "utf8");
			if (!extrairSchema(texto)) continue;
			total++;
			const problemas = validarLiquid(caminho, texto);
			if (problemas.length) falhas.push(`${pasta}/${arquivo}: ${problemas[0].mensagem}`);
		}
	}
	assert.ok(total > 0, "nenhum schema encontrado");
	assert.deepEqual(falhas, [], `${falhas.length} de ${total}`);
});
