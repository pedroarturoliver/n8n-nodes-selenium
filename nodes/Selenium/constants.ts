/** Key under which the W3C WebDriver spec returns an element reference. */
export const ELEMENT_KEY = 'element-6066-11e4-a52e-4f735466cecf';

/** Default HTTP timeout for a WebDriver command (page loads can be slow). */
export const HTTP_TIMEOUT_MS = 180_000;

/** Pause between polls while waiting for a condition. */
export const POLL_INTERVAL_MS = 250;

/** WebDriver errors that only mean "not yet" while polling (the element may appear later). */
export const TRANSIENT_ERROR_CODES = [
	'no such element',
	'stale element reference',
	'no such frame',
] as const;

/** Special keys, as the Unicode private-use code points defined by the WebDriver spec. */
export const KEY_CODES: Record<string, string> = {
	Enter: '',
	Tab: '',
	Escape: '',
};

/** Resources whose operations act on an existing browser session. */
export const SESSION_RESOURCES = [
	'alert',
	'cookie',
	'element',
	'frame',
	'navigation',
	'script',
	'wait',
	'window',
] as const;

/** Name under which the credential is registered. */
export const CREDENTIAL_NAME = 'seleniumGrid';
