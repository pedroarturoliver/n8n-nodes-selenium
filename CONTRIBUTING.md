# Contributing

Thanks for helping! This node is a thin, well-tested layer over the W3C WebDriver protocol, and it is meant to
stay generic: no site-specific logic, no credentials, no private URLs in the repository.

## Setup

Requirements: Node.js >= 18.10 and npm.

```bash
git clone https://github.com/pedroarturoliver/n8n-nodes-selenium.git
cd n8n-nodes-selenium
npm ci
npm run build
```

## Checks (all must pass before a pull request)

```bash
npm run format:check   # Prettier (run `npm run format` to fix)
npm run lint           # ESLint: typescript-eslint + eslint-plugin-n8n-nodes-base
npm run typecheck      # tsc on sources and tests
npm test               # unit tests, no Selenium required
npm run test:integration   # optional: needs SELENIUM_URL, see README > Development
```

CI runs the same commands on Node 20 and 22, and the integration tests against `selenium/standalone-chrome`.

## Conventions

- **Everything in the code is English**: identifiers, comments, commit messages, parameter names, output field
  names. Interface text is English too; other languages live only in `nodes/Selenium/i18n/`.
- Parameter and output names are part of the public API (workflows depend on them). Do not rename them without a
  note in `CHANGELOG.md`.
- Output field names are camelCase and never translated.
- Keep operations **atomic**: one WebDriver concept per operation. Combine them in the workflow, not in the node.
  (`Check Multiple Elements` and `Fill Multiple Fields` exist because doing them node by node is impractical.)
- Prefer small pure helpers in `helpers/` that can be unit-tested with the fakes in `test/helpers/`.
- Tabs for indentation, single quotes, trailing commas (Prettier enforces this).
- Use `msg('key')` for error messages, never hard-coded sentences, so they are translatable.

## Project layout

See [README > Project structure](README.md#project-structure). The important rule: **descriptions** define the UI,
**actions** define the behaviour, and the registry in `actions/index.ts` connects an operation to its handler.

## Adding an operation

1. **UI** - add the option to the resource's `operationField(...)` list in
   `nodes/Selenium/descriptions/<resource>.description.ts` (`name`, `value`, `description`, `action`), and add the
   fields it needs. Show them only for that operation with
   `displayOptions: { show: { resource: ['<resource>'], operation: ['<operation>'] } }` (the `field(...)` helper in
   `descriptions/common.ts` does this for you).
2. **Behaviour** - add a handler with the same key to `nodes/Selenium/actions/<resource>.ts`:

   ```ts
   export const alertActions: Record<string, ActionHandler> = {
   	getText: async (c) => c.output({ text: await c.request('GET', c.sessionPath('/alert/text')) }),
   };
   ```

   `c.param(name)` reads a parameter, `c.request(method, path, body)` talks to WebDriver,
   `c.sessionPath('/x')` builds `/session/<id>/x`, and `c.output({...})` builds the result item.

3. **New resource?** Create both files, then register the resource in `descriptions/index.ts` (the resource
   options) and in `actions/index.ts` (the `RESOURCES` map). Resources that must run without an existing session go
   in `isSessionless`.
4. **Tests** - add unit tests in `test/unit/` (use `fakeRequester` / `fakePage`), and an integration test in
   `test/integration/grid.test.ts` if the behaviour depends on a real browser. One unit test already fails when an
   operation is declared in a description without a handler.
5. **Translations** - see below.
6. **Docs** - update the operation table in `README.md` and add a line to `CHANGELOG.md`.

## Translations

The node follows `N8N_DEFAULT_LOCALE` and supports `en`, `pt`, `es`, `fr`, `de`, `ru`. English is the source: the
English text of a `displayName`, `description`, `placeholder`, `hint`, option name, `action` or button label **is the
translation key**.

- Interface text: `nodes/Selenium/i18n/locales/<language>.ts`, field `ui` (`'English text': 'Translation'`).
- Error messages: `nodes/Selenium/i18n/messages.ts` (English) and the `messages` field of each locale file.
- Words of the logical expression (AND, OR, T, F): the `logic` field of each locale file.

Fix a wording by editing the value in the locale file. When you add or change English text, add the key to **every**
locale file (an untranslated language may temporarily repeat the English text); `npm test` fails on missing or
stale keys and on placeholders (`{name}`) that differ from the English text.

To add a language:

1. Add its code to `SUPPORTED_LANGUAGES` in `i18n/types.ts`.
2. Copy an existing file in `i18n/locales/`, translate it, and register it in `LOCALES` in `i18n/index.ts`.
3. Run `npm test`. Mention the language in `README.md`.

## Commits and pull requests

- Keep pull requests focused; describe what and why.
- Use clear, imperative commit messages (`Add Window > Print To PDF landscape option`).
- Do not commit `dist/`, `node_modules/`, `.env` files or any credentials. Test workflows you share in issues must
  not contain real URLs, passwords or cookies.

## Releasing (maintainers)

1. Update `version` in `package.json` and move the `Unreleased` notes in `CHANGELOG.md` under the new version.
2. `npm run prepublishOnly` (lint, tests, build), then `npm publish` if publishing to npm.
3. Tag the release (`v0.x.y`).
