#!/usr/bin/env python3
"""
Git Changes Summarizer

This script uses OpenAI to summarize git changes for posting to Slack.
By default, it analyzes the last commit. You can also specify source and destination commits.

Usage:
    python summarize_changes.py                    # Summarize last commit
    python summarize_changes.py <source> <dest>   # Summarize changes between commits
    python summarize_changes.py --help            # Show help

Requirements:
    - openai library
    - git repository
    - OPENAI_API_KEY environment variable
"""

import argparse
import subprocess
import sys
import os
from typing import Optional, Tuple
import openai
from openai import OpenAI


def run_git_command(command: list) -> str:
    """Run a git command and return the output."""
    try:
        result = subprocess.run(
            command, 
            capture_output=True, 
            text=True, 
            check=True,
            cwd=os.getcwd()
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Git command failed: {' '.join(command)}")
        print(f"Error: {e.stderr}")
        sys.exit(1)


def get_last_commit_hash() -> str:
    """Get the hash of the last commit."""
    return run_git_command(['git', 'rev-parse', 'HEAD'])


def get_commit_info(commit_hash: str) -> dict:
    """Get commit information."""
    # Get commit message
    message = run_git_command(['git', 'log', '-1', '--pretty=format:%s', commit_hash])
    
    # Get date
    date = run_git_command(['git', 'log', '-1', '--pretty=format:%ad', '--date=short', commit_hash])
    
    return {
        'hash': commit_hash[:8],  # Short hash
        'message': message,
        'date': date
    }


def get_git_diff(source: Optional[str] = None, dest: Optional[str] = None) -> str:
    """Get git diff between commits."""
    if source and dest:
        # Diff between two specific commits
        command = ['git', 'diff', source, dest]
    elif source:
        # Diff from source to HEAD
        command = ['git', 'diff', source, 'HEAD']
    else:
        # Diff of last commit
        command = ['git', 'show', '--format=', 'HEAD']
    
    return run_git_command(command)


def get_changed_files(source: Optional[str] = None, dest: Optional[str] = None) -> list:
    """Get list of changed files."""
    if source and dest:
        command = ['git', 'diff', '--name-only', source, dest]
    elif source:
        command = ['git', 'diff', '--name-only', source, 'HEAD']
    else:
        command = ['git', 'show', '--name-only', '--format=', 'HEAD']
    
    files = run_git_command(command)
    return [f for f in files.split('\n') if f.strip()]


def categorize_files_by_repo(changed_files: list) -> dict:
    """Categorize changed files by logical LiveKit component structure."""
    categories = {
        'Server/Core': [],
        'Client': [],
        'SDK': [],
        'Agents': [],
        'Embedded': [],
        'Examples': [],
        'Other': []
    }
    
    for file in changed_files:
        # Skip root directory files (tool files)
        if '/' not in file:
            continue
            
        # Server or Core
        if (file.startswith('livekit/livekit/') or 
            file.startswith('livekit/sip/')):
            categories['Server/Core'].append(file)
        
        # Client
        elif (file.startswith('livekit/client') or 
              file.startswith('livekit/component')):
            categories['Client'].append(file)
        
        # SDK
        elif 'livekit/' in file and '-sdk-' in file:
            categories['SDK'].append(file)
        
        # Agents
        elif file.startswith('livekit/agents'):
            categories['Agents'].append(file)
        
        # Embedded
        elif file.startswith('livekit-examples/esp'):
            categories['Embedded'].append(file)
        
        # Examples (catch-all for examples)
        elif (file.startswith('livekit-examples/') or 
              '/examples/' in file):
            categories['Examples'].append(file)
        
        # Other
        else:
            categories['Other'].append(file)
    
    return categories


def get_diff_stats(source: Optional[str] = None, dest: Optional[str] = None) -> str:
    """Get diff statistics."""
    if source and dest:
        command = ['git', 'diff', '--stat', source, dest]
    elif source:
        command = ['git', 'diff', '--stat', source, 'HEAD']
    else:
        command = ['git', 'show', '--stat', '--format=', 'HEAD']
    
    return run_git_command(command)


def summarize_with_openai(diff_content: str, commit_info: dict, changed_files: list, stats: str) -> str:
    """Use OpenAI to summarize the changes."""
    
    # Check for API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable is required")
        sys.exit(1)
    
    client = OpenAI(api_key=api_key)
    
    # Categorize files by repository
    file_categories = categorize_files_by_repo(changed_files)
    
    # Build categorized file list
    categorized_files = []
    for category, files in file_categories.items():
        if files:
            categorized_files.append(f"\n**{category}:**")
            categorized_files.extend([f"- {file}" for file in files])
    
    files_list = '\n'.join(categorized_files) if categorized_files else '\n'.join([f"- {file}" for file in changed_files])
    
    # Count changes per category
    category_counts = {category: len(files) for category, files in file_categories.items() if files}
    category_summary = ', '.join([f"{count} in {category}" for category, count in category_counts.items()])
    
    prompt = f"""
Please provide a detailed technical summary of the following git changes suitable for a development team Slack channel.

This repository contains snapshots of multiple LiveKit repositories. The changes span: {category_summary}.

**Commit Information:**
- Hash: {commit_info['hash']}
- Date: {commit_info['date']}
- Message: {commit_info['message']}

**Changed Files by Component:**
{files_list}

**Statistics:**
{stats}

**Diff Content:**
```
{diff_content[:6000]}  # More content for detailed analysis
```

Please provide a comprehensive analysis including:

1. **Summary by Component**: Organize changes by the affected components (Server/Core, Client, SDK, etc.)

2. **Detailed Code Changes**: 
   - Specific functions, methods, or classes that were added/modified/removed
   - New or changed function signatures and parameters
   - Data structures, interfaces, or type definitions that changed
   - Algorithm or logic changes within existing functions
   - New imports, dependencies, or external library usage
   - Configuration file changes, environment variables, or constants
   - Database schema modifications, queries, or data model changes
   - UI components, styling, or frontend logic modifications
   - Error handling improvements or new exception types
   - Documentation or comment updates that indicate significant changes

Focus on describing the actual code modifications in detail, including line-level changes where relevant. Explain what the code was doing before vs. after the changes.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a senior software engineer who specializes in analyzing code changes for development teams. Provide detailed, technical analysis that helps team members understand what changed, why it matters, and what they need to know for testing, deployment, and integration. Focus on actionable insights and technical specifics."
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.2
        )
        
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        print(f"OpenAI API error: {e}")
        sys.exit(1)


def validate_commit_hash(commit_hash: str) -> bool:
    """Validate that a commit hash exists."""
    try:
        run_git_command(['git', 'rev-parse', '--verify', commit_hash])
        return True
    except:
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Summarize git changes using OpenAI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python summarize_changes.py                    # Summarize last commit
  python summarize_changes.py abc123f def456g   # Summarize changes between commits
  python summarize_changes.py HEAD~3 HEAD       # Summarize last 3 commits
        """
    )
    
    parser.add_argument('source', nargs='?', help='Source commit hash (optional)')
    parser.add_argument('dest', nargs='?', help='Destination commit hash (optional)')
    parser.add_argument('--model', default='gpt-3.5-turbo', help='OpenAI model to use')
    
    args = parser.parse_args()
    
    # Validate we're in a git repository
    try:
        run_git_command(['git', 'rev-parse', '--git-dir'])
    except:
        print("Error: Not in a git repository")
        sys.exit(1)
    
    # Validate commit hashes if provided
    if args.source and not validate_commit_hash(args.source):
        print(f"Error: Invalid source commit hash: {args.source}")
        sys.exit(1)
    
    if args.dest and not validate_commit_hash(args.dest):
        print(f"Error: Invalid destination commit hash: {args.dest}")
        sys.exit(1)
    
    # Get commit information
    if args.dest:
        # If dest is provided, use it for commit info
        commit_info = get_commit_info(args.dest)
    elif args.source:
        # If only source provided, use HEAD
        commit_info = get_commit_info('HEAD')
    else:
        # Default: last commit
        commit_info = get_commit_info(get_last_commit_hash())
    
    print("🚀 Analyzing git changes...")
    
    # Get the changes
    diff_content = get_git_diff(args.source, args.dest)
    changed_files = get_changed_files(args.source, args.dest)
    diff_stats = get_diff_stats(args.source, args.dest)
    
    if not diff_content.strip():
        print("No changes found between the specified commits.")
        sys.exit(0)
    
    # Categorize and display file changes
    file_categories = categorize_files_by_repo(changed_files)
    total_files = len(changed_files)
    
    print(f"📊 Found changes in {total_files} files:")
    for category, files in file_categories.items():
        if files:
            print(f"   • {len(files)} in {category}")
    
    print("🤖 Generating summary with OpenAI...")
    
    # Generate summary
    summary = summarize_with_openai(diff_content, commit_info, changed_files, diff_stats)
    
    print("\n" + "-"*3)
    print("📝 CHANGE SUMMARY")
    print("-"*3)
    print(summary)
    print("-"*3)


if __name__ == '__main__':
    main()
