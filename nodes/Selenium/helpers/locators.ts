import type { IDataObject } from 'n8n-workflow';

import { ELEMENT_KEY, POLL_INTERVAL_MS } from '../constants';
import { msg } from '../i18n';
import type { ActionContext } from './context';
import { IS_VISIBLE_SCRIPT } from './scripts';
import { sleep } from './waiting';
import { isWebDriverError, WebDriverError } from './webdriver';

export interface Locator {
	using: string;
	value: string;
}

const escapeAttribute = (value: string): string =>
	value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Translates Selenium's `By.*` strategies to the W3C locator strategies.
 * W3C only knows css, xpath, tag name, link text and partial link text, so ID, Name and Class Name
 * become CSS selectors (exactly what Selenium itself does).
 */
export function buildLocator(selectorType: string, selector: string): Locator {
	if (!selector) throw new Error(msg('selectorRequired'));
	switch (selectorType) {
		case 'css':
			return { using: 'css selector', value: selector };
		case 'xpath':
			return { using: 'xpath', value: selector };
		case 'id':
			return { using: 'css selector', value: `[id="${escapeAttribute(selector)}"]` };
		case 'name':
			return { using: 'css selector', value: `[name="${escapeAttribute(selector)}"]` };
		case 'class':
			// like Selenium: "a b" and "a.b" both become ".a.b"
			return { using: 'css selector', value: '.' + selector.trim().split(/\s+/).join('.') };
		case 'tag':
			return { using: 'tag name', value: selector };
		case 'linkText':
			return { using: 'link text', value: selector };
		case 'partialLinkText':
			return { using: 'partial link text', value: selector };
		default:
			throw new Error(msg('unknownSelectorType', { type: selectorType }));
	}
}

/** W3C element reference object (to pass an element as a script argument or `frame` id). */
export const elementRef = (id: string): IDataObject => ({ [ELEMENT_KEY]: id });

/** Runs JavaScript in the page and returns its result. */
export function runScript<T = unknown>(
	context: ActionContext,
	script: string,
	args: unknown[] = [],
): Promise<T> {
	return context.request<T>('POST', context.sessionPath('/execute/sync'), {
		script,
		args: args as IDataObject[],
	});
}

/** Finds ONE element, retrying until `timeoutMs` (0 = a single attempt). Returns the element id. */
export async function findElement(
	context: ActionContext,
	selectorType: string,
	selector: string,
	timeoutMs: number,
): Promise<string> {
	const locator = buildLocator(selectorType, selector);
	const start = Date.now();
	for (;;) {
		try {
			const found = await context.request<IDataObject>(
				'POST',
				context.sessionPath('/element'),
				locator as unknown as IDataObject,
			);
			return found[ELEMENT_KEY] as string;
		} catch (error) {
			if (!isWebDriverError(error, 'no such element')) throw error;
			if (Date.now() - start >= timeoutMs) {
				throw new WebDriverError(
					'no such element',
					msg('elementNotFound', { type: selectorType, value: selector }) +
						(timeoutMs > 0 ? msg('afterWaiting', { ms: timeoutMs }) : ''),
					404,
				);
			}
		}
		await sleep(POLL_INTERVAL_MS);
	}
}

/** Like `findElement` (single attempt) but returns `null` instead of throwing when absent. */
export async function findElementOrNull(
	context: ActionContext,
	selectorType: string,
	selector: string,
): Promise<string | null> {
	try {
		return await findElement(context, selectorType, selector, 0);
	} catch (error) {
		if (isWebDriverError(error, 'no such element')) return null;
		throw error;
	}
}

/** Selector type and value from the standard node parameters. */
export const selectorFromParams = (
	context: ActionContext,
): { selectorType: string; selector: string } => ({
	selectorType: context.param<string>('selectorType', 'css'),
	selector: context.param<string>('selector', ''),
});

/** Finds the element described by the standard node parameters (waits `findTimeoutMs`). */
export function elementFromParams(context: ActionContext): Promise<string> {
	const { selectorType, selector } = selectorFromParams(context);
	return findElement(
		context,
		selectorType,
		selector,
		context.param<number>('findTimeoutMs', 10000),
	);
}

export const isVisible = async (context: ActionContext, elementId: string): Promise<boolean> =>
	Boolean(await runScript(context, IS_VISIBLE_SCRIPT, [elementRef(elementId)]));

export const isEnabled = async (context: ActionContext, elementId: string): Promise<boolean> =>
	Boolean(await context.request('GET', context.sessionPath(`/element/${elementId}/enabled`)));

export const getText = async (context: ActionContext, elementId: string): Promise<string> =>
	String(await context.request('GET', context.sessionPath(`/element/${elementId}/text`)));
