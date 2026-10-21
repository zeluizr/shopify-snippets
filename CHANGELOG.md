# Changelog

Todos los cambios de shopify-snippets. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
las versiones siguen [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

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
