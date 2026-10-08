import type { INodeProperties } from 'n8n-workflow';

import { field, operationField, SELECTOR_TYPE_OPTIONS, selectorFields, Show } from './common';

export const elementOperation: INodeProperties = operationField(
	'element',
	[
		{
			name: 'Check Multiple Elements',
			value: 'checkMultiple',
			description:
				'Like the IF node: several conditions on elements combined with AND/OR; outputs True or False',
			action: 'Check multiple elements',
		},
		{ name: 'Clear', value: 'clear', description: 'element.clear()', action: 'Clear field' },
		{ name: 'Click', value: 'click', description: 'element.click()', action: 'Click element' },
		{
			name: 'Exists',
			value: 'exists',
			description: 'Returns true/false depending on whether the element is in the DOM',
			action: 'Check if element exists',
		},
		{
			name: 'Fill Multiple Fields (Form)',
			value: 'fillForm',
			description:
				'Fills in an entire form in a single node: type, select option, check/uncheck and click, in order',
			action: 'Fill multiple fields of a form',
		},
		{
			name: 'Get Attribute',
			value: 'getAttribute',
			description: 'element.get_attribute()',
			action: 'Get element attribute',
		},
		{
			name: 'Get Property',
			value: 'getProperty',
			description: 'element.get_property() (value, innerHTML, outerHTML...)',
			action: 'Get element property',
		},
		{
			name: 'Get Text',
			value: 'getText',
			description: 'element.text',
			action: 'Get element text',
		},
		{
			name: 'Hover',
			value: 'hover',
			description: 'Moves the mouse over the element',
			action: 'Hover over element',
		},
		{
			name: 'Is Enabled',
			value: 'isEnabled',
			description: 'element.is_enabled()',
			action: 'Check if element is enabled',
		},
		{
			name: 'Is Visible',
			value: 'isVisible',
			description: 'element.is_displayed()',
			action: 'Check if element is visible',
		},
		{
			name: 'List Elements',
			value: 'list',
			description: 'find_elements: text and attributes of all elements found',
			action: 'List elements',
		},
		{
			name: 'Scroll To Element',
			value: 'scrollIntoView',
			description: 'scrollIntoView',
			action: 'Scroll to element',
		},
		{
			name: 'Select Option (Select)',
			value: 'selectOption',
			description: 'Chooses an option from a &lt;select&gt;',
			action: 'Select option from select',
		},
		{
			name: 'Take Element Screenshot',
			value: 'screenshot',
			description: 'Screenshot of just the element (PNG binary)',
			action: 'Take element screenshot',
		},
		{
			name: 'Type',
			value: 'type',
			description: 'element.send_keys()',
			action: 'Type into element',
		},
	],
	'click',
);

const element = (...operations: string[]): Show => ({
	resource: ['element'],
	operation: operations,
});

const END_KEY_OPTIONS = [
	{ name: 'No Key', value: 'none' },
	{ name: 'Enter', value: 'Enter' },
	{ name: 'Tab', value: 'Tab' },
	{ name: 'Escape', value: 'Escape' },
];

// ---------------------------------------------------------------------------------------------
// Check Multiple Elements (IF-like): first condition + conditions linked by AND / OR
// ---------------------------------------------------------------------------------------------

const CONDITION_OPTIONS = [
	{ name: 'Exists in DOM', value: 'exists' },
	{ name: 'Does Not Exist', value: 'notExists' },
	{ name: 'Is Visible', value: 'visible' },
	{ name: 'Is Not Visible', value: 'notVisible' },
	{ name: 'Is Enabled', value: 'enabled' },
	{ name: 'Text Contains', value: 'textContains' },
	{ name: 'Text Equals', value: 'textEquals' },
];

/**
 * Fields of one condition. `prefix` is used for the first condition (`firstSelector`...) which lives
 * at the top level; additional conditions live inside a fixedCollection and use plain names.
 */
