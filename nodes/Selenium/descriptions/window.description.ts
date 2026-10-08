import type { INodeProperties } from 'n8n-workflow';

import { field, operationField } from './common';

export const windowOperation: INodeProperties = operationField(
	'window',
	[
		{
			name: 'Close Current',
			value: 'close',
			description: 'browser.close()',
			action: 'Close current window',
		},
		{
			name: 'List',
			value: 'list',
			description: 'window_handles',
			action: 'List windows',
		},
		{
			name: 'Maximize',
			value: 'maximize',
			description: 'maximize_window()',
			action: 'Maximize window',
		},
		{
			name: 'New Tab / Window',
			value: 'new',
			description: 'switch_to.new_window()',
			action: 'Open new tab',
		},
		{
			name: 'Print To PDF',
			value: 'printPdf',
			description: 'Generates a PDF of the page (binary)',
			action: 'Print page to PDF',
		},
		{
			name: 'Set Size',
			value: 'setSize',
			description: 'set_window_size()',
			action: 'Set window size',
		},
		{
			name: 'Switch Tab / Window',
			value: 'switch',
			description: 'switch_to.window()',
			action: 'Switch tab',
		},
		{
			name: 'Take Screenshot',
			value: 'screenshot',
			description: 'Screenshot of the page (PNG binary)',
			action: 'Take page screenshot',
		},
	],
	'list',
);

const files = { resource: ['window'], operation: ['screenshot', 'printPdf'] };

export const windowFields: INodeProperties[] = [
	// ---- switch
	field(
		{
			displayName: 'Switch By',
			name: 'switchMode',
			type: 'options',
			options: [
				{ name: 'Handle', value: 'handle' },
				{ name: 'Index', value: 'index' },
				{ name: 'Most Recent (Last Opened)', value: 'latest' },
			],
			default: 'latest',
		},
		{ resource: ['window'], operation: ['switch'] },
	),
	field(
		{ displayName: 'Window Index', name: 'windowIndex', type: 'number', default: 0 },
		{ resource: ['window'], operation: ['switch'], switchMode: ['index'] },
	),
	field(
		{ displayName: 'Handle', name: 'windowHandle', type: 'string', default: '' },
		{ resource: ['window'], operation: ['switch'], switchMode: ['handle'] },
	),

	// ---- new
	field(
		{
			displayName: 'Open As',
			name: 'windowType',
			type: 'options',
			options: [
				{ name: 'Browser Tab', value: 'tab' },
				{ name: 'Window', value: 'window' },
			],
			default: 'tab',
		},
		{ resource: ['window'], operation: ['new'] },
	),
	field(
		{ displayName: 'Switch To New Tab', name: 'switchToNew', type: 'boolean', default: true },
		{ resource: ['window'], operation: ['new'] },
	),

	// ---- close
	field(
		{
			displayName: 'Go Back To First Tab After Closing',
			name: 'switchToFirst',
			type: 'boolean',
			default: true,
			description:
				'Whether to select the first remaining tab after closing the current one (Selenium has no active tab after a close)',
		},
		{ resource: ['window'], operation: ['close'] },
	),

	// ---- set size
	field(
		{ displayName: 'Width', name: 'width', type: 'number', default: 1920 },
		{ resource: ['window'], operation: ['setSize'] },
	),
	field(
		{ displayName: 'Height', name: 'height', type: 'number', default: 1080 },
		{ resource: ['window'], operation: ['setSize'] },
	),

	// ---- print to PDF
	field(
		{ displayName: 'Landscape', name: 'landscape', type: 'boolean', default: false },
		{ resource: ['window'], operation: ['printPdf'] },
	),
	field(
		{
			displayName: 'Print Background Colors',
			name: 'printBackground',
			type: 'boolean',
			default: true,
		},
		{ resource: ['window'], operation: ['printPdf'] },
	),

	// ---- files (screenshot / PDF)
	field(
		{
			displayName: 'Binary Property Name',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			description: 'The binary property in which the generated file will be placed',
		},
		files,
	),
	field(
		{
			displayName: 'File Name',
			name: 'fileName',
			type: 'string',
			default: '',
			description: 'Optional. Default: screenshot.png / page.pdf',
		},
		files,
	),
];
