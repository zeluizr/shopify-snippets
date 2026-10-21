# Shopify Snippets by commente.me

**Snippets de Liquid y validación del `{% schema %}` para temas de Shopify, generados desde la documentación oficial.**

Extensión de VS Code para quien construye temas de Shopify (Online Store 2.0 y Horizon): las tags y los filtros de
Liquid como snippets, la estructura de sections y bloques con su `{% schema %}`, un snippet por cada tipo de setting
del editor de temas, y la validación del `{% schema %}` contra el esquema oficial de Shopify mientras escribes.

[![licencia](https://badgen.net/github/license/zeluizr/shopify-snippets?label=licencia)](./LICENSE)

Versión del código: **0.1.0**, según [package.json](package.json). Requiere **VS Code >= 1.60.0**.

---

## Por qué otra extensión

Todo lo que sugiere sale de los datos oficiales de Shopify
([Shopify/theme-liquid-docs](https://github.com/Shopify/theme-liquid-docs)), fijados en un commit en
[data/fonte.json](data/fonte.json), y cada pieza tiene un test:

- **Ninguna tag ni filtro se queda afuera**: si Shopify agrega uno, el test falla hasta que el snippet exista.
- **Los descontinuados no se sugieren** (`include` y los filtros marcados como `deprecated`).
- **Cada snippet de setting es válido**: los 35 tipos del esquema oficial están cubiertos, y cada ejemplo pasa la
  validación del propio esquema.
- **La validación no da falsos positivos**: se prueba contra todas las sections y bloques de un tema Horizon real.

## Instalación

Mientras no esté en el Marketplace, desde el `.vsix` de la release:

```bash
code --install-extension shopify-snippets-0.1.0.vsix
```

## Uso

### Tags y filtros de Liquid

En cualquier `.liquid`, escribe el nombre de la tag (`if`, `for`, `paginate`, `form`, `render`, `content_for`...) o,
después de un `|`, el nombre del filtro (`image_url`, `money`, `where`...). Cada snippet trae el resumen oficial y
el enlace a shopify.dev.

| Prefijo | Qué inserta |
| :--- | :--- |
| `if`, `for`, `case`, `paginate`... | La tag con sus partes editables, en el orden del Tab |
| `content_for` | Dos formas: los bloques del editor o un bloque estático |
| `image_url`, `append`, `where`... | El filtro con sus parámetros |

### Sections y bloques

| Prefijo | Qué inserta |
| :--- | :--- |
| `section-file` | Section completa: bloques del tema, `{% stylesheet %}` y `{% schema %}` con preset |
| `block-file` | Bloque del tema: `{% doc %}`, `block.shopify_attributes` y `{% schema %}` con preset |
| `schema-section` | Solo el `{% schema %}` de una section |
| `schema-block` | Solo el `{% schema %}` de un bloque |
| `preset` | Una entrada de `presets` |
| `blocks-theme` | `"blocks": [{ "type": "@theme" }, { "type": "@app" }]` |
| `image-responsive` | Imagen con `srcset`, `sizes` y `loading: 'lazy'` |
| `shopify-attributes` | `{{ block.shopify_attributes }}` |
| `t-default` | Texto traducido desde `locales` |

### Settings del editor de temas

`setting-<tipo>` inserta un setting válido de ese tipo, en Liquid (dentro del `{% schema %}`) y en JSON
(`config/settings_schema.json`): `setting-text`, `setting-range`, `setting-select`, `setting-color_scheme`,
`setting-image_picker`, `setting-product_list`, `setting-header`... los 35 tipos.

### Validación

- **`{% schema %}` de `sections/*.liquid` y `blocks/*.liquid`**: los errores aparecen subrayados en el lugar exacto,
  en español (propiedad que falta, propiedad que sobra, tipo de setting inexistente, JSON mal formado).
- **`config/settings_schema.json` y `locales/*.json`**: con el validador de JSON del propio VS Code.

Para apagar la validación del `{% schema %}`:

```json
"shopifySnippets.validarSchema": false
```

## Junto con otras extensiones

Esta extensión no colorea la sintaxis de Liquid: registra el lenguaje `liquid` para los snippets y la validación, y
convive con cualquier extensión que traiga la gramática, como la oficial de Shopify.

## Desarrollo

```bash
npm install
npm run check          # regenera los snippets, falla si cambiaron, y corre los tests
SHOPIFY_TEMA=/ruta/del/tema node --test   # agrega el test contra un tema real
```

Para actualizar los datos oficiales:

```bash
node scripts/sincronizar.js <commit>   # baja datos y esquemas de Shopify/theme-liquid-docs
node scripts/gerar.js                  # regenera los snippets
node --test
```

Ramas: el trabajo sale de `dev` y llega por pull request; `dev → qa → main` por merge de la rama entera, y el commit
de `main` lleva tag anotado de versión. `./scripts/instalar-hooks.sh` activa los hooks que cobran lo mismo en local.

## Licencia

MIT, ver [LICENSE](LICENSE). Los datos y esquemas de `data/` y `schemas/` son de Shopify, también MIT: ver
[NOTICE](NOTICE).

---

Hecho por [commente.me](https://commente.me).