function conditionFields(prefix: string | null, isRow: boolean): INodeProperties[] {
	const name = (base: string): string =>
		prefix ? `${prefix}${base}` : base.charAt(0).toLowerCase() + base.slice(1);
	// inside the collection the toggle is a root parameter, hence the "/" path
	const parenthesesShown = isRow ? { '/useParentheses': [true] } : { useParentheses: [true] };

	const fields: INodeProperties[] = [];
	if (isRow) {
		fields.push({
			displayName: 'Connect With Previous Condition',
			name: 'connector',
			type: 'options',
			options: [
				{ name: 'AND', value: 'AND', description: 'Both must be true' },
				{ name: 'OR', value: 'OR', description: 'Only one needs to be true' },
			],
			default: 'AND',
			description:
				'How this condition links to the previous one. AND is resolved before OR (use parentheses to change the order).',
		});
	}
	fields.push(
		{
			displayName: 'Selector Type',
			name: name('SelectorType'),
			type: 'options',
			options: SELECTOR_TYPE_OPTIONS,
			default: 'css',
		},
		{
			displayName: 'Selector',
			name: name('Selector'),
			type: 'string',
			default: '',
			placeholder: '#pageBody',
		},
		{
			displayName: 'Condition',
			name: name('Condition'),
			type: 'options',
			options: CONDITION_OPTIONS,
			default: 'exists',
		},
		{
			displayName: 'Text',
			name: name('Text'),
			type: 'string',
			default: '',
			displayOptions: { show: { [name('Condition')]: ['textContains', 'textEquals'] } },
		},
		{
			displayName: 'Open Parenthesis Before',
			name: name('Open'),
			type: 'number',
			typeOptions: { minValue: 0, maxValue: 5 },
			default: 0,
			displayOptions: { show: parenthesesShown },
		},
		{
			displayName: 'Close Parenthesis After',
			name: name('Close'),
			type: 'number',
			typeOptions: { minValue: 0, maxValue: 5 },
			default: 0,
			displayOptions: { show: parenthesesShown },
		},
	);
	return fields;
}

function checkMultipleFields(): INodeProperties[] {
	const show = element('checkMultiple');
	const first = conditionFields('first', false).map((definition) => ({
		...definition,
		displayName: `Condition 1: ${definition.displayName}`,
		displayOptions: {
			show: { ...show, ...((definition.displayOptions?.show as Show | undefined) ?? {}) },
		},
	}));

	return [
		...first,
		field(
			{
				displayName: 'Additional Conditions',
				name: 'moreConditions',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, sortable: true },
				placeholder: 'Add Condition (AND / OR)',
				default: {},
				description:
					'Each new condition chooses whether it links to the previous one with AND or OR. The result is calculated using Boolean logic: AND takes precedence over OR, and parentheses change the order.',
				options: [{ name: 'items', displayName: 'Condition', values: conditionFields(null, true) }],
			},
			show,
		),
		field(
			{
				displayName: 'Use Parentheses (Advanced)',
				name: 'useParentheses',
				type: 'boolean',
				default: false,
				description:
					'Whether to show "open/close parentheses" on every condition, to build expressions like (A OR B) AND C',
			},
			show,
		),
		field(
			{
				displayName: 'Wait Up To (Ms)',
				name: 'timeoutMs',
				type: 'number',
				default: 0,
				description:
					'0 = check once and respond. Greater than 0 = repeat the check until the result is True or time runs out (useful for "whichever shows up first": use OR).',
			},
			show,
		),
	];
}

// ---------------------------------------------------------------------------------------------
// Fill Multiple Fields (Form)
// ---------------------------------------------------------------------------------------------

function fillFormFields(): INodeProperties[] {
	const show = element('fillForm');
	return [
		field(
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, sortable: true },
				placeholder: 'Add Field',
				default: { items: [{ selectorType: 'css', action: 'type' }] },
				description: 'Run from top to bottom. Drag to change the order.',
				options: [
					{
						name: 'items',
						displayName: 'Field',
						values: [
							{
								displayName: 'Selector Type',
								name: 'selectorType',
								type: 'options',
								options: SELECTOR_TYPE_OPTIONS,
								default: 'css',
							},
							{
								displayName: 'Selector',
								name: 'selector',
								type: 'string',
								default: '',
								placeholder: '#name',
							},
							{
								displayName: 'Action',
								name: 'action',
								type: 'options',
								options: [
									{ name: 'Type', value: 'type' },
									{ name: 'Select Option By Text (Select)', value: 'selectByText' },
									{ name: 'Select Option By Value (Select)', value: 'selectByValue' },
									{ name: 'Check (Checkbox/Radio)', value: 'check' },
									{ name: 'Uncheck (Checkbox)', value: 'uncheck' },
									{ name: 'Click', value: 'click' },
								],
								default: 'type',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								displayOptions: { show: { action: ['type', 'selectByText', 'selectByValue'] } },
							},
							{
								displayName: 'Clear Before Typing',
								name: 'clearFirst',
								type: 'boolean',
								default: true,
								displayOptions: { show: { action: ['type'] } },
							},
							{
								displayName: 'Key At End',
								name: 'endKey',
								type: 'options',
								options: END_KEY_OPTIONS,
								default: 'none',
								displayOptions: { show: { action: ['type'] } },
							},
						],
					},
				],
			},
			show,
		),
		field(
			{
				displayName: 'Wait For Each Field (Ms)',
				name: 'findTimeoutMs',
				type: 'number',
				default: 10000,
				description:
					'How long to keep retrying until each field exists in the DOM. 0 = try only once.',
			},
			show,
		),
		field(
			{
				displayName: 'Continue If a Field Fails',
				name: 'continueOnFieldError',
				type: 'boolean',
				default: false,
				description:
					'Whether to keep filling the remaining fields when one fails (the result lists which ones failed). Off = stop with an error naming the field',
			},
			show,
		),
	];
}

