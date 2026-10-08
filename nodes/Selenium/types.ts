import type { IBinaryKeyData, IDataObject, INodeExecutionData } from 'n8n-workflow';

export type HttpMethod = 'GET' | 'POST' | 'DELETE';

/**
 * Sends a WebDriver command and resolves with the `value` of the response.
 * Rejects with a `WebDriverError` when the driver reports an error.
 */
export type Requester = <T = unknown>(
	method: HttpMethod,
	path: string,
	body?: IDataObject,
	timeoutMs?: number,
) => Promise<T>;

/** Result of operations with two outputs (the "True"/"False" branches of the IF-like operation). */
export interface DualOutput {
	whenTrue: INodeExecutionData[];
	whenFalse: INodeExecutionData[];
}

export type { IBinaryKeyData };
