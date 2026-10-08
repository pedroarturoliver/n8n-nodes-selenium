import type { IDataObject } from 'n8n-workflow';

import type { ActionHandler } from '../helpers/context';
import { parseJson } from '../helpers/utils';
import { msg } from '../i18n';

export const scriptActions: Record<string, ActionHandler> = {
	execute: async (c) => {
		const args = parseJson(c.param('scriptArgs', '[]')) ?? [];
		if (!Array.isArray(args)) throw new Error(msg('argsMustBeArray'));

		const mode = c.param<string>('scriptMode', 'sync');
		const result = await c.request('POST', c.sessionPath(`/execute/${mode}`), {
			script: c.param<string>('scriptCode'),
			args: args as IDataObject[],
		});
		return c.output({ result });
	},
};
