import type { IDataObject } from 'n8n-workflow';

import type { ActionHandler } from '../helpers/context';
import { runScript } from '../helpers/locators';
import { parseJson, splitList } from '../helpers/utils';
import { msg } from '../i18n';

/** `name=value; name2=value2`, ready for a Cookie header. */
export function buildCookieHeader(cookies: IDataObject[], excludeNames: string[]): string {
	return cookies
		.filter((cookie) => !excludeNames.includes(String(cookie.name)))
		.map((cookie) => `${cookie.name}=${cookie.value}`)
		.join('; ');
}

export const cookieActions: Record<string, ActionHandler> = {
	getAll: async (c) => {
		let cookies = await c.request<IDataObject[]>('GET', c.sessionPath('/cookie'));
		const domain = c.param<string>('domainFilter', '').trim();
		if (domain) cookies = cookies.filter((cookie) => String(cookie.domain ?? '').includes(domain));

		const cookieHeader = buildCookieHeader(
			cookies,
			splitList(c.param<string>('excludeNames', ''), /,/),
		);
		const userAgent = c.param<boolean>('includeUserAgent', true)
			? await runScript<string>(c, 'return navigator.userAgent;')
			: undefined;

		if (c.param<boolean>('onePerCookie', false)) {
			return c.items(cookies.map((cookie) => ({ sessionId: c.sessionId, ...cookie })));
		}
		return c.output({
			total: cookies.length,
			cookies,
			cookieHeader,
			...(userAgent !== undefined ? { userAgent } : {}),
		});
	},

	getOne: async (c) => {
		const name = c.param<string>('cookieName');
		return c.output({
			cookie: await c.request('GET', c.sessionPath(`/cookie/${encodeURIComponent(name)}`)),
		});
	},

	add: async (c) => {
		const cookie: IDataObject = {
			name: c.param<string>('cookieName'),
			value: c.param<string>('cookieValue', ''),
			path: c.param<string>('cookiePath', '/'),
			secure: c.param<boolean>('cookieSecure', false),
			httpOnly: c.param<boolean>('cookieHttpOnly', false),
		};
		const domain = c.param<string>('cookieDomain', '');
		const expiry = c.param<number>('cookieExpiry', 0);
		const sameSite = c.param<string>('cookieSameSite', '');
		if (domain) cookie.domain = domain;
		if (expiry > 0) cookie.expiry = expiry;
		if (sameSite) cookie.sameSite = sameSite;
		await c.request('POST', c.sessionPath('/cookie'), { cookie });
		return c.output({ added: cookie.name as string });
	},

	addMany: async (c) => {
		const cookies = parseJson(c.param('cookiesJson', '[]'));
		if (!Array.isArray(cookies)) throw new Error(msg('cookiesMustBeArray'));

		const failures: IDataObject[] = [];
		let added = 0;
		for (const cookie of cookies as IDataObject[]) {
			try {
				await c.request('POST', c.sessionPath('/cookie'), { cookie });
				added++;
			} catch (error) {
				failures.push({ name: cookie.name, error: (error as Error).message });
			}
		}
		return c.output({ added, failures });
	},

	delete: async (c) => {
		const name = c.param<string>('cookieName');
		await c.request('DELETE', c.sessionPath(`/cookie/${encodeURIComponent(name)}`));
		return c.output({ deleted: name });
	},

	deleteAll: async (c) => {
		await c.request('DELETE', c.sessionPath('/cookie'));
		return c.output({ deletedAll: true });
	},
};
