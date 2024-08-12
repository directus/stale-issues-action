import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import core from '@actions/core';

import type { Config } from './get-config.js';

dayjs.extend(isSameOrBefore);
dayjs.extend(relativeTime);

export interface IssuesResponse {
	repository: {
		issues: {
			totalCount: number;
			nodes: {
				id: string;
				createdAt: string;
				number: number;
				url: string;
			}[];
		};
	};
}

export interface LabeledEventsResponse {
	node: {
		timelineItems: {
			nodes: {
				createdAt: string;
				label: {
					name: string;
				};
			}[];
			pageInfo: {
				hasPreviousPage: boolean;
				startCursor: string;
			};
		};
	};
}

export interface Issue {
	number: number;
	url: string;
	staleSince: string;
}

export async function* getStaleIssues({ octokit, ownerRepo, staleLabel, daysBeforeClose }: Config): AsyncGenerator<Issue> {
	const staleDate = dayjs().subtract(daysBeforeClose, 'days');

	const { repository: { issues } } = await octokit.graphql<IssuesResponse>(
		`
			query ($owner: String!, $repo: String!, $staleLabel: String!) {
				repository(owner: $owner, name: $repo) {
					issues(first: 50, states: OPEN, labels: [$staleLabel]) {
						totalCount
						nodes {
							id
							createdAt
							number
							url
						}
					}
				}
			}
		`,
		{
			...ownerRepo,
			staleLabel,
		},
	);

	core.info(`Found ${issues.totalCount} ${issues.totalCount === 1 ? 'issue' : 'issues'} with stale label`);

	for (const { id, createdAt, number, url } of issues.nodes) {
		if (dayjs(createdAt).isAfter(staleDate)) {
			const difference = dayjs(staleDate).to(createdAt, true);
			core.info(`Stopping at issue #${number} (${url}) because it's ${difference} younger than the configured stale date`);
			break;
		}

		let cursor: LabeledEventsResponse['node']['timelineItems']['pageInfo']['startCursor'] | undefined;
		let labeledEvent: LabeledEventsResponse['node']['timelineItems']['nodes'][number] | undefined;

		do {
			const { node: { timelineItems } } = await octokit.graphql<LabeledEventsResponse>(
				`
					query ($issue: ID!, $cursor: String) {
						node(id: $issue) {
							... on Issue {
								timelineItems(last: 10, before: $cursor, itemTypes: [LABELED_EVENT]) {
									nodes {
										... on LabeledEvent {
											createdAt
											label {
												name
											}
										}
									}
									pageInfo {
										hasPreviousPage
										startCursor
									}
								}
							}
						}
					}
				`,
				{
					issue: id,
					cursor,
				},
			);

			labeledEvent = timelineItems.nodes.find(({ label: { name } }) => name === staleLabel);

			if (!timelineItems.pageInfo.hasPreviousPage)
				break;

			cursor = timelineItems.pageInfo.startCursor;
		} while (!labeledEvent);

		if (!labeledEvent) {
			core.warning(`Couldn't get labeling date for issue #${number} (${url})`);
			continue;
		}

		const labeledAt = dayjs(labeledEvent.createdAt);

		if (labeledAt.isSameOrBefore(staleDate)) {
			const staleSince = labeledAt.from(staleDate, true);
			yield { number, url, staleSince };
		}
		else {
			const staleIn = labeledAt.to(staleDate, true);
			core.info(`Issue #${number} (${url}) is not yet stale, will become stale in ${staleIn}`);
		}
	}
}
