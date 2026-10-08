import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { KEY_CODES } from '../constants';
import { evaluateCondition } from '../helpers/conditions';
import type { ActionContext, ActionHandler } from '../helpers/context';
import { evaluateExpression, formatExpression, LogicToken } from '../helpers/logic';
import {
	buildLocator,
	elementFromParams,
	elementRef,
	findElement,
	findElementOrNull,
	isEnabled,
	isVisible,
	runScript,
	selectorFromParams,
} from '../helpers/locators';
import { LIST_ELEMENTS_SCRIPT, SELECT_OPTION_SCRIPT } from '../helpers/scripts';
import { byteLength, splitList, toBinary } from '../helpers/utils';
import { pollUntil } from '../helpers/waiting';
import { errorMessage, WebDriverError } from '../helpers/webdriver';
import { msg } from '../i18n';

const elementPath = (c: ActionContext, id: string, suffix: string): string =>
	c.sessionPath(`/element/${id}${suffix}`);

/** Types text (plus an optional special key) into an element. */
async function typeInto(
	c: ActionContext,
	id: string,
	text: string,
	endKey: string,
	clearFirst: boolean,
): Promise<void> {
	if (clearFirst) await c.request('POST', elementPath(c, id, '/clear'), {});
	const key = KEY_CODES[endKey] ?? '';
	if (text || key) await c.request('POST', elementPath(c, id, '/value'), { text: text + key });
}

/** Selects an <option> of a <select> element, throwing when it does not exist. */
async function selectOption(
	c: ActionContext,
	id: string,
	mode: string,
	option: string,
): Promise<void> {
	const ok = await runScript(c, SELECT_OPTION_SCRIPT, [elementRef(id), mode, option]);
	if (!ok) throw new WebDriverError('no such option', msg('optionNotFound', { mode, option }));
}

// ---------------------------------------------------------------------------------------------
// Check Multiple Elements
// ---------------------------------------------------------------------------------------------

interface ConditionRow {
	condition: IDataObject;
	connector: 'AND' | 'OR' | null;
	open: number;
	close: number;
}

/** Reads the first condition (top-level fields) and the additional ones (each with its connector). */
function readConditionRows(c: ActionContext): ConditionRow[] {
	const useParentheses = c.param<boolean>('useParentheses', false);
	const count = (value: unknown): number =>
		useParentheses ? Math.max(0, Math.floor(Number(value) || 0)) : 0;

	const rows: ConditionRow[] = [
		{
			condition: {
				selectorType: c.param<string>('firstSelectorType', 'css'),
				selector: c.param<string>('firstSelector', ''),
				condition: c.param<string>('firstCondition', 'exists'),
				text: c.param<string>('firstText', ''),
			},
			connector: null,
			open: count(c.param('firstOpen', 0)),
			close: count(c.param('firstClose', 0)),
		},
	];
	for (const extra of c.param<{ items?: IDataObject[] }>('moreConditions', {}).items ?? []) {
		rows.push({
			condition: extra,
			connector: extra.connector === 'OR' ? 'OR' : 'AND',
			open: count(extra.open),
			close: count(extra.close),
		});
	}
	return rows;
}

async function checkMultiple(c: ActionContext) {
	const rows = readConditionRows(c);
	let tokens: LogicToken[] = [];
	let details: IDataObject[] = [];

	const poll = await pollUntil(
		async () => {
			const values: boolean[] = [];
			for (const row of rows) values.push(await evaluateCondition(c, row.condition));

			tokens = [];
			details = [];
			rows.forEach((row, index) => {
				const label = `C${index + 1}`;
				if (index > 0) tokens.push({ type: row.connector === 'OR' ? 'or' : 'and' });
				for (let n = 0; n < row.open; n++) tokens.push({ type: 'open' });
				tokens.push({ type: 'value', value: values[index], label });
				for (let n = 0; n < row.close; n++) tokens.push({ type: 'close' });
				details.push({
					label,
					selectorType: row.condition.selectorType as string,
					selector: row.condition.selector as string,
					condition: row.condition.condition as string,
					...(row.condition.text ? { text: row.condition.text as string } : {}),
					...(row.connector ? { connector: row.connector } : {}),
					result: values[index],
				});
			});
			return evaluateExpression(tokens);
		},
		c.param<number>('timeoutMs', 0),
	);

	const item: INodeExecutionData = {
		json: {
			sessionId: c.sessionId,
			result: poll.ok,
			expression: formatExpression(tokens, false),
			evaluation: formatExpression(tokens, true),
			waitedMs: poll.waitedMs,
			conditions: details,
		},
		pairedItem: { item: c.itemIndex },
	};
	return poll.ok ? { whenTrue: [item], whenFalse: [] } : { whenTrue: [], whenFalse: [item] };
}

// ---------------------------------------------------------------------------------------------
// Fill Multiple Fields (Form)
// ---------------------------------------------------------------------------------------------

/** Performs the action of one row of the form on an already located element. */
async function fillField(c: ActionContext, id: string, row: IDataObject): Promise<void> {
	const action = String(row.action ?? 'type');
	const value = String(row.value ?? '');

	switch (action) {
		case 'type':
			return typeInto(c, id, value, String(row.endKey ?? 'none'), row.clearFirst !== false);
		case 'selectByText':
			return selectOption(c, id, 'text', value);
		case 'selectByValue':
			return selectOption(c, id, 'value', value);
		case 'check':
		case 'uncheck': {
			const checked = Boolean(await c.request('GET', elementPath(c, id, '/property/checked')));
			if (checked !== (action === 'check')) {
				await c.request('POST', elementPath(c, id, '/click'), {});
			}
			return;
		}
		case 'click':
			await c.request('POST', elementPath(c, id, '/click'), {});
			return;
		default:
			throw new Error(msg('unknownAction', { action }));
	}
}

