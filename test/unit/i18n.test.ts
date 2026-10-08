import { afterEach, describe, expect, it } from 'vitest';

import { Selenium } from '../../nodes/Selenium/Selenium.node';
import {
	detectLanguage,
	LOCALES,
	MESSAGES,
	msg,
	setLanguage,
	SUPPORTED_LANGUAGES,
	t,
	translateDescription,
} from '../../nodes/Selenium/i18n';
import { SeleniumGrid } from '../../credentials/SeleniumGrid.credentials';

afterEach(() => setLanguage('en'));

describe('detectLanguage', () => {
	it.each([
		[undefined, 'en'],
		['', 'en'],
		['en', 'en'],
		['pt', 'pt'],
		['pt-BR', 'pt'],
		['pt_BR', 'pt'],
		['PT-br', 'pt'],
		['es', 'es'],
		['es_MX', 'es'],
		['fr-CA', 'fr'],
		['de-AT', 'de'],
		['ru', 'ru'],
		['ja', 'en'],
		['zh-CN', 'en'],
	])('%s -> %s', (locale, expected) => {
		expect(detectLanguage(locale)).toBe(expected);
	});
});

type Obj = Record<string, any>;

/** Every UI text of the node and credential descriptions, in English. */
function collectUiTexts(): Set<string> {
	setLanguage('en');
	const texts = new Set<string>();
	const add = (value: unknown) => typeof value === 'string' && value.trim() && texts.add(value);
	const walk = (property: Obj) => {
		['displayName', 'description', 'placeholder', 'hint'].forEach((k) => add(property[k]));
		['addButtonText', 'multipleValueButtonText'].forEach((k) => add(property.typeOptions?.[k]));
		for (const option of property.options ?? []) {
			if (option.values) {
				add(option.displayName);
				add(option.description);
				option.values.forEach(walk);
			} else {
				['name', 'description', 'action'].forEach((k) => add(option[k]));
			}
		}
	};
	const description = new Selenium().description as Obj;
	add(description.displayName);
	add(description.description);
	description.properties.forEach(walk);
	new SeleniumGrid().properties.forEach((p) => walk(p as Obj));
	['True', 'False', 'since', 'no open tab'].forEach(add);
	return texts;
}

describe('translations', () => {
	const texts = collectUiTexts();
	const languages = SUPPORTED_LANGUAGES.filter((l) => l !== 'en') as Exclude<
		(typeof SUPPORTED_LANGUAGES)[number],
		'en'
	>[];

	it.each(languages)('%s translates every UI text', (language) => {
		const missing = [...texts].filter((text) => !(text in LOCALES[language].ui));
		expect(missing).toEqual([]);
	});

	it.each(languages)(
		'%s has no stale translations (keys must be current English texts)',
		(language) => {
			const stale = Object.keys(LOCALES[language].ui).filter((key) => !texts.has(key));
			expect(stale).toEqual([]);
		},
	);

	it.each(languages)('%s has every runtime message with the same placeholders', (language) => {
		const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
		for (const key of Object.keys(MESSAGES) as (keyof typeof MESSAGES)[]) {
			const translated = LOCALES[language].messages[key];
			expect(translated, `${language}.${key}`).toBeTruthy();
			expect(placeholders(translated), `${language}.${key}`).toEqual(placeholders(MESSAGES[key]));
		}
		expect(Object.keys(LOCALES[language].messages).sort()).toEqual(Object.keys(MESSAGES).sort());
	});

	it('translates the node description without touching the original', () => {
		const original = new Selenium().description;
		const portuguese = translateDescription(original, 'pt');
		expect(portuguese.description).not.toBe(original.description);
		expect(portuguese.outputs).toContain('displayName: "Verdadeiro"');
		expect(portuguese.outputs).toContain('displayName: "Falso"');
		expect(original.outputs).toContain('displayName: "True"');
	});

	it('keeps internal names (parameters and values) untouched in every language', () => {
		const names = (description: Obj): string[] =>
			description.properties.flatMap((p: Obj) => [
				p.name,
				...(p.options ?? []).map((o: Obj) => o.value ?? o.name),
			]);
		const reference = names(new Selenium().description as Obj);
		for (const language of languages) {
			expect(names(translateDescription(new Selenium().description, language) as Obj)).toEqual(
				reference,
			);
		}
	});

	it('builds the node in the language of N8N_DEFAULT_LOCALE', () => {
		setLanguage('es');
		expect(new Selenium().description.displayName).toBe('Selenium');
		expect(t('Resource')).toBe(LOCALES.es.ui['Resource']);
	});

	it('falls back to the English text when there is no translation', () => {
		setLanguage('pt');
		expect(t('A text that is not translated')).toBe('A text that is not translated');
	});

	it('fills placeholders in messages', () => {
		setLanguage('en');
		expect(msg('elementNotFound', { type: 'id', value: 'zzz' })).toBe(
			'Element not found (id: zzz)',
		);
		setLanguage('pt');
		expect(msg('elementNotFound', { type: 'id', value: 'zzz' })).toContain('(id: zzz)');
	});
});
