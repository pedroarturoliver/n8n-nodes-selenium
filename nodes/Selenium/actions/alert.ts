import type { ActionHandler } from '../helpers/context';

export const alertActions: Record<string, ActionHandler> = {
	accept: async (c) => {
		await c.request('POST', c.sessionPath('/alert/accept'), {});
		return c.output({ accepted: true });
	},
	dismiss: async (c) => {
		await c.request('POST', c.sessionPath('/alert/dismiss'), {});
		return c.output({ dismissed: true });
	},
	getText: async (c) => c.output({ text: await c.request('GET', c.sessionPath('/alert/text')) }),
};
