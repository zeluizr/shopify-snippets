// @ts-check
"use strict";

// Catálogo de settings do editor de temas: um exemplo concreto e válido de cada tipo
// do esquema oficial (schemas/theme/setting.json). Os testes garantem que todo tipo do
// esquema está aqui e que cada exemplo passa na validação. Lógica pura, sem `vscode`.

const { escaparSnippet, escaparCampo } = require("./liquid");

/**
 * Exemplos em ordem de uso no editor: primeiro os de texto e escolha, depois os de
 * recurso da loja, por último os de barra lateral.
 * @type {Record<string, { descricao: string, exemplo: Record<string, unknown> }>}
 */
const CATALOGO = {
	text: { descricao: "Campo de texto de una línea.", exemplo: { type: "text", id: "titulo", label: "Título", default: "" } },
	textarea: { descricao: "Campo de texto de varias líneas.", exemplo: { type: "textarea", id: "texto", label: "Texto", default: "" } },
	richtext: { descricao: "Editor de texto enriquecido con párrafos.", exemplo: { type: "richtext", id: "contenido", label: "Contenido", default: "<p></p>" } },
	inline_richtext: { descricao: "Texto enriquecido de una línea (negrita, cursiva, enlace).", exemplo: { type: "inline_richtext", id: "titular", label: "Titular", default: "" } },
	html: { descricao: "Campo de HTML.", exemplo: { type: "html", id: "html", label: "HTML", default: "" } },
	liquid: { descricao: "Campo de Liquid.", exemplo: { type: "liquid", id: "liquid", label: "Liquid", default: "" } },
	number: { descricao: "Campo numérico.", exemplo: { type: "number", id: "cantidad", label: "Cantidad", default: 4 } },
	range: { descricao: "Control deslizante con mínimo, máximo y paso.", exemplo: { type: "range", id: "columnas", label: "Columnas", min: 1, max: 6, step: 1, default: 4 } },
	checkbox: { descricao: "Casilla de verificación.", exemplo: { type: "checkbox", id: "mostrar", label: "Mostrar", default: true } },
	select: {
		descricao: "Lista desplegable de opciones.",
		exemplo: { type: "select", id: "alineacion", label: "Alineación", options: [{ value: "izquierda", label: "Izquierda" }, { value: "centro", label: "Centro" }], default: "izquierda" }
	},
	radio: {
		descricao: "Botones de opción.",
		exemplo: { type: "radio", id: "tamano", label: "Tamaño", options: [{ value: "chico", label: "Chico" }, { value: "grande", label: "Grande" }], default: "chico" }
	},
	text_alignment: { descricao: "Selector de alineación de texto.", exemplo: { type: "text_alignment", id: "alineacion_texto", label: "Alineación del texto", default: "left" } },
	color: { descricao: "Selector de color.", exemplo: { type: "color", id: "color", label: "Color", default: "#000000" } },
	color_background: { descricao: "Fondo con color o degradado (CSS background).", exemplo: { type: "color_background", id: "fondo", label: "Fondo" } },
	color_scheme: { descricao: "Selector de esquema de colores del tema.", exemplo: { type: "color_scheme", id: "esquema", label: "Esquema de colores", default: "scheme-1" } },
	color_scheme_group: {
		descricao: "Grupo de esquemas de colores (solo en config/settings_schema.json).",
		exemplo: {
			type: "color_scheme_group",
			id: "esquemas",
			definition: [
				{ type: "color", id: "fondo", label: "Fondo", default: "#FFFFFF" },
				{ type: "color", id: "texto", label: "Texto", default: "#121212" }
			],
			role: {
				text: "texto",
				background: { solid: "fondo", gradient: "fondo" },
				links: "texto",
				icons: "texto",
				primary_button: "texto",
				on_primary_button: "fondo",
				primary_button_border: "texto",
				secondary_button: "fondo",
				on_secondary_button: "texto",
				secondary_button_border: "texto"
			}
		}
	},
	color_palette: { descricao: "Paleta de colores con nombre.", exemplo: { type: "color_palette", id: "paleta", default: { fondo: "#FFFFFF", texto: "#000000" } } },
	font_picker: { descricao: "Selector de fuente de la biblioteca de Shopify.", exemplo: { type: "font_picker", id: "fuente", label: "Fuente", default: "assistant_n4" } },
	image_picker: { descricao: "Selector de imagen.", exemplo: { type: "image_picker", id: "imagen", label: "Imagen" } },
	video: { descricao: "Selector de video subido a Shopify.", exemplo: { type: "video", id: "video", label: "Video" } },
	video_url: { descricao: "URL de YouTube o Vimeo.", exemplo: { type: "video_url", id: "video_url", label: "URL del video", accept: ["youtube", "vimeo"] } },
	url: { descricao: "Enlace a una página de la tienda o externa.", exemplo: { type: "url", id: "enlace", label: "Enlace" } },
	link_list: { descricao: "Selector de menú.", exemplo: { type: "link_list", id: "menu", label: "Menú", default: "main-menu" } },
	product: { descricao: "Selector de producto.", exemplo: { type: "product", id: "producto", label: "Producto" } },
	product_list: { descricao: "Selector de varios productos.", exemplo: { type: "product_list", id: "productos", label: "Productos", limit: 12 } },
	collection: { descricao: "Selector de colección.", exemplo: { type: "collection", id: "coleccion", label: "Colección" } },
	collection_list: { descricao: "Selector de varias colecciones.", exemplo: { type: "collection_list", id: "colecciones", label: "Colecciones", limit: 8 } },
	page: { descricao: "Selector de página.", exemplo: { type: "page", id: "pagina", label: "Página" } },
	blog: { descricao: "Selector de blog.", exemplo: { type: "blog", id: "blog", label: "Blog" } },
	article: { descricao: "Selector de artículo de blog.", exemplo: { type: "article", id: "articulo", label: "Artículo" } },
	article_list: { descricao: "Selector de varios artículos de blog.", exemplo: { type: "article_list", id: "articulos", label: "Artículos", limit: 6 } },
	metaobject: { descricao: "Selector de una entrada de metaobjeto.", exemplo: { type: "metaobject", id: "metaobjeto", label: "Metaobjeto", metaobject_type: "tipo" } },
	metaobject_list: { descricao: "Selector de varias entradas de metaobjeto.", exemplo: { type: "metaobject_list", id: "metaobjetos", label: "Metaobjetos", metaobject_type: "tipo", limit: 6 } },
	header: { descricao: "Encabezado en la barra lateral del editor (no guarda valor).", exemplo: { type: "header", content: "Encabezado" } },
	paragraph: { descricao: "Párrafo en la barra lateral del editor (no guarda valor).", exemplo: { type: "paragraph", content: "Texto de ayuda." } }
};

