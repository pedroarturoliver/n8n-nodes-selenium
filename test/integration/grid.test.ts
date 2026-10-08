/**
 * End-to-end test of the node against a REAL Selenium (Grid or standalone) and a tiny local site.
 *
 *   SELENIUM_URL=http://localhost:4444 npm run test:integration
 *
 * Optional: SELENIUM_CHROME_BINARY (path of the browser inside the Selenium container/host) and
 * SELENIUM_HOST_FOR_SITE (address the browser uses to reach this machine, default 127.0.0.1).
 * Without SELENIUM_URL the whole suite is skipped.
 */
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Selenium } from '../../nodes/Selenium/Selenium.node';
import { setLanguage } from '../../nodes/Selenium/i18n';

const SELENIUM_URL = process.env.SELENIUM_URL;
const CHROME_BINARY = process.env.SELENIUM_CHROME_BINARY;
const SITE_HOST = process.env.SELENIUM_HOST_FOR_SITE ?? '127.0.0.1';

const PAGE = `<!doctype html><html><head><title>Test Page</title></head><body>
<h1 id="title">Hello world</h1>
<input id="field" name="field" type="text">
<button id="button" onclick="document.getElementById('res').innerText='clicked'">Click</button>
<div id="res"></div>
<select id="sel"><option value="a">Alpha</option><option value="b">Beta</option></select>
<input id="agree" type="checkbox">
<a class="lnk" href="/target">link1</a> <a class="lnk" href="/other">link2</a>
<button id="alert" onclick="alert('hi alert')">alert</button>
<div id="hidden" style="display:none">hidden</div>
<iframe id="myFrame" src="/frame"></iframe>
<script>setTimeout(()=>{const d=document.createElement('div');d.id='late';d.innerText='appeared';document.body.appendChild(d)},1200)</script>
</body></html>`;
const FRAME = `<!doctype html><html><body><input id="inside"><p id="msg">inside the iframe</p></body></html>`;

let server: http.Server;
let site = '';
let sessionId = '';

/** A fake `IExecuteFunctions` that talks to the real Selenium through `fetch`. */
function context(params: Record<string, unknown>): IExecuteFunctions {
	return {
		getInputData: () => [{ json: {} }],
		getCredentials: async () => ({ baseUrl: SELENIUM_URL }),
		getNodeParameter: (name: string, _i: number, fallback?: unknown) =>
			name in params ? params[name] : fallback,
		getNode: () => ({ name: 'Selenium' }),
		continueOnFail: () => false,
		helpers: {
			httpRequest: async (options: any) => {
				const response = await fetch(options.url, {
					method: options.method,
					headers: options.headers,
					body: options.body,
				});
				const text = await response.text();
				let body: unknown = text;
				try {
					body = JSON.parse(text);
				} catch {
					/* not JSON */
				}
				return { statusCode: response.status, body };
			},
			prepareBinaryData: async (buffer: Buffer, fileName: string, mimeType: string) => ({
				data: buffer.toString('base64'),
				fileName,
				mimeType,
				fileSize: String(buffer.length),
			}),
		},
	} as unknown as IExecuteFunctions;
}

async function run(
	resource: string,
	operation: string,
	params: Record<string, unknown> = {},
): Promise<INodeExecutionData[]> {
	const [out] = await new Selenium().execute.call(
		context({ resource, operation, sessionId, ...params }),
	);
	return out;
}

const find = (selectorType: string, selector: string, extra: Record<string, unknown> = {}) => ({
	selectorType,
	selector,
	findTimeoutMs: 5000,
	...extra,
});

const createSession = (windowSize = '1280,800', userAgent = 'TestUA/1.0') =>
	run('session', 'create', {
		browser: 'chrome',
		headless: true,
		windowSize,
		userAgent,
		hideAutomation: true,
		pageLoadStrategy: 'normal',
		pageLoadTimeoutMs: 30000,
		acceptInsecureCerts: false,
		extraCapabilities: CHROME_BINARY
			? JSON.stringify({ 'goog:chromeOptions': { binary: CHROME_BINARY } })
			: '',
	});

