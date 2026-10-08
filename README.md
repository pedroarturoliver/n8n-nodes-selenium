# n8n-nodes-selenium

A generic [n8n](https://n8n.io) community node for [Selenium](https://www.selenium.dev) (W3C WebDriver
protocol). It works with any website: open a page, wait for an element, enter/leave an iframe, read cookies,
click, type, switch tabs, run JavaScript...

The browser runs in the **Selenium container** (`selenium/standalone-chrome`); the node only sends HTTP
commands to it. Every operation returns the `sessionId`, so the **Session** field of the following nodes is
already filled in (`{{ $json.sessionId }}`).

## Contents

- [Sessions](#sessions)
- [Install](#install)
- [Languages](#languages)
- [Operations](#operations)
- [Selenium (Python) equivalents](#selenium-python-equivalents)
- [Example flow (login)](#example-flow-login)
- [Check Multiple Elements (works like the IF node)](#check-multiple-elements-works-like-the-if-node)
- [Fill Multiple Fields in one node (form)](#fill-multiple-fields-in-one-node-form)
- [Caveats](#caveats)
- [Development](#development)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Sessions

- **Session > Create (Open Browser)** opens the browser and returns `sessionId`. Every other operation
  (except List and End All) has a **Session** field with two modes: _From List_ (pick one of the browsers
  currently open in Selenium, showing version, start time and current URL) and _By ID / Expression_
  (default `{{ $json.sessionId }}`, to chain nodes).
- **Session > End Session and Close Browser** closes the browser of the chosen session.
- **Session > List Open Sessions** returns one item per session; **End All Sessions** closes every session
  (including those of other workflows - use it for cleanup).
- Listing and picking from the list works with Selenium Grid / standalone (the `selenium/standalone-chrome`
  image), not with a bare chromedriver.

## Install

1. Clone this repository next to your `docker-compose.yml`, then build it (`dist/` is not committed):

   ```bash
   git clone https://github.com/pedroarturoliver/n8n-nodes-selenium.git n8n-nodes-selenium
   cd n8n-nodes-selenium
   npm ci
   npm run build
   ```

2. Add this to your `docker-compose.yml`:

   ```yaml
   selenium:
     image: selenium/standalone-chrome:latest # Apple Silicon / ARM: selenium/standalone-chromium:latest
     restart: unless-stopped
     shm_size: '2gb'
     environment:
       SE_NODE_MAX_SESSIONS: '4'
       SE_NODE_OVERRIDE_MAX_SESSIONS: 'true'
       SE_NODE_SESSION_TIMEOUT: '1800' # seconds without commands before Selenium kills the session
       SE_VNC_NO_PASSWORD: '1'
     ports:
       - '4444:4444' # WebDriver / Grid
       - '7900:7900' # noVNC: open http://localhost:7900 to watch the browser live
     networks: [my-network] # the same network as your n8n

   n8n:
     image: n8nio/n8n:latest
     restart: unless-stopped
     ports:
       - '5678:5678'
     environment:
       N8N_CUSTOM_EXTENSIONS: /custom-nodes
       N8N_DEFAULT_LOCALE: en # node language, see "Languages" below
       GENERIC_TIMEZONE: America/Sao_Paulo
       TZ: America/Sao_Paulo
     volumes:
       - n8n-data:/home/node/.n8n
       - ./n8n-nodes-selenium/dist:/custom-nodes/n8n-nodes-selenium
     depends_on:
       - selenium
     networks: [my-network] # the same network as your selenium
   ```

   and at the end of the file, under `volumes:` (if it does not exist yet): `n8n-data:`

3. `docker compose up -d selenium n8n` and open <http://localhost:5678>.
4. Credentials > New > **Selenium (WebDriver)** > URL `http://selenium:4444` > Test.

After changing the code: `npm run build && docker compose restart n8n`.

## Languages

The node follows the language configured in n8n (the `N8N_DEFAULT_LOCALE` environment variable) and is
available in **English, Portuguese (`pt`, `pt-BR`), Spanish (`es`), French (`fr`), German (`de`) and Russian (`ru`)**.
Any other language - or no variable at all - falls back to **English**. Regional variants such as
`pt-BR`, `de-AT` or `es_MX` are matched by their base language.

This covers field names and descriptions, option labels, output labels (True/False), error messages,
the credential form and the words of the logical expression shown in the output
(`C1 OR C2 AND C3`, `C1 OU C2 E C3`, `C1 ODER C2 UND C3`...). Example in `docker-compose.yml`:

```yaml
n8n:
  environment:
    - N8N_DEFAULT_LOCALE=pt-BR
```

Notes:

- n8n uses **one language per instance**, so every user of that n8n sees the node in the same language.
  Change the variable and restart n8n to switch.
- Internal parameter names and output field names are always English and never change with the language, so
  a workflow built in one language keeps working in another (only the labels differ).
- The English text of the interface is the translation key. Translations live in
  `nodes/Selenium/i18n/locales/<language>.ts` (interface) and `nodes/Selenium/i18n/messages.ts` (error messages).
  See [CONTRIBUTING.md](CONTRIBUTING.md#translations) to fix a wording or add a language.

## Operations

| Resource            | Operations                                                                                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session (Browser)   | Create (Open Browser), End Session and Close Browser, End All Sessions, List Open Sessions                                                                                                                                       |
| Navigation          | Open URL, Back, Go Forward, Reload, Get Current URL, Get Title, Get Page Source                                                                                                                                                  |
| Element             | Click, Type, Clear, Get Text, Get Attribute, Get Property, Is Visible, Is Enabled, Exists, List Elements, Hover, Scroll To Element, Select Option, Take Element Screenshot, Fill Multiple Fields (Form), Check Multiple Elements |
| Wait                | Element, URL Contains, Title Contains, Page Loaded, Fixed Time (Sleep)                                                                                                                                                           |
| Frame (Iframe)      | Enter Iframe, Back To Parent Frame, Back To Main Content                                                                                                                                                                         |
| Cookie              | Get All, Get One, Add, Add Multiple (JSON), Delete, Delete All                                                                                                                                                                   |
| Window / Tab        | List, Switch Tab / Window, New Tab / Window, Close Current, Set Size, Maximize, Take Screenshot, Print To PDF                                                                                                                    |
| Script (JavaScript) | Execute JavaScript                                                                                                                                                                                                               |
| Alert               | Accept, Dismiss, Get Text                                                                                                                                                                                                        |
| System              | Selenium Status                                                                                                                                                                                                                  |

## Selenium (Python) equivalents

| Python / Selenium                                  | Node (Resource > Operation)                               |
| -------------------------------------------------- | --------------------------------------------------------- |
| `webdriver.Chrome(options=...)`                    | Session > Create (headless, size, user-agent, args)       |
| `browser.quit()`                                   | Session > End Session and Close Browser                   |
| `browser.get(url)`                                 | Navigation > Open URL                                     |
| `WebDriverWait(...).until(presence_of_element...)` | Wait > Element (condition: Present in DOM)                |
| `EC.element_to_be_clickable`                       | Wait > Element (condition: Clickable)                     |
| `find_element(By.ID, ..).send_keys(x)`             | Element > Type                                            |
| `find_element(...).click()`                        | Element > Click                                           |
| `execute_script("arguments[0].click();", el)`      | Element > Click (Click Via JavaScript)                    |
| `By.CLASS_NAME`, `By.XPATH`...                     | "Selector Type" on any element operation                  |
| `EC.frame_to_be_available_and_switch_to_it`        | Frame > Enter Iframe                                      |
| `switch_to.default_content()`                      | Frame > Back To Main Content                              |
| `browser.get_cookies()` + `navigator.userAgent`    | Cookie > Get All (returns `cookieHeader` and `userAgent`) |
| `time.sleep(2)`                                    | Wait > Fixed Time (Sleep)                                 |
| `browser.execute_script(...)`                      | Script > Execute JavaScript                               |

A Python `requests.Session()` carrying the browser's cookies becomes n8n's **HTTP Request** node, using
`{{ $json.cookieHeader }}` in the `Cookie` header and `{{ $json.userAgent }}` in `User-Agent`.

## Example flow (login)

Session > Create -> Navigation > Open URL (login page) -> Wait > Element (`#user`) ->
Element > Type (`#user`) -> Element > Type (`#password`) -> Element > Click (`#login`) ->
Wait > Element (`#dashboard`, "Fail On Timeout" off) -> IF `found` ->
(if false: Element > Type into the 2FA code field + Click) -> Frame > Enter Iframe (`#myIframe`) -> Cookie > Get All ->
HTTP Request -> Session > End.

## Check Multiple Elements (works like the IF node)

**Element > Check Multiple Elements** has two outputs, _True_ and _False_.
Fill in the first condition (selector + rule: exists, does not exist, visible, not visible, enabled,
text contains, text equals) and click **Add Condition (AND / OR)**. Every new condition has a
**Connect With Previous Condition** field (**AND** or **OR**), so you can build any combination, with no limit.

The result is computed with Boolean logic: each condition becomes T or F and the expression is evaluated with the
precedence rule of discrete mathematics, **AND before OR** (`A OR B AND C` = `A OR (B AND C)`).
To change the order, turn on **Use Parentheses (Advanced)** and set how many parentheses open/close at each condition.

With "Wait Up To (ms)" greater than 0 it re-checks until the result is True or the time runs out - combined with **OR**
this solves "whichever shows up first" (e.g. logged-in dashboard OR 2FA code screen).
The output has `result`, `expression` (e.g. `C1 OR C2 AND C3`), `evaluation` (e.g. `T OR F AND F`)
and the result of each condition in `conditions`.

## Fill Multiple Fields in one node (form)

**Element > Fill Multiple Fields (Form)** takes a list of fields, executed from top to bottom
(drag to reorder). Each field has a selector + action: _Type_ (with "clear before" and a key at the end),
_Select option_ of a dropdown (by text or by value), _Check_ / _Uncheck_ a checkbox or radio, and _Click_
(use it as the last row to submit). If a field fails, the error says which one (number and selector); with
"Continue If a Field Fails" the others keep going and the output lists the result of each field in `fields`.

## Caveats

- Selenium kills the session after `SE_NODE_SESSION_TIMEOUT` seconds without commands.
- Always end the session at the end of the flow (each session is an open Chrome). Use "Continue On Fail" +
  Session > End on an error branch.
- "Get All" returns only the cookies of the current page's domain (same as `get_cookies()`); HttpOnly cookies are included.
- Element operations wait for the element to appear (default 10 s). In "Exists" and "List" the default is 0 (no wait).
- "List Elements" emits no items if nothing is found; enable "Always Output Data" in the node settings if the flow must continue.
- Output field names (`sessionId`, `found`, `result`, `conditions`, `waitedMs`...) are not translated, so expressions keep working in any language.
- Tested against a real Selenium Grid 4.25 (standalone) with Chromium: all operations, several simultaneous sessions,
  list and end all. The Grid requires `Content-Type: application/json; charset=utf-8`; the node already sends it.
  Firefox/Edge only build the capabilities and were not tested.

## Development

Requirements: Node.js >= 18.10 and npm.

```bash
npm ci                  # install dependencies
npm run build           # compile to dist/
npm run dev             # compile in watch mode
npm run typecheck       # type-check sources and tests
npm run lint            # ESLint (typescript-eslint + n8n community node rules)
npm run format          # Prettier (use format:check in CI)
npm test                # unit tests (no Selenium needed)
npm run test:integration  # integration tests against a real Selenium (see below)
```

Integration tests are skipped unless `SELENIUM_URL` is set:

```bash
docker run -d --rm -p 4444:4444 --shm-size=2g selenium/standalone-chrome:latest
SELENIUM_URL=http://localhost:4444 npm run test:integration
```

Optional variables: `SELENIUM_CHROME_BINARY` (path to the browser binary) and `SELENIUM_HOST_FOR_SITE`
(host name under which the Selenium container can reach the machine running the tests).

## Project structure

```text
credentials/
  SeleniumGrid.credentials.ts   Credential type (Selenium URL)
nodes/Selenium/
  Selenium.node.ts              Node class: wires descriptions, actions and the session search
  constants.ts                  Shared constants (timeouts, key codes, ...)
  types.ts                      Shared types
  descriptions/                 UI definition (n8n properties), one file per resource
  actions/                      Behaviour, one file per resource; index.ts is the operation registry
  helpers/                      WebDriver client, locators, polling, boolean logic, capabilities, ...
  i18n/                         Runtime translations (EN source, PT, ES, FR, DE, RU)
test/
  unit/                         Fast tests with fakes (no network)
  integration/                  Tests against a real Selenium Grid (opt-in)
  helpers/                      Fake n8n context and fake page used by the unit tests
scripts/                        Build helpers
```

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first: it explains how to
add an operation, how to add or fix a translation and which checks must pass. Release notes and breaking
changes are in [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
