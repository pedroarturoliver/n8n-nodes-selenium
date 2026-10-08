import type { IDataObject } from 'n8n-workflow';

import { msg } from '../i18n';
import type { ActionContext } from './context';
import { findElementOrNull, getText, isEnabled, isVisible } from './locators';
import { isWebDriverError } from './webdriver';

/** Conditions that are satisfied by the ABSENCE of the element (also true if it vanishes mid-check). */
const NEGATIVE_CONDITIONS = ['notExists', 'notVisible'];

/** Evaluates ONE condition of "Check Multiple Elements" (a single attempt, no waiting). */
export async function evaluateCondition(
	context: ActionContext,
	condition: IDataObject,
): Promise<boolean> {
	const selectorType = String(condition.selectorType ?? 'css');
	const selector = String(condition.selector ?? '');
	const rule = String(condition.condition ?? 'exists');
	const text = String(condition.text ?? '');

	try {
		const id = await findElementOrNull(context, selectorType, selector);
		if (rule === 'exists') return id !== null;
		if (rule === 'notExists') return id === null;
		if (rule === 'notVisible') return id === null || !(await isVisible(context, id));
		if (id === null) return false;
		if (rule === 'visible') return isVisible(context, id);
		if (rule === 'enabled') return isEnabled(context, id);
		const content = await getText(context, id);
		if (rule === 'textContains') return content.includes(text);
		if (rule === 'textEquals') return content.trim() === text.trim();
		throw new Error(msg('unknownCondition', { condition: rule }));
	} catch (error) {
		// the element disappeared in the middle of the check
		if (isWebDriverError(error, 'stale element reference')) {
			return NEGATIVE_CONDITIONS.includes(rule);
		}
		throw error;
	}
}
