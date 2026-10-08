import type { INodeProperties } from 'n8n-workflow';

import { field, operationField } from './common';

export const navigationOperation: INodeProperties = operationField(
	'navigation',
	[
		{ name: 'Back', value: 'back', description: 'browser.back()', action: 'Go back' },
		{
			name: 'Get Current URL',
			value: 'getCurrentUrl',
			description: 'browser.current_url',
			action: 'Get current URL',
		},
		{
			name: 'Get Page Source',
			value: 'getPageSource',
			description: 'browser.page_source',
			action: 'Get page source',
		},
		{ name: 'Get Title', value: 'getTitle', description: 'browser.title', action: 'Get title' },
		{
			name: 'Go Forward',
			value: 'forward',
			description: 'browser.forward()',
			action: 'Go forward',
		},
		{ name: 'Open URL', value: 'openUrl', description: 'browser.get(url)', action: 'Open URL' },
		{ name: 'Reload', value: 'reload', description: 'browser.refresh()', action: 'Reload page' },
	],
	'openUrl',
);

export const navigationFields: INodeProperties[] = [
	field(
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://example.com/login',
		},
		{ resource: ['navigation'], operation: ['openUrl'] },
	),
];
