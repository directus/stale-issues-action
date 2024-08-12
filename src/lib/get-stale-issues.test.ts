import core from '@actions/core';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';

import type { Config } from './get-config.js';
import { type IssuesResponse, type LabeledEventsResponse, getStaleIssues } from './get-stale-issues.js';

const mockOctokit = {
	graphql: vi.fn(),
};

const mockConfig = {
	octokit: mockOctokit as unknown as Config['octokit'],
	ownerRepo: { owner: 'directus', repo: 'stale-issues-action' },
	staleLabel: 'stale',
	daysBeforeClose: 7,
} as Config;

const infoSpy = vi.spyOn(core, 'info').mockImplementation(() => {});

beforeAll(() => {
	vi.setSystemTime('2024-08-12');
});

afterEach(() => {
	vi.clearAllMocks();
});

it('yields stale issues', async () => {
	const issuesResponse: IssuesResponse = { repository: {
		issues: {
			totalCount: 2,
			nodes: [
				{
					id: '123abc',
					createdAt: '2024-08-01',
					number: 1,
					url: 'https://github.com/directus/stale-issues-action/issues/1',
				},
				{
					id: '456def',
					createdAt: '2024-08-02',
					number: 2,
					url: 'https://github.com/directus/stale-issues-action/issues/2',
				},
			],
		},
	} };

	mockOctokit.graphql.mockResolvedValueOnce(issuesResponse);

	const labeledEventsResponse: LabeledEventsResponse = {
		node: {
			timelineItems: {
				nodes: [
					{ createdAt: '2024-08-02', label: { name: 'stale' } },
				],
				pageInfo: { hasPreviousPage: false, startCursor: '123abc' },
			},
		},
	};

	mockOctokit.graphql.mockResolvedValue(labeledEventsResponse);

	const issues = getStaleIssues(mockConfig);

	await expect(issues.next()).resolves.toMatchObject({
		value: {
			number: 1,
			staleSince: '3 days',
			url: 'https://github.com/directus/stale-issues-action/issues/1',
		},
	});

	await expect(issues.next()).resolves.toMatchObject({
		value: {
			number: 2,
			staleSince: '3 days',
			url: 'https://github.com/directus/stale-issues-action/issues/2',
		},
	});

	await expect(issues.next()).resolves.toMatchObject({ done: true });

	expect(infoSpy).toBeCalledWith('Found 2 issues with stale label');
});

it('paginates through labeling events until corresponding event is found', async () => {
	const issuesResponse: IssuesResponse = { repository: {
		issues: {
			totalCount: 1,
			nodes: [
				{
					id: '123abc',
					createdAt: '2024-08-01',
					number: 1,
					url: 'https://github.com/directus/stale-issues-action/issues/1',
				},
			],
		},
	} };

	mockOctokit.graphql.mockResolvedValueOnce(issuesResponse);

	const labeledEventsResponse1: LabeledEventsResponse = {
		node: {
			timelineItems: {
				nodes: [
					{ createdAt: '2024-08-02', label: { name: 'other label' } },
				],
				pageInfo: { hasPreviousPage: true, startCursor: '123abc' },
			},
		},
	};

	mockOctokit.graphql.mockResolvedValueOnce(labeledEventsResponse1);

	const labeledEventsResponse2: LabeledEventsResponse = {
		node: {
			timelineItems: {
				nodes: [
					{ createdAt: '2024-08-02', label: { name: 'stale' } },
				],
				pageInfo: { hasPreviousPage: false, startCursor: '456def' },
			},
		},
	};

	mockOctokit.graphql.mockResolvedValueOnce(labeledEventsResponse2);

	const issues = getStaleIssues(mockConfig);

	await expect(issues.next()).resolves.toMatchObject({
		value: {
			number: 1,
			staleSince: '3 days',
			url: 'https://github.com/directus/stale-issues-action/issues/1',
		},
	});

	expect(infoSpy).toBeCalledWith('Found 1 issue with stale label');
});

it('does not return labeled issues which are not yet stale', async () => {
	const issuesResponse: IssuesResponse = { repository: {
		issues: {
			totalCount: 1,
			nodes: [
				{
					id: '123abc',
					createdAt: '2024-08-01',
					number: 1,
					url: 'https://github.com/directus/stale-issues-action/issues/1',
				},
			],
		},
	} };

	mockOctokit.graphql.mockResolvedValueOnce(issuesResponse);

	const labeledEventsResponse: LabeledEventsResponse = {
		node: {
			timelineItems: {
				nodes: [
					{ createdAt: '2024-08-08', label: { name: 'stale' } },
				],
				pageInfo: { hasPreviousPage: false, startCursor: '123abc' },
			},
		},
	};

	mockOctokit.graphql.mockResolvedValueOnce(labeledEventsResponse);

	const issues = getStaleIssues(mockConfig);
	await issues.next();

	expect(infoSpy).toBeCalledWith('Found 1 issue with stale label');
	expect(infoSpy).toBeCalledWith(`Issue #1 (https://github.com/directus/stale-issues-action/issues/1) is not yet stale, will become stale in 3 days`);
});

it('aborts early if creation date of issues is younger than stale date', async () => {
	const issuesResponse: IssuesResponse = { repository: {
		issues: {
			totalCount: 1,
			nodes: [
				{
					id: '123abc',
					createdAt: '2024-08-08',
					number: 1,
					url: 'https://github.com/directus/stale-issues-action/issues/1',
				},
			],
		},
	} };

	mockOctokit.graphql.mockResolvedValueOnce(issuesResponse);

	const issues = getStaleIssues(mockConfig);
	await issues.next();

	expect(infoSpy).toBeCalledWith('Found 1 issue with stale label');
	expect(infoSpy).toBeCalledWith(`Stopping at issue #1 (https://github.com/directus/stale-issues-action/issues/1) because it's 3 days younger than the configured stale date`);
});