async function fillForm(c: ActionContext) {
	const rows = c.param<{ items?: IDataObject[] }>('fields', {}).items ?? [];
	if (rows.length === 0) throw new Error(msg('noFieldsConfigured'));

	const timeout = c.param<number>('findTimeoutMs', 10000);
	const continueOnError = c.param<boolean>('continueOnFieldError', false);
	const results: IDataObject[] = [];

	for (let index = 0; index < rows.length; index++) {
		const row = rows[index];
		const type = String(row.selectorType ?? 'css');
		const selector = String(row.selector ?? '');
		const action = String(row.action ?? 'type');
		try {
			const id = await findElement(c, type, selector, timeout);
			await fillField(c, id, row);
			results.push({ index: index + 1, selector, action, ok: true });
		} catch (error) {
			const message = errorMessage(error);
			if (!continueOnError) {
				throw new WebDriverError(
					'fill failed',
					msg('fieldFailed', { index: index + 1, type, selector, action, message }),
				);
			}
			results.push({ index: index + 1, selector, action, ok: false, error: message });
		}
	}
	const filled = results.filter((result) => result.ok).length;
	return c.output({ filled, total: rows.length, fields: results });
}

// ---------------------------------------------------------------------------------------------

export const elementActions: Record<string, ActionHandler> = {
	click: async (c) => {
		const id = await elementFromParams(c);
		if (c.param<boolean>('clickViaJs', false)) {
			await runScript(c, 'arguments[0].click();', [elementRef(id)]);
		} else {
			await c.request('POST', elementPath(c, id, '/click'), {});
		}
		return c.output({ clicked: true });
	},

	type: async (c) => {
		const id = await elementFromParams(c);
		await typeInto(
			c,
			id,
			c.param<string>('text', ''),
			c.param<string>('endKey', 'none'),
			c.param<boolean>('clearFirst', false),
		);
		return c.output({ typed: true });
	},

	clear: async (c) => {
		const id = await elementFromParams(c);
		await c.request('POST', elementPath(c, id, '/clear'), {});
		return c.output({ cleared: true });
	},

	getText: async (c) => {
		const id = await elementFromParams(c);
		return c.output({ text: await c.request('GET', elementPath(c, id, '/text')) });
	},

	getAttribute: async (c) => {
		const id = await elementFromParams(c);
		const name = c.param<string>('attributeName');
		const value = await c.request(
			'GET',
			elementPath(c, id, `/attribute/${encodeURIComponent(name)}`),
		);
		return c.output({ attribute: name, value });
	},

	getProperty: async (c) => {
		const id = await elementFromParams(c);
		const name = c.param<string>('propertyName');
		const value = await c.request(
			'GET',
			elementPath(c, id, `/property/${encodeURIComponent(name)}`),
		);
		return c.output({ property: name, value });
	},

	isVisible: async (c) => c.output({ visible: await isVisible(c, await elementFromParams(c)) }),

	isEnabled: async (c) => c.output({ enabled: await isEnabled(c, await elementFromParams(c)) }),

	exists: async (c) => {
		const { selectorType, selector } = selectorFromParams(c);
		let found = false;
		await pollUntil(
			async () => {
				found = (await findElementOrNull(c, selectorType, selector)) !== null;
				return found;
			},
			c.param<number>('findTimeoutMs', 0),
		);
		return c.output({ exists: found });
	},

	list: async (c) => {
		const { selectorType, selector } = selectorFromParams(c);
		const locator = buildLocator(selectorType, selector) as unknown as IDataObject;
		let refs: IDataObject[] = [];
		await pollUntil(
			async () => {
				refs = await c.request<IDataObject[]>('POST', c.sessionPath('/elements'), locator);
				return refs.length > 0;
			},
			c.param<number>('findTimeoutMs', 0),
		);

		const limit = c.param<number>('maxElements', 0);
		if (limit > 0) refs = refs.slice(0, limit);
		const attributes = splitList(c.param<string>('extraAttributes', ''), /,/);
		const data = refs.length
			? await runScript<IDataObject[]>(c, LIST_ELEMENTS_SCRIPT, [refs, attributes])
			: [];

		if (!c.param<boolean>('oneItemPerElement', true)) {
			return c.output({ total: data.length, elements: data });
		}
		return c.items(
			data.map((entry, index) => ({
				sessionId: c.sessionId,
				index,
				total: data.length,
				...entry,
			})),
		);
	},

	hover: async (c) => {
		const id = await elementFromParams(c);
		await c.request('POST', c.sessionPath('/actions'), {
			actions: [
				{
					type: 'pointer',
					id: 'mouse',
					parameters: { pointerType: 'mouse' },
					actions: [{ type: 'pointerMove', duration: 200, x: 0, y: 0, origin: elementRef(id) }],
				},
			],
		});
		return c.output({ hovered: true });
	},

	scrollIntoView: async (c) => {
		const id = await elementFromParams(c);
		await runScript(c, "arguments[0].scrollIntoView({block:'center'});", [elementRef(id)]);
		return c.output({ scrolled: true });
	},

	selectOption: async (c) => {
		const id = await elementFromParams(c);
		const option = c.param<string>('optionValue');
		await selectOption(c, id, c.param<string>('selectBy', 'text'), option);
		return c.output({ selected: option });
	},

	screenshot: async (c) => {
		const id = await elementFromParams(c);
		const base64 = await c.request<string>('GET', elementPath(c, id, '/screenshot'));
		return c.output(
			{ sizeBytes: byteLength(base64) },
			await toBinary(c, base64, 'element.png', 'image/png'),
		);
	},

	fillForm,
	checkMultiple,
};
