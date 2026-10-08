import type { IDataObject } from 'n8n-workflow';

import type { ActionContext } from './context';
import { parseJson, splitList } from './utils';

/** Browser-specific option blocks whose `args` and `prefs` are merged instead of replaced. */
const BROWSER_OPTION_KEYS = ['goog:chromeOptions', 'ms:edgeOptions', 'moz:firefoxOptions'];

/** Deep-merges user supplied capabilities into the generated ones. */
export function mergeCapabilities(base: IDataObject, extra: IDataObject): IDataObject {
	const merged: IDataObject = { ...base };
	for (const [key, value] of Object.entries(extra)) {
		const current = merged[key];
		const mergeable =
			BROWSER_OPTION_KEYS.includes(key) &&
			current &&
			typeof current === 'object' &&
			value &&
			typeof value === 'object';
		if (mergeable) {
			const a = current as IDataObject;
			const b = value as IDataObject;
			merged[key] = {
				...a,
				...b,
				args: [...((a.args as string[]) ?? []), ...((b.args as string[]) ?? [])],
				prefs: { ...((a.prefs as IDataObject) ?? {}), ...((b.prefs as IDataObject) ?? {}) },
			};
		} else {
			merged[key] = value;
		}
	}
	return merged;
}

/** Builds the W3C capabilities of "Session > Create" from the node parameters. */
export function buildCapabilities(context: ActionContext): IDataObject {
	const browser = context.param<string>('browser', 'chrome');
	const headless = context.param<boolean>('headless', true);
	const windowSize = context.param<string>('windowSize', '').trim();
	const userAgent = context.param<string>('userAgent', '').trim();
	const [width, height] = windowSize.split(',').map((part) => part.trim());
	const extraArgs = splitList(context.param<string>('extraArgs', ''), /\r?\n/);

	const capabilities: IDataObject = {
		pageLoadStrategy: context.param('pageLoadStrategy', 'normal'),
		acceptInsecureCerts: context.param<boolean>('acceptInsecureCerts', false),
		timeouts: { pageLoad: context.param<number>('pageLoadTimeoutMs', 60000) },
	};

	if (browser === 'firefox') {
		capabilities.browserName = 'firefox';
		const args = [...(headless ? ['-headless'] : []), ...extraArgs];
		if (width && height) args.push(`-width=${width}`, `-height=${height}`);
		capabilities['moz:firefoxOptions'] = {
			args,
			prefs: userAgent ? { 'general.useragent.override': userAgent } : {},
		};
	} else {
		const args = ['--no-sandbox', '--disable-dev-shm-usage', '--disable-notifications'];
		if (headless) args.push('--headless=new');
		if (windowSize) args.push(`--window-size=${windowSize}`);
		if (userAgent) args.push(`--user-agent=${userAgent}`);
		if (context.param<boolean>('hideAutomation', true)) {
			args.push('--disable-blink-features=AutomationControlled');
		}
		args.push(...extraArgs);
		if (browser === 'edge') {
			capabilities.browserName = 'MicrosoftEdge';
			capabilities['ms:edgeOptions'] = { args };
		} else {
			capabilities.browserName = 'chrome';
			capabilities['goog:chromeOptions'] = { args };
		}
	}

	const extra = parseJson(context.param('extraCapabilities', ''));
	return extra ? mergeCapabilities(capabilities, extra as IDataObject) : capabilities;
}
