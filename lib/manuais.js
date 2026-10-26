// @ts-check
"use strict";

// Snippets escritos à mão: a estrutura de sections e blocks do tema e os padrões do
// dia a dia que os dados oficiais não descrevem como template. Ficam em dados (e não
// direto no .code-snippets) para os testes validarem cada {% schema %} contra o
// esquema oficial. Lógica pura, sem `vscode`.

/**
 * `arquivo` e `fragmento` são internos (só os testes usam, e o gerar.js tira):
 * `arquivo` diz onde o snippet, sozinho, vira um {% schema %} válido; `fragmento`
 * diz em que lugar de um schema o pedaço entra ("preset", "section" ou "setting"),
 * para o teste montar o schema em volta e validá-lo também.
 * @type {Record<string, { prefix: string, body: string[], description: string, arquivo?: string, fragmento?: "preset" | "section" | "setting" }>}
 */
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
	"snippet con LiquidDoc": {
		prefix: "snippet-file",
		description: "Snippet con {% doc %}: descripción, parámetros y ejemplo de uso con render.\nhttps://shopify.dev/docs/storefronts/themes/tools/liquid-doc",
		body: [
			"{% doc %}",
			"\t${1:Qué renderiza este snippet.}",
			"",
			"\t@param {${2:string}} ${3:titulo} - ${4:Descripción del parámetro.}",
			"\t@param {${5:boolean}} [${6:mostrar}] - ${7:Parámetro opcional.}",
			"",
			"\t@example",
			"\t{% render '${8:nombre}', ${3:titulo}: '${9:Hola}' %}",
			"{% enddoc %}",
			"$0"
		]
	},
	"preset": {
		prefix: "preset",
		fragmento: "preset",
		description: "Entrada de presets: hace que la section o el bloque aparezca en el editor.\nhttps://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema#presets",
		body: ["{ \"name\": \"${1:Nombre}\"${2:, \"settings\": {\\}} }"]
	},
	"preset con bloques": {
		prefix: "preset-blocks",
		fragmento: "preset",
		description: "Preset con bloques por id, un bloque estático y block_order, como en Horizon.\nhttps://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/static-blocks",
		body: [
			"{",
			"\t\"name\": \"${1:Nombre}\",",
			"\t\"blocks\": {",
			"\t\t\"${2:encabezado}\": { \"type\": \"${3:text}\", \"static\": true, \"settings\": {} },",
			"\t\t\"${4:boton}\": { \"type\": \"${5:button}\", \"settings\": {} }",
			"\t},",
			"\t\"block_order\": [\"${4:boton}\"]",
			"}"
		]
	},
	"visible_if": {
		prefix: "visible-if",
		fragmento: "setting",
		description: "Muestra el setting en el editor solo cuando se cumple la condición.\nhttps://shopify.dev/docs/storefronts/themes/architecture/settings#conditional-settings",
		body: ["\"visible_if\": \"{{ ${1:block}.settings.${2:mostrar} ${3:== true} }}\""]
	},
	"blocks do tema": {
		prefix: "blocks-theme",
		fragmento: "section",
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
