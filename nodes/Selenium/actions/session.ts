import type { IDataObject } from 'n8n-workflow';

import { buildCapabilities } from '../helpers/capabilities';
import type { ActionHandler } from '../helpers/context';
import { isWebDriverError, listOpenSessions } from '../helpers/webdriver';

export const sessionActions: Record<string, ActionHandler> = {
	create: async (c) => {
		const value = await c.request<IDataObject>(
			'POST',
			'/session',
			{ capabilities: { alwaysMatch: buildCapabilities(c) } },
			120_000,
		);
		const capabilities = (value.capabilities ?? {}) as IDataObject;
		return c.output({
			sessionId: value.sessionId as string,
			browser: capabilities.browserName as string,
			version: capabilities.browserVersion as string,
			capabilities,
		});
	},

	end: async (c) => {
		try {
			await c.request('DELETE', c.sessionPath());
			return c.output({ ended: true });
		} catch (error) {
			// ending a session that is already gone is not a failure
			if (isWebDriverError(error, 'invalid session id')) {
				return c.output({ ended: true, alreadyEnded: true });
			}
			throw error;
		}
	},

	list: async (c) => {
		const sessions = await listOpenSessions(c.request, c.param<boolean>('includeUrl', true));
		return c.items(sessions.map((session) => ({ ...session, total: sessions.length })));
	},

	endAll: async (c) => {
		const sessions = await listOpenSessions(c.request, false);
		const ended: string[] = [];
		const failures: IDataObject[] = [];
		for (const session of sessions) {
			try {
				await c.request('DELETE', `/session/${encodeURIComponent(session.sessionId)}`);
				ended.push(session.sessionId);
			} catch (error) {
				failures.push({ sessionId: session.sessionId, error: (error as Error).message });
			}
		}
		return c.items([{ totalEnded: ended.length, ended, failures }]);
	},
};
