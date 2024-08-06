import core from '@actions/core';

import type { Config } from './get-config.js';
import type { Issue } from './get-stale-issues.js';

export async function closeIssue({ dryRun, octokit, ownerRepo, closeMessage }: Config, { number, url, staleSince }: Issue) {
	if (dryRun) {
		core.info(`Issue #${number} (${url}) is stale since ${staleSince} and would have been closed (dry-run)`);
		return;
	}

	await octokit.rest.issues.createComment({
		...ownerRepo,
		issue_number: number,
		body: closeMessage,
	});

	await octokit.rest.issues.update({
		...ownerRepo,
		issue_number: number,
		state: 'closed',
		state_reason: 'not_planned',
	});

	core.info(`Issue #${number} (${url}) is stale since ${staleSince} and has been closed`);
}
