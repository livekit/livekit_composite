import os
import shutil
import time
import requests
from tqdm import tqdm
from subprocess import run, CalledProcessError

GITHUB_API = "https://api.github.com"
ORG_LIST = ["livekit", "livekit-examples"]
BASE_DIR = os.getcwd()
TOKEN = os.getenv("GITHUB_TOKEN")
HEADERS = {"Authorization": f"token {TOKEN}"} if TOKEN else {}

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
    return [repo['clone_url'] for repo in repos]

def clean_and_prepare_dir(path):
    if os.path.exists(path):
        shutil.rmtree(path)
    os.makedirs(path, exist_ok=True)

def clone_repo_without_git(repo_url, dest_dir):
    temp_dir = dest_dir + "_tmp"
    try:
        run(["git", "clone", "--depth", "1", repo_url, temp_dir], check=True)
        git_dir = os.path.join(temp_dir, ".git")
        if os.path.exists(git_dir):
            shutil.rmtree(git_dir)
        shutil.move(temp_dir, dest_dir)
    except CalledProcessError as e:
        print(f"Failed to clone {repo_url}: {e}")
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

def main():
    for org in ORG_LIST:
        target_base = os.path.join(BASE_DIR, org)
        clean_and_prepare_dir(target_base)
        repos = fetch_public_repos(org)
        print(f"Cloning {len(repos)} repos for {org}...")
        for repo_url in tqdm(repos):
            repo_name = repo_url.split("/")[-1].replace(".git", "")
            dest_path = os.path.join(target_base, repo_name)
            clone_repo_without_git(repo_url, dest_path)

if __name__ == "__main__":
    main()
