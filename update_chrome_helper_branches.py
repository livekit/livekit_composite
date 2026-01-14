import os
import time
import requests
import json
from datetime import datetime, timedelta
from tqdm import tqdm

GITHUB_API = "https://api.github.com"
ORG_LIST = ["livekit", "livekit-examples"]
BASE_DIR = os.getcwd()
TOKEN = os.getenv("GITHUB_TOKEN")
HEADERS = {"Authorization": f"token {TOKEN}"} if TOKEN else {}

def load_repo_config():
    """Load repository branch overrides from repo.conf"""
    config = {}
    config_path = os.path.join(BASE_DIR, "repo.conf")

    if not os.path.exists(config_path):
        return config

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue

                if '=' in line:
                    repo_key, branch = line.split('=', 1)
                    config[repo_key.strip()] = branch.strip()
    except Exception as e:
        print(f"Warning: Failed to load repo.conf: {e}")

    return config

def fetch_public_repos(org):
    repos = []
    page = 1
    while True:
        url = f"{GITHUB_API}/orgs/{org}/repos?per_page=100&type=public&page={page}"
        r = requests.get(url, headers=HEADERS)
        if r.status_code == 403 and "X-RateLimit-Remaining" in r.headers:
            reset = int(r.headers.get("X-RateLimit-Reset", time.time() + 60))
            wait = reset - int(time.time()) + 1
            print(f"Rate limit hit, backing off for {wait} seconds...")
            time.sleep(wait)
            continue
        r.raise_for_status()
        data = r.json()
        if not data:
            break
        repos.extend(data)
        page += 1

    cutoff_date = datetime.now() - timedelta(days=365)
    filtered_repos = []

    for repo in repos:
        # Skip archived repositories
        if repo.get('archived', False):
            continue

        # Check if repo was updated within the past 365 days
        pushed_at_str = repo.get('pushed_at')
        if pushed_at_str:
            try:
                # GitHub API returns ISO format: "2023-12-01T10:30:00Z"
                pushed_at = datetime.fromisoformat(pushed_at_str.replace('Z', '+00:00'))
                if pushed_at.replace(tzinfo=None) > cutoff_date:
                    filtered_repos.append(repo)
            except (ValueError, TypeError):
                # If date parsing fails, skip this repo
                continue

    return filtered_repos

def get_repo_default_branch(org, repo_name):
    """Fetch the default branch for a specific repository"""
    url = f"{GITHUB_API}/repos/{org}/{repo_name}"

    while True:
        r = requests.get(url, headers=HEADERS)
        if r.status_code == 403 and "X-RateLimit-Remaining" in r.headers:
            reset = int(r.headers.get("X-RateLimit-Reset", time.time() + 60))
            wait = reset - int(time.time()) + 1
            print(f"Rate limit hit, backing off for {wait} seconds...")
            time.sleep(wait)
            continue

        if r.status_code == 200:
            return r.json().get('default_branch', 'unknown')
        else:
            print(f"Failed to fetch {org}/{repo_name}: {r.status_code}")
            return 'unknown'

def main():
    # Load repository configuration
    repo_config = load_repo_config()
    if repo_config:
        print(f"Loaded {len(repo_config)} branch override(s) from repo.conf")

    all_repo_branches = {}

    for org in ORG_LIST:
        print(f"\nFetching repositories for {org}...")
        repos = fetch_public_repos(org)
        print(f"Found {len(repos)} active repos for {org}")

        org_branches = {}

        for repo in tqdm(repos, desc=f"Getting default branches for {org}"):
            repo_name = repo['name']

            # Skip livekit_composite repository
            if org == "livekit" and repo_name == "livekit_composite":
                continue

            # Check if this repo has a custom branch configured
            repo_key = f"{org}/{repo_name}"
            if repo_key in repo_config:
                # Use the override from repo.conf
                branch = repo_config[repo_key]
                org_branches[repo_name] = {"branch": branch, "isOverride": True}
            else:
                # Use the default branch from GitHub
                branch = get_repo_default_branch(org, repo_name)
                org_branches[repo_name] = {"branch": branch}

        all_repo_branches[org] = org_branches

    # Print results to console
    print("\n" + "="*60)
    print("REPOSITORY DEFAULT BRANCHES")
    print("="*60)

    for org, repos in all_repo_branches.items():
        print(f"\n{org.upper()}:")
        print("-" * 40)
        for repo_name, data in sorted(repos.items()):
            branch = data["branch"]
            override_marker = " (override)" if data.get("isOverride") else ""
            print(f"  {repo_name}: {branch}{override_marker}")

    print("\n" + "="*60)
    print(f"Total repositories: {sum(len(repos) for repos in all_repo_branches.values())}")
    print("="*60)

    # Save to JSON file
    output_path = os.path.join(BASE_DIR, "composite_chrome_helper", "repo-default-branches.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_repo_branches, f, indent=2)
    print(f"\nSaved to {output_path}")

if __name__ == "__main__":
    main()
