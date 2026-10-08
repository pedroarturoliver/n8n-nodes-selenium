import { ELEMENT_KEY } from '../../nodes/Selenium/constants';
import { WebDriverError } from '../../nodes/Selenium/helpers/webdriver';
import { fakeRequester, RecordedCall } from './fake-n8n';

export interface FakeElement {
	visible?: boolean;
	enabled?: boolean;
	text?: string;
	checked?: boolean;
}

/**
 * A tiny in-memory page behind a fake WebDriver: elements are looked up by their CSS selector
 * (`#id`), and the endpoints used by the node's operations are answered.
 */
export function fakePage(elements: Record<string, FakeElement>) {
	const idOf = (selector: string) => `el:${selector}`;
	const byId = (id: string) => elements[id.replace(/^el:/, '')];

	return fakeRequester((call: RecordedCall) => {
		if (call.path.endsWith('/element') && call.method === 'POST') {
			const selector = (call.body as { value: string }).value;
			return selector in elements
				? { [ELEMENT_KEY]: idOf(selector) }
				: new WebDriverError('no such element', 'no such element: not found', 404);
		}
		const element = call.path.match(/\/element\/([^/]+)\/(\w+)(?:\/(\w+))?$/);
		if (element) {
			const [, id, what] = element;
			const state = byId(decodeURIComponent(id));
			if (!state) return new WebDriverError('stale element reference', 'stale', 404);
			if (what === 'enabled') return state.enabled ?? true;
			if (what === 'text') return state.text ?? '';
			if (what === 'property') return state.checked ?? false;
			return null; // click, clear, value...
		}
		if (call.path.endsWith('/execute/sync')) {
			const script = String((call.body as { script: string }).script);
			if (script.includes('getComputedStyle')) {
				const ref = (call.body as { args: Record<string, string>[] }).args[0];
				return byId(ref[ELEMENT_KEY])?.visible ?? true;
			}
			return true;
		}
		return null;
	});
}
