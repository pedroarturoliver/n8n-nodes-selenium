import type { IBinaryKeyData } from 'n8n-workflow';

import { msg } from '../i18n';
import type { ActionContext } from './context';

/** Parses a JSON parameter. Empty values give `undefined`; objects pass through. */
export function parseJson(value: unknown): unknown {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'object') return value;
	try {
		return JSON.parse(String(value));
	} catch {
		throw new Error(msg('invalidJson'));
	}
}

/** Splits text by a separator, trimming each part and dropping empty ones. */
export function splitList(text: string, separator: RegExp): string[] {
	return String(text ?? '')
		.split(separator)
		.map((part) => part.trim())
		.filter(Boolean);
}

/** Turns a base64 payload (screenshot, PDF) into n8n binary data under the configured property. */
export async function toBinary(
	context: ActionContext,
	base64: string,
	defaultFileName: string,
	mimeType: string,
): Promise<IBinaryKeyData> {
	const fileName = context.param<string>('fileName', '') || defaultFileName;
	const property = context.param<string>('binaryPropertyName', 'data');
	const binary = await context.fn.helpers.prepareBinaryData(
		Buffer.from(base64, 'base64'),
		fileName,
		mimeType,
	);
	return { [property]: binary };
}

export const byteLength = (base64: string): number => Buffer.from(base64, 'base64').length;
