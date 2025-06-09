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
- A brief summary of what changed
- The impact/purpose of the changes
- Notable technical details
- Commit information (hash, author, date, message)
- File change statistics

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
📊 Found changes in 3 files
🤖 Generating summary with OpenAI...

============================================================
📝 CHANGE SUMMARY
============================================================
**Summary**: Added user authentication middleware and updated API endpoints

**Impact**: Enhanced security by implementing JWT-based authentication across all API routes. This change ensures that only authenticated users can access protected resources.

**Technical Details**:
- Added JWT middleware in `auth/middleware.py`
- Updated 5 API endpoints to require authentication
- Modified user model to include token expiration
- Added error handling for invalid tokens

**Files Changed**: 3 files, +127 lines, -23 lines
============================================================