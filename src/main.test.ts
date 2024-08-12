import { expect, it, vi } from 'vitest';
import core from '@actions/core';

import { main } from './main.js';
import { type Config, getConfig } from './lib/get-config.js';
import { type Issue, getStaleIssues } from './lib/get-stale-issues.js';
import { closeIssue } from './lib/close-issue.js';

vi.mock('./lib/get-config.js');
vi.mock('./lib/get-stale-issues.js');
vi.mock('./lib/close-issue.js');

it('retrieves, closes and outputs stale issues', async () => {
	const mockConfig = {} as Config;
	const getConfigSpy = vi.mocked(getConfig).mockResolvedValue(mockConfig);

	const mockIssue = { number: 1 } as Issue;

	async function* mockGetStaleIssues() {
		yield mockIssue;
	}

	const getStaleIssuesSpy = vi.mocked(getStaleIssues).mockImplementation(mockGetStaleIssues);

	const closeIssueSpy = vi.mocked(closeIssue);

	const setOutputSpy = vi.spyOn(core, 'setOutput').mockImplementation(() => {});

	await main();

	expect(getConfigSpy).toHaveBeenCalled();
	expect(getStaleIssuesSpy).toHaveBeenCalledWith(mockConfig);
	expect(closeIssueSpy).toHaveBeenCalledWith(mockConfig, mockIssue);
	expect(setOutputSpy).toBeCalledWith('closed-issues', [mockIssue.number]);
});

it('fails the action on error', async () => {
	const errorMessage = 'Failed to get config';

	vi.mocked(getConfig).mockRejectedValue(errorMessage);

	const setOutputSpy = vi.spyOn(core, 'setFailed').mockImplementation(() => {});

	await main();

	expect(setOutputSpy).toHaveBeenCalledWith(errorMessage);
});
