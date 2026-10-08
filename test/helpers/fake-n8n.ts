import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { ActionContext } from '../../nodes/Selenium/helpers/context';
import type { Requester } from '../../nodes/Selenium/types';

export interface RecordedCall {
	method: string;
	path: string;
	body?: IDataObject;
}

/** A scripted WebDriver: answers requests with `respond` and records every call. */
export function fakeRequester(respond: (call: RecordedCall) => unknown): {
	request: Requester;
	calls: RecordedCall[];
} {
	const calls: RecordedCall[] = [];
	const request = (async (method: string, path: string, body?: IDataObject) => {
		const call = { method, path, body };
		calls.push(call);
		const result = respond(call);
		if (result instanceof Error) throw result;
		return result;
	}) as Requester;
	return { request, calls };
}

/** Minimal `IExecuteFunctions` that serves node parameters from a plain object. */
export function fakeExecuteFunctions(
	params: Record<string, unknown>,
	options: { continueOnFail?: boolean; items?: INodeExecutionData[]; http?: unknown } = {},
): IExecuteFunctions {
	return {
		getInputData: () => options.items ?? [{ json: {} }],
		getCredentials: async () => ({ baseUrl: 'http://selenium:4444/' }),
		getNodeParameter: (name: string, _index: number, fallback?: unknown) =>
			name in params ? params[name] : fallback,
		getNode: () => ({ name: 'Selenium' }),
		continueOnFail: () => Boolean(options.continueOnFail),
		helpers: {
			httpRequest: options.http,
			prepareBinaryData: async (buffer: Buffer, fileName: string, mimeType: string) => ({
				data: buffer.toString('base64'),
				fileName,
				mimeType,
			}),
		},
	} as unknown as IExecuteFunctions;
}

/** Builds an `ActionContext` for unit-testing a single operation handler. */
export function actionContext(
	params: Record<string, unknown>,
	request: Requester,
	sessionId = 'sess1',
): ActionContext {
	return new ActionContext(fakeExecuteFunctions(params), request, 0, sessionId);
}
