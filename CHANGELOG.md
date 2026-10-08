# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/) (while the version is `0.x`, minor releases may contain breaking changes).

## [Unreleased]

## [0.2.0]

### Breaking changes

**Workflows built with 0.1.x must be rebuilt.** All internal names (resources, operations, parameters, option
values and output fields) were renamed from Portuguese to English. The labels shown in the interface are
unchanged in meaning, and can still be shown in Portuguese (see _Added_), but the stored names are different.
The credential type (`seleniumGrid`) did not change.

Resources:

| Before (0.1.x)      | Now          |
| ------------------- | ------------ |
| `alerta`            | `alert`      |
| `cookie`            | `cookie`     |
| `elemento`          | `element`    |
| `espera`            | `wait`       |
| `frame`             | `frame`      |
| `janela`            | `window`     |
| `navegacao`         | `navigation` |
| `script`            | `script`     |
| `sessao`            | `session`    |
| `sistema`           | `system`     |

Operations (the most used ones):

| Resource   | Before                                                                                                              | Now                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| session    | `criar`, `encerrar`, `encerrarTodas`, `listar`                                                                      | `create`, `end`, `endAll`, `list`                                                                                                    |
| navigation | `abrir`, `voltar`, `avancar`, `recarregar`, `urlAtual`, `titulo`, `codigoFonte`                                     | `openUrl`, `back`, `forward`, `reload`, `getCurrentUrl`, `getTitle`, `getPageSource`                                                 |
| element    | `clicar`, `digitar`, `limpar`, `texto`, `atributo`, `propriedade`, `visivel`, `habilitado`, `existe`, `listar`      | `click`, `type`, `clear`, `getText`, `getAttribute`, `getProperty`, `isVisible`, `isEnabled`, `exists`, `list`                       |
| element    | `passarMouse`, `rolarAte`, `selecionarOpcao`, `capturaTela`, `preencher`, `verificar`                               | `hover`, `scrollIntoView`, `selectOption`, `screenshot`, `fillForm`, `checkMultiple`                                                 |
| wait       | `elemento`, `urlContem`, `tituloContem`, `paginaCarregada`, `tempo`                                                 | `element`, `urlContains`, `titleContains`, `pageLoaded`, `time`                                                                      |
| frame      | `entrar`, `pai`, `principal`                                                                                        | `enter`, `parent`, `main`                                                                                                            |
| cookie     | `todos`, `um`, `adicionar`, `adicionarVarios`, `excluir`, `excluirTodos`                                            | `getAll`, `getOne`, `add`, `addMany`, `delete`, `deleteAll`                                                                          |
| window     | `listar`, `trocar`, `nova`, `fechar`, `definirTamanho`, `maximizar`, `capturaTela`, `imprimirPdf`                   | `list`, `switch`, `new`, `close`, `setSize`, `maximize`, `screenshot`, `printPdf`                                                    |
| script     | `executar`                                                                                                          | `execute`                                                                                                                            |
| alert      | `aceitar`, `dispensar`, `texto`                                                                                     | `accept`, `dismiss`, `getText`                                                                                                       |

Parameters:

| Before                                                                                   | Now                                                                                           |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `seletorTipo`, `seletor`, `tempoParaAcharMs`                                             | `selectorType`, `selector`, `findTimeoutMs`                                                   |
| `teclaFinal` (`nenhuma`), `limparAntes`, `clicarViaJs`                                   | `endKey` (`none`), `clearFirst`, `clickViaJs`                                                 |
| `nomePropriedade`, `atributosExtras`, `umItemPorElemento`, `modoSelecao`                 | `propertyName`, `extraAttributes`, `oneItemPerElement`, `selectBy`                            |
| `maisCondicoes`, `conector`, `condicao`, `usarParenteses`, `tempoMaximoMs`               | `moreConditions`, `connector`, `condition`, `useParentheses`, `timeoutMs`                     |
| `campos`, `acao`, `continuarSeFalhar`                                                    | `fields`, `action`, `continueOnFieldError`                                                    |
| `falharNoTimeout`, `modoFrame`, `modoTroca`, `modoScript`                                | `failOnTimeout`, `frameMode`, `switchMode`, `scriptMode`                                      |
| `codigoJs`, `argumentos`                                                                 | `scriptCode`, `scriptArgs`                                                                    |
| `navegador`, `tamanhoJanela`, `ocultarAutomacao`, `argsExtras`, `capsExtras`             | `browser`, `windowSize`, `hideAutomation`, `extraArgs`, `extraCapabilities`                   |
| `carregamentoPagina`, `timeoutPaginaMs`, `aceitarCertInseguro`                           | `pageLoadStrategy`, `pageLoadTimeoutMs`, `acceptInsecureCerts`                                |
| `filtrarDominio`, `excluirNomes`, `incluirUserAgent`, `umItemPorCookie`, `incluirUrl`    | `domainFilter`, `excludeNames`, `includeUserAgent`, `onePerCookie`, `includeUrl`              |
| `nomeArquivo`, `tipoJanela`, `trocarParaNova`, `trocarParaPrimeira`                      | `fileName`, `windowType`, `switchToNew`, `switchToFirst`                                      |

Output fields: `encontrado` -> `found`, `esperouMs` -> `waitedMs`, `resultado` -> `result`,
`expressao` -> `expression`, `avaliacao` -> `evaluation`, `condicoes` -> `conditions`. `sessionId` is unchanged.
Expressions in later nodes (`{{ $json.encontrado }}`) and IF nodes that read these fields must be updated.

The field values of option lists were renamed the same way (for example the wait condition `presente` -> `present`,
the check rule `textoContem` -> `textContains`, the select mode `indice` -> `index`).
See the `descriptions/` folder for the complete current list.

### Added

- **Languages**: the node follows `N8N_DEFAULT_LOCALE` and is available in English, Portuguese (`pt`, `pt-BR`),
  Spanish, French, German and Russian. Any other language falls back to English. Covers the interface, error
  messages, the credential form and the words of the logical expression in the output.
- **Check Multiple Elements** (previously "Check Multiple Elements AND/OR"): each condition has its own
  AND / OR connector to the previous one, evaluated with Boolean precedence (AND before OR), with optional
  parentheses. The output shows `expression` and `evaluation`.
- Unit tests (122) and integration tests against a real Selenium Grid (13, opt-in via `SELENIUM_URL`).
- ESLint (typescript-eslint + n8n community node rules), Prettier, EditorConfig, GitHub Actions CI, issue and pull
  request templates, `CONTRIBUTING.md`.

### Changed

- The code base is now English and split into modules (`descriptions/`, `actions/`, `helpers/`, `i18n/`) instead of
  a single large file.
- The README is now in English.
- Removed the old `combinar` / `condicoes` fields of the previous multiple-element check; use the per-condition
  connector instead.

### Fixed

- The "invalid session" error message is now translated.

## [0.1.0]

- First version: atomic Selenium operations over the W3C WebDriver protocol, session selector (list or ID),
  list / end / end-all sessions, Check Multiple Elements (True / False outputs) and Fill Multiple Fields (form).
