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
import collections


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
        'Knowledge': [],
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
        
        # Knowledge Base
        elif file.startswith('knowledge_base/'):
            categories['Knowledge'].append(file)
        
        # Examples (catch-all for examples)
        elif (file.startswith('livekit-examples/') or 
              '/examples/' in file):
            categories['Examples'].append(file)
        
        # Other
        else:
            categories['Other'].append(file)
    
    return categories


def categorize_files_by_subproject(changed_files: list) -> dict:
    """Categorize changed files by individual repositories/projects for detailed analysis."""
    subprojects = {}
    
    for file in changed_files:
        # Skip root directory files (tool files)
        if '/' not in file:
            continue
            
        # Extract the subproject path (first two levels)
        parts = file.split('/')
        if len(parts) >= 2:
            subproject_key = f"{parts[0]}/{parts[1]}"
        else:
            subproject_key = parts[0]
        
        # Special handling for specific patterns
        if file.startswith('livekit/client-sdk-'):
            # Extract the specific client SDK (e.g., client-sdk-js, client-sdk-swift)
            sdk_name = parts[1] if len(parts) > 1 else "client-sdk"
            subproject_key = f"livekit/{sdk_name}"
        elif file.startswith('livekit/agents-js/'):
            subproject_key = "livekit/agents-js"
        elif file.startswith('livekit/agents/'):
            subproject_key = "livekit/agents"
        elif file.startswith('livekit-examples/'):
            # For examples, use the specific example name
            if len(parts) >= 2:
                subproject_key = f"livekit-examples/{parts[1]}"
            else:
                subproject_key = "livekit-examples"
        elif file.startswith('knowledge_base/'):
            subproject_key = "knowledge_base"
        
        if subproject_key not in subprojects:
            subprojects[subproject_key] = []
        subprojects[subproject_key].append(file)
    
    return subprojects


def get_subproject_display_name(subproject_key: str) -> str:
    """Get a human-readable display name for a subproject."""
    if subproject_key == "knowledge_base":
        return "Knowledge Base"
    elif subproject_key.startswith("livekit/client-sdk-"):
        # Convert client-sdk-js to Client SDK (JavaScript)
        sdk_name = subproject_key.split('/')[-1]
        if sdk_name == "client-sdk-js":
            return "Client SDK (JavaScript)"
        elif sdk_name == "client-sdk-swift":
            return "Client SDK (Swift)"
        elif sdk_name == "client-sdk-android":
            return "Client SDK (Android)"
        elif sdk_name == "client-sdk-flutter":
            return "Client SDK (Flutter)"
        elif sdk_name == "client-sdk-react-native":
            return "Client SDK (React Native)"
        elif sdk_name == "client-sdk-unity":
            return "Client SDK (Unity)"
        else:
            return f"Client SDK ({sdk_name.replace('client-sdk-', '').title()})"
    elif subproject_key == "livekit/agents":
        return "Agents (Python)"
    elif subproject_key == "livekit/agents-js":
        return "Agents (JavaScript)"
    elif subproject_key.startswith("livekit-examples/"):
        example_name = subproject_key.split('/')[-1]
        return f"Example: {example_name.replace('-', ' ').title()}"
    else:
        # Convert livekit/some-component to Some Component
        parts = subproject_key.split('/')
        if len(parts) >= 2:
            component_name = parts[-1].replace('-', ' ').title()
            return f"{parts[0].title()}: {component_name}"
        else:
            return subproject_key.replace('-', ' ').title()


def get_diff_stats(source: Optional[str] = None, dest: Optional[str] = None) -> str:
    """Get diff statistics."""
    if source and dest:
        command = ['git', 'diff', '--stat', source, dest]
    elif source:
        command = ['git', 'diff', '--stat', source, 'HEAD']
    else:
        command = ['git', 'show', '--stat', '--format=', 'HEAD']
    
    stats = run_git_command(command)
    
    # Truncate stats if too long to prevent token limit issues
    max_stats_lines = 50
    lines = stats.split('\n')
    if len(lines) > max_stats_lines:
        # Keep the summary line and first few file stats
        summary_line = lines[-1] if lines else ""
        file_lines = lines[:-1][:max_stats_lines-2]  # Leave room for summary and truncation notice
        truncated_stats = '\n'.join(file_lines) + f"\n... and {len(lines) - max_stats_lines} more files\n{summary_line}"
        return truncated_stats
    
    return stats


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


