import type { ActionHandler } from '../helpers/context';
import { elementRef, findElementOrNull, selectorFromParams } from '../helpers/locators';
import { pollUntil } from '../helpers/waiting';
import { WebDriverError } from '../helpers/webdriver';
import { msg } from '../i18n';

export const frameActions: Record<string, ActionHandler> = {
	enter: async (c) => {
		if (c.param<string>('frameMode', 'selector') === 'index') {
			const index = c.param<number>('frameIndex', 0);
			await c.request('POST', c.sessionPath('/frame'), { id: index });
			return c.output({ frame: index });
		}

		const { selectorType, selector } = selectorFromParams(c);
		const timeout = c.param<number>('timeoutMs', 30000);
		// like frame_to_be_available_and_switch_to_it: wait for the iframe, then switch to it
		const result = await pollUntil(async () => {
			const id = await findElementOrNull(c, selectorType, selector);
			if (id === null) return false;
			await c.request('POST', c.sessionPath('/frame'), { id: elementRef(id) });
			return true;
		}, timeout);
		if (!result.ok) {
			throw new WebDriverError(
				'timeout',
				msg('iframeTimeout', { type: selectorType, value: selector, ms: timeout }),
			);
		}
		return c.output({ frame: `${selectorType}: ${selector}`, waitedMs: result.waitedMs });
	},

	parent: async (c) => {
		await c.request('POST', c.sessionPath('/frame/parent'), {});
		return c.output({ frame: 'parent' });
	},

	main: async (c) => {
		await c.request('POST', c.sessionPath('/frame'), { id: null });
		return c.output({ frame: 'main' });
	},
};
