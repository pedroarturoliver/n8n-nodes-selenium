import type { IDataObject } from 'n8n-workflow';

import type { ActionHandler } from '../helpers/context';
import { byteLength, toBinary } from '../helpers/utils';
import { WebDriverError } from '../helpers/webdriver';
import { msg } from '../i18n';
import { pageInfo } from './navigation';

export const windowActions: Record<string, ActionHandler> = {
	list: async (c) => {
		const [windows, currentWindow] = await Promise.all([
			c.request<string[]>('GET', c.sessionPath('/window/handles')),
			c.request<string>('GET', c.sessionPath('/window')).catch(() => null),
		]);
		return c.output({ currentWindow, windows });
	},

	switch: async (c) => {
		const handles = await c.request<string[]>('GET', c.sessionPath('/window/handles'));
		const mode = c.param<string>('switchMode', 'latest');
		const handle =
			mode === 'handle'
				? c.param<string>('windowHandle')
				: mode === 'index'
					? handles[c.param<number>('windowIndex', 0)]
					: handles[handles.length - 1];
		if (!handle) {
			throw new WebDriverError(
				'no such window',
				msg('windowNotFound', { mode, count: handles.length }),
			);
		}
		await c.request('POST', c.sessionPath('/window'), { handle });
		return c.output({ currentWindow: handle, windows: handles, ...(await pageInfo(c)) });
	},

	new: async (c) => {
		const created = await c.request<IDataObject>('POST', c.sessionPath('/window/new'), {
			type: c.param('windowType', 'tab'),
		});
		if (c.param<boolean>('switchToNew', true)) {
			await c.request('POST', c.sessionPath('/window'), { handle: created.handle });
		}
		return c.output({ newWindow: created.handle as string, type: created.type as string });
	},

	close: async (c) => {
		const remaining = await c.request<string[]>('DELETE', c.sessionPath('/window'));
		let currentWindow: string | null = null;
		// after closing, WebDriver has no active window until one is selected explicitly
		if (c.param<boolean>('switchToFirst', true) && remaining.length > 0) {
			currentWindow = remaining[0];
			await c.request('POST', c.sessionPath('/window'), { handle: currentWindow });
		}
		return c.output({ currentWindow, windows: remaining });
	},

	setSize: async (c) => {
		const rect = await c.request<IDataObject>('POST', c.sessionPath('/window/rect'), {
			width: c.param<number>('width', 1920),
			height: c.param<number>('height', 1080),
		});
		return c.output({ window: rect });
	},

	maximize: async (c) =>
		c.output({ window: await c.request('POST', c.sessionPath('/window/maximize'), {}) }),

	screenshot: async (c) => {
		const base64 = await c.request<string>('GET', c.sessionPath('/screenshot'));
		return c.output(
			{ sizeBytes: byteLength(base64) },
			await toBinary(c, base64, 'screenshot.png', 'image/png'),
		);
	},

	printPdf: async (c) => {
		const base64 = await c.request<string>('POST', c.sessionPath('/print'), {
			orientation: c.param<boolean>('landscape', false) ? 'landscape' : 'portrait',
			background: c.param<boolean>('printBackground', true),
		});
		return c.output(
			{ sizeBytes: byteLength(base64) },
			await toBinary(c, base64, 'page.pdf', 'application/pdf'),
		);
	},
};
