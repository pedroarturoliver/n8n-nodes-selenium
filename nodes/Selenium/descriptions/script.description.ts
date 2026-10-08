import type { INodeProperties } from 'n8n-workflow';

import { field, operationField } from './common';

export const scriptOperation: INodeProperties = operationField(
	'script',
	[
		{
			name: 'Execute JavaScript',
			value: 'execute',
			description: 'execute_script() / execute_async_script()',
			action: 'Execute JavaScript',
		},
	],
	'execute',
);

const execute = { resource: ['script'], operation: ['execute'] };

export const scriptFields: INodeProperties[] = [
	field(
		{
			displayName: 'JavaScript Code',
			name: 'scriptCode',
			type: 'string',
			typeOptions: { rows: 8 },
			default: 'return document.title;',
			required: true,
			description:
				'Body of a function executed on the page. Use "return" to return a value; "arguments[0]" etc. are the arguments. In async mode, call the last argument as a callback.',
		},
		execute,
	),
	field(
		{
			displayName: 'Arguments (JSON)',
			name: 'scriptArgs',
			type: 'json',
			default: '[]',
			description: 'List of arguments that become arguments[0], arguments[1]...',
		},
		execute,
	),
	field(
		{
			displayName: 'Mode',
			name: 'scriptMode',
			type: 'options',
			options: [
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'Synchronous (execute_script)', value: 'sync' },
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'Asynchronous (execute_async_script)', value: 'async' },
			],
			default: 'sync',
		},
		execute,
	),
];
