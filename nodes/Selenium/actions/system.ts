import type { IDataObject } from 'n8n-workflow';

import type { ActionHandler } from '../helpers/context';

export const systemActions: Record<string, ActionHandler> = {
	status: async (c) => {
		const status = await c.request<IDataObject>('GET', '/status');
		return c.items([status]);
	},
};
