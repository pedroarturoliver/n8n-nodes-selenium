import type { INodeProperties } from 'n8n-workflow';

import { field, operationField, selectorFields } from './common';

export const waitOperation: INodeProperties = operationField(
	'wait',
	[
		{
			name: 'Element',
			value: 'element',
			description:
				'WebDriverWait until the element meets a condition (present, visible, clickable...)',
			action: 'Wait for element',
		},
		{
			name: 'Fixed Time (Sleep)',
			value: 'time',
			description: 'time.sleep()',
			action: 'Wait a fixed time',
		},
		{
			name: 'Page Loaded',
			value: 'pageLoaded',
			description: 'Waits for document.readyState == complete',
			action: 'Wait for page to load',
		},
		{
			name: 'Title Contains',
			value: 'titleContains',
			description: 'Waits for the page title to contain a substring',
			action: 'Wait for title to contain',
		},
		{
			name: 'URL Contains',
			value: 'urlContains',
			description: 'Waits for the current URL to contain a substring',
			action: 'Wait for URL to contain',
		},
	],
	'element',
);

const timedOperations = ['element', 'urlContains', 'titleContains', 'pageLoaded'];

export const waitFields: INodeProperties[] = [
	...selectorFields({ resource: ['wait'], operation: ['element'] }, false),
	field(
		{
			displayName: 'Condition',
			name: 'condition',
			type: 'options',
			options: [
				{ name: 'Absent From DOM', value: 'absent', description: 'EC.staleness_of' },
				{
					name: 'Clickable (Visible and Enabled)',
					value: 'clickable',
					description: 'EC.element_to_be_clickable',
				},
				{
					name: 'Invisible or Absent',
					value: 'invisible',
					description: 'EC.invisibility_of_element_located',
				},
				{ name: 'Present in DOM', value: 'present', description: 'EC.presence_of_element_located' },
				{
					name: 'Text Contains',
					value: 'textContains',
					description: 'EC.text_to_be_present_in_element',
				},
				{ name: 'Visible', value: 'visible', description: 'EC.visibility_of_element_located' },
			],
			default: 'present',
		},
		{ resource: ['wait'], operation: ['element'] },
	),
	field(
		{
			displayName: 'Expected Text',
			name: 'expectedText',
			type: 'string',
			default: '',
			required: true,
		},
		{ resource: ['wait'], operation: ['element'], condition: ['textContains'] },
	),
	field(
		{ displayName: 'Substring', name: 'substring', type: 'string', default: '', required: true },
		{ resource: ['wait'], operation: ['urlContains', 'titleContains'] },
	),
	field(
		{ displayName: 'Maximum Time (Ms)', name: 'timeoutMs', type: 'number', default: 30000 },
		{ resource: ['wait'], operation: timedOperations },
	),
	field(
		{
			displayName: 'Fail On Timeout',
			name: 'failOnTimeout',
			type: 'boolean',
			default: true,
			description:
				'Whether to fail the node on timeout. If disabled, the node continues with "found": false so you can branch with an IF node',
		},
		{ resource: ['wait'], operation: timedOperations },
	),
	field(
		{ displayName: 'Milliseconds', name: 'milliseconds', type: 'number', default: 1000 },
		{ resource: ['wait'], operation: ['time'] },
	),
];
