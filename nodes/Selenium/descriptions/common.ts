import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

/** `displayOptions.show` conditions, e.g. `{ resource: ['element'], operation: ['click'] }`. */
export type Show = Record<string, string[]>;

/** Builds a property that is only displayed when the `show` conditions match. */
export function field(
	definition: {
		displayName: string;
		name: string;
		type: INodeProperties['type'];
	} & Partial<INodeProperties>,
	show: Show,
): INodeProperties {
	return { default: '', ...definition, displayOptions: { show } } as INodeProperties;
}

/** The "Operation" dropdown of one resource. */
export function operationField(
	resource: string,
	options: INodePropertyOptions[],
	defaultValue: string,
): INodeProperties {
	return field(
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options,
			default: defaultValue,
		},
		{ resource: [resource] },
	);
}

export const SELECTOR_TYPE_OPTIONS: INodePropertyOptions[] = [
	{ name: 'CSS', value: 'css' },
	{ name: 'XPath', value: 'xpath' },
	{ name: 'ID', value: 'id' },
	{ name: 'Name', value: 'name' },
	{ name: 'Class Name', value: 'class' },
	{ name: 'Tag Name', value: 'tag' },
	{ name: 'Link Text', value: 'linkText' },
	{ name: 'Partial Link Text', value: 'partialLinkText' },
];

/** The fields that identify an element: selector type, selector and (optionally) the wait time. */
export function selectorFields(
	show: Show,
	withTimeout: boolean,
	timeoutDefault = 10000,
): INodeProperties[] {
	const fields: INodeProperties[] = [
		field(
			{
				displayName: 'Selector Type',
				name: 'selectorType',
				type: 'options',
				options: SELECTOR_TYPE_OPTIONS,
				default: 'css',
			},
			show,
		),
		field(
			{
				displayName: 'Selector',
				name: 'selector',
				type: 'string',
				default: '',
				required: true,
				placeholder: '#username',
				// the description quotes selector code (id="...")
				// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
				description:
					'Selector value. E.g.: #username (CSS/ID: username), //button[@id="kc-login"] (XPath)',
			},
			show,
		),
	];
	if (withTimeout) {
		fields.push(
			field(
				{
					displayName: 'Wait For Element (Ms)',
					name: 'findTimeoutMs',
					type: 'number',
					default: timeoutDefault,
					description:
						'How long to keep retrying until the element exists in the DOM (equivalent to a presence WebDriverWait). 0 = try only once.',
				},
				show,
			),
		);
	}
	return fields;
}

/**
 * Session picker shown on every operation that needs a browser session.
 * "From List" is fed by the `searchSessions` list search; "By ID / Expression" chains nodes.
 */
export function sessionField(show: Show): INodeProperties {
	return field(
		{
			displayName: 'Session',
			name: 'sessionId',
			type: 'resourceLocator',
			default: { mode: 'id', value: '={{ $json.sessionId }}' },
			required: true,
			description:
				'Browser the operation runs in. "From List" shows the sessions currently open in Selenium; "By ID / Expression" accepts the sessionId from the Session > Create node (all operations return "sessionId", so the default works when chaining nodes).',
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					placeholder: 'Choose an open session...',
					typeOptions: { searchListMethod: 'searchSessions', searchable: false },
				},
				{
					displayName: 'By ID / Expression',
					name: 'id',
					type: 'string',
					placeholder: '={{ $json.sessionId }}',
				},
			],
		},
		show,
	);
}
