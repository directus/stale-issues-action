import core from '@actions/core';
import github from '@actions/github';
import { beforeEach, expect, it, vi } from 'vitest';

import { type Config, getConfig } from './get-config.js';

vi.mock('@actions/github');

let actionInputs: Record<string, string> = {};

function getInput(name: string) {
	return actionInputs[name] || '';
}

vi.spyOn(core, 'getInput').mockImplementation(getInput);
vi.spyOn(core, 'getBooleanInput').mockImplementation((name) => Boolean(getInput(name)));

const mockOctokit = { request: vi.fn() };

vi.spyOn(github, 'getOctokit').mockReturnValue(mockOctokit as unknown as Config['octokit']);

beforeEach(() => {
	actionInputs = {
		'github-token': 'token',
		'github-repo': 'directus/stale-issues-action',
		'stale-label': 'stale',
		'days-before-close': '7',
		'close-message': 'Closing this issue as it has become stale.',
	};
});

it('returns the config if all inputs are valid', async () => {
	await expect(getConfig()).resolves.toStrictEqual({
		closeMessage: 'Closing this issue as it has become stale.',
		daysBeforeClose: 7,
		dryRun: false,
		octokit: mockOctokit,
		ownerRepo: {
			owner: 'directus',
			repo: 'stale-issues-action',
		},
		staleLabel: 'stale',

	});
});

it('throws if the format of "github-repo" is invalid', async () => {
	actionInputs['github-repo'] = 'invalid';

	await expect(getConfig()).rejects.toThrow('"github-repo" must be provided in form of "<owner>/<repo>"');
});

it('throws if the given "stale-label" could not be found', async () => {
	mockOctokit.request.mockRejectedValueOnce(new Error('label not found'));

	await expect(getConfig()).rejects.toThrow(`"stale-label" doesn't refer to an existing label or repository cannot be accessed`);
});

it('warns if the given "stale-label" could not be found in dry-run mode', async () => {
	actionInputs['dry-run'] = 'true';

	const warnSpy = vi.spyOn(core, 'warning').mockImplementation(() => {});
	mockOctokit.request.mockRejectedValueOnce(new Error('label not found'));

	await expect(getConfig()).resolves.toBeDefined();
	expect(warnSpy).toBeCalledWith(`"stale-label" doesn't refer to an existing label or repository cannot be accessed`);
});

it('throws if "days-before-close" is not a number', async () => {
	actionInputs['days-before-close'] = 'invalid';

	await expect(getConfig()).rejects.toThrow('"days-before-close" must be a number');
});
