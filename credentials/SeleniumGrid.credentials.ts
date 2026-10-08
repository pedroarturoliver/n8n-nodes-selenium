import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

import { translateDescription } from '../nodes/Selenium/i18n';

export class SeleniumGrid implements ICredentialType {
	name = 'seleniumGrid';
	displayName = 'Selenium (WebDriver)';
	documentationUrl = 'https://www.selenium.dev/documentation/grid/';

	properties: INodeProperties[] = translateDescription({
		properties: [
			{
				displayName: 'Selenium URL',
				name: 'baseUrl',
				type: 'string',
				default: 'http://selenium:4444',
				description:
					'Address of the Selenium container (Grid / standalone-chrome). Inside the same docker-compose, use the service name.',
			},
		] as INodeProperties[],
	}).properties;

	// The "Test" button calls GET {baseUrl}/status
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/status',
		},
	};
}
