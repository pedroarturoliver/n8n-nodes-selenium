import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import { findAction, hasDualOutput, isSessionless } from './actions';
import { CREDENTIAL_NAME } from './constants';
import { nodeProperties } from './descriptions';
import { ActionContext } from './helpers/context';
import { createRequester, errorMessage, getBaseUrl, listOpenSessions } from './helpers/webdriver';
import { getDateLocale, msg, t, translateDescription } from './i18n';

/**
 * Generic Selenium node for n8n.
 *
 * The node does NOT run a browser: it speaks the W3C WebDriver protocol (HTTP/JSON) with a Selenium
 * container (selenium/standalone-chrome or a Grid). Each operation is an "atom" of Selenium (open a
 * page, find an element, wait, switch iframe, get cookies...). The state (the browser session) lives
 * in the container; n8n only carries the `sessionId`.
 */
export class Selenium implements INodeType {
	description: INodeTypeDescription = translateDescription<INodeTypeDescription>({
		displayName: 'Selenium',
		name: 'selenium',
		icon: 'file:selenium.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description:
			'Controls a browser in a Selenium container (open page, iframe, cookies, waits, clicks...) for web scraping and automation',
		defaults: { name: 'Selenium' },
		inputs: [NodeConnectionTypes.Main],
		// "Check Multiple Elements" has two outputs (True/False), like the IF node
		outputs:
			'={{ ($parameter["resource"] === "element" && $parameter["operation"] === "checkMultiple") ? [{ type: "main", displayName: "True" }, { type: "main", displayName: "False" }] : [{ type: "main" }] }}',
		credentials: [{ name: CREDENTIAL_NAME, required: true }],
		properties: nodeProperties,
	});

	methods = {
		listSearch: {
			/** Feeds the "Session > From List" picker with the browsers open in Selenium right now. */
			async searchSessions(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const request = createRequester(this, await getBaseUrl(this));
				const sessions = await listOpenSessions(request, true);
				return {
					results: sessions.map((session) => {
						const time = session.startedAt
							? new Date(session.startedAt).toLocaleTimeString(getDateLocale())
							: '?';
						return {
							name: `${session.browser} ${session.version} · ${session.sessionId.slice(0, 8)} · ${t('since')} ${time}`,
							value: session.sessionId,
							description: session.url
								? `${session.title ?? ''} ${session.url}`.trim()
								: t('no open tab'),
						};
					}),
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const single: INodeExecutionData[] = [];
		const whenTrue: INodeExecutionData[] = [];
		const whenFalse: INodeExecutionData[] = [];
		const dualOutput =
			items.length > 0 &&
			hasDualOutput(
				this.getNodeParameter('resource', 0, '') as string,
				this.getNodeParameter('operation', 0, '') as string,
			);

		const request = createRequester(this, await getBaseUrl(this));

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const action = findAction(resource, operation);
				if (!action) {
					throw new NodeOperationError(
						this.getNode(),
						msg('unsupportedOperation', { resource, operation }),
						{ itemIndex: i },
					);
				}

				const sessionless = isSessionless(resource, operation);
				const sessionId = sessionless
					? ''
					: String(this.getNodeParameter('sessionId', i, '', { extractValue: true }) ?? '').trim();
				if (!sessionless && !sessionId) {
					throw new NodeOperationError(this.getNode(), msg('sessionRequired'), { itemIndex: i });
				}

				const result = await action(new ActionContext(this, request, i, sessionId));
				if (Array.isArray(result)) {
					single.push(...result);
				} else {
					whenTrue.push(...result.whenTrue);
					whenFalse.push(...result.whenFalse);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					// with two outputs, the error item goes to "False"
					(dualOutput ? whenFalse : single).push({
						json: { error: errorMessage(error) },
						pairedItem: { item: i },
					});
					continue;
				}
				if (error instanceof NodeOperationError) throw error;
				throw new NodeOperationError(this.getNode(), errorMessage(error), { itemIndex: i });
			}
		}

		return dualOutput ? [whenTrue, whenFalse] : [single];
	}
}
