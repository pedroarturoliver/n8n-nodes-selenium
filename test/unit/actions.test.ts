import { describe, expect, it } from 'vitest';

import { cookieActions, buildCookieHeader } from '../../nodes/Selenium/actions/cookie';
import { elementActions } from '../../nodes/Selenium/actions/element';
import { sessionActions } from '../../nodes/Selenium/actions/session';
import { waitActions } from '../../nodes/Selenium/actions/wait';
import { windowActions } from '../../nodes/Selenium/actions/window';
import { setLanguage } from '../../nodes/Selenium/i18n';
import { actionContext, fakeRequester } from '../helpers/fake-n8n';
import { fakePage } from '../helpers/fake-page';

const selector = (css: string, extra: Record<string, unknown> = {}) => ({
	selectorType: 'css',
	selector: css,
	findTimeoutMs: 0,
	...extra,
});

describe('element actions', () => {
	it('clicks an element with an empty JSON body', async () => {
		const { request, calls } = fakePage({ '#go': {} });
		const out = await elementActions.click(actionContext(selector('#go'), request));
		expect(calls.at(-1)).toMatchObject({
			method: 'POST',
			path: '/session/sess1/element/el%3A%23go/click'.replace('%3A%23', ':#'),
			body: {},
		});
		expect(out).toMatchObject([{ json: { sessionId: 'sess1', clicked: true } }]);
	});

	it('types text, clearing first and pressing a special key at the end', async () => {
		const { request, calls } = fakePage({ '#q': {} });
		await elementActions.type(
			actionContext(selector('#q', { text: 'hello', clearFirst: true, endKey: 'Enter' }), request),
		);
		const paths = calls.map((c) => c.path.split('/').pop());
		expect(paths).toContain('clear');
		expect(calls.at(-1)?.body).toEqual({ text: 'hello' });
	});

	it('reports whether an element exists', async () => {
		const { request } = fakePage({ '#here': {} });
		const exists = async (css: string) =>
			(await elementActions.exists(actionContext(selector(css), request)))[0 as never];
		expect((await exists('#here')) as any).toMatchObject({ json: { exists: true } });
		expect((await exists('#gone')) as any).toMatchObject({ json: { exists: false } });
	});

	describe('check multiple elements', () => {
		const page = { '#a': {}, '#b': { visible: false }, '#t': { text: 'Welcome back' } };
		const run = async (params: Record<string, unknown>) => {
			const { request } = fakePage(page);
			return (await elementActions.checkMultiple(
				actionContext({ timeoutMs: 0, ...params }, request),
			)) as { whenTrue: any[]; whenFalse: any[] };
		};

		it('sends the item to "True" when the expression holds', async () => {
			setLanguage('en');
			const out = await run({
				firstSelector: '#a',
				firstCondition: 'exists',
				moreConditions: {
					items: [
						{ connector: 'OR', selectorType: 'css', selector: '#missing', condition: 'exists' },
						{ connector: 'AND', selectorType: 'css', selector: '#missing', condition: 'exists' },
					],
				},
			});
			// T OR F AND F = T OR (F AND F) = T
			expect(out.whenFalse).toHaveLength(0);
			expect(out.whenTrue[0].json).toMatchObject({
				result: true,
				expression: 'C1 OR C2 AND C3',
				evaluation: 'T OR F AND F',
			});
		});

		it('sends the item to "False" and details every condition', async () => {
			const out = await run({
				firstSelector: '#a',
				firstCondition: 'visible',
				moreConditions: {
					items: [
						{ connector: 'AND', selectorType: 'css', selector: '#b', condition: 'visible' },
						{
							connector: 'OR',
							selectorType: 'css',
							selector: '#t',
							condition: 'textEquals',
							text: 'x',
						},
					],
				},
			});
			// T AND F OR F = F
			expect(out.whenTrue).toHaveLength(0);
			const json = out.whenFalse[0].json;
			expect(json.result).toBe(false);
			expect(json.conditions.map((c: any) => c.result)).toEqual([true, false, false]);
			expect(json.conditions[2]).toMatchObject({ label: 'C3', connector: 'OR', text: 'x' });
		});

		it('honours parentheses only when enabled', async () => {
			const params = {
				firstSelector: '#a',
				firstCondition: 'exists',
				firstOpen: 1,
				moreConditions: {
					items: [
						{
							connector: 'OR',
							selectorType: 'css',
							selector: '#missing',
							condition: 'exists',
							close: 1,
						},
						{ connector: 'AND', selectorType: 'css', selector: '#missing', condition: 'exists' },
					],
				},
			};
			// (T OR F) AND F = F ...
			expect((await run({ ...params, useParentheses: true })).whenFalse).toHaveLength(1);
			// ... but the parentheses are ignored when the toggle is off: T OR F AND F = T
			expect((await run({ ...params, useParentheses: false })).whenTrue).toHaveLength(1);
		});

		it.each([
			['notExists', '#missing', true],
			['notExists', '#a', false],
			['notVisible', '#b', true],
			['enabled', '#a', true],
			['textContains', '#t', true],
		])('condition %s on %s -> %s', async (condition, css, expected) => {
			const out = await run({
				firstSelector: css,
				firstCondition: condition,
				firstText: 'Welcome',
			});
			expect(out.whenTrue.length).toBe(expected ? 1 : 0);
		});
	});

	describe('fill form', () => {
		const fields = (items: Record<string, unknown>[]) => ({ fields: { items } });

		it('fills fields in order and reports each one', async () => {
			const { request, calls } = fakePage({
				'#user': {},
				'#agree': { checked: false },
				'#send': {},
			});
			const out = await elementActions.fillForm(
				actionContext(
					{
						findTimeoutMs: 0,
						...fields([
							{
								selectorType: 'css',
								selector: '#user',
								action: 'type',
								value: 'bob',
								clearFirst: true,
								endKey: 'none',
							},
							{ selectorType: 'css', selector: '#agree', action: 'check' },
							{ selectorType: 'css', selector: '#send', action: 'click' },
						]),
					},
					request,
				),
			);
			expect(out).toMatchObject([{ json: { filled: 3, total: 3 } }]);
			const bodies = calls.filter((c) => c.path.endsWith('/value')).map((c) => c.body);
			expect(bodies).toEqual([{ text: 'bob' }]);
			// "check" clicks because the box was unchecked
			expect(calls.filter((c) => c.path.endsWith('/click'))).toHaveLength(2);
		});

		it('stops with an error naming the field', async () => {
			const { request } = fakePage({ '#user': {} });
			await expect(
				elementActions.fillForm(
					actionContext(
						{
							findTimeoutMs: 0,
							...fields([
								{ selectorType: 'css', selector: '#user', action: 'type', value: 'x' },
								{ selectorType: 'css', selector: '#nope', action: 'click' },
							]),
						},
						request,
					),
				),
			).rejects.toThrow(/Field 2 \(css: #nope, action: click\) failed/);
		});

		it('keeps going when "Continue If a Field Fails" is on', async () => {
			const { request } = fakePage({ '#user': {} });
			const out = (await elementActions.fillForm(
				actionContext(
					{
						findTimeoutMs: 0,
						continueOnFieldError: true,
						...fields([
							{ selectorType: 'css', selector: '#nope', action: 'click' },
							{ selectorType: 'css', selector: '#user', action: 'type', value: 'x' },
						]),
					},
					request,
				),
			)) as any;
			expect(out[0].json.filled).toBe(1);
			expect(out[0].json.fields[0]).toMatchObject({ ok: false, index: 1 });
			expect(out[0].json.fields[1]).toMatchObject({ ok: true, index: 2 });
		});

		it('requires at least one field', async () => {
			const { request } = fakePage({});
			await expect(elementActions.fillForm(actionContext({}, request))).rejects.toThrow(
				/at least one field/,
			);
		});
	});
});

describe('wait actions', () => {
	it('"Fail On Timeout" off returns found: false', async () => {
		const { request } = fakePage({});
		const out = await waitActions.element(
			actionContext(
				{
					selectorType: 'css',
					selector: '#nope',
					condition: 'present',
					timeoutMs: 0,
					failOnTimeout: false,
				},
				request,
			),
		);
		expect(out).toMatchObject([{ json: { found: false } }]);
	});

	it('"Fail On Timeout" on throws a clear timeout error', async () => {
		const { request } = fakePage({});
		await expect(
			waitActions.element(
				actionContext(
					{
						selectorType: 'css',
						selector: '#nope',
						condition: 'present',
						timeoutMs: 0,
						failOnTimeout: true,
					},
					request,
				),
			),
		).rejects.toThrow('Timed out (0 ms) waiting for the element (css: #nope) to be "present"');
	});

	it.each([
		['present', '#a', true],
		['absent', '#a', false],
		['clickable', '#b', false],
		['invisible', '#b', true],
		['textContains', '#t', true],
	])('element condition %s on %s', async (condition, css, expected) => {
		const { request } = fakePage({
			'#a': {},
			'#b': { visible: false },
			'#t': { text: 'hello world' },
		});
		const out = await waitActions.element(
			actionContext(
				{
					selectorType: 'css',
					selector: css,
					condition,
					expectedText: 'world',
					timeoutMs: 0,
					failOnTimeout: false,
				},
				request,
			),
		);
		expect((out as any)[0].json.found).toBe(expected);
	});
});

describe('cookie actions', () => {
	it('builds the Cookie header, skipping excluded names', () => {
		expect(
			buildCookieHeader(
				[
					{ name: 'a', value: '1' },
					{ name: 'b', value: '2' },
				],
				['b'],
			),
		).toBe('a=1');
	});

	it('returns cookies, the header and the user agent', async () => {
		const { request } = fakeRequester(({ path }) =>
			path.endsWith('/cookie')
				? [{ name: 'sid', value: 'abc', domain: 'example.com' }]
				: 'Agent/1.0',
		);
		const out = await cookieActions.getAll(
			actionContext({ includeUserAgent: true, domainFilter: 'example' }, request),
		);
		expect(out[0 as never]).toMatchObject({
			json: { total: 1, cookieHeader: 'sid=abc', userAgent: 'Agent/1.0' },
		});
	});

	it('adds many cookies and reports failures', async () => {
		const { request } = fakeRequester(({ body }) =>
			(body as any).cookie.name === 'bad' ? new Error('rejected') : null,
		);
		const out = await cookieActions.addMany(
			actionContext(
				{
					cookiesJson: JSON.stringify([
						{ name: 'ok', value: '1' },
						{ name: 'bad', value: '2' },
					]),
				},
				request,
			),
		);
		expect((out as any)[0].json).toMatchObject({
			added: 1,
			failures: [{ name: 'bad', error: 'rejected' }],
		});
	});

	it('rejects a JSON that is not a list', async () => {
		const { request } = fakeRequester(() => null);
		await expect(
			cookieActions.addMany(actionContext({ cookiesJson: '{"name":"x"}' }, request)),
		).rejects.toThrow('"Cookies (JSON)" must be a list (array)');
	});
});

describe('session actions', () => {
	it('creates a session from the node parameters', async () => {
		const { request, calls } = fakeRequester(() => ({
			sessionId: 'new-1',
			capabilities: { browserName: 'chrome', browserVersion: '141' },
		}));
		const out = await sessionActions.create(
			actionContext({ browser: 'chrome', headless: true }, request, ''),
		);
		expect(calls[0].path).toBe('/session');
		expect((calls[0].body as any).capabilities.alwaysMatch.browserName).toBe('chrome');
		expect((out as any)[0].json).toMatchObject({
			sessionId: 'new-1',
			browser: 'chrome',
			version: '141',
		});
	});

	it('ending an already-ended session is not an error', async () => {
		const { WebDriverError } = await import('../../nodes/Selenium/helpers/webdriver');
		const { request } = fakeRequester(() => new WebDriverError('invalid session id', 'gone'));
		const out = await sessionActions.end(actionContext({}, request));
		expect((out as any)[0].json).toMatchObject({ ended: true, alreadyEnded: true });
	});
});

describe('window actions', () => {
	it('fails clearly when the window does not exist', async () => {
		const { request } = fakeRequester(() => ['w1']);
		await expect(
			windowActions.switch(actionContext({ switchMode: 'index', windowIndex: 5 }, request)),
		).rejects.toThrow('Window not found (index). Open windows: 1');
	});
});
