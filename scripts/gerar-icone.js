// @ts-check
"use strict";

// Gera images/icon.png (256x256) a partir de um SVG: quadrado verde com o
// delimitador do Liquid, {%}, em branco. Irmão do ícone do vtex-io-snippets
// (cor da plataforma com um glifo branco). Precisa do `sharp` (devDependency).
//
//   node scripts/gerar-icone.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const LADO = 256;
const COR = { topo: "#13906A", base: "#0A5C44" };

// Chave esquerda; a direita é o espelho (x → LADO - x).
const chave = "M 92 58 C 66 58 66 72 66 94 L 66 110 C 66 122 60 128 46 128 C 60 128 66 134 66 146 L 66 162 C 66 184 66 198 92 198";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}" viewBox="0 0 ${LADO} ${LADO}">
	<defs>
		<linearGradient id="fundo" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="${COR.topo}"/>
			<stop offset="1" stop-color="${COR.base}"/>
		</linearGradient>
	</defs>
	<rect width="${LADO}" height="${LADO}" rx="52" fill="url(#fundo)"/>
	<g fill="none" stroke="#FFFFFF" stroke-width="17" stroke-linecap="round" stroke-linejoin="round">
		<path d="${chave}"/>
		<path d="${chave}" transform="translate(${LADO} 0) scale(-1 1)"/>
		<line x1="150" y1="88" x2="106" y2="168"/>
	</g>
	<g fill="#FFFFFF">
		<circle cx="107" cy="99" r="12"/>
		<circle cx="149" cy="157" r="12"/>
	</g>
</svg>`;

const destino = path.join(__dirname, "..", "images", "icon.png");
fs.mkdirSync(path.dirname(destino), { recursive: true });
sharp(Buffer.from(svg))
	.png({ compressionLevel: 9 })
	.toFile(destino)
	.then(() => console.log(`images/icon.png (${LADO}x${LADO})`))
	.catch((erro) => {
		console.error(erro.message);
		process.exit(1);
	});
