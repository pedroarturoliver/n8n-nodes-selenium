import type { INodeProperties } from 'n8n-workflow';

import { field, operationField } from './common';

export const cookieOperation: INodeProperties = operationField(
	'cookie',
	[
		{
			name: 'Add',
			value: 'add',
			description: "add_cookie() (the tab must be on the cookie's domain)",
			action: 'Add cookie',
		},
		{
			name: 'Add Multiple (JSON)',
			value: 'addMany',
			description: 'Restores a list of cookies (e.g. the output of Get All)',
			action: 'Add multiple cookies',
		},
		{ name: 'Delete', value: 'delete', description: 'delete_cookie()', action: 'Delete cookie' },
		{
			name: 'Delete All',
			value: 'deleteAll',
			description: 'delete_all_cookies()',
			action: 'Delete all cookies',
		},
		{
			name: 'Get All',
			value: 'getAll',
			description: 'get_cookies() + ready-made Cookie header + User-Agent',
			action: 'Get all cookies',
		},
		{ name: 'Get One', value: 'getOne', description: 'get_cookie(name)', action: 'Get a cookie' },
	],
	'getAll',
);

const getAll = { resource: ['cookie'], operation: ['getAll'] };
const add = { resource: ['cookie'], operation: ['add'] };

export const cookieFields: INodeProperties[] = [
	// ---- get all
	field(
		{
			displayName: 'Filter By Domain',
			name: 'domainFilter',
			type: 'string',
			default: '',
			description: 'Only cookies whose domain contains this text. Empty = all',
		},
		getAll,
	),
	field(
		{
			displayName: 'Exclude Names From Cookie Header',
			name: 'excludeNames',
			type: 'string',
			default: '',
			placeholder: 'cookie_a,cookie_b',
			description: 'Names (comma-separated) to leave out of "cookieHeader"',
		},
		getAll,
	),
	field(
		{
			displayName: 'Include User-Agent',
			name: 'includeUserAgent',
			type: 'boolean',
			default: true,
			description:
				'Whether to also return navigator.userAgent, to replay requests (HTTP Request node) with the same identity',
		},
		getAll,
	),
	field(
		{ displayName: 'One Item Per Cookie', name: 'onePerCookie', type: 'boolean', default: false },
		getAll,
	),

	// ---- get one / delete / add
	field(
		{ displayName: 'Cookie Name', name: 'cookieName', type: 'string', default: '', required: true },
		{ resource: ['cookie'], operation: ['getOne', 'delete', 'add'] },
	),
	field({ displayName: 'Value', name: 'cookieValue', type: 'string', default: '' }, add),
	field(
		{
			displayName: 'Domain',
			name: 'cookieDomain',
			type: 'string',
			default: '',
			description: 'Empty = current page domain',
		},
		add,
	),
	field({ displayName: 'Path', name: 'cookiePath', type: 'string', default: '/' }, add),
	field({ displayName: 'Secure', name: 'cookieSecure', type: 'boolean', default: false }, add),
	field({ displayName: 'HTTP Only', name: 'cookieHttpOnly', type: 'boolean', default: false }, add),
	field(
		{
			displayName: 'Expires (Epoch, Seconds)',
			name: 'cookieExpiry',
			type: 'number',
			default: 0,
			description: '0 = session cookie (disappears when the browser closes)',
		},
		add,
	),
	field(
		{
			displayName: 'SameSite',
			name: 'cookieSameSite',
			type: 'options',
			options: [
				{ name: 'Browser Default', value: '' },
				{ name: 'Lax', value: 'Lax' },
				{ name: 'None', value: 'None' },
				{ name: 'Strict', value: 'Strict' },
			],
			default: '',
		},
		add,
	),

	// ---- add many
	field(
		{
			displayName: 'Cookies (JSON)',
			name: 'cookiesJson',
			type: 'json',
			default: '={{ JSON.stringify($json.cookies) }}',
			description: 'List of objects {name, value, domain, path, ...}',
		},
		{ resource: ['cookie'], operation: ['addMany'] },
	),
];