// ---------------------------------------------------------------------------------------------

export const elementFields: INodeProperties[] = [
	...selectorFields(
		element(
			'click',
			'type',
			'clear',
			'getText',
			'getAttribute',
			'getProperty',
			'isVisible',
			'isEnabled',
			'hover',
			'scrollIntoView',
			'selectOption',
			'screenshot',
		),
		true,
		10000,
	),
	...selectorFields(element('exists', 'list'), true, 0),

	// ---- click
	field(
		{
			displayName: 'Click Via JavaScript',
			name: 'clickViaJs',
			type: 'boolean',
			default: false,
			description:
				'Whether to run element.click() through JavaScript (works when the element is covered or off-screen, like execute_script("arguments[0].click()"))',
		},
		element('click'),
	),

	// ---- type
	field(
		{ displayName: 'Text', name: 'text', type: 'string', default: '', description: 'What to type' },
		element('type'),
	),
	field(
		{ displayName: 'Clear Before Typing', name: 'clearFirst', type: 'boolean', default: false },
		element('type'),
	),
	field(
		{
			displayName: 'Key At End',
			name: 'endKey',
			type: 'options',
			options: END_KEY_OPTIONS,
			default: 'none',
		},
		element('type'),
	),

	// ---- get attribute / property
	field(
		{
			displayName: 'Attribute Name',
			name: 'attributeName',
			type: 'string',
			default: '',
			placeholder: 'href',
			required: true,
		},
		element('getAttribute'),
	),
	field(
		{
			displayName: 'Property Name',
			name: 'propertyName',
			type: 'string',
			default: 'value',
			placeholder: 'value, innerHTML, outerHTML, textContent',
			required: true,
		},
		element('getProperty'),
	),

	// ---- list
	field(
		{
			displayName: 'Extra Attributes',
			name: 'extraAttributes',
			type: 'string',
			default: '',
			placeholder: 'href,src,value',
			description: 'Attributes (comma-separated) to return besides the text',
		},
		element('list'),
	),
	field(
		{
			displayName: 'One Item Per Element',
			name: 'oneItemPerElement',
			type: 'boolean',
			default: true,
			description:
				'Whether to emit one n8n item per element found (if none is found no item is emitted; enable "Always Output Data" in the node settings to keep the flow going)',
		},
		element('list'),
	),
	field(
		{
			displayName: 'Max Elements',
			name: 'maxElements',
			type: 'number',
			default: 0,
			description: '0 = all',
		},
		element('list'),
	),

	// ---- select option
	field(
		{
			displayName: 'Choose By',
			name: 'selectBy',
			type: 'options',
			options: [
				{ name: 'Visible Text', value: 'text' },
				{ name: 'Value', value: 'value' },
				{ name: 'Index (0, 1, 2...)', value: 'index' },
			],
			default: 'text',
		},
		element('selectOption'),
	),
	field(
		{ displayName: 'Option', name: 'optionValue', type: 'string', default: '', required: true },
		element('selectOption'),
	),

	...fillFormFields(),
	...checkMultipleFields(),

	// ---- screenshot
	field(
		{
			displayName: 'Binary Property Name',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			description: 'The binary property in which the generated file will be placed',
		},
		element('screenshot'),
	),
	field(
		{
			displayName: 'File Name',
			name: 'fileName',
			type: 'string',
			default: '',
			description: 'Optional. Default: element.png',
		},
		element('screenshot'),
	),
];
