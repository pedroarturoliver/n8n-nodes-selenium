import type { ActionContext, ActionHandler } from '../helpers/context';
import {
	findElementOrNull,
	getText,
	isEnabled,
	isVisible,
	runScript,
	selectorFromParams,
} from '../helpers/locators';
import { pollUntil, sleep, waitOutput } from '../helpers/waiting';
import { isWebDriverError } from '../helpers/webdriver';
import { msg } from '../i18n';

/** One attempt of "Wait > Element": does the element currently meet the chosen condition? */
async function elementMeetsCondition(
	c: ActionContext,
	selectorType: string,
	selector: string,
	condition: string,
	expectedText: string,
): Promise<boolean> {
	const id = await findElementOrNull(c, selectorType, selector);
	if (condition === 'present') return id !== null;
	if (condition === 'absent') return id === null;
	if (condition === 'invisible') {
		if (id === null) return true;
		try {
			return !(await isVisible(c, id));
		} catch (error) {
			if (isWebDriverError(error, 'stale element reference')) return true;
			throw error;
		}
	}
	if (id === null) return false;
	if (condition === 'visible') return isVisible(c, id);
	if (condition === 'clickable') return (await isVisible(c, id)) && (await isEnabled(c, id));
	if (condition === 'textContains') return (await getText(c, id)).includes(expectedText);
	throw new Error(msg('unknownCondition', { condition }));
}

/** "Wait until `path` (url/title) contains the substring". */
const waitForPageText =
	(path: '/url' | '/title', messageKey: 'timeoutUrl' | 'timeoutTitle'): ActionHandler =>
	async (c) => {
		const text = c.param<string>('substring');
		const timeout = c.param<number>('timeoutMs', 30000);
		const result = await pollUntil(
			async () => String(await c.request('GET', c.sessionPath(path))).includes(text),
			timeout,
		);
		return waitOutput(c, result, msg(messageKey, { ms: timeout, text }));
	};

export const waitActions: Record<string, ActionHandler> = {
	element: async (c) => {
		const { selectorType, selector } = selectorFromParams(c);
		const condition = c.param<string>('condition', 'present');
		const expectedText = c.param<string>('expectedText', '');
		const timeout = c.param<number>('timeoutMs', 30000);

		const result = await pollUntil(
			() => elementMeetsCondition(c, selectorType, selector, condition, expectedText),
			timeout,
		);
		return waitOutput(
			c,
			result,
			msg('timeoutElement', { ms: timeout, type: selectorType, value: selector, condition }),
		);
	},

	urlContains: waitForPageText('/url', 'timeoutUrl'),
	titleContains: waitForPageText('/title', 'timeoutTitle'),

	pageLoaded: async (c) => {
		const timeout = c.param<number>('timeoutMs', 30000);
		const result = await pollUntil(
			async () => (await runScript(c, 'return document.readyState;')) === 'complete',
			timeout,
		);
		return waitOutput(c, result, msg('timeoutPageLoad', { ms: timeout }));
	},

	time: async (c) => {
		const ms = Math.max(0, c.param<number>('milliseconds', 1000));
		await sleep(ms);
		return c.output({ waitedMs: ms });
	},
};
