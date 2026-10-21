// @ts-check
"use strict";

// Snippets escritos à mão: a estrutura de sections e blocks do tema e os padrões do
// dia a dia que os dados oficiais não descrevem como template. Ficam em dados (e não
// direto no .code-snippets) para os testes validarem cada {% schema %} contra o
// esquema oficial. Lógica pura, sem `vscode`.

/** @type {Record<string, { prefix: string, body: string[], description: string, arquivo?: string }>} */
const MANUAIS = {
	"section completa": {
		prefix: "section-file",
		arquivo: "sections/exemplo.liquid",
		description: "Section con bloques del tema, estilos y {% schema %} con preset.\nhttps://shopify.dev/docs/storefronts/themes/architecture/sections",
		body: [
			"<div class=\"${1:nombre}\">",
			"\t{% content_for 'blocks' %}",
			"</div>",
			"",
			"{% stylesheet %}",
			"\t.${1:nombre} {",
			"\t\t$0",
			"\t}",
			"{% endstylesheet %}",
			"",
			"{% schema %}",
			"{",
			"\t\"name\": \"${2:Nombre}\",",
			"\t\"tag\": \"section\",",
			"\t\"class\": \"${1:nombre}\",",
			"\t\"settings\": [],",
			"\t\"blocks\": [{ \"type\": \"@theme\" }, { \"type\": \"@app\" }],",
			"\t\"presets\": [{ \"name\": \"${2:Nombre}\" }]",
			"}",
			"{% endschema %}"
		]
	},
	"block completo": {
		prefix: "block-file",
		arquivo: "blocks/exemplo.liquid",
		description: "Bloque del tema con LiquidDoc, shopify_attributes y {% schema %} con preset.\nhttps://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks",
		body: [
			"{% doc %}",
			"\t${1:Descripción del bloque.}",
			"{% enddoc %}",
			"<div class=\"${2:nombre}\" {{ block.shopify_attributes }}>",
			"\t$0",
			"</div>",
			"",
			"{% schema %}",
			"{",
			"\t\"name\": \"${3:Nombre}\",",
			"\t\"settings\": [],",
			"\t\"presets\": [{ \"name\": \"${3:Nombre}\" }]",
			"}",
			"{% endschema %}"
		]
	},
	"schema de section": {
		prefix: "schema-section",
		arquivo: "sections/exemplo.liquid",
		description: "Solo el {% schema %} de una section.\nhttps://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema",
		body: [
			"{% schema %}",
			"{",
			"\t\"name\": \"${1:Nombre}\",",
			"\t\"settings\": [$0],",
			"\t\"blocks\": [{ \"type\": \"@theme\" }, { \"type\": \"@app\" }],",
			"\t\"presets\": [{ \"name\": \"${1:Nombre}\" }]",
			"}",
			"{% endschema %}"
		]
	},
	"schema de block": {
		prefix: "schema-block",
		arquivo: "blocks/exemplo.liquid",
		description: "Solo el {% schema %} de un bloque del tema.\nhttps://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/schema",
		body: [
			"{% schema %}",
			"{",
			"\t\"name\": \"${1:Nombre}\",",
			"\t\"settings\": [$0],",
			"\t\"presets\": [{ \"name\": \"${1:Nombre}\" }]",
			"}",
			"{% endschema %}"
		]
	},
	"preset": {
		prefix: "preset",
		description: "Entrada de presets: hace que la section o el bloque aparezca en el editor.\nhttps://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema#presets",
		body: ["{ \"name\": \"${1:Nombre}\"${2:, \"settings\": {\\}} }"]
	},
	"blocks do tema": {
		prefix: "blocks-theme",
		description: "Acepta cualquier bloque del tema y bloques de apps.\nhttps://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks",
		body: ["\"blocks\": [{ \"type\": \"@theme\" }, { \"type\": \"@app\" }]"]
	},
	"imagem responsiva": {
		prefix: "image-responsive",
		description: "Imagen con srcset, sizes y lazy loading a partir de un setting image_picker.\nhttps://shopify.dev/docs/api/liquid/filters/image_tag",
		body: [
			"{%- if ${1:section}.settings.${2:imagen} != blank -%}",
			"\t{{ ${1:section}.settings.${2:imagen} | image_url: width: ${3:1600} | image_tag: widths: '${4:400, 800, 1200, 1600}', sizes: '${5:100vw}', loading: 'lazy' }}",
			"{%- endif -%}"
		]
	},
	"atributos do block": {
		prefix: "shopify-attributes",
		description: "Atributos que el editor de temas necesita para seleccionar el bloque.\nhttps://shopify.dev/docs/api/liquid/objects/block#block-shopify_attributes",
		body: ["{{ block.shopify_attributes }}"]
	},
	"t com padrão": {
		prefix: "t-default",
		description: "Texto traducido desde locales, con valor por defecto.\nhttps://shopify.dev/docs/api/liquid/filters/translate",
		body: ["{{ '${1:seccion.clave}' | t${2:: valor: ${3:variable}} }}"]
	}
};

module.exports = { MANUAIS };
