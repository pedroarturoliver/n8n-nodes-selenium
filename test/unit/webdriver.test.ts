import { describe, expect, it, vi } from 'vitest';

import {
	createRequester,
	errorMessage,
	isWebDriverError,
	listOpenSessions,
	WebDriverError,
} from '../../nodes/Selenium/helpers/webdriver';
import { fakeRequester } from '../helpers/fake-n8n';

const contextWith = (httpRequest: unknown) => ({ helpers: { httpRequest } }) as any;

describe('createRequester', () => {
	it('sends POST bodies serialised (n8n drops empty objects) with the UTF-8 JSON header', async () => {
		const http = vi.fn().mockResolvedValue({ statusCode: 200, body: { value: null } });
		const request = createRequester(contextWith(http), 'http://sel:4444');

		await request('POST', '/session/1/element/2/click', {});
		const options = http.mock.calls[0][0];
		expect(options.url).toBe('http://sel:4444/session/1/element/2/click');
		expect(options.body).toBe('{}');
		expect(options.headers['Content-Type']).toBe('application/json; charset=utf-8');
		expect(options.ignoreHttpStatusErrors).toBe(true);
	});

	it('sends no body on GET and DELETE', async () => {
		const http = vi.fn().mockResolvedValue({ statusCode: 200, body: { value: 'x' } });
		const request = createRequester(contextWith(http), 'http://sel:4444');
		await request('GET', '/status');
		await request('DELETE', '/session/1');
		expect(http.mock.calls[0][0]).not.toHaveProperty('body');
		expect(http.mock.calls[1][0]).not.toHaveProperty('body');
	});

	it('resolves with the `value` of the response', async () => {
		const http = vi.fn().mockResolvedValue({ statusCode: 200, body: { value: { a: 1 } } });
		await expect(createRequester(contextWith(http), 'http://x')('GET', '/y')).resolves.toEqual({
			a: 1,
		});
	});

	it('turns WebDriver errors into WebDriverError with the driver code', async () => {
		const http = vi.fn().mockResolvedValue({
			statusCode: 404,
			body: { value: { error: 'no such element', message: 'Unable to locate\nstacktrace...' } },
		});
		const error = (await createRequester(contextWith(http), 'http://x')('POST', '/e', {}).catch(
			(e) => e,
		)) as WebDriverError;
		expect(error).toBeInstanceOf(WebDriverError);
		expect(error.code).toBe('no such element');
		expect(error.status).toBe(404);
		expect(error.message).toBe('no such element: Unable to locate');
	});

	it('handles non-JSON error bodies', async () => {
		const http = vi.fn().mockResolvedValue({ statusCode: 502, body: 'Bad gateway' });
		const error = (await createRequester(contextWith(http), 'http://x')('GET', '/y').catch(
			(e) => e,
		)) as WebDriverError;
		expect(error.code).toBe('http 502');
		expect(error.message).toContain('Bad gateway');
	});

	it('explains connection failures', async () => {
		const http = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
		await expect(
			createRequester(contextWith(http), 'http://sel:4444')('GET', '/status'),
		).rejects.toThrow('Could not connect to Selenium at http://sel:4444: ECONNREFUSED');
	});
});

describe('errorMessage', () => {
	it('gives a friendly message for dead sessions', () => {
		const dead = new WebDriverError('invalid session id', 'invalid session id: x');
		expect(errorMessage(dead)).toMatch(/does not exist, has expired or was already ended/);
		expect(isWebDriverError(dead, 'invalid session id')).toBe(true);
		expect(isWebDriverError(dead, 'timeout')).toBe(false);
	});

	it('passes other messages through', () => {
		expect(errorMessage(new Error('boom'))).toBe('boom');
		expect(errorMessage('plain')).toBe('plain');
	});
});

describe('listOpenSessions', () => {
	const status = {
		nodes: [
			{
				slots: [
					{ session: null },
					{
						session: {
							sessionId: 'abc',
							start: '2026-10-07T10:00:00Z',
							capabilities: { browserName: 'chrome', browserVersion: '141.0' },
						},
					},
				],
			},
		],
	};

	it('reads sessions from the Grid /status', async () => {
		const { request } = fakeRequester(() => status);
		await expect(listOpenSessions(request, false)).resolves.toEqual([
			{ sessionId: 'abc', browser: 'chrome', version: '141.0', startedAt: '2026-10-07T10:00:00Z' },
		]);
	});

	it('adds URL and title when asked, and survives busy sessions', async () => {
		const { request } = fakeRequester(({ path }) => {
			if (path === '/status') return status;
			if (path.endsWith('/url')) return 'https://example.com/';
			return new WebDriverError('no such window', 'busy');
		});
		const [session] = await listOpenSessions(request, true);
		expect(session.url).toBe('https://example.com/');
		expect(session.title).toBeUndefined();
	});

	it('explains when the server is not a Grid', async () => {
		const { request } = fakeRequester(() => ({ ready: true }));
		await expect(listOpenSessions(request, false)).rejects.toThrow(/not a Selenium Grid/);
	});
});
