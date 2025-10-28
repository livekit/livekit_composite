# LiveKit Cloud Agents GitHub Plugin

A GitHub Action for creating, deploying, and getting the status of LiveKit Cloud Agents.

## Usage

### Manually Create a New Agent or Deploy a new version

The create or deploy operations in this workflow are triggered manually and requires a working directory input.
**Automatic Deployment**: When creating a new agent, a deployment happens automatically. You do **not** need to manually call the deploy operation after creation.

```yaml
name: Create or Deploy LiveKit Cloud Agent Manually
on:
  workflow_dispatch:
    inputs:
      working_directory:
        description: 'Working directory for the agent'
        required: true
        type: string
        default: '.'
      operation:
        description: 'Which operation to run'
        required: true
        type: choice
        options:
          - create
          - deploy
        default: 'create'

jobs:
  create-agent:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.working_directory }}
    if: github.event.inputs.operation == 'create'
    concurrency:
      group: ${{ github.workflow }}-${{ github.ref }}
      cancel-in-progress: true
    permissions:
      contents: write
      pull-requests: write
      actions: read
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Create LiveKit Cloud Agent
        id: livekit
        uses: livekit/deploy-action@v2.12.1
        env:
          LIVEKIT_URL: ${{ secrets.LIVEKIT_URL }}
          LIVEKIT_API_KEY: ${{ secrets.LIVEKIT_API_KEY }}
          LIVEKIT_API_SECRET: ${{ secrets.LIVEKIT_API_SECRET }}
          SECRET_LIST: ${{ secrets.SECRET_LIST }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          OPERATION: create
          WORKING_DIRECTORY: ${{ github.event.inputs.working_directory }}
      - name: Create Pull Request # create a pull request to add the newly created livekit.toml
        uses: peter-evans/create-pull-request@v7
        with:
          add-paths: |
            ${{ github.event.inputs.working_directory }}/livekit.toml
          token: ${{ secrets.GITHUB_TOKEN }}
          branch: cloud-agent-${{ github.run_id }}
          title: "Add LiveKit agent config"
          commit-message: "Add LiveKit agent config"
          body: |
            This PR adds the LiveKit agent configuration

          base: main
          delete-branch: true
      - name: Checkout PR branch
        uses: actions/checkout@v4
        with:
          ref: cloud-agent-${{ github.run_id }}
      - name: Status Check # block until the agent is in the 'Running' state
        uses: livekit/deploy-action@v2.12.1
        env:
          LIVEKIT_URL: ${{ secrets.LIVEKIT_URL }}
          LIVEKIT_API_KEY: ${{ secrets.LIVEKIT_API_KEY }}
          LIVEKIT_API_SECRET: ${{ secrets.LIVEKIT_API_SECRET }}
        with:
          OPERATION: status-retry
          WORKING_DIRECTORY: ${{ github.event.inputs.working_directory }}
          TIMEOUT: 5m
  deploy-agent:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.working_directory }}
    if: github.event.inputs.operation == 'deploy'
    concurrency:
      group: ${{ github.workflow }}-${{ github.ref }}
      cancel-in-progress: true

    steps:
      - uses: actions/checkout@v4

      - name: Deploy LiveKit Cloud Agent
        uses: livekit/deploy-action@v2.12.1
        env:
          LIVEKIT_URL: ${{ secrets.LIVEKIT_URL }}
          LIVEKIT_API_KEY: ${{ secrets.LIVEKIT_API_KEY }}
          LIVEKIT_API_SECRET: ${{ secrets.LIVEKIT_API_SECRET }}
          SECRET_LIST: ${{ secrets.SECRET_LIST }}
        with:
          OPERATION: deploy
          WORKING_DIRECTORY: ${{ github.event.inputs.working_directory }}
```

### Deploy an Existing Agent on a file change

