import type { INodeProperties } from 'n8n-workflow';

import { operationField } from './common';

export const systemOperation: INodeProperties = operationField(
	'system',
	[
		{
			name: 'Selenium Status',
			value: 'status',
			description: 'Checks whether the container is up and has room for new sessions',
			action: 'Check Selenium status',
		},
	],
	'status',
);
