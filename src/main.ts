import core from '@actions/core';
import { closeIssue } from './lib/close-issue.js';
import { getConfig } from './lib/get-config.js';
import { getStaleIssues } from './lib/get-stale-issues.js';

export async function main() {
	try {
		const config = await getConfig();

		const issues = getStaleIssues(config);

		const closedIssues = [];

		for await (const issue of issues) {
			await closeIssue(config, issue);
			closedIssues.push(issue.number);
		}

		core.setOutput('closed-issues', closedIssues);
	}
	catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		core.setFailed(message);
	}
}
