import { afterEach, expect, it, vi } from 'vitest';
import core from '@actions/core';

import type { Config } from './get-config.js';
import type { Issue } from './get-stale-issues.js';
import { closeIssue } from './close-issue.js';

const mockOctokit = {
	rest: {
		issues: {
			createComment: vi.fn(),
			update: vi.fn(),
		},
	},
} as unknown as Config['octokit'];

const mockConfig = {
	octokit: mockOctokit,
	ownerRepo: { owner: 'directus', repo: 'stale-issues-action' },
	closeMessage: 'Closing this issue as it has become stale.',
} as Config;

const mockIssue = {
	number: 1,
	url: 'https://github.com/directus/stale-issues-action/issues/1',
	staleSince: '1 day',
} as Issue;

const infoSpy = vi.spyOn(core, 'info').mockImplementation(() => {});

afterEach(() => {
	vi.clearAllMocks();
});

it('creates a comment and closes the issue', async () => {
	await closeIssue(mockConfig, mockIssue);

	expect(mockOctokit.rest.issues.createComment).toBeCalledWith({
		...mockConfig.ownerRepo,
		issue_number: mockIssue.number,
		body: mockConfig.closeMessage,
	});

	expect(mockOctokit.rest.issues.update).toBeCalledWith({
		...mockConfig.ownerRepo,
		issue_number: mockIssue.number,
		state: 'closed',
		state_reason: 'not_planned',
	});

	expect(infoSpy).toBeCalledWith(
		`Issue #${mockIssue.number} (${mockIssue.url}) is stale since ${mockIssue.staleSince} and has been closed`,
	);
});

it('prints info only in dry-run mode', async () => {
	await closeIssue({ ...mockConfig, dryRun: true }, mockIssue);

	expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
	expect(mockOctokit.rest.issues.update).not.toHaveBeenCalled();

	expect(infoSpy).toBeCalledWith(
		`Issue #${mockIssue.number} (${mockIssue.url}) is stale since ${mockIssue.staleSince} and would have been closed (dry-run)`,
	);
});
