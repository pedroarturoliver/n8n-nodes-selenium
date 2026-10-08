import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

import type { DualOutput, Requester } from '../types';

/** What an operation handler returns: items for the single output, or items split in two outputs. */
export type ActionResult = INodeExecutionData[] | DualOutput;

/** One operation of the node. Receives the context of ONE input item. */
export type ActionHandler = (context: ActionContext) => Promise<ActionResult>;

/** Everything an operation needs while running for one input item. */
export class ActionContext {
	constructor(
		readonly fn: IExecuteFunctions,
		readonly request: Requester,
		readonly itemIndex: number,
		readonly sessionId: string,
	) {}

	/** Reads a node parameter for the current item. */
	param<T = string>(name: string, fallback?: unknown): T {
		return this.fn.getNodeParameter(name, this.itemIndex, fallback) as T;
	}

	/** Path of a session endpoint: `/session/{id}{path}`. */
	sessionPath(path = ''): string {
		return `/session/${encodeURIComponent(this.sessionId)}${path}`;
	}

	/** Builds the single output item (always carries the `sessionId`, so nodes can be chained). */
	output(json: Record<string, unknown> = {}, binary?: IBinaryKeyData): INodeExecutionData[] {
		return [
			{
				json: { sessionId: this.sessionId, ...json } as IDataObject,
				...(binary ? { binary } : {}),
				pairedItem: { item: this.itemIndex },
			},
		];
	}

	/** Wraps already-built JSON objects as output items paired with the current input item. */
	items(rows: IDataObject[]): INodeExecutionData[] {
		return rows.map((json) => ({ json, pairedItem: { item: this.itemIndex } }));
	}
}
