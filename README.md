[![Ask DeepWiki for understanding the codebase](https://deepwiki.com/badge.svg)](https://deepwiki.com/yepher/livekit_composite)


This is all the LiveKit public repos to make it easier for AI tools to understand the full scope of the LiveKit echo system. Each directory represents a snapshot of the given LiveKit repository.

# Git Changes Summarizer

A Python script that uses OpenAI to summarize git changes for posting to Slack channels.

## Features

- **Default behavior**: Analyzes the last commit
- **Flexible analysis**: Can analyze changes between any two commits
- **OpenAI integration**: Uses GPT to generate human-readable summaries
- **Slack-ready**: Output formatted for team communication

## Setup

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up OpenAI API key**:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

3. **GitHub repository URL** (automatic):
   The script automatically detects your GitHub repository from the git remote origin.
   Supports both HTTPS and SSH remote URLs. You can override with:
   ```bash
   export GITHUB_REPO_URL="https://github.com/your-org/your-repo"
   ```

## Usage

### Basic Usage (Last Commit)
```bash
python summarize_changes.py
```

### Analyze Changes Between Two Commits
```bash
python summarize_changes.py <source_commit> <destination_commit>
```

### Examples
```bash
# Summarize the last commit
python summarize_changes.py

# Summarize changes between two specific commits
python summarize_changes.py abc123f def456g

# Summarize changes from 3 commits ago to now
python summarize_changes.py HEAD~3 HEAD

# Summarize changes from a specific commit to HEAD
python summarize_changes.py abc123f
```

## Command Line Options

- `source` (optional): Source commit hash
- `dest` (optional): Destination commit hash  
- `--model`: OpenAI model to use (default: gpt-3.5-turbo)
- `--help`: Show help message

## Output

The script provides:
- **GitHub link** at the top for easy access to view changes online
- Detailed summary of what changed organized by component
- Specific code modifications and technical details
- Commit information (hash, date, message)
- File change statistics organized by LiveKit component

## Requirements

- Python 3.7+
- Git repository
- OpenAI API key
- `openai` Python package

## Error Handling

The script includes robust error handling for:
- Invalid commit hashes
- Missing OpenAI API key
- Git command failures
- Non-git repositories

## Example Output

```
🚀 Analyzing git changes...
📊 Found changes in 8 files:
   • 3 in Server/Core
   • 2 in SDK
   • 3 in Examples
🤖 Generating summary with OpenAI...

---
📝 CHANGE SUMMARY
---
🔗 **GitHub Link**: https://github.com/livekit/livekit_composite/commit/abc123def456

**Summary by Component:**

**Server/Core:**
- Updated participant management and SIP gateway configuration

**SDK:**
- Enhanced JavaScript SDK with new room events
- Python SDK connection handling improvements

**Detailed Code Changes:**

**livekit/livekit/pkg/room/manager.go (lines 45-78):**
- **Before**: `func AddParticipant(p *Participant)` accepted unlimited participants
- **After**: `func AddParticipant(p *Participant, maxCount int)` now enforces limits
- **New validation logic**: Added participant count check with `ErrRoomFull` error
- **Struct modification**: Added `MaxParticipants int` field to `RoomConfig`

**livekit/node-sdk-js/src/room.ts (lines 120-145):**
- **New event**: Added `participantLimitReached` event emission
- **Modified method**: `connect()` now accepts optional `maxParticipants` parameter
- **Error handling**: Enhanced with specific error types for room capacity

---