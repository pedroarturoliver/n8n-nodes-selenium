import type { INodeExecutionData } from 'n8n-workflow';

import { POLL_INTERVAL_MS, TRANSIENT_ERROR_CODES } from '../constants';
import type { ActionContext } from './context';
import { WebDriverError } from './webdriver';

export const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

export interface PollResult {
	ok: boolean;
	waitedMs: number;
}

/**
 * Calls `check` until it returns true or `timeoutMs` passes (always checks at least once).
 * Transient WebDriver errors (element vanished, frame gone...) count as "not yet".
 */
export async function pollUntil(
	check: () => Promise<boolean>,
	timeoutMs: number,
): Promise<PollResult> {
	const start = Date.now();
	for (;;) {
		let ok = false;
		try {
			ok = await check();
		} catch (error) {
			const transient =
				error instanceof WebDriverError &&
				(TRANSIENT_ERROR_CODES as readonly string[]).includes(error.code);
			if (!transient) throw error;
		}
		const waitedMs = Date.now() - start;
		if (ok) return { ok: true, waitedMs };
		if (waitedMs >= timeoutMs) return { ok: false, waitedMs };
		await sleep(POLL_INTERVAL_MS);
	}
}

/** Output of the "wait" operations, honouring "Fail On Timeout". */
export function waitOutput(
	context: ActionContext,
	result: PollResult,
	timeoutMessage: string,
): INodeExecutionData[] {
	if (!result.ok && context.param<boolean>('failOnTimeout', true)) {
		throw new WebDriverError('timeout', timeoutMessage);
	}
	return context.output({ found: result.ok, waitedMs: result.waitedMs });
}
