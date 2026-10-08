/**
 * Runtime messages (errors) in English, the source language.
 * Use `{placeholder}` for values. Translations live in `locales/` and must keep the same placeholders.
 */
export const MESSAGES = {
	invalidJson: 'The JSON provided is not valid',
	connectionFailed: 'Could not connect to Selenium at {base}: {error}',
	notAGrid:
		'This address is not a Selenium Grid/standalone (its /status lists no nodes), so sessions cannot be listed. Use the selenium/standalone-chrome image.',
	invalidSession:
		'The browser session does not exist, has expired or was already ended. Create a new one with Session > Create (if there was a long pause between steps, increase SE_NODE_SESSION_TIMEOUT in the Selenium container).',
	sessionRequired:
		'Choose the Session (from the list, or by the sessionId returned by Session > Create)',
	unsupportedOperation: 'Unsupported operation: {resource} / {operation}',
	selectorRequired: 'Enter the element selector',
	unknownSelectorType: 'Unknown selector type: {type}',
	elementNotFound: 'Element not found ({type}: {value})',
	afterWaiting: ' after waiting {ms} ms',
	timeoutElement:
		'Timed out ({ms} ms) waiting for the element ({type}: {value}) to be "{condition}"',
	timeoutUrl: 'Timed out ({ms} ms) waiting for the URL to contain "{text}"',
	timeoutTitle: 'Timed out ({ms} ms) waiting for the title to contain "{text}"',
	timeoutPageLoad: 'Timed out ({ms} ms) waiting for the page to finish loading',
	iframeTimeout: 'Iframe ({type}: {value}) was not available within {ms} ms',
	windowNotFound: 'Window not found ({mode}). Open windows: {count}',
	optionNotFound: 'Option not found ({mode}: {option})',
	unknownCondition: 'Unknown condition: {condition}',
	unknownAction: 'Unknown action: {action}',
	noFieldsConfigured: 'Add at least one field under "Fields"',
	fieldFailed: 'Field {index} ({type}: {selector}, action: {action}) failed: {message}',
	cookiesMustBeArray: '"Cookies (JSON)" must be a list (array)',
	argsMustBeArray: '"Arguments (JSON)" must be a list (array)',
	invalidExpression: 'Invalid logical expression: {detail}',
	missingCondition: 'missing a condition',
	unclosedParenthesis: 'opening parenthesis without a closing one',
	unopenedParenthesis: 'closing parenthesis without an opening one',
	unexpectedSymbol: 'unexpected symbol "{symbol}"',
	trailingContent: 'unexpected content at the end',
} as const;

export type MessageKey = keyof typeof MESSAGES;
