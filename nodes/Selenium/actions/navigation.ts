import type { ActionContext, ActionHandler } from '../helpers/context';

/** Current URL and title, returned by every navigation that changes the page. */
async function pageInfo(c: ActionContext): Promise<{ url: string; title: string }> {
	const [url, title] = await Promise.all([
		c.request<string>('GET', c.sessionPath('/url')),
		c.request<string>('GET', c.sessionPath('/title')),
	]);
	return { url, title };
}

/** Navigation commands that take no parameters: POST the command, then report the new page. */
const simpleNavigation =
	(command: string): ActionHandler =>
	async (c) => {
		await c.request('POST', c.sessionPath(command), {});
		return c.output(await pageInfo(c));
	};

export { pageInfo };

export const navigationActions: Record<string, ActionHandler> = {
	openUrl: async (c) => {
		await c.request('POST', c.sessionPath('/url'), { url: c.param('url') });
		return c.output(await pageInfo(c));
	},
	back: simpleNavigation('/back'),
	forward: simpleNavigation('/forward'),
	reload: simpleNavigation('/refresh'),
	getCurrentUrl: async (c) => c.output({ url: await c.request('GET', c.sessionPath('/url')) }),
	getTitle: async (c) => c.output({ title: await c.request('GET', c.sessionPath('/title')) }),
	getPageSource: async (c) => c.output({ html: await c.request('GET', c.sessionPath('/source')) }),
};
