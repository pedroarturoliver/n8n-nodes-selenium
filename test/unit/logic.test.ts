import { describe, expect, it } from 'vitest';

import {
	evaluateExpression,
	formatExpression,
	LogicToken,
} from '../../nodes/Selenium/helpers/logic';
import { setLanguage } from '../../nodes/Selenium/i18n';

const v = (value: boolean, label = 'C'): LogicToken => ({ type: 'value', value, label });
const AND: LogicToken = { type: 'and' };
const OR: LogicToken = { type: 'or' };
const OPEN: LogicToken = { type: 'open' };
const CLOSE: LogicToken = { type: 'close' };

describe('evaluateExpression', () => {
	it('evaluates a single value', () => {
		expect(evaluateExpression([v(true)])).toBe(true);
		expect(evaluateExpression([v(false)])).toBe(false);
	});

	it('implements the AND / OR truth tables', () => {
		for (const a of [true, false]) {
			for (const b of [true, false]) {
				expect(evaluateExpression([v(a), AND, v(b)])).toBe(a && b);
				expect(evaluateExpression([v(a), OR, v(b)])).toBe(a || b);
			}
		}
	});

	it('gives AND precedence over OR: A OR B AND C = A OR (B AND C)', () => {
		// T OR F AND F -> T (left-to-right evaluation would give F)
		expect(evaluateExpression([v(true), OR, v(false), AND, v(false)])).toBe(true);
		// F AND F OR T -> T
		expect(evaluateExpression([v(false), AND, v(false), OR, v(true)])).toBe(true);
		// F OR F AND T -> F
		expect(evaluateExpression([v(false), OR, v(false), AND, v(true)])).toBe(false);
	});

	it('lets parentheses change the order', () => {
		// (T OR F) AND F -> F
		const tokens = [OPEN, v(true), OR, v(false), CLOSE, AND, v(false)];
		expect(evaluateExpression(tokens)).toBe(false);
	});

	it('supports nested parentheses', () => {
		// T AND ((F OR T) AND (T OR F))
		const tokens = [
			v(true),
			AND,
			OPEN,
			OPEN,
			v(false),
			OR,
			v(true),
			CLOSE,
			AND,
			OPEN,
			v(true),
			OR,
			v(false),
			CLOSE,
			CLOSE,
		];
		expect(evaluateExpression(tokens)).toBe(true);
	});

	it.each([
		['empty expression', []],
		['dangling connector', [v(true), AND]],
		['leading connector', [OR, v(true)]],
		['two values in a row', [v(true), v(false)]],
		['unclosed parenthesis', [OPEN, v(true)]],
		['unopened parenthesis', [v(true), CLOSE]],
	] as [string, LogicToken[]][])('rejects an invalid expression: %s', (_name, tokens) => {
		expect(() => evaluateExpression(tokens)).toThrow(/logical expression/i);
	});

	it('matches JavaScript for random expressions (JS has the same AND-over-OR precedence)', () => {
		let seed = 12345;
		const random = () => {
			seed = (seed * 1664525 + 1013904223) % 4294967296;
			return seed / 4294967296;
		};

		for (let run = 0; run < 3000; run++) {
			const tokens: LogicToken[] = [];
			const source: string[] = [];
			let depth = 0;
			const count = 1 + Math.floor(random() * 6);
			for (let i = 0; i < count; i++) {
				if (i > 0) {
					const connector = random() < 0.5;
					tokens.push(connector ? AND : OR);
					source.push(connector ? '&&' : '||');
				}
				const opens = random() < 0.3 ? 1 : 0;
				for (let n = 0; n < opens; n++) {
					tokens.push(OPEN);
					source.push('(');
					depth++;
				}
				const value = random() < 0.5;
				tokens.push(v(value));
				source.push(String(value));
				if (depth > 0 && random() < 0.5) {
					tokens.push(CLOSE);
					source.push(')');
					depth--;
				}
			}
			while (depth-- > 0) {
				tokens.push(CLOSE);
				source.push(')');
			}
			const expected = new Function(`return (${source.join(' ')})`)() as boolean;
			expect(evaluateExpression(tokens)).toBe(expected);
		}
	});
});

describe('formatExpression', () => {
	const tokens: LogicToken[] = [
		OPEN,
		v(true, 'C1'),
		OR,
		v(false, 'C2'),
		CLOSE,
		AND,
		v(false, 'C3'),
	];

	it('writes labels and values in English by default', () => {
		setLanguage('en');
		expect(formatExpression(tokens, false)).toBe('(C1 OR C2) AND C3');
		expect(formatExpression(tokens, true)).toBe('(T OR F) AND F');
	});

	it('uses the words of the current language', () => {
		setLanguage('pt');
		expect(formatExpression(tokens, false)).toBe('(C1 OU C2) E C3');
		setLanguage('de');
		expect(formatExpression(tokens, true)).toBe('(W ODER F) UND F');
		setLanguage('en');
	});
});
