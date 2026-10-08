/**
 * Boolean logic of "Check Multiple Elements" (propositional logic / discrete mathematics).
 *
 * Each condition becomes a truth value; the connectors AND/OR (and optional parentheses) between
 * them are evaluated with the usual grammar:
 *
 *   expression := term ( OR term )*        -- disjunction (∨), lower precedence
 *   term       := factor ( AND factor )*   -- conjunction (∧), higher precedence
 *   factor     := value | "(" expression ")"
 *
 * So `A OR B AND C` means `A ∨ (B ∧ C)`. Unbalanced parentheses or misplaced connectors throw.
 */
import { getLogicTerms, msg } from '../i18n';

/** A token of a boolean expression. */
export type LogicToken =
	| { type: 'open' }
	| { type: 'close' }
	| { type: 'and' }
	| { type: 'or' }
	| { type: 'value'; value: boolean; label: string };

export function evaluateExpression(tokens: LogicToken[]): boolean {
	let position = 0;

	const fail = (detail: string): never => {
		throw new Error(msg('invalidExpression', { detail }));
	};

	const factor = (): boolean => {
		const token = tokens[position];
		if (!token) return fail(msg('missingCondition'));
		if (token.type === 'value') {
			position++;
			return token.value;
		}
		if (token.type === 'open') {
			position++;
			const inner = expression();
			if (tokens[position]?.type !== 'close') return fail(msg('unclosedParenthesis'));
			position++;
			return inner;
		}
		return fail(msg('unexpectedSymbol', { symbol: token.type }));
	};

	const term = (): boolean => {
		let result = factor();
		while (tokens[position]?.type === 'and') {
			position++;
			const next = factor(); // always evaluates both sides (no hidden short-circuit)
			result = result && next;
		}
		return result;
	};

	const expression = (): boolean => {
		let result = term();
		while (tokens[position]?.type === 'or') {
			position++;
			const next = term();
			result = result || next;
		}
		return result;
	};

	const result = expression();
	if (position < tokens.length) {
		return fail(msg(tokens[position].type === 'close' ? 'unopenedParenthesis' : 'trailingContent'));
	}
	return result;
}

/**
 * Writes the expression for humans: "C1 AND (C2 OR C3)" with the condition labels, or
 * "T AND (F OR T)" with the truth values (words come from the current language).
 */
export function formatExpression(tokens: LogicToken[], withValues: boolean): string {
	const terms = getLogicTerms();
	let text = '';
	for (const token of tokens) {
		if (token.type === 'open') text += '(';
		else if (token.type === 'close') text = text.trimEnd() + ') ';
		else if (token.type === 'and') text += `${terms.and} `;
		else if (token.type === 'or') text += `${terms.or} `;
		else text += (withValues ? (token.value ? terms.true : terms.false) : token.label) + ' ';
	}
	return text.trim().replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
}
