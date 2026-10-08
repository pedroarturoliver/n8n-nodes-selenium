import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { findAction, hasDualOutput, isSessionless } from '../../nodes/Selenium/actions';
import { Selenium } from '../../nodes/Selenium/Selenium.node';
import { setLanguage } from '../../nodes/Selenium/i18n';
import { fakeExecuteFunctions } from '../helpers/fake-n8n';

type Property = { name: string; options?: { value?: string }[]; displayOptions?: any };

const properties = new Selenium().description.properties as Property[];
const resources = properties.find((p) => p.name === 'resource')!.options!.map((o) => o.value!);

describe('node description', () => {
	it('exposes a handler for every resource/operation and no orphan handlers', () => {
		const declared: string[] = [];
		for (const resource of resources) {
			const operation = properties.find(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.[0] === resource,
			);
			expect(operation, `operation list of ${resource}`).toBeDefined();
			for (const option of operation!.options!) {
				declared.push(`${resource}.${option.value}`);
				expect(findAction(resource, option.value!), `${resource}.${option.value}`).toBeTypeOf(
					'function',
				);
			}
		}
		expect(declared.length).toBeGreaterThan(50);
		expect(new Set(declared).size).toBe(declared.length);
	});

	it('has the session picker on every operation that needs one', () => {
		const picker = properties.filter((p) => p.name === 'sessionId');
		const shown = picker.flatMap((p) => p.displayOptions.show.resource);
		for (const resource of resources) {
			if (resource === 'system') continue;
			expect(shown, resource).toContain(resource);
		}
	});

	it('declares two outputs only for "Check Multiple Elements"', () => {
		expect(new Selenium().description.outputs).toContain('checkMultiple');
		expect(hasDualOutput('element', 'checkMultiple')).toBe(true);
		expect(hasDualOutput('element', 'click')).toBe(false);
	});

	it('knows which operations run without a session', () => {
		expect(isSessionless('session', 'create')).toBe(true);
		expect(isSessionless('session', 'end')).toBe(false);
		expect(isSessionless('system', 'status')).toBe(true);
		expect(isSessionless('element', 'click')).toBe(false);
	});

	it('uses the new name for the IF-like operation', () => {
		setLanguage('en');
		const operation = properties.find(
			(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.[0] === 'element',
		) as any;
		const option = operation.options.find((o: any) => o.value === 'checkMultiple');
		expect(option.name).toBe('Check Multiple Elements');
		expect(option.action).toBe('Check multiple elements');
	});
});

describe('execute', () => {
	const http = (handler: (options: any) => unknown) =>
		vi.fn(async (options: any) => handler(options));

	it('runs the operation against the session and returns its output', async () => {
		const httpRequest = http(() => ({ statusCode: 200, body: { value: null } }));
		const fn = fakeExecuteFunctions(
			{ resource: 'navigation', operation: 'reload', sessionId: 'S1' },
			{ http: httpRequest },
		);
		const [[item]] = await new Selenium().execute.call(fn);
		expect(httpRequest.mock.calls[0][0]).toMatchObject({
			method: 'POST',
			url: 'http://selenium:4444/session/S1/refresh',
			body: '{}',
		});
		expect(item.json.sessionId).toBe('S1');
	});

	it('requires a session for session operations', async () => {
		const fn = fakeExecuteFunctions({ resource: 'navigation', operation: 'reload', sessionId: '' });
		await expect(new Selenium().execute.call(fn)).rejects.toThrow(/Choose the Session/);
	});

	it('rejects an unsupported operation', async () => {
		const fn = fakeExecuteFunctions({ resource: 'navigation', operation: 'dance', sessionId: 'S' });
		await expect(new Selenium().execute.call(fn)).rejects.toThrow(NodeOperationError);
	});

	it('turns failures into error items with "Continue On Fail"', async () => {
		const httpRequest = http(() => ({
			statusCode: 404,
			body: { value: { error: 'invalid session id', message: 'x' } },
		}));
		const fn = fakeExecuteFunctions(
			{ resource: 'navigation', operation: 'getTitle', sessionId: 'dead' },
			{ http: httpRequest, continueOnFail: true },
		);
		const [[item]] = await new Selenium().execute.call(fn);
		expect(item.json.error).toMatch(/does not exist, has expired or was already ended/);
	});

	it('sends the error item to the "False" output of the IF-like operation', async () => {
		const httpRequest = http(() => ({
			statusCode: 500,
			body: { value: { error: 'unknown error', message: 'boom' } },
		}));
		const fn = fakeExecuteFunctions(
			{
				resource: 'element',
				operation: 'checkMultiple',
				sessionId: 'S',
				firstSelector: '#a',
				firstCondition: 'exists',
				timeoutMs: 0,
			},
			{ http: httpRequest, continueOnFail: true },
		);
		const [whenTrue, whenFalse] = await new Selenium().execute.call(fn);
		expect(whenTrue).toHaveLength(0);
		expect(whenFalse[0].json.error).toContain('boom');
	});
});

describe('listSearch.searchSessions', () => {
	it('lists the open sessions for the picker', async () => {
		setLanguage('en');
		const httpRequest = vi.fn(async ({ url }: any) => ({
			statusCode: 200,
			body: {
				value: url.endsWith('/status')
					? {
							nodes: [
								{
									slots: [
										{
											session: {
												sessionId: 'abcdef1234',
												start: '2026-10-07T10:00:00Z',
												capabilities: { browserName: 'chrome', browserVersion: '141' },
											},
										},
									],
								},
							],
						}
					: 'https://example.com/',
			},
		}));
		const context = {
			getCredentials: async () => ({ baseUrl: 'http://selenium:4444' }),
			helpers: { httpRequest },
		} as any;
		const { results } = await new Selenium().methods.listSearch.searchSessions.call(context);
		expect(results).toHaveLength(1);
		expect(results[0].value).toBe('abcdef1234');
		expect(results[0].name).toContain('chrome 141 · abcdef12 · since');
	});
});
