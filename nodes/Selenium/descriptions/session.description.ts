import type { INodeProperties } from 'n8n-workflow';

import { field, operationField } from './common';

export const sessionOperation: INodeProperties = operationField(
	'session',
	[
		{
			name: 'Create (Open Browser)',
			value: 'create',
			description: 'Opens a new browser in the Selenium container and returns the sessionId',
			action: 'Open browser and create session',
		},
		{
			name: 'End All Sessions',
			value: 'endAll',
			description: 'Closes ALL browsers open in Selenium, including those from other workflows',
			action: 'End all sessions',
		},
		{
			name: 'End Session and Close Browser',
			value: 'end',
			description: 'Closes the entire browser of the chosen session (browser.quit)',
			action: 'End session and close the browser',
		},
		{
			name: 'List Open Sessions',
			value: 'list',
			description: 'Shows the sessions that currently exist in Selenium (one per item)',
			action: 'List open sessions',
		},
	],
	'create',
);

const create = { resource: ['session'], operation: ['create'] };

export const sessionFields: INodeProperties[] = [
	// ---- list
	field(
		{
			displayName: 'Include Current URL and Title',
			name: 'includeUrl',
			type: 'boolean',
			default: true,
			description:
				'Whether to also ask each session for its current URL and page title (helps identify which browser is which)',
		},
		{ resource: ['session'], operation: ['list'] },
	),

	// ---- create
	field(
		{
			displayName: 'Browser',
			name: 'browser',
			type: 'options',
			options: [
				{ name: 'Chrome', value: 'chrome' },
				{ name: 'Edge', value: 'edge' },
				{ name: 'Firefox', value: 'firefox' },
			],
			default: 'chrome',
			description:
				'Must be the same browser as the container image (selenium/standalone-chrome = Chrome)',
		},
		create,
	),
	field(
		{
			displayName: 'Headless',
			name: 'headless',
			type: 'boolean',
			default: true,
			description:
				'Whether to run the browser without a visible window (you can still watch it via noVNC if disabled)',
		},
		create,
	),
	field(
		{
			displayName: 'Window Size',
			name: 'windowSize',
			type: 'string',
			default: '1920,1080',
			description: 'Width,height. Empty = browser default',
		},
		create,
	),
	field(
		{
			displayName: 'User-Agent',
			name: 'userAgent',
			type: 'string',
			default: '',
			description: 'Empty = browser default',
		},
		create,
	),
	field(
		{
			displayName: 'Hide Automation Signal',
			name: 'hideAutomation',
			type: 'boolean',
			default: true,
			description: 'Whether to add --disable-blink-features=AutomationControlled (Chrome/Edge)',
		},
		create,
	),
	field(
		{
			displayName: 'Extra Browser Arguments',
			name: 'extraArgs',
			type: 'string',
			typeOptions: { rows: 3 },
			default: '',
			placeholder: '--lang=en-US\n--proxy-server=http://proxy:3128',
			description: 'One argument per line',
		},
		create,
	),
	field(
		{
			displayName: 'Page Load Strategy',
			name: 'pageLoadStrategy',
			type: 'options',
			options: [
				{ name: 'Normal (Wait For Full Load)', value: 'normal' },
				{ name: 'Eager (Until DOM Ready)', value: 'eager' },
				{ name: "None (Don't Wait)", value: 'none' },
			],
			default: 'normal',
		},
		create,
	),
	field(
		{
			displayName: 'Page Load Timeout (Ms)',
			name: 'pageLoadTimeoutMs',
			type: 'number',
			default: 60000,
		},
		create,
	),
	field(
		{
			displayName: 'Accept Insecure Certificates',
			name: 'acceptInsecureCerts',
			type: 'boolean',
			default: false,
		},
		create,
	),
	field(
		{
			displayName: 'Extra Capabilities (JSON)',
			name: 'extraCapabilities',
			type: 'json',
			default: '',
			description:
				'Merged into the capabilities. For browser options use, for example, {"goog:chromeOptions":{"args":["--lang=en-US"],"prefs":{"download.default_directory":"/home/seluser/Downloads"}}}',
		},
		create,
	),
];
