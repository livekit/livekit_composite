# LiveKit Data Update Scripts

[LiveKit Docs](https://docs.livekit.io/)
[![Ask DeepWiki for understanding the codebase](https://deepwiki.com/badge.svg)](https://deepwiki.com/livekit/livekit_composite)
[![Slack community](https://img.shields.io/endpoint?url=https%3A%2F%2Flivekit.io%2Fbadges%2Fslack)](https://livekit.io/join-slack)
[![Twitter Follow](https://img.shields.io/twitter/follow/livekit)](https://twitter.com/livekit)

## Overview

This document describes how to use the update scripts to maintain the LiveKit knowledge base data in this project. There are two main scripts that work together to provide comprehensive, up-to-date LiveKit information:

1. **`pull_kb.py`** - Downloads and formats LiveKit Knowledge Base articles
2. **`sync_livekit_repos.py`** - Clones LiveKit repositories and downloads documentation

## Quick Start

### Update Everything
```bash
# Update all data sources
python sync_livekit_repos.py && python pull_kb.py
```

### Update Individual Components
```bash
# Update repositories and documentation only
python sync_livekit_repos.py

# Update knowledge base articles only  
python pull_kb.py
```

## Script 1: Repository & Documentation Sync (`sync_livekit_repos.py`)

### What It Does

1. **🗑️ Cleans existing repositories**: Removes `livekit/` and `livekit-examples/` directories
2. **📥 Downloads LLM documentation**: Fetches latest docs from `https://docs.livekit.io/llms-full.txt`
3. **🔍 Discovers active repositories**: Finds all public repos from `livekit` and `livekit-examples` orgs
4. **⏰ Filters by activity**: Only includes repos updated within the past 365 days
5. **🚫 Excludes archived repos**: Skips repositories marked as archived
6. **📁 Clones without history**: Downloads clean snapshots without git history
7. **⚙️ Supports custom branches**: Uses `repo.conf` for branch overrides

### Usage

```bash
python sync_livekit_repos.py
```

### Configuration

Create a `repo.conf` file to specify custom branches:

```bash
# Repository branch overrides
# Format: org/repo-name=branch-name
livekit-examples/esp-webrtc-solution=livekit-demo
```

### Prerequisites

- Python 3.7+
- Git installed and accessible in PATH
- Internet connection
- Optional: `GITHUB_TOKEN` environment variable for higher rate limits

### Example Output

```bash
$ python sync_livekit_repos.py
Downloading LiveKit LLM documentation...
Successfully downloaded LLM documentation to doc/full-llm.txt
Cloning 45 repos for livekit...
100%|████████████████████| 45/45 [02:15<00:00,  3.01it/s]
Using custom branch 'livekit-demo' for livekit-examples/esp-webrtc-solution
Cloning 23 repos for livekit-examples...
100%|████████████████████| 23/23 [01:30<00:00,  2.55it/s]
```

### Generated Structure

```
├── livekit/
│   ├── livekit/           # Core LiveKit server
│   ├── agents/            # Python agents SDK
│   ├── client-sdk-js/     # JavaScript client SDK
│   ├── ingress/           # Media ingress service
│   ├── egress/            # Media egress service
│   └── ...
├── livekit-examples/
│   ├── voice-agent/       # Voice agent examples
│   ├── livestream/        # Livestreaming examples
│   ├── meet/              # Video conferencing example
│   └── ...
└── doc/
    └── full-llm.txt       # Complete LLM documentation
```

## Script 2: Knowledge Base Sync (`pull_kb.py`)

### What It Does

1. **🗑️ Cleans existing data**: Removes the `knowledge_base/` directory if it exists
2. **📁 Creates fresh directory**: Sets up a clean `knowledge_base/` directory  
3. **🔍 Discovers articles**: Fetches the sitemap from https://kb.livekit.io/sitemap.xml
4. **📥 Downloads content**: Retrieves each article from the LiveKit knowledge base
5. **✨ Formats content**: Converts HTML to well-structured Markdown with proper:
   - Headings (`#`, `##`, `###`)
   - Lists (bulleted and numbered)
   - Links (`[text](url)`)
   - Callout boxes (`> **Note:**`)
   - Code formatting
6. **💾 Saves files**: Creates individual `.md` files for each article

### Usage

```bash
python pull_kb.py
```

### Prerequisites

- Python 3.7+
- Internet connection to access kb.livekit.io
- Required packages: `requests`, `beautifulsoup4`, `lxml`

### Example Output

```bash
$ python pull_kb.py
Removing existing knowledge_base directory...
Created fresh knowledge_base directory
Found sitemap at: https://kb.livekit.io/sitemap.xml
Found 17 article URLs
[+] Saved knowledge_base/understanding_livekit_cloud_pricing.md
[+] Saved knowledge_base/how_do_i_configure_barvisualizer_in_react_.md
[+] Saved knowledge_base/creating_sip_inbound_trunks_and_dispatch_rules_with_python_s.md
[+] Saved knowledge_base/how_to_detect_and_handle_silence_during_calls.md
[+] Saved knowledge_base/how_can_i_reduce_latency_in_voice_agents_using_stt__tts_and_.md
[+] Saved knowledge_base/how_to_set_a_fixed_participant_for_agent_audio_processing.md
[+] Saved knowledge_base/how_to_get_help_from_livekit_with_agents.md
[+] Saved knowledge_base/slack_etiquette.md
[+] Saved knowledge_base/still_have_questions.md
[+] Saved knowledge_base/understanding__silence_detected_on_local_audio_track__warnin.md
[+] Saved knowledge_base/resolving__invalidstate_-_failed_to_capture_frame__errors_in.md
[+] Saved knowledge_base/using_mcp_with_livekit_agents.md
[+] Saved knowledge_base/managing_video_quality_during_network_congestion.md
[+] Saved knowledge_base/how_to_send_logs_from_the_javascript_sdk_to_providers_like_d.md
[+] Saved knowledge_base/how_does_end-of-utterance_detection_work_in_conversations_.md
[+] Saved knowledge_base/how_to_enable_auto-egress_with_sip.md
[+] Saved knowledge_base/how_to_test_your_agent_using_another_agent.md

✅ Successfully downloaded 17 articles to knowledge_base/
```

## Prerequisites

### Python Dependencies

Install the required packages:

```bash
pip install -r requirements.txt
```

Required packages:
- `requests` - For HTTP requests
- `beautifulsoup4` - For HTML parsing  
- `lxml` - For XML sitemap parsing
- `tqdm` - For progress bars (repo sync)

### System Requirements

- Python 3.7+
- Git (for repository cloning)
- Internet connection
- Write permissions in the current directory

### Optional: GitHub Token

Set a GitHub token for higher API rate limits:

```bash
export GITHUB_TOKEN="your-github-token-here"
```

This is especially useful when syncing many repositories.

## When to Run the Scripts

### Recommended Schedule

- **Weekly**: For general maintenance and to catch new content
- **Before important projects**: To ensure you have the latest information
- **When troubleshooting**: To get the most current solutions
- **When LiveKit releases updates**: New features often come with new documentation

### Script-Specific Timing

**`sync_livekit_repos.py`**:
- **Monthly**: Repository structure changes slowly
- **After major LiveKit releases**: New repos or significant updates
- **When working on specific features**: To get latest implementation examples

**`pull_kb.py`**:
- **Weekly**: Knowledge base articles are updated frequently
- **When troubleshooting**: Articles often contain the latest solutions
- **Before customer support**: Ensure you have current information

## Automation Options

### Cron Jobs (Unix/Linux/macOS)

**Weekly full update**:
```bash
# Run every Sunday at 2 AM
0 2 * * 0 cd /path/to/project && python sync_livekit_repos.py && python pull_kb.py
```

**Separate schedules**:
```bash
# Repos monthly (1st of month at 1 AM)
0 1 1 * * cd /path/to/project && python sync_livekit_repos.py

# KB weekly (Sunday at 2 AM)  
0 2 * * 0 cd /path/to/project && python pull_kb.py
```

### GitHub Actions

```yaml
name: Update LiveKit Data
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2 AM
  workflow_dispatch:      # Manual trigger
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - run: pip install -r requirements.txt
      - name: Update repositories and documentation
        run: python sync_livekit_repos.py
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Update knowledge base  
        run: python pull_kb.py
      - uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: 'Update LiveKit data sources'
```

## Troubleshooting

### Common Issues

**Repository sync fails**:
- Check internet connection
- Verify Git is installed and in PATH
- Set `GITHUB_TOKEN` if hitting rate limits
- Check if specific repositories are accessible

**Knowledge base sync fails**:
- Verify https://kb.livekit.io is accessible
- Check internet connection
- Ensure the sitemap.xml endpoint is working

**Permission errors**:
- Ensure write permissions in the current directory
- Run with appropriate user permissions
- Check if directories are locked by other processes

**Import errors**:
- Install missing dependencies: `pip install -r requirements.txt`
- Check Python version (3.7+ required)
- Verify virtual environment activation

**Malformed content**:
- Repository parsing issues may indicate site structure changes
- Knowledge base formatting issues may require script updates
- Open an issue if content consistently appears malformed

### Debug Mode

Add debug output by modifying the scripts:

**For repository sync**, add `print()` statements around git operations
**For knowledge base sync**, uncomment debug print statements in the parsing functions

## Data Usage

Once updated, the data sources provide:

### For LLM Assistants
- **Knowledge base**: Curated answers to common questions
- **Repository code**: Real implementation examples
- **Documentation**: Comprehensive API and concept explanations
- **Examples**: Working applications demonstrating best practices

### For Development
- **Code reference**: Current API implementations
- **Working examples**: Complete applications to learn from
- **Documentation**: Detailed guides and explanations
- **Troubleshooting**: Solutions to common problems

See `README.md` for detailed guidance on how LLM assistants should use this data.

## Contributing

### Improving the Scripts

1. Test your changes with both scripts
2. Verify all data sources are successfully updated
3. Ensure generated content is well-formatted
4. Submit improvements via pull request

### Adding New Data Sources

1. Identify the data source and format
2. Add appropriate update logic to existing scripts or create new script
3. Update this documentation
4. Test the complete update workflow

## Support

For issues with:
- **Scripts themselves**: Open an issue in this repository
- **LiveKit platform**: Use the official LiveKit support channels
- **Knowledge base content**: Contact LiveKit support directly
- **Repository access**: Check GitHub repository permissions 