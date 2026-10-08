/** Languages the node UI is available in. English is the source language. */
export type Language = 'en' | 'pt' | 'es' | 'fr' | 'de' | 'ru';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'pt', 'es', 'fr', 'de', 'ru'];

/** Words used when the logical expression of "Check Multiple Elements" is written in the output. */
export interface LogicTerms {
	and: string;
	or: string;
	/** Short symbol for a condition that evaluated to true (e.g. "T"). */
	true: string;
	/** Short symbol for a condition that evaluated to false (e.g. "F"). */
	false: string;
}

/** Everything a translation file must provide (see `locales/`). */
export interface Locale {
	/** BCP 47 tag used to format dates (session list: "since 14:03:22"). */
	dateLocale: string;
	logic: LogicTerms;
	/** UI texts. Key = the English source text, value = its translation. */
	ui: Record<string, string>;
	/** Runtime messages. Same keys and `{placeholders}` as `messages.ts`. */
	messages: Record<string, string>;
}
