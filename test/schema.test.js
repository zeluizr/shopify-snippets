// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { validarLiquid, extrairSchema, esquemaDoArquivo, mensagemDeEnum, mensagemDeTipo, MAX_PASSOS } = require("../lib/schema");
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

test("os fragmentos escritos à mão, montados no lugar deles, geram {% schema %} válido", () => {
	/** @type {Record<string, (corpo: string) => string>} */
	const moldes = {
		preset: (c) => `{ "name": "A", "blocks": [{ "type": "@theme" }], "presets": [${c}] }`,
		section: (c) => `{ "name": "A", ${c} }`,
		setting: (c) => `{ "name": "A", "settings": [{ "type": "checkbox", "id": "mostrar", "label": "M" }, { "type": "text", "id": "t", "label": "T", ${c} }] }`
	};
	let total = 0;
	for (const [nome, s] of Object.entries(MANUAIS)) {
		if (!s.fragmento) continue;
		total++;
		const texto = `{% schema %}\n${moldes[s.fragmento](resolver(s.body))}\n{% endschema %}`;
		assert.deepEqual(validarLiquid("sections/a.liquid", texto), [], `${nome}:\n${texto}`);
	}
	assert.ok(total >= 4);
});

/**
 * Problemas de um schema de section, com o trecho marcado de cada um.
 * @param {unknown} schema
 * @param {string} [caminho]
 */
function marcados(schema, caminho = "sections/a.liquid") {
	const texto = section(schema);
	return validarLiquid(caminho, texto).map((p) => ({ trecho: texto.slice(p.inicio, p.fim), mensagem: p.mensagem, severidade: p.severidade }));
}

test("tipo errado diz em espanhol o esperado e o encontrado", () => {
	assert.deepEqual(marcados({ name: 1 }), [{ trecho: "1", mensagem: "Se esperaba un texto, pero hay un número.", severidade: "erro" }]);
	assert.equal(mensagemDeTipo("string,array", true), "Se esperaba un texto o una lista, pero hay true o false.");
	assert.equal(mensagemDeTipo(["integer"], "4"), "Se esperaba un número entero, pero hay un texto.");
});

test("propriedade obrigatória faltando num item de lista marca o type, não o objeto inteiro", () => {
	assert.deepEqual(marcados({ name: "A", settings: [{ type: "text", label: "T" }] }), [{ trecho: "\"type\": \"text\"", mensagem: "Falta la propiedad obligatoria \"id\".", severidade: "erro" }]);
});

test("id de setting repetido é erro, na section e dentro de cada bloco", () => {
	const repetido = [{ type: "text", id: "t", label: "T" }, { type: "text", id: "t", label: "U" }];
	const naSection = marcados({ name: "A", settings: repetido });
	assert.equal(naSection.length, 1);
	assert.equal(naSection[0].trecho, "\"t\"");
	assert.equal(naSection[0].severidade, "erro");
	assert.match(naSection[0].mensagem, /El id "t" está repetido/);
	const noBloco = marcados({ name: "A", blocks: [{ type: "item", name: "Item", settings: repetido }] });
	assert.match(noBloco.map((p) => p.mensagem).join(), /del bloque "item"/);
	assert.deepEqual(marcados({ name: "A", settings: [{ type: "header", content: "H" }, { type: "header", content: "H" }] }), [], "header não tem id");
	assert.deepEqual(marcados({ name: "A", settings: [{ type: "text", id: "t", label: "T" }], blocks: [{ type: "b", name: "B", settings: [{ type: "text", id: "t", label: "T" }] }] }), [], "o mesmo id em section e bloco é permitido");
});

test("tipo e nome de bloco local repetidos são erro", () => {
	const p = marcados({ name: "A", blocks: [{ type: "a", name: "A" }, { type: "a", name: "B" }, { type: "c", name: "B" }] });
	assert.deepEqual(p.map((x) => x.trecho), ["\"a\"", "\"B\""]);
	assert.ok(p.every((x) => x.severidade === "erro"));
});

test("range: intervalo, passos e default viram aviso no lugar certo", () => {
	const range = (/** @type {object} */ extra) => marcados({ name: "A", settings: [{ type: "range", id: "r", label: "R", min: 0, max: 10, step: 1, default: 5, ...extra }] });
	assert.deepEqual(range({}), []);
	assert.deepEqual(range({ default: 20 }), [{ trecho: "20", mensagem: "El default (20) está fuera del intervalo, entre 0 y 10.", severidade: "aviso" }]);
	assert.deepEqual(range({ step: 2, default: 3 }).map((p) => p.trecho), ["3"]);
	assert.deepEqual(range({ step: 0.1, default: 0.3 }), [], "passo decimal sem erro de arredondamento");
	const muitos = range({ max: 1000 });
	assert.deepEqual(muitos.map((p) => p.trecho), ["1"]);
	assert.match(muitos[0].mensagem, new RegExp(`1000 pasos .* ${MAX_PASSOS}`));
	assert.deepEqual(range({ max: 101 }), [], "101 passos ainda cabem");
	const invertido = range({ min: 10, max: 0, default: 5 });
	assert.deepEqual(invertido.map((p) => [p.trecho, p.severidade]), [["0", "erro"]]);
});

test("default de select e radio fora das opções vira aviso", () => {
	const opcoes = [{ value: "a", label: "A" }, { value: "b", label: "B" }];
	for (const type of ["select", "radio"]) {
		assert.deepEqual(marcados({ name: "A", settings: [{ type, id: "s", label: "S", options: opcoes, default: "b" }] }), []);
		assert.deepEqual(marcados({ name: "A", settings: [{ type, id: "s", label: "S", options: opcoes, default: "c" }] }), [
			{ trecho: "\"c\"", mensagem: "El default \"c\" no es el value de ninguna opción (\"a\", \"b\").", severidade: "aviso" }
		]);
	}
});

test("preset com setting que não existe avisa na chave", () => {
	const settings = [{ type: "text", id: "titulo", label: "T" }];
	assert.deepEqual(marcados({ name: "A", settings, presets: [{ name: "A", settings: { titulo: "x" } }] }), []);
	assert.deepEqual(marcados({ name: "A", settings, presets: [{ name: "A", settings: { titlo: "x" } }] }), [
		{ trecho: "\"titlo\"", mensagem: "El preset usa el setting \"titlo\", que no existe en los settings de este archivo.", severidade: "aviso" }
	]);
	// Bloco local em preset (lista e objeto por id): confere os settings do bloco.
	const blocks = [{ type: "item", name: "Item", settings }];
	assert.equal(marcados({ name: "A", blocks, presets: [{ name: "A", blocks: [{ type: "item", settings: { nada: 1 } }] }] }).length, 1);
	assert.equal(marcados({ name: "A", blocks, presets: [{ name: "A", blocks: { i1: { type: "item", settings: { nada: 1 } } } }] }).length, 1);
	// Bloco do tema (definido em outro arquivo) não é conferido.
	assert.deepEqual(marcados({ name: "A", blocks: [{ type: "@theme" }], presets: [{ name: "A", blocks: [{ type: "text", settings: { qualquer: 1 } }] }] }), []);
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
