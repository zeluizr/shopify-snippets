# CLAUDE.md

Guia para trabalhar neste repositório. É a extensão de VS Code **"Shopify Snippets"** (publisher
`commenteme`, id `commenteme.shopify-snippets`). Irmã do `zeluizr/vtex-io-snippets`, para temas de Shopify.

## O que a extensão faz

1. **Snippets de Liquid** gerados dos dados oficiais (`data/tags.json`, `data/filters.json`, de
   Shopify/theme-liquid-docs no commit de `data/fonte.json`). Descontinuados ficam de fora.
2. **Snippets de estrutura** escritos à mão em `lib/manuais.js` (section, block, schema, preset...).
3. **Um snippet por tipo de setting** a partir do catálogo de `lib/settings.js`.
4. **Validação do `{% schema %}`** de `sections/*.liquid` e `blocks/*.liquid` com `ajv` contra `schemas/theme/`
   (diagnósticos em `extension.js`, lógica em `lib/schema.js`), e de `config/settings_schema.json` e
   `locales/*.json` por `jsonValidation`.

Não traz gramática de Liquid: registra o lenguaje `liquid` e convive com a extensão oficial da Shopify.

## Regras que os testes cobram

- **Toda tag e todo filtro vigente tem snippet.** Ao sincronizar um commit novo, o teste mostra o que falta.
- **O catálogo de settings cobre exatamente os tipos do esquema oficial**, e cada exemplo passa no esquema.
- **Os snippets de section e block geram `{% schema %}` válido.**
- **Os arquivos de `snippets/` são gerados**: nunca edite à mão. Mude `lib/` e rode `node scripts/gerar.js`; o CI
  falha se o gerado divergir do commitado.
- **Sem falso positivo**: `SHOPIFY_TEMA=/caminho/do/tema node --test` valida todo `{% schema %}` de um tema real.
  Antes de mexer em `lib/schema.js`, rode contra um tema Horizon (em `~/Sites/vino-theme` há um).

## Convenções

- JavaScript puro, CommonJS, sem build step. Todo arquivo começa com `// @ts-check` e `"use strict"`.
- Estilo: tab (largura 2), aspas duplas e ponto e vírgula.
- `lib/*.js` é lógica pura, sem `vscode`, testável com `node:test`. Só o `extension.js` importa `vscode`.
- Comentários e mensagens de commit em português; README, CHANGELOG, descrições de snippets e mensagens de
  diagnóstico em espanhol.
- Dependências de runtime só `ajv` e `jsonc-parser`. O `.vsix` vai com elas (sem `--no-dependencies`).

## Marca

Segue o kit de marca da commente.me (skill `marca-commente`): o ícone é o **ladrillo de produto para devs**
(`images/icon.svg`, cópia de `icon-snippets-shopify.svg` do kit v7 sem metadados): destaque em verde Shopify `#95BF47` e glifo `</>` no quarto bloco; o banner do
Marketplace é `--azul` (`#005278`), o nome não leva "by commente.me" e o README assina "Hecho con amor y café por
commente.me", sem citar ferramenta de IA.

## Comandos

```bash
npm install
npm run check                          # gera, confere o diff de snippets/ e roda os testes (é o gate)
node scripts/sincronizar.js <commit>   # atualiza data/ e schemas/ de Shopify/theme-liquid-docs
npm run empacotar                      # gera o .vsix
npm run icone                          # images/icon.png a partir de images/icon.svg (sharp)
npm run preview                        # images/preview.png, a partir dos snippets e do validador reais
```

## Branches e versão

`branch de trabalho` → PR contra `dev` → `qa` → `main`, sempre por merge da branch inteira. O workflow `ramas`
cobra que `qa` só tenha o que está em `dev` e que o commit de `main` tenha **tag anotada de versão**: antes de
promover para `main`, suba a versão no `package.json` e feche a seção do CHANGELOG por PR em `dev`. Uma tag `v*`
dispara o `publish.yml`, que só anexa o `.vsix` à Release; o Marketplace é manual (`vsce publish`).
