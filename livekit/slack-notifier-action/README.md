# Slack notifier GitHub Action

## Usage

To use, add the following to a Github Actions workflow:

```yaml
name: PR Slack Notifier

on:
   pull_request:
      types: [review_requested, reopened, closed, synchronize]
   pull_request_review:
      types: [submitted]

permissions:
   contents: read
   pull-requests: write
   issues: write

concurrency:
   group: pr-slack-${{ github.event.pull_request.number }}-${{ github.workflow }}
   cancel-in-progress: false

jobs:
   notify-devs:
      runs-on: ubuntu-latest
      steps:
         - uses: livekit/slack-notifier-action@main
           with:
              config_json: ${{ secrets.SLACK_NOTIFY_CONFIG_JSON }}
              slack_token: ${{ secrets.SLACK_PR_NOTIFIER_TOKEN }}
```

## Adding teams and team members:

1. Get slack-notify-config.json from 1password

2. Add `{github_team_slug}: {slack_channel_id}` to `channels` in slack-notify-config.json
   - In Slack, go to the channel, click on the channel name at the top, and select "Open channel details"
   - Copy the channel ID at the bottom

3. Add `{github_team_slug}: {slack_usergroup_id}` to `usergroups` in slack-notify-config.json
    - Get token from Slack PR Notifier App
    - `curl -s -H "Authorization: Bearer {xoxb-token}" https://slack.com/api/usergroups.list | jq`
    - Find the usergroup ID for your team (e.g. `S01234567`)

4. Add `{github_username}: {slack_user_id}` to `users` in slack-notify-config.json
   - Get token from Slack PR Notifier App
   - `curl -s -H "Authorization: Bearer {xoxb-token}" https://slack.com/api/users.list | jq`
   - Find the user ID for each username (e.g. `U01234567`)

5. Update the secret `SLACK_NOTIFY_CONFIG_JSON` in our org settings with the updated JSON file, and update in 1password
