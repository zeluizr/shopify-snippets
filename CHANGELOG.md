# Changelog

Todos los cambios de shopify-snippets. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
las versiones siguen [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

### Cambiado

- El nombre visible pasa a ser «Snippets for Shopify», como pide la marca de commente.me para los productos para devs. El
  identificador no cambia: quien ya la tiene instalada no pierde nada.
- Nuevo ícono de producto para devs del kit de marca v7: el ladrillo de commente.me con el destaque en el verde de
  Shopify y el glifo `</>` de snippets.

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