describe.skipIf(!SELENIUM_URL)('Selenium node against a real Selenium', () => {
	beforeAll(async () => {
		setLanguage('en');
		server = http.createServer((req, res) => {
			res.setHeader('Content-Type', 'text/html');
			if (req.url === '/frame') return void res.end(FRAME);
			res.setHeader('Set-Cookie', ['sid=abc123; Path=/', 'other=xyz; Path=/']);
			res.end(PAGE);
		});
		await new Promise<void>((resolve) => server.listen(0, '0.0.0.0', resolve));
		site = `http://${SITE_HOST}:${(server.address() as AddressInfo).port}/`;
	});

	afterAll(async () => {
		await run('session', 'endAll').catch(() => undefined);
		await new Promise((resolve) => server.close(resolve));
	});

	it('creates a session and opens a page', async () => {
		const [created] = await createSession();
		sessionId = created.json.sessionId as string;
		expect(sessionId).toBeTruthy();
		expect(created.json.browser).toMatch(/chrome/i);

		const [opened] = await run('navigation', 'openUrl', { url: site });
		expect(opened.json.title).toBe('Test Page');
		expect((await run('navigation', 'getTitle'))[0].json.title).toBe('Test Page');
		expect((await run('navigation', 'getPageSource'))[0].json.html).toContain('Hello world');
	});

	it('reads, types, clicks and clears elements with every selector type', async () => {
		expect((await run('element', 'getText', find('id', 'title')))[0].json.text).toBe('Hello world');

		await run(
			'element',
			'type',
			find('name', 'field', { text: 'abc', clearFirst: true, endKey: 'none' }),
		);
		expect(
			(await run('element', 'getProperty', find('css', '#field', { propertyName: 'value' })))[0]
				.json.value,
		).toBe('abc');

		await run('element', 'click', find('xpath', '//button[@id="button"]'));
		expect((await run('element', 'getText', find('id', 'res')))[0].json.text).toBe('clicked');

		await run('element', 'clear', find('id', 'field'));
		expect(
			(await run('element', 'getProperty', find('id', 'field', { propertyName: 'value' })))[0].json
				.value,
		).toBe('');

		const attribute = await run(
			'element',
			'getAttribute',
			find('class', 'lnk', { attributeName: 'href' }),
		);
		expect(String(attribute[0].json.value)).toMatch(/\/target$/);
	});

	it('lists elements, checks state, selects options, hovers, scrolls and takes screenshots', async () => {
		const list = await run('element', 'list', {
			...find('css', 'a.lnk'),
			extraAttributes: 'href',
			oneItemPerElement: true,
			maxElements: 0,
		});
		expect(list).toHaveLength(2);
		expect(list[1].json).toMatchObject({ text: 'link2', total: 2, index: 1 });
		expect((list[1].json.attributes as any).href).toMatch(/\/other$/);

		expect(
			(await run('element', 'exists', find('id', 'nope', { findTimeoutMs: 0 })))[0].json.exists,
		).toBe(false);
		expect((await run('element', 'isVisible', find('id', 'hidden')))[0].json.visible).toBe(false);
		expect((await run('element', 'isEnabled', find('id', 'button')))[0].json.enabled).toBe(true);

		await run(
			'element',
			'selectOption',
			find('id', 'sel', { selectBy: 'text', optionValue: 'Beta' }),
		);
		expect(
			(await run('element', 'getProperty', find('id', 'sel', { propertyName: 'value' })))[0].json
				.value,
		).toBe('b');

		await run('element', 'hover', find('id', 'button'));
		await run('element', 'scrollIntoView', find('id', 'button'));

		const [shot] = await run(
			'element',
			'screenshot',
			find('id', 'title', { binaryPropertyName: 'img' }),
		);
		expect(shot.binary!.img.mimeType).toBe('image/png');
		expect(shot.json.sizeBytes as number).toBeGreaterThan(100);
	});

	it('fills a form in a single node', async () => {
		await run('navigation', 'reload');
		const [filled] = await run('element', 'fillForm', {
			findTimeoutMs: 5000,
			fields: {
				items: [
					{
						selectorType: 'id',
						selector: 'field',
						action: 'type',
						value: 'form text',
						clearFirst: true,
						endKey: 'none',
					},
					{ selectorType: 'id', selector: 'sel', action: 'selectByValue', value: 'b' },
					{ selectorType: 'id', selector: 'agree', action: 'check' },
					{ selectorType: 'id', selector: 'button', action: 'click' },
				],
			},
		});
		expect(filled.json).toMatchObject({ filled: 4, total: 4 });
		expect((await run('element', 'getText', find('id', 'res')))[0].json.text).toBe('clicked');
		expect(
			(await run('element', 'getProperty', find('id', 'agree', { propertyName: 'checked' })))[0]
				.json.value,
		).toBe(true);
	});

	it('routes "Check Multiple Elements" to True/False with AND/OR precedence', async () => {
		const check = async (params: Record<string, unknown>) => {
			const [whenTrue, whenFalse] = await new Selenium().execute.call(
				context({
					resource: 'element',
					operation: 'checkMultiple',
					sessionId,
					timeoutMs: 0,
					...params,
				}),
			);
			return { whenTrue, whenFalse };
		};
		const row = (connector: string, selector: string, condition: string, extra = {}) => ({
			connector,
			selectorType: 'css',
			selector,
			condition,
			...extra,
		});

		// T OR F AND F = T
		const a = await check({
			firstSelector: '#button',
			firstCondition: 'exists',
			moreConditions: { items: [row('OR', '#nope', 'exists'), row('AND', '#nope', 'exists')] },
		});
		expect(a.whenTrue).toHaveLength(1);
		expect(a.whenTrue[0].json).toMatchObject({
			result: true,
			expression: 'C1 OR C2 AND C3',
			evaluation: 'T OR F AND F',
		});

		// (T OR F) AND F = F
		const b = await check({
			firstSelector: '#button',
			firstCondition: 'exists',
			firstOpen: 1,
			useParentheses: true,
			moreConditions: {
				items: [row('OR', '#nope', 'exists', { close: 1 }), row('AND', '#nope', 'exists')],
			},
		});
		expect(b.whenFalse).toHaveLength(1);
		expect(b.whenFalse[0].json.expression).toBe('(C1 OR C2) AND C3');

		// text and visibility conditions
		const c = await check({
			firstSelector: '#title',
			firstCondition: 'textEquals',
			firstText: 'Hello world',
			moreConditions: { items: [row('AND', '#hidden', 'notVisible')] },
		});
		expect(c.whenTrue).toHaveLength(1);

		// waits until "whichever shows up first" is true
		await run('navigation', 'reload');
		const d = await check({
			firstSelector: '#never',
			firstCondition: 'exists',
			timeoutMs: 8000,
			moreConditions: { items: [row('OR', '#late', 'exists')] },
		});
		expect(d.whenTrue).toHaveLength(1);
		expect(d.whenTrue[0].json.waitedMs as number).toBeGreaterThan(300);
	});

	it('waits for elements, URL, title and page load', async () => {
		await run('navigation', 'reload');
		const late = await run('wait', 'element', {
			...find('id', 'late'),
			condition: 'visible',
			timeoutMs: 8000,
			failOnTimeout: true,
		});
		expect(late[0].json).toMatchObject({ found: true });
		expect(late[0].json.waitedMs as number).toBeGreaterThan(300);

		expect(
			(
				await run('wait', 'element', {
					...find('id', 'late'),
					condition: 'textContains',
					expectedText: 'appear',
					timeoutMs: 3000,
					failOnTimeout: true,
				})
			)[0].json.found,
		).toBe(true);
		expect(
			(
				await run('wait', 'element', {
					...find('id', 'hidden'),
					condition: 'invisible',
					timeoutMs: 3000,
					failOnTimeout: true,
				})
			)[0].json.found,
		).toBe(true);
		expect(
			(
				await run('wait', 'element', {
					...find('id', 'never'),
					condition: 'present',
					timeoutMs: 600,
					failOnTimeout: false,
				})
			)[0].json.found,
		).toBe(false);
		await expect(
			run('wait', 'element', {
				...find('id', 'never'),
				condition: 'present',
				timeoutMs: 500,
				failOnTimeout: true,
			}),
		).rejects.toThrow(/Timed out/);

		expect(
			(await run('wait', 'pageLoaded', { timeoutMs: 3000, failOnTimeout: true }))[0].json.found,
		).toBe(true);
		expect(
			(
				await run('wait', 'urlContains', {
					substring: String(new URL(site).port),
					timeoutMs: 2000,
					failOnTimeout: true,
				})
			)[0].json.found,
		).toBe(true);
		expect(
			(
				await run('wait', 'titleContains', {
					substring: 'Test',
					timeoutMs: 2000,
					failOnTimeout: true,
				})
			)[0].json.found,
		).toBe(true);
		expect((await run('wait', 'time', { milliseconds: 100 }))[0].json.waitedMs).toBe(100);
	});

	it('explains a missing element', async () => {
		await expect(
			run('element', 'click', find('id', 'zzz', { findTimeoutMs: 300 })),
		).rejects.toThrow(/Element not found \(id: zzz\)/);
	});

	it('enters and leaves iframes', async () => {
		await run('navigation', 'reload');
		const [entered] = await run('frame', 'enter', {
			frameMode: 'selector',
			...find('id', 'myFrame'),
			timeoutMs: 5000,
		});
		expect(entered.json.frame).toContain('myFrame');
		expect((await run('element', 'getText', find('id', 'msg')))[0].json.text).toBe(
			'inside the iframe',
		);
		await run(
			'element',
			'type',
			find('id', 'inside', { text: 'xyz', endKey: 'Tab', clearFirst: false }),
		);

		await run('frame', 'main');
		expect(
			(await run('element', 'exists', find('id', 'msg', { findTimeoutMs: 0 })))[0].json.exists,
		).toBe(false);

		await run('frame', 'enter', { frameMode: 'index', frameIndex: 0 });
		await run('frame', 'parent');
		expect(
			(await run('element', 'exists', find('id', 'title', { findTimeoutMs: 0 })))[0].json.exists,
		).toBe(true);
	});

	it('handles cookies', async () => {
		const [all] = await run('cookie', 'getAll', { excludeNames: 'other', includeUserAgent: true });
		expect(all.json).toMatchObject({
			total: 2,
			cookieHeader: 'sid=abc123',
			userAgent: 'TestUA/1.0',
		});

		expect(
			((await run('cookie', 'getOne', { cookieName: 'sid' }))[0].json.cookie as any).value,
		).toBe('abc123');

		await run('cookie', 'add', {
			cookieName: 'fresh',
			cookieValue: '42',
			cookiePath: '/',
			cookieSecure: false,
			cookieHttpOnly: false,
			cookieExpiry: 0,
			cookieSameSite: '',
		});
		expect(
			((await run('cookie', 'getOne', { cookieName: 'fresh' }))[0].json.cookie as any).value,
		).toBe('42');
		await run('cookie', 'delete', { cookieName: 'fresh' });

		const items = await run('cookie', 'getAll', { includeUserAgent: false, onePerCookie: true });
		expect(items).toHaveLength(2);

		const saved = (await run('cookie', 'getAll', { includeUserAgent: false }))[0].json.cookies;
		await run('cookie', 'deleteAll');
		expect((await run('cookie', 'getAll', { includeUserAgent: false }))[0].json.total).toBe(0);
		const restored = await run('cookie', 'addMany', { cookiesJson: JSON.stringify(saved) });
		expect(restored[0].json).toMatchObject({ added: 2, failures: [] });
	});

	it('runs scripts and handles alerts', async () => {
		expect(
			(
				await run('script', 'execute', {
					scriptCode: 'return arguments[0] + document.title;',
					scriptArgs: '["T: "]',
					scriptMode: 'sync',
				})
			)[0].json.result,
		).toBe('T: Test Page');
		expect(
			(
				await run('script', 'execute', {
					scriptCode: 'const cb=arguments[arguments.length-1]; setTimeout(()=>cb(7),50);',
					scriptArgs: '[]',
					scriptMode: 'async',
				})
			)[0].json.result,
		).toBe(7);

		await run('element', 'click', find('id', 'alert'));
		expect((await run('alert', 'getText'))[0].json.text).toBe('hi alert');
		await run('alert', 'accept');
	});

	it('manages windows, screenshots and PDFs', async () => {
		const [created] = await run('window', 'new', { windowType: 'tab', switchToNew: true });
		expect(created.json.newWindow).toBeTruthy();
		await run('navigation', 'openUrl', { url: `${site}frame` });
		expect((await run('window', 'list'))[0].json.windows).toHaveLength(2);

		expect(
			(await run('window', 'switch', { switchMode: 'index', windowIndex: 0 }))[0].json.title,
		).toBe('Test Page');
		expect((await run('window', 'switch', { switchMode: 'latest' }))[0].json.windows).toHaveLength(
			2,
		);
		expect((await run('window', 'close', { switchToFirst: true }))[0].json.windows).toHaveLength(1);

		const size = await run('window', 'setSize', { width: 1000, height: 700 });
		expect((size[0].json.window as any).width).toBe(1000);
		await run('window', 'maximize');

		const [shot] = await run('window', 'screenshot', { binaryPropertyName: 'data', fileName: '' });
		expect(shot.binary!.data.fileName).toBe('screenshot.png');
		expect(shot.json.sizeBytes as number).toBeGreaterThan(1000);

		const [pdf] = await run('window', 'printPdf', {
			landscape: false,
			printBackground: true,
			binaryPropertyName: 'pdf',
			fileName: '',
		});
		expect(Buffer.from(pdf.binary!.pdf.data, 'base64').subarray(0, 4).toString()).toBe('%PDF');
	});

	it('reports the Selenium status and feeds the session picker', async () => {
		const status = await run('system', 'status');
		expect(status[0].json).toHaveProperty('ready');

		const { results } = await new Selenium().methods.listSearch.searchSessions.call({
			getCredentials: async () => ({ baseUrl: SELENIUM_URL }),
			helpers: context({}).helpers,
		} as any);
		expect(results.some((r) => r.value === sessionId)).toBe(true);
	});

	it('keeps several sessions isolated, lists them and ends them', async () => {
		const first = sessionId;
		const [second] = await createSession('800,600', '');
		const secondId = second.json.sessionId as string;
		expect(secondId).not.toBe(first);

		sessionId = secondId;
		await run('navigation', 'openUrl', { url: `${site}frame` });
		sessionId = first;
		expect(
			((await run('navigation', 'getCurrentUrl'))[0].json.url as string).endsWith('/frame'),
		).toBe(false);
		sessionId = secondId;
		expect(
			((await run('navigation', 'getCurrentUrl'))[0].json.url as string).endsWith('/frame'),
		).toBe(true);

		const listed = await run('session', 'list', { includeUrl: false });
		expect(listed).toHaveLength(2);
		expect((await run('session', 'end'))[0].json.ended).toBe(true);

		sessionId = first;
		expect(await run('session', 'list', { includeUrl: false })).toHaveLength(1);
		const all = await run('session', 'endAll');
		expect(all[0].json).toMatchObject({ totalEnded: 1, failures: [] });
		expect(await run('session', 'list', { includeUrl: false })).toHaveLength(0);

		// ending again is idempotent; using a dead session explains what happened
		expect((await run('session', 'end'))[0].json.ended).toBe(true);
		await expect(run('navigation', 'getTitle')).rejects.toThrow(
			/does not exist, has expired or was already ended/,
		);
	});
});
