import type { INodeProperties } from 'n8n-workflow';

import { operationField } from './common';

export const alertOperation: INodeProperties = operationField(
	'alert',
	[
		{ name: 'Accept', value: 'accept', description: 'alert.accept()', action: 'Accept alert' },
		{ name: 'Dismiss', value: 'dismiss', description: 'alert.dismiss()', action: 'Dismiss alert' },
		{ name: 'Get Text', value: 'getText', description: 'alert.text', action: 'Get alert text' },
	],
	'accept',
);
