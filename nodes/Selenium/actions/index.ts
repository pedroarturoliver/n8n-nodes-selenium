import type { ActionHandler } from '../helpers/context';
import { alertActions } from './alert';
import { cookieActions } from './cookie';
import { elementActions } from './element';
import { frameActions } from './frame';
import { navigationActions } from './navigation';
import { scriptActions } from './script';
import { sessionActions } from './session';
import { systemActions } from './system';
import { waitActions } from './wait';
import { windowActions } from './window';

const RESOURCES: Record<string, Record<string, ActionHandler>> = {
	alert: alertActions,
	cookie: cookieActions,
	element: elementActions,
	frame: frameActions,
	navigation: navigationActions,
	script: scriptActions,
	session: sessionActions,
	system: systemActions,
	wait: waitActions,
	window: windowActions,
};

/** Finds the handler of a `resource` + `operation` pair, or `undefined` when unsupported. */
export const findAction = (resource: string, operation: string): ActionHandler | undefined =>
	RESOURCES[resource]?.[operation];

/** Operations that run without an existing browser session (they create or list sessions). */
export const isSessionless = (resource: string, operation: string): boolean =>
	resource === 'system' ||
	(resource === 'session' && ['create', 'list', 'endAll'].includes(operation));

/** The operation with two outputs (True / False). */
export const hasDualOutput = (resource: string, operation: string): boolean =>
	resource === 'element' && operation === 'checkMultiple';