def detect_large_added_dirs(changed_files, threshold=200):
    """Detect large new top-level directories that were added in this commit/range."""
    # Only consider added files
    added_files = [f for f in changed_files if f and not f.startswith('..')]
    
    # Count files by directory path (up to 3 levels deep)
    dir_counts = collections.defaultdict(list)
    for f in added_files:
        parts = f.split('/')
        if len(parts) >= 2:
            # Check different levels: level 1, level 2, level 3
            for depth in range(1, min(4, len(parts))):
                dir_path = '/'.join(parts[:depth])
                dir_counts[dir_path].append(f)
    
    # Find directories with more than threshold files
    large_dirs = {}
    for dir_path, files in dir_counts.items():
        if len(files) >= threshold:
            # Check if this is the most specific (deepest) directory that meets the threshold
            is_most_specific = True
            for other_path, other_files in dir_counts.items():
                if (other_path != dir_path and 
                    other_path.startswith(dir_path + '/') and 
                    len(other_files) >= threshold):
                    is_most_specific = False
                    break
            
            if is_most_specific:
                large_dirs[dir_path] = files
    
    # Prefer parent directories when possible
    # If we have both livekit/llama.cpp/ and livekit/llama.cpp/ggml/, prefer livekit/llama.cpp/
    preferred_dirs = {}
    for dir_path, files in large_dirs.items():
        # Check if this directory is a parent of another large directory
        is_parent = False
        for other_path in large_dirs.keys():
            if other_path != dir_path and other_path.startswith(dir_path + '/'):
                # This is a parent directory, prefer it
                is_parent = True
                break
        
        if is_parent:
            # Use this parent directory instead of its children
            preferred_dirs[dir_path] = files
        else:
            # Check if this directory is a child of an already selected parent
            is_child_of_selected = False
            for parent_path in preferred_dirs.keys():
                if dir_path.startswith(parent_path + '/'):
                    is_child_of_selected = True
                    break
            
            if not is_child_of_selected:
                preferred_dirs[dir_path] = files
    
    return preferred_dirs