```yaml
name: Deploy test-agent on changes
on:
  push:
    branches:
      - main
    paths:
      - 'test-agent/**'
      - '!test-agent/livekit.toml'
      - '!test-agent/README.md'
      - '!test-agent/**/*.md'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: test-agent
    concurrency:
      group: ${{ github.workflow }}-test-agent
      cancel-in-progress: true

    steps:
      - uses: actions/checkout@v4

      - name: Deploy LiveKit Cloud Agent
        uses: livekit/deploy-action@v2.12.1
        env:
          LIVEKIT_URL: ${{ secrets.LIVEKIT_URL }}
          LIVEKIT_API_KEY: ${{ secrets.LIVEKIT_API_KEY }}
          LIVEKIT_API_SECRET: ${{ secrets.LIVEKIT_API_SECRET }}
          SECRET_LIST: ${{ secrets.SECRET_LIST }}
        with:
          OPERATION: deploy
          WORKING_DIRECTORY: test-agent
```

### Check Agent Status

```yaml
name: Monitor Agent Status
on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes

jobs:
  check-status:
    runs-on: ubuntu-latest
    concurrency:
      group: ${{ github.workflow }}-${{ github.ref }}
      cancel-in-progress: true
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Check Agent Status
        uses: livekit/deploy-action@v2.12.1
        env:
          LIVEKIT_URL: ${{ secrets.LIVEKIT_URL }}
          LIVEKIT_API_KEY: ${{ secrets.LIVEKIT_API_KEY }}
          LIVEKIT_API_SECRET: ${{ secrets.LIVEKIT_API_SECRET }}
        with:
          OPERATION: status
          SLACK_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_CHANNEL: "#monitoring"
```

### Check Agent Status with Retry until timeout or status == Running
```yaml
      - name: Status Check
        uses: livekit/deploy-action@v2.12.1
        env:
          LIVEKIT_URL: ${{ secrets.LIVEKIT_URL }}
          LIVEKIT_API_KEY: ${{ secrets.LIVEKIT_API_KEY }}
          LIVEKIT_API_SECRET: ${{ secrets.LIVEKIT_API_SECRET }}
        with:
          OPERATION: status-retry
          WORKING_DIRECTORY: ${{ github.event.inputs.working_directory }}
          TIMEOUT: 5m
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `OPERATION` | Operation to perform (`create`, `deploy`, `status`, `status-retry`) | Yes | `status` |
| `REGION` | Region to deploy the agent to. If empty defaults to the nearest LiveKit Cloud region. | No | `""` |
| `WORKING_DIRECTORY` | Directory containing the agent configuration | No | `.` |
| `SLACK_TOKEN` | Slack Bot Token for sending notifications | No | - |
| `SLACK_CHANNEL` | Slack channel to send notifications to (e.g., `#general`) | No | - |
| `TIMEOUT` | Timeout for the status-retry check | No | 5m |

## Environment Variables

### Required LiveKit Configuration

These can be set either as direct environment variables or as secrets with `SECRET_` prefix:

- `LIVEKIT_URL` - Your LiveKit Cloud URL
- `LIVEKIT_API_KEY` - Your LiveKit Cloud API Key  
- `LIVEKIT_API_SECRET` - Your LiveKit Cloud API Secret

### Agent Secrets

Pass any number of secrets to your agent by setting the `SECRET_LIST` var with a comma separated list in your workflow:

```yaml
  OPENAI_API_KEY=${{key}},AUTH_TOKEN=${{token}}
  # Add as many secrets as needed...
```


## Concurrency Control

All workflows should use concurrency control to prevent multiple operations on the same agent:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Permissions

The create operation performs git commits and pushes, so workflows need proper permissions:

```yaml
permissions:
  contents: write
  pull-requests: write
  actions: read
```

And the checkout action should include the token:

```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Release

This project shares the same **major** and **minor** version as server-sdk-go for compatibility. The deploy-action must always import server-sdk-go with matching major and minor versions.

| valid | deploy-action | server-sdk-go | server constraint | explanation
✅	| 2.12.2 | 2.12.2 | >= 2.12.0 | minor/major version match
✅	| 2.12.5 | 2.12.2 | >= 2.12.0 | patch version ahead
❌	| 2.13.2 | 2.12.2 | >= 2.12.0 | minor version ahead
❌	| 3.12.2 | 2.12.2 | >= 2.12.0 | major version ahead
