import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { CREDENTIAL_NAME, HTTP_TIMEOUT_MS } from '../constants';
import { msg } from '../i18n';
import type { Requester } from '../types';

/** An error reported by the WebDriver server (`error` code + message). */
export class WebDriverError extends Error {
	constructor(
		readonly code: string,
		message: string,
		readonly status = 0,
	) {
		super(message);
		this.name = 'WebDriverError';
	}
}

export const isWebDriverError = (error: unknown, code?: string): error is WebDriverError =>
	error instanceof WebDriverError && (code === undefined || error.code === code);

/** Human readable message for any thrown value. */
export function errorMessage(error: unknown): string {
	if (isWebDriverError(error, 'invalid session id')) return msg('invalidSession');
	return error instanceof Error ? error.message : String(error);
}

/**
 * Selenium Grid rejects requests whose Content-Type is not exactly
 * "application/json; charset=utf-8" ("Content-Type header does not indicate utf-8 encoded json"),
 * while the n8n/axios default is only "application/json". The header is therefore sent explicitly.
 */
const JSON_HEADERS = {
	'Content-Type': 'application/json; charset=utf-8',
	Accept: 'application/json',
};

type HttpContext = IExecuteFunctions | ILoadOptionsFunctions;

/** Reads the Selenium URL from the credential (without a trailing slash). */
export async function getBaseUrl(context: HttpContext): Promise<string> {
	const credentials = await context.getCredentials(CREDENTIAL_NAME);
	return String(credentials.baseUrl).replace(/\/+$/, '');
}

/** Creates the function that talks to the WebDriver HTTP API at `baseUrl`. */
export function createRequester(context: HttpContext, baseUrl: string): Requester {
	return async <T>(
		method: 'GET' | 'POST' | 'DELETE',
		path: string,
		body?: IDataObject,
		timeoutMs = HTTP_TIMEOUT_MS,
	): Promise<T> => {
		let response: { statusCode: number; body: unknown };
		try {
			response = (await context.helpers.httpRequest({
				method,
				url: `${baseUrl}${path}`,
				headers: JSON_HEADERS,
				// n8n drops empty "{}" bodies, but WebDriver requires a JSON body on every POST
				// (click, clear, back...), so the body is serialised here.
				...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}),
				json: true,
				timeout: timeoutMs,
				ignoreHttpStatusErrors: true,
				returnFullResponse: true,
			})) as { statusCode: number; body: unknown };
		} catch (error) {
			throw new Error(msg('connectionFailed', { base: baseUrl, error: (error as Error).message }));
		}

		const payload = response.body as { value?: IDataObject } | string | undefined;
		const value = typeof payload === 'object' && payload !== null ? payload.value : undefined;

		if (response.statusCode >= 400) {
			const failure = (value ?? {}) as IDataObject;
			const code = String(failure.error ?? `http ${response.statusCode}`);
			const detail = String(
				failure.message ?? (typeof payload === 'string' ? payload.slice(0, 200) : ''),
			).split('\n')[0];
			throw new WebDriverError(code, `${code}: ${detail}`.trim(), response.statusCode);
		}
		return value as T;
	};
}

/** A browser session currently open in the Selenium server. */
export interface OpenSession {
	sessionId: string;
	browser: string;
	version: string;
	startedAt: string;
	url?: string;
	title?: string;
}

/**
 * Lists the sessions open right now by reading `GET /status` of a Selenium Grid / standalone.
 * With `withPageInfo`, each session is also asked for its current URL and title.
 */
export async function listOpenSessions(
	request: Requester,
	withPageInfo: boolean,
): Promise<OpenSession[]> {
	const status = await request<IDataObject>('GET', '/status', undefined, 15_000);
	const nodes = status?.nodes as IDataObject[] | undefined;
	if (!Array.isArray(nodes)) throw new Error(msg('notAGrid'));

	const sessions: OpenSession[] = [];
	for (const node of nodes) {
		for (const slot of (node.slots as IDataObject[]) ?? []) {
			const session = slot.session as IDataObject | null;
			if (!session) continue;
			const capabilities = (session.capabilities ?? {}) as IDataObject;
			sessions.push({
				sessionId: String(session.sessionId),
				browser: String(capabilities.browserName ?? ''),
				version: String(capabilities.browserVersion ?? ''),
				startedAt: String(session.start ?? ''),
			});
		}
	}

	if (withPageInfo) {
		await Promise.all(
			sessions.map(async (session) => {
				try {
					const id = encodeURIComponent(session.sessionId);
					session.url = await request<string>('GET', `/session/${id}/url`, undefined, 5_000);
					session.title = await request<string>('GET', `/session/${id}/title`, undefined, 5_000);
				} catch {
					// busy session or no open tab: keep it in the list without page info
				}
			}),
		);
	}
	return sessions;
}
