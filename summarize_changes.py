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
import shutil
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


def get_category_diff(source: Optional[str], dest: Optional[str], files: list) -> str:
    """Get git diff for specific files."""
    if not files:
        return ""
    
    try:
        if source and dest:
            command = ['git', 'diff', source, dest, '--']
        elif source:
            command = ['git', 'diff', source, 'HEAD', '--']
        else:
            command = ['git', 'show', '--format=', 'HEAD', '--']
        
        # Add the files to the command
        command.extend(files)
        
        # Run git command
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True,
            cwd=os.getcwd()
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Warning: Could not get diff for files: {str(e)}")
        return ""


def summarize_with_openai(diff_content: str, commit_info: dict, changed_files: list, stats: str) -> Tuple[str, str]:
    """Use OpenAI to summarize the changes and return both brief and detailed summaries."""
    
    # Check for API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable is required")
        sys.exit(1)
    
    client = OpenAI(api_key=api_key)
    
    # Categorize files by repository
    file_categories = categorize_files_by_repo(changed_files)
    
    # Count changes per category
    category_counts = {category: len(files) for category, files in file_categories.items() if files}
    category_summary = ', '.join([f"{count} in {category}" for category, count in category_counts.items()])
    
    # Brief summary prompt - Markdown bullets
    brief_prompt = f"""
Summarize these git changes in 100 words or less, using Markdown bullet points for each major change (each bullet should be 1-2 sentences):

Commit: {commit_info['hash']} ({commit_info['date']})
Message: {commit_info['message']}
Changes: {category_summary}
Stats: {stats}

Focus on the most significant changes and their impact.
"""

    try:
        # Get brief summary
        brief_response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a senior software engineer who specializes in providing concise summaries of code changes. Use Markdown bullet points for each major change. Keep your response under 100 words while highlighting the most important changes."
                },
                {"role": "user", "content": brief_prompt}
            ],
            max_tokens=200,
            temperature=0.2
        )
        
        # Process each category separately for detailed summary
        detailed_summaries = []
        for category, files in file_categories.items():
            if not files:
                continue
                
            print(f"Processing {category} changes...")
            
            # Get diff for this category
            category_diff = get_category_diff(None, None, files)
            if not category_diff:
                continue
                
            # Truncate diff content if too large
            category_diff = category_diff[:3000]  # Reduced to 3000 chars per category
            
            # Simplify the file list to just show count and a few examples
            file_examples = files[:3]  # Show only first 3 files
            file_list = f"Changed {len(files)} files, including:\n" + "\n".join([f"- {file}" for file in file_examples])
            if len(files) > 3:
                file_list += f"\n... and {len(files) - 3} more files"
            
            category_prompt = f"""
Analyze the changes in the {category} component. Use Markdown formatting and bullet points for all lists:

{file_list}

Diff:
```
{category_diff}
```

Provide a technical summary with the following sections, each as a Markdown bullet list (use a bullet for each item, even if a section is empty):
- **Key functional changes**
- **Important code modifications**
- **New features or fixes**
- **Breaking changes or API updates**
"""
            
            try:
                category_response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {
                            "role": "system", 
                            "content": "You are a senior software engineer who specializes in analyzing code changes. Use Markdown bullet points for all lists and sections. Provide clear, technical analysis focusing on the most important changes."
                        },
                        {"role": "user", "content": category_prompt}
                    ],
                    max_tokens=800,  # Reduced token count
                    temperature=0.2
                )
                
                detailed_summaries.append(f"## {category}\n\n{category_response.choices[0].message.content.strip()}\n")
            except Exception as e:
                print(f"Warning: Could not process {category} changes: {str(e)}")
                detailed_summaries.append(f"## {category}\n\n*Error processing changes in this category*\n")
        
        # Combine all detailed summaries
        detailed_summary = "\n".join(detailed_summaries)
        
        return brief_response.choices[0].message.content.strip(), detailed_summary
    
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
    
    print("🤖 Generating summaries with OpenAI...")
    
    # Generate summaries
    brief_summary, detailed_summary = summarize_with_openai(diff_content, commit_info, changed_files, diff_stats)
    
    # Create output directory if it doesn't exist
    os.makedirs('output', exist_ok=True)
    
    # Remove existing files if they exist
    for file in ['output/summary.md', 'output/details.md']:
        if os.path.exists(file):
            os.remove(file)
    
    # Write summaries to files
    with open('output/summary.md', 'w') as f:
        f.write("# Brief Summary\n\n")
        f.write(brief_summary)
    
    with open('output/details.md', 'w') as f:
        f.write("# Detailed Summary\n\n")
        f.write(detailed_summary)
    
    print("\n" + "-"*3)
    print("📝 SUMMARIES GENERATED")
    print("-"*3)
    print("Brief summary saved to: output/summary.md")
    print("Detailed summary saved to: output/details.md")
    print("-"*3)


if __name__ == '__main__':
    main()
