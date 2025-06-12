import os
import shutil
import time
import requests
from datetime import datetime, timedelta
from tqdm import tqdm
from subprocess import run, CalledProcessError

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

def download_llm_doc():
    """Download the LiveKit LLM documentation"""
    doc_url = "https://docs.livekit.io/llms-full.txt"
    doc_dir = os.path.join(BASE_DIR, "doc")
    doc_path = os.path.join(doc_dir, "full-llm.txt")
    
    # Create doc directory if it doesn't exist
    os.makedirs(doc_dir, exist_ok=True)
    
    try:
        print("Downloading LiveKit LLM documentation...")
        response = requests.get(doc_url)
        response.raise_for_status()
        
        with open(doc_path, 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        print(f"Successfully downloaded LLM documentation to {doc_path}")
    except requests.RequestException as e:
        print(f"Failed to download LLM documentation: {e}")

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
                    filtered_repos.append(repo['clone_url'])
            except (ValueError, TypeError):
                # If date parsing fails, skip this repo
                continue
    
    return filtered_repos

def clean_and_prepare_dir(path):
    if os.path.exists(path):
        shutil.rmtree(path)
    os.makedirs(path, exist_ok=True)

def clone_repo_without_git(repo_url, dest_dir, branch="main"):
    """Clone repository without git history, optionally specifying branch"""
    temp_dir = dest_dir + "_tmp"
    try:
        # Try the specified branch first, fall back to default if it fails
        cmd = ["git", "clone", "--depth", "1", "--branch", branch, repo_url, temp_dir]
        try:
            run(cmd, check=True)
        except CalledProcessError:
            # If custom branch fails, try without specifying branch (uses default)
            print(f"Branch '{branch}' not found for {repo_url}, using default branch")
            cmd = ["git", "clone", "--depth", "1", repo_url, temp_dir]
            run(cmd, check=True)
        
        git_dir = os.path.join(temp_dir, ".git")
        if os.path.exists(git_dir):
            shutil.rmtree(git_dir)
        shutil.move(temp_dir, dest_dir)
    except CalledProcessError as e:
        print(f"Failed to clone {repo_url}: {e}")
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

def main():
    # Load repository configuration
    repo_config = load_repo_config()
    
    # Download LLM documentation first
    download_llm_doc()
    
    for org in ORG_LIST:
        target_base = os.path.join(BASE_DIR, org)
        clean_and_prepare_dir(target_base)
        repos = fetch_public_repos(org)
        print(f"Cloning {len(repos)} repos for {org}...")
        for repo_url in tqdm(repos):
            repo_name = repo_url.split("/")[-1].replace(".git", "")
            
            # Skip livekit_composite repository
            if org == "livekit" and repo_name == "livekit_composite":
                continue
            
            dest_path = os.path.join(target_base, repo_name)
            
            # Check if this repo has a custom branch configured
            repo_key = f"{org}/{repo_name}"
            branch = repo_config.get(repo_key, "main")
            
            if repo_key in repo_config:
                print(f"Using custom branch '{branch}' for {repo_key}")
            
            clone_repo_without_git(repo_url, dest_path, branch)

if __name__ == "__main__":
    main()
