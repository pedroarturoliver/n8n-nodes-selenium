import { describe, expect, it } from 'vitest';

import {
	buildLocator,
	findElement,
	findElementOrNull,
} from '../../nodes/Selenium/helpers/locators';
import { WebDriverError } from '../../nodes/Selenium/helpers/webdriver';
import { ELEMENT_KEY } from '../../nodes/Selenium/constants';
import { actionContext, fakeRequester } from '../helpers/fake-n8n';

describe('buildLocator', () => {
	it.each([
		['css', '#user', { using: 'css selector', value: '#user' }],
		['xpath', '//a', { using: 'xpath', value: '//a' }],
		['id', 'user', { using: 'css selector', value: '[id="user"]' }],
		['name', 'q', { using: 'css selector', value: '[name="q"]' }],
		['class', 'a b', { using: 'css selector', value: '.a.b' }],
		['class', '  a   b  ', { using: 'css selector', value: '.a.b' }],
		['tag', 'button', { using: 'tag name', value: 'button' }],
		['linkText', 'Home', { using: 'link text', value: 'Home' }],
		['partialLinkText', 'Hom', { using: 'partial link text', value: 'Hom' }],
	])('%s "%s"', (type, selector, expected) => {
		expect(buildLocator(type, selector)).toEqual(expected);
	});

	it('escapes quotes and backslashes in ID and Name selectors', () => {
		expect(buildLocator('id', 'a"b\\c').value).toBe('[id="a\\"b\\\\c"]');
	});

	it('rejects an empty selector and an unknown type', () => {
		expect(() => buildLocator('css', '')).toThrow(/selector/i);
		expect(() => buildLocator('nope', 'x')).toThrow(/Unknown selector type: nope/);
	});
});

describe('findElement', () => {
	const notFound = new WebDriverError('no such element', 'no such element: nothing', 404);

	it('returns the element id', async () => {
		const { request, calls } = fakeRequester(() => ({ [ELEMENT_KEY]: 'el-1' }));
		const id = await findElement(actionContext({}, request), 'css', '#a', 0);
		expect(id).toBe('el-1');
		expect(calls[0]).toMatchObject({
			method: 'POST',
			path: '/session/sess1/element',
			body: { using: 'css selector', value: '#a' },
		});
	});

	it('retries until the element appears', async () => {
		let attempts = 0;
		const { request } = fakeRequester(() =>
			++attempts < 3 ? notFound : { [ELEMENT_KEY]: 'late' },
		);
		await expect(findElement(actionContext({}, request), 'css', '#a', 5000)).resolves.toBe('late');
		expect(attempts).toBe(3);
	});

	it('fails with a clear message when it never appears', async () => {
		const { request } = fakeRequester(() => notFound);
		await expect(findElement(actionContext({}, request), 'id', 'zzz', 0)).rejects.toThrow(
			'Element not found (id: zzz)',
		);
		await expect(findElement(actionContext({}, request), 'id', 'zzz', 300)).rejects.toThrow(
			/after waiting 300 ms/,
		);
	});

	it('does not swallow other errors', async () => {
		const boom = new WebDriverError('javascript error', 'boom');
		const { request } = fakeRequester(() => boom);
		await expect(findElement(actionContext({}, request), 'css', '#a', 0)).rejects.toBe(boom);
	});

	it('findElementOrNull returns null instead of throwing', async () => {
		const { request } = fakeRequester(() => notFound);
		await expect(findElementOrNull(actionContext({}, request), 'css', '#a')).resolves.toBeNull();
	});
});