/** Campos que viram campo editável no snippet, nesta ordem. */
const EDITAVEIS = ["id", "label", "content", "metaobject_type", "default", "min", "max", "step", "limit"];

/**
 * Serializa o exemplo como corpo de snippet: JSON com tab, e os campos primitivos de
 * `EDITAVEIS` como campos editáveis, numerados na ordem em que aparecem (é a ordem do
 * Tab). As aspas ficam fora do campo, para o JSON seguir válido seja qual for o texto.
 * @param {Record<string, unknown>} exemplo
 * @returns {string[]}
 */
function corpoDoSetting(exemplo) {
	let n = 1;
	const linhas = JSON.stringify(exemplo, null, "\t").split("\n");
	return linhas.map((linha) => {
		// Só os campos do primeiro nível (uma tab de indentação).
		const m = linha.match(/^\t"([^"]+)": (.+?)(,?)$/);
		// Valor que abre objeto ou lista (o `default` do color_palette) segue literal.
		if (!m || !EDITAVEIS.includes(m[1]) || m[2] === "{" || m[2] === "[") return escaparSnippet(linha);
		const [, chave, bruto, virgula] = m;
		const valor = JSON.parse(bruto);
		if (typeof valor === "string") return `\t"${chave}": "\${${n++}:${escaparCampo(valor.replace(/"/g, "\\\""))}}"${virgula}`;
		if (typeof valor === "number" || typeof valor === "boolean") return `\t"${chave}": \${${n++}:${escaparCampo(String(valor))}}${virgula}`;
		return escaparSnippet(linha);
	});
}

/** Snippets de setting, um por tipo, com prefixo `setting-<tipo>`. */
function snippetsDeSettings() {
	/** @type {Record<string, { prefix: string, body: string[], description: string }>} */
	const saida = {};
	for (const [tipo, { descricao, exemplo }] of Object.entries(CATALOGO)) {
		saida[`setting ${tipo}`] = {
			prefix: `setting-${tipo}`,
			body: corpoDoSetting(exemplo),
			description: `${descricao}\nhttps://shopify.dev/docs/storefronts/themes/architecture/settings/${tipo === "header" || tipo === "paragraph" ? "sidebar-settings" : "input-settings"}#${tipo}`
		};
	}
	return saida;
}

module.exports = { CATALOGO, EDITAVEIS, corpoDoSetting, snippetsDeSettings };