def summarize_with_openai(diff_content: str, commit_info: dict, changed_files: list, stats: str, max_files_per_category: int = 50, large_added_dirs=None) -> Tuple[str, str]:
    """Use OpenAI to summarize the changes and return both brief and detailed summaries."""
    
    # Check for API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable is required")
        sys.exit(1)
    
    client = OpenAI(api_key=api_key)
    
    # Categorize files by repository for brief summary
    file_categories = categorize_files_by_repo(changed_files)
    
    # Categorize files by subproject for detailed analysis
    subprojects = categorize_files_by_subproject(changed_files)
    
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

    if large_added_dirs is None:
        large_added_dirs = {}
    
    # Add a note about large added directories at the top of the brief summary
    large_dir_note = ""
    if large_added_dirs:
        dir_list = ', '.join([f'`{d}/` ({len(files)} files)' for d, files in large_added_dirs.items()])
        large_dir_note = f"**Note:** A large external repository or directory was added: {dir_list}. No further summary for this directory.\n\n"
    
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
        
        # Process each subproject separately for detailed summary
        detailed_summaries = []
        
        # Sort subprojects by display name for consistent ordering
        sorted_subprojects = sorted(subprojects.items(), key=lambda x: get_subproject_display_name(x[0]))
        
        for subproject_key, files in sorted_subprojects:
            if not files:
                continue
                
            display_name = get_subproject_display_name(subproject_key)
            print(f"Processing {display_name} changes ({len(files)} files)...")
            
            # Handle large subprojects by sampling files
            if len(files) > max_files_per_category:
                print(f"  ⚠️  Large subproject detected ({len(files)} files). Sampling {max_files_per_category} files for analysis.")
                # Sample files intelligently - take first half and last half to get a good spread
                half_size = max_files_per_category // 2
                first_half = files[:half_size]
                last_half = files[-half_size:]
                sampled_files = first_half + last_half
                # Remove duplicates if any
                sampled_files = list(dict.fromkeys(sampled_files))
            else:
                sampled_files = files
            
            # Get diff for this subproject (using sampled files)
            category_diff = get_category_diff(None, None, sampled_files)
            if not category_diff:
                continue
                
            # Truncate diff content if too large (more conservative limit)
            max_diff_chars = 2000  # Reduced from 3000
            if len(category_diff) > max_diff_chars:
                print(f"  ⚠️  Large diff detected ({len(category_diff)} chars). Truncating to {max_diff_chars} chars.")
                category_diff = category_diff[:max_diff_chars] + "\n\n[Diff truncated due to size...]"
            
            # Simplify the file list to just show count and a few examples
            file_examples = files[:5]  # Show first 5 files
            file_list = f"Changed {len(files)} files, including:\n" + "\n".join([f"- {file}" for file in file_examples])
            if len(files) > 5:
                file_list += f"\n... and {len(files) - 5} more files"
            
            # Add sampling info if files were sampled
            if len(files) > max_files_per_category:
                file_list += f"\n\n*Note: Analysis based on sample of {len(sampled_files)} files due to large number of changes*"
            
            category_prompt = f"""
Analyze the changes in the {display_name} component. Use Markdown formatting and bullet points for all lists:

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
                    max_tokens=600,  # Further reduced token count
                    temperature=0.2
                )
                
                detailed_summaries.append(f"## {display_name}\n\n{category_response.choices[0].message.content.strip()}\n")
            except Exception as e:
                error_msg = str(e)
                if "context_length_exceeded" in error_msg:
                    print(f"  ❌ Token limit exceeded for {display_name}. Skipping detailed analysis.")
                    detailed_summaries.append(f"## {display_name}\n\n*Detailed analysis skipped due to large number of changes ({len(files)} files). See brief summary above for overview.*\n")
                else:
                    print(f"  ❌ Error processing {display_name} changes: {error_msg}")
                    detailed_summaries.append(f"## {display_name}\n\n*Error processing changes in this subproject*\n")
        
        # Combine all detailed summaries
        detailed_summary = "\n".join(detailed_summaries)
        
        return brief_response.choices[0].message.content.strip(), detailed_summary
    
    except Exception as e:
        error_msg = str(e)
        if "context_length_exceeded" in error_msg:
            print("❌ Token limit exceeded for brief summary. Generating fallback summary...")
            # Generate a simple fallback summary based on file counts
            fallback_brief = f"""## Brief Summary

Large-scale changes detected in commit {commit_info['hash']} ({commit_info['date']}):
- **{len(changed_files)} total files changed**
- **{category_summary}**
- **Commit message**: {commit_info['message']}

*Detailed analysis was limited due to the large number of changes. Consider analyzing smaller commit ranges for more detailed insights.*
"""
            fallback_detailed = f"""## Detailed Summary

### Overview
This commit contains changes across {len(changed_files)} files, making it a large-scale update.

### File Distribution by Subproject
{chr(10).join([f"- **{get_subproject_display_name(key)}**: {len(files)} files" for key, files in sorted(subprojects.items(), key=lambda x: get_subproject_display_name(x[0]))])}

### Analysis Limitations
Due to the large number of changes ({len(changed_files)} files), detailed analysis was limited to prevent API token limits. Consider:
- Breaking down the analysis into smaller commit ranges
- Using `git log --oneline` to identify specific commits of interest
- Running the analysis on individual components separately

