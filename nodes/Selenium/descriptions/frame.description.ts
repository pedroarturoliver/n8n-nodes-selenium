import type { INodeProperties } from 'n8n-workflow';

import { field, operationField, selectorFields } from './common';

export const frameOperation: INodeProperties = operationField(
	'frame',
	[
		{
			name: 'Back To Main Content',
			value: 'main',
			description: 'switch_to.default_content()',
			action: 'Back to main content',
		},
		{
			name: 'Back To Parent Frame',
			value: 'parent',
			description: 'switch_to.parent_frame()',
			action: 'Back to parent frame',
		},
		{
			name: 'Enter Iframe',
			value: 'enter',
			description: 'switch_to.frame / frame_to_be_available_and_switch_to_it',
			action: 'Enter iframe',
		},
	],
	'enter',
);

export const frameFields: INodeProperties[] = [
	field(
		{
			displayName: 'Identify Iframe By',
			name: 'frameMode',
			type: 'options',
			options: [
				{ name: 'Index', value: 'index' },
				{ name: 'Selector', value: 'selector' },
			],
			default: 'selector',
		},
		{ resource: ['frame'], operation: ['enter'] },
	),
	...selectorFields({ resource: ['frame'], operation: ['enter'], frameMode: ['selector'] }, false),
	field(
		{
			displayName: 'Wait For Iframe (Ms)',
			name: 'timeoutMs',
			type: 'number',
			default: 30000,
			description:
				'Waits for the iframe to exist and be available before entering (frame_to_be_available_and_switch_to_it)',
		},
		{ resource: ['frame'], operation: ['enter'], frameMode: ['selector'] },
	),
	field(
		{ displayName: 'Iframe Index', name: 'frameIndex', type: 'number', default: 0 },
		{ resource: ['frame'], operation: ['enter'], frameMode: ['index'] },
	),
];
