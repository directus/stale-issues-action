import github from '@actions/github';
import type { GitHub } from '@actions/github/lib/utils.js';
import core from '@actions/core';

export interface Config {
	octokit: InstanceType<typeof GitHub>;
	ownerRepo: { owner: string; repo: string };
	staleLabel: string;
	daysBeforeClose: number;
	closeMessage: string;
	dryRun: boolean;
}

export async function getConfig(): Promise<Config> {
	const octokit = github.getOctokit(core.getInput('github-token'));

	const [owner, repo] = core.getInput('github-repo').split('/');

	if (!owner || !repo) {
		throw new Error('"github-repo" must be provided in form of "<owner>/<repo>"');
	}

	const ownerRepo = { owner, repo };

	const dryRun = core.getBooleanInput('dry-run');

	const staleLabel = core.getInput('stale-label');

	try {
		await octokit.request('GET /repos/{owner}/{repo}/labels/{name}', {
			...ownerRepo,
			name: staleLabel,
			headers: {
				'X-GitHub-Api-Version': '2022-11-28',
			},
		});
	}
	catch {
		const message = `"stale-label" doesn't refer to an existing label or repository cannot be accessed`;

		if (dryRun) {
			core.warning(message);
		}
		else {
			throw new Error(message);
		}
	}

	const daysBeforeClose = Number.parseInt(core.getInput('days-before-close'));

	if ((Number.isNaN(daysBeforeClose))) {
		throw new TypeError('"days-before-close" must be a number');
	}

	const closeMessage = core.getInput('close-message');

	return {
		octokit,
		ownerRepo,
		staleLabel,
		daysBeforeClose,
		closeMessage,
		dryRun,
	};
}