### Commit Information
- **Hash**: {commit_info['hash']}
- **Date**: {commit_info['date']}
- **Message**: {commit_info['message']}
- **Stats**: {stats}
"""
            return fallback_brief, fallback_detailed
        else:
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
  python summarize_changes.py --categories "Server/Core,Client"  # Only analyze specific categories
  python summarize_changes.py --max-files 20    # Limit to 20 files per category
  python summarize_changes.py --dry-run         # Show what would be analyzed without calling OpenAI
        """
    )
    
    parser.add_argument('source', nargs='?', help='Source commit hash (optional)')
    parser.add_argument('dest', nargs='?', help='Destination commit hash (optional)')
    parser.add_argument('--model', default='gpt-3.5-turbo', help='OpenAI model to use')
    parser.add_argument('--categories', help='Comma-separated list of categories to analyze (e.g., "Server/Core,Client,Agents")')
    parser.add_argument('--max-files', type=int, default=50, help='Maximum files to analyze per category (default: 50)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be analyzed without calling OpenAI')
    
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
    subprojects = categorize_files_by_subproject(changed_files)
    total_files = len(changed_files)
    
    # Filter categories if specified
    if args.categories:
        allowed_categories = [cat.strip() for cat in args.categories.split(',')]
        filtered_categories = {}
        for category, files in file_categories.items():
            if category in allowed_categories:
                filtered_categories[category] = files
        file_categories = filtered_categories
        print(f"📋 Filtering to categories: {', '.join(allowed_categories)}")
    
    print(f"📊 Found changes in {total_files} files:")
    for category, files in file_categories.items():
        if files:
            print(f"   • {len(files)} in {category}")
    
    # Show subproject breakdown for better understanding
    print(f"\n📁 Detailed breakdown by subproject:")
    sorted_subprojects = sorted(subprojects.items(), key=lambda x: get_subproject_display_name(x[0]))
    for subproject_key, files in sorted_subprojects:
        display_name = get_subproject_display_name(subproject_key)
        print(f"   • {len(files)} in {display_name}")
    
    # Warn about large changes and suggest options
    if total_files > 500:
        print(f"\n⚠️  Large number of changes detected ({total_files} files). Consider:")
        print("   • Using --categories to focus on specific components")
        print("   • Using --max-files to limit analysis per category")
        print("   • Using --dry-run to see what would be analyzed")
        print("   • Breaking down into smaller commit ranges")
        print()
    
    # Detect large added directories (e.g., from a fork)
    large_added_dirs = detect_large_added_dirs(changed_files, threshold=200)
    if large_added_dirs:
        print("⚡ Detected large new directories added:")
        for d, files in large_added_dirs.items():
            print(f"   • {d}/ ({len(files)} files)")
        print("These will be summarized as a single addition and excluded from detailed analysis.")
        # Remove these files from changed_files for further analysis
        files_to_exclude = set()
        for files in large_added_dirs.values():
            files_to_exclude.update(files)
        changed_files = [f for f in changed_files if f not in files_to_exclude]
    
    if args.dry_run:
        print("\n🔍 DRY RUN MODE - No OpenAI calls will be made")
        print("Subprojects that would be analyzed:")
        for subproject_key, files in sorted_subprojects:
            display_name = get_subproject_display_name(subproject_key)
            max_files = min(len(files), args.max_files)
            print(f"   • {display_name}: {len(files)} files (would analyze {max_files})")
        print(f"\nTotal files that would be analyzed: {sum(min(len(files), args.max_files) for files in subprojects.values())}")
        return
    
    print("🤖 Generating summaries with OpenAI...")
    
    # Generate summaries with custom max_files parameter
    brief_summary, detailed_summary = summarize_with_openai(
        diff_content, commit_info, changed_files, diff_stats, args.max_files, large_added_dirs=large_added_dirs)
    
    # Create output directory if it doesn't exist
    os.makedirs('output', exist_ok=True)
    
    # Remove existing files if they exist
    for file in ['output/summary.md', 'output/details.md']:
        if os.path.exists(file):
            os.remove(file)
    
    # Prepare large_dir_note for summary.md
    large_dir_note = ""
    if large_added_dirs:
        dir_list = ', '.join([f'`{d}/` ({len(files)} files)' for d, files in large_added_dirs.items()])
        large_dir_note = f"**Note:** A large external repository or directory was added: {dir_list}. No further summary for this directory.\n\n"

    # Write summaries to files
    github_url = None
    repo_url = "https://github.com/livekit/livekit_composite"
    if args.source and args.dest:
        # Comparison between two commits
        github_url = f"{repo_url}/compare/{args.source}...{args.dest}"
    elif args.dest:
        github_url = f"{repo_url}/commit/{args.dest}"
    elif args.source:
        github_url = f"{repo_url}/commit/HEAD"
    else:
        github_url = f"{repo_url}/commit/{commit_info['hash']}"

    with open('output/summary.md', 'w') as f:
        f.write(f"[changes]({github_url})\n\n")
        if large_dir_note:
            f.write(large_dir_note)
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
