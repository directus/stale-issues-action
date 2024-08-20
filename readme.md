# Stale Issues Action

GitHub Action to close issues certain days after a stale label has been added.

## Usage

<pre lang="yaml">
name: Close Stale Issues

on:
  schedule:
    - cron: '30 1 * * *'

permissions:
  issues: write

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: directus/stale-issues-action@v<!-- version:start -->0<!-- version:end -->
        with:
          stale-label: stale
          days-before-close: 7
          close-message: Closing this issue as it has become stale.
</pre>

A maximum of 50 issues with the stale label are processed per run in order not to exceed GitHub's rate limits. If more
stale issues are expected, it's recommended to schedule the action more frequently (but at no more than once an hour).

## Additional Resources

- [Directus Website](https://directus.io)
- [Directus GitHub Repository](https://github.com/directus/directus)
