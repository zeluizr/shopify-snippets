// @ts-check
"use strict";

// Baixa os dados e os esquemas oficiais de Shopify/theme-liquid-docs num commit fixo.
//
//   node scripts/sincronizar.js            # usa o commit de data/fonte.json
//   node scripts/sincronizar.js <sha>      # troca de commit e grava em data/fonte.json
//
// Depois de sincronizar: `node scripts/gerar.js` e `node --test`.

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const FONTE = path.join(RAIZ, "data", "fonte.json");
const REPO = "Shopify/theme-liquid-docs";
const DADOS = ["filters", "tags", "objects"];

/** @param {string} url */
async function baixar(url) {
	const resposta = await fetch(url);
	if (!resposta.ok) throw new Error(`${resposta.status} em ${url}`);
	return resposta.text();
}

async function main() {
	const fonte = JSON.parse(fs.readFileSync(FONTE, "utf8"));
	const sha = process.argv[2] || fonte.commit;
	if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`commit inválido: ${sha}`);
	const cru = `https://raw.githubusercontent.com/${REPO}/${sha}`;

	for (const nome of DADOS) {
		const texto = await baixar(`${cru}/data/${nome}.json`);
		JSON.parse(texto);
		fs.writeFileSync(path.join(RAIZ, "data", `${nome}.json`), texto);
	}

	const listagem = JSON.parse(await baixar(`https://api.github.com/repos/${REPO}/contents/schemas/theme?ref=${sha}`));
	const pasta = path.join(RAIZ, "schemas", "theme");
	fs.rmSync(pasta, { recursive: true, force: true });
	fs.mkdirSync(pasta, { recursive: true });
	for (const item of listagem.filter((/** @type {{name: string}} */ i) => i.name.endsWith(".json"))) {
		const texto = await baixar(`${cru}/schemas/theme/${item.name}`);
		JSON.parse(texto);
		fs.writeFileSync(path.join(pasta, item.name), texto);
	}
	fs.writeFileSync(path.join(RAIZ, "schemas", "manifest_theme.json"), await baixar(`${cru}/schemas/manifest_theme.json`));

	fs.writeFileSync(FONTE, `${JSON.stringify({ ...fonte, commit: sha }, null, "\t")}\n`);
	console.log(`theme-liquid-docs @ ${sha}: ${DADOS.length} dados e ${listagem.length} esquemas`);
}

main().catch((erro) => {
	console.error(erro.message);
	process.exit(1);
});
