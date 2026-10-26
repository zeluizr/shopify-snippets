# Changelog

Todos los cambios de shopify-snippets. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
las versiones siguen [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

### Agregado

- La validación del `{% schema %}` revisa reglas de Shopify que el esquema oficial no expresa: `id` de setting
  repetido en la section o en un bloque, y tipo o nombre de bloque repetido, como errores; `default` de `range` fuera
  del intervalo o fuera de un paso, `range` con más de 101 pasos, `default` de `select` o `radio` que no es ninguna
  opción y preset que usa un setting que no existe, como advertencias.
- Snippets `snippet-file` (snippet con `{% doc %}`, `@param` y `@example`), `preset-blocks` (preset con bloques por
  id, bloque estático y `block_order`, como en Horizon) y `visible-if` (setting condicional).

### Cambiado

- El error de tipo dice en español qué se esperaba y qué hay: *Se esperaba un texto, pero hay un número.* en lugar
  de *Se esperaba string.*
- Cuando falta una propiedad en un setting o un bloque, se subraya su `"type"` (o la primera propiedad) en lugar del
  objeto entero; en la raíz del schema, ya no se subraya el archivo completo.

## [0.1.4] - 2026-10-26

### Cambiado

- El nombre visible pasa a ser «Snippets for Shopify», el mismo patrón que Snippets for VTEX IO. El identificador no
  cambia: quien ya la tiene instalada no pierde nada.

## [0.1.3] - 2026-10-26

### Cambiado

- El ícono tiene las esquinas redondeadas, con el radio del ladrillo, porque el Marketplace no las redondea.
- La cabecera del Marketplace va en el color de la plataforma, con texto oscuro, y el badge de versión del README
  también.
- Nuevo ícono de producto para devs del kit de marca v7: el ladrillo de commente.me con el destaque en el verde de
  Shopify y el glifo `</>` de snippets.
- El README sigue el mismo formato que el de VTEX IO Snippets y el de Adobe Commerce Snippets, con los badges de
  versión, instalaciones y licencia.

## [0.1.2] - 2026-10-21

### Cambiado

- La extensión sigue la marca de commente.me: el ícono es el ladrillo, el banner del Marketplace va en azul y el
  nombre visible pasa a «Shopify Snippets».

## [0.1.1] - 2026-10-21

### Cambiado

- Cuando un valor del `{% schema %}` no está entre las opciones permitidas y hay más de seis, el error sugiere la
  más cercana (`"colour"` → *¿Quisiste decir "color"?*) en lugar de listar todas.

### Agregado

- Imagen del README con la extensión en uso, generada desde los snippets y el validador reales.

## [0.1.0] - 2026-10-21

### Agregado

- Snippets de las 32 tags y los 148 filtros de Liquid vigentes, generados desde
  [Shopify/theme-liquid-docs](https://github.com/Shopify/theme-liquid-docs) en un commit fijo, con resumen y enlace a
  shopify.dev. Los descontinuados quedan afuera.
- Snippets de estructura: section y bloque completos, `{% schema %}` de section y de bloque, preset, bloques del tema,
  imagen responsiva, `block.shopify_attributes` y texto traducido.
- Un snippet por cada uno de los 35 tipos de setting del editor de temas, en Liquid y en JSON.
- Validación del `{% schema %}` de `sections/*.liquid` y `blocks/*.liquid` contra el esquema oficial, con los errores
  en español y en el lugar exacto. Se apaga con `shopifySnippets.validarSchema`.
- Validación de `config/settings_schema.json` y `locales/*.json` con los esquemas oficiales.
- Ícono de la extensión (el delimitador de Liquid sobre verde) y color del banner del Marketplace.
