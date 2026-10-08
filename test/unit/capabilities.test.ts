import { describe, expect, it } from 'vitest';

import { buildCapabilities, mergeCapabilities } from '../../nodes/Selenium/helpers/capabilities';
import { actionContext, fakeRequester } from '../helpers/fake-n8n';

const caps = (params: Record<string, unknown>) =>
	buildCapabilities(actionContext(params, fakeRequester(() => undefined).request)) as any;

describe('buildCapabilities', () => {
	it('builds Chrome capabilities with sensible container flags', () => {
		const c = caps({
			browser: 'chrome',
			headless: true,
			windowSize: '1280,800',
			userAgent: 'UA/1',
		});
		expect(c.browserName).toBe('chrome');
		expect(c['goog:chromeOptions'].args).toEqual(
			expect.arrayContaining([
				'--no-sandbox',
				'--disable-dev-shm-usage',
				'--headless=new',
				'--window-size=1280,800',
				'--user-agent=UA/1',
				'--disable-blink-features=AutomationControlled',
			]),
		);
		expect(c.pageLoadStrategy).toBe('normal');
	});

	it('omits optional flags', () => {
		const c = caps({ headless: false, hideAutomation: false, windowSize: '', userAgent: '' });
		const args: string[] = c['goog:chromeOptions'].args;
		expect(args).not.toContain('--headless=new');
		expect(args.some((a) => a.startsWith('--window-size'))).toBe(false);
		expect(args).not.toContain('--disable-blink-features=AutomationControlled');
	});

	it('adds extra arguments, one per line', () => {
		const c = caps({ extraArgs: '--lang=pt-BR\n\n --proxy-server=http://p:3128 \n' });
		expect(c['goog:chromeOptions'].args).toEqual(
			expect.arrayContaining(['--lang=pt-BR', '--proxy-server=http://p:3128']),
		);
	});

	it('builds Firefox and Edge capabilities', () => {
		const firefox = caps({
			browser: 'firefox',
			headless: true,
			windowSize: '800,600',
			userAgent: 'UA',
		});
		expect(firefox.browserName).toBe('firefox');
		expect(firefox['moz:firefoxOptions'].args).toEqual(['-headless', '-width=800', '-height=600']);
		expect(firefox['moz:firefoxOptions'].prefs['general.useragent.override']).toBe('UA');

		const edge = caps({ browser: 'edge' });
		expect(edge.browserName).toBe('MicrosoftEdge');
		expect(edge['ms:edgeOptions'].args).toContain('--no-sandbox');
	});

	it('merges extra capabilities JSON into the browser options', () => {
		const c = caps({
			extraCapabilities: JSON.stringify({
				'goog:chromeOptions': { args: ['--lang=de'], prefs: { a: 1 }, binary: '/x' },
				custom: true,
			}),
		});
		expect(c.custom).toBe(true);
		expect(c['goog:chromeOptions'].binary).toBe('/x');
		expect(c['goog:chromeOptions'].prefs).toEqual({ a: 1 });
		expect(c['goog:chromeOptions'].args).toEqual(
			expect.arrayContaining(['--no-sandbox', '--lang=de']),
		);
	});

	it('rejects invalid capabilities JSON', () => {
		expect(() => caps({ extraCapabilities: '{nope' })).toThrow(/not valid/i);
	});
});

describe('mergeCapabilities', () => {
	it('replaces plain keys and merges browser option arrays', () => {
		const merged = mergeCapabilities(
			{ a: 1, 'goog:chromeOptions': { args: ['x'] } },
			{ a: 2, 'goog:chromeOptions': { args: ['y'] } },
		) as any;
		expect(merged.a).toBe(2);
		expect(merged['goog:chromeOptions'].args).toEqual(['x', 'y']);
	});
});
