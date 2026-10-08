/**
 * Internationalisation.
 *
 * The node speaks the language configured in n8n (`N8N_DEFAULT_LOCALE`): English, Portuguese
 * (pt, pt-BR), Spanish, French, German or Russian. Anything else falls back to English.
 *
 * English is the source language: UI texts are written in English in the code, and the
 * translation files in `locales/` map "English text" -> "translated text".
 */
import { de } from './locales/de';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { MESSAGES, MessageKey } from './messages';
import { Language, LogicTerms, Locale, SUPPORTED_LANGUAGES } from './types';

export { MESSAGES, SUPPORTED_LANGUAGES };
export type { Language, LogicTerms, Locale, MessageKey };

export const LOCALES: Record<Exclude<Language, 'en'>, Locale> = { pt, es, fr, de, ru };

const ENGLISH_LOGIC: LogicTerms = { and: 'AND', or: 'OR', true: 'T', false: 'F' };

/**
 * Maps an n8n locale ("pt-BR", "de_DE", "en"...) to a supported language by its base language.
 * Unset or unsupported locales return English.
 */
export function detectLanguage(
	locale: string | undefined = process.env.N8N_DEFAULT_LOCALE,
): Language {
	const base = String(locale ?? '')
		.trim()
		.toLowerCase()
		.replace(/_/g, '-')
		.split('-')[0];
	return (SUPPORTED_LANGUAGES as readonly string[]).includes(base) ? (base as Language) : 'en';
}

let currentLanguage: Language = detectLanguage();

export const getLanguage = (): Language => currentLanguage;

/** Overrides the language (used by tests; the node itself reads the n8n environment on load). */
export function setLanguage(language: Language): void {
	currentLanguage = language;
}

const localeOf = (language: Language): Locale | undefined =>
	language === 'en' ? undefined : LOCALES[language];

/** Translates a UI text written in English. Without a translation it returns the original. */
export function t(text: string, language: Language = currentLanguage): string {
	return localeOf(language)?.ui[text] ?? text;
}

/** Runtime message in the current language with its `{placeholders}` filled in. */
export function msg(key: MessageKey, params: Record<string, string | number> = {}): string {
	const template = localeOf(currentLanguage)?.messages[key] ?? MESSAGES[key];
	return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}

export const getLogicTerms = (language: Language = currentLanguage): LogicTerms =>
	localeOf(language)?.logic ?? ENGLISH_LOGIC;

export const getDateLocale = (language: Language = currentLanguage): string =>
	localeOf(language)?.dateLocale ?? 'en-US';

// ---------------------------------------------------------------------------------------------
// Translation of n8n node/credential descriptions
// ---------------------------------------------------------------------------------------------

type Obj = Record<string, unknown>;

function translateText(target: Obj, keys: string[], language: Language): void {
	for (const key of keys) {
		if (typeof target[key] === 'string') target[key] = t(target[key], language);
	}
}

/** Translates a property: labels, descriptions, placeholders, hints and option labels. */
function translateProperty(property: Obj, language: Language): void {
	translateText(property, ['displayName', 'description', 'placeholder', 'hint'], language);

	const typeOptions = property.typeOptions as Obj | undefined;
	if (typeOptions)
		translateText(typeOptions, ['addButtonText', 'multipleValueButtonText'], language);

	if (!Array.isArray(property.options)) return;
	for (const option of property.options as Obj[]) {
		if (Array.isArray(option.values)) {
			// fixedCollection group: `displayName` is the label, `name` is only the id
			translateText(option, ['displayName', 'description'], language);
			for (const child of option.values as Obj[]) translateProperty(child, language);
		} else {
			// option of a list: `name` is the label, `value` is the id
			translateText(option, ['name', 'description', 'action'], language);
		}
	}
}

/** Returns a copy of a node (or credential) description translated to `language`. */
export function translateDescription<T extends object>(
	description: T,
	language: Language = currentLanguage,
): T {
	if (language === 'en') return description;
	const copy = structuredClone(description) as Obj;

	translateText(copy, ['displayName', 'description'], language);
	const defaults = copy.defaults as Obj | undefined;
	if (defaults) translateText(defaults, ['name'], language);

	if (typeof copy.outputs === 'string') {
		// the "True"/"False" labels live inside an n8n expression string
		copy.outputs = copy.outputs
			.replace('displayName: "True"', `displayName: ${JSON.stringify(t('True', language))}`)
			.replace('displayName: "False"', `displayName: ${JSON.stringify(t('False', language))}`);
	}
	if (Array.isArray(copy.properties)) {
		for (const property of copy.properties as Obj[]) translateProperty(property, language);
	}
	return copy as T;
}
