import tseslint from 'typescript-eslint';
import n8nNodesBase from 'eslint-plugin-n8n-nodes-base';

export default tseslint.config(
	{ ignores: ['dist/**', 'node_modules/**', 'scripts/**', 'coverage/**'] },
	...tseslint.configs.recommended,
	{
		files: ['**/*.ts'],
		rules: {
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/consistent-type-imports': 'off',
		},
	},
	{
		// n8n rules for node definitions
		files: ['nodes/**/*.ts'],
		plugins: { 'n8n-nodes-base': n8nNodesBase },
		rules: {
			...n8nNodesBase.configs.nodes.rules,
			// Descriptions deliberately quote the Selenium/Python API (e.g. "browser.get(url)").
			'n8n-nodes-base/node-param-description-lowercase-first-char': 'off',
			'n8n-nodes-base/node-param-description-miscased-url': 'off',
			// Option order is deliberate (workflow order, most used first), not alphabetical.
			'n8n-nodes-base/node-param-options-type-unsorted-items': 'off',
			'n8n-nodes-base/node-param-fixed-collection-type-unsorted-items': 'off',
			// "Get All" (cookies) returns a single item holding all cookies, not a paginated "Get Many".
			'n8n-nodes-base/node-param-option-name-wrong-for-get-many': 'off',
			// Descriptions end with or without a period depending on whether they are a sentence or a hint.
			'n8n-nodes-base/node-param-description-missing-final-period': 'off',
			'n8n-nodes-base/node-param-description-excess-final-period': 'off',
			// The typed `NodeConnectionTypes.Main` enum is the current way to declare connections.
			'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
		},
	},
	{
		// n8n rules for credential definitions
		files: ['credentials/**/*.ts'],
		plugins: { 'n8n-nodes-base': n8nNodesBase },
		rules: {
			...n8nNodesBase.configs.credentials.rules,
			// The credential keeps the name `seleniumGrid` so saved credentials keep working;
			// the official "...Api" naming only applies to API-key style credentials.
			'n8n-nodes-base/cred-class-name-unsuffixed': 'off',
			'n8n-nodes-base/cred-class-field-name-unsuffixed': 'off',
			'n8n-nodes-base/cred-class-field-display-name-missing-api': 'off',
			'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
		},
	},
	{
		files: ['test/**/*.ts'],
		rules: { '@typescript-eslint/no-explicit-any': 'off' },
	},
);
