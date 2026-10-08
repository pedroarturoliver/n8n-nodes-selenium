import type { INodeProperties } from 'n8n-workflow';

import { SESSION_RESOURCES } from '../constants';
import { alertOperation } from './alert.description';
import { sessionField } from './common';
import { cookieFields, cookieOperation } from './cookie.description';
import { elementFields, elementOperation } from './element.description';
import { frameFields, frameOperation } from './frame.description';
import { navigationFields, navigationOperation } from './navigation.description';
import { scriptFields, scriptOperation } from './script.description';
import { sessionFields, sessionOperation } from './session.description';
import { systemOperation } from './system.description';
import { waitFields, waitOperation } from './wait.description';
import { windowFields, windowOperation } from './window.description';

const resourceField: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Alert', value: 'alert' },
		{ name: 'Cookie', value: 'cookie' },
		{ name: 'Element', value: 'element' },
		{ name: 'Frame (Iframe)', value: 'frame' },
		{ name: 'Navigation', value: 'navigation' },
		{ name: 'Script (JavaScript)', value: 'script' },
		{ name: 'Session (Browser)', value: 'session' },
		{ name: 'System', value: 'system' },
		{ name: 'Wait', value: 'wait' },
		{ name: 'Window / Tab', value: 'window' },
	],
	default: 'session',
};

/**
 * All node properties, in display order: resource, operation pickers, the session picker, then the
 * fields of each resource.
 */
export const nodeProperties: INodeProperties[] = [
	resourceField,
	sessionOperation,
	navigationOperation,
	elementOperation,
	waitOperation,
	frameOperation,
	cookieOperation,
	windowOperation,
	scriptOperation,
	alertOperation,
	systemOperation,

	// session picker: every operation that works on an existing session...
	sessionField({ resource: [...SESSION_RESOURCES] }),
	// ...plus "Session > End"
	sessionField({ resource: ['session'], operation: ['end'] }),

	...sessionFields,
	...navigationFields,
	...elementFields,
	...waitFields,
	...frameFields,
	...cookieFields,
	...windowFields,
	...scriptFields,
];
