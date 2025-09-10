#!/usr/bin/env python3
"""
Generate GitHub-flavored Markdown diffs for sequential public modules.

Finds all `public_modules/*/src/agent.py`, orders modules by their numeric prefix
(`01-…`, `02-…`, …), and emits Markdown files containing unified diffs for each
adjacent pair (sequence only, not all combinations).

Usage:
  python tools/gen_module_diffs.py --output-dir module_diffs

Outputs files like:
  module_diffs/01-voice-agent-overview__to__02-end-to-end-architecture.md
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import List, Tuple
import difflib


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_MODULES_DIR = ROOT / "public_modules"


def find_agent_files() -> List[Tuple[str, Path]]:
    """Return list of (module_dir_name, path_to_agent_py) sorted by numeric prefix."""
    if not PUBLIC_MODULES_DIR.is_dir():
        raise SystemExit(f"Directory not found: {PUBLIC_MODULES_DIR}")

    pairs: List[Tuple[str, Path]] = []
    for module_dir in sorted(PUBLIC_MODULES_DIR.iterdir()):
        if not module_dir.is_dir():
            continue
        agent = module_dir / "src" / "agent.py"
        if agent.is_file():
            pairs.append((module_dir.name, agent))

    def module_key(item: Tuple[str, Path]):
        name = item[0]
        m = re.match(r"^(\d+)-", name)
        if m:
            return (int(m.group(1)), name)
        return (10**9, name)

    pairs.sort(key=module_key)
    return pairs


def read_lines(path: Path) -> List[str]:
    try:
        return path.read_text(encoding="utf-8").splitlines()
    except UnicodeDecodeError:
        # Fallback if file contains non-UTF-8; read binary and decode errors
        return path.read_bytes().decode("utf-8", errors="replace").splitlines()


def make_markdown_diff(path_a: Path, path_b: Path, label_a: str, label_b: str) -> str:
    """Return a Markdown string with a unified diff fenced as ```diff."""
    a_lines = read_lines(path_a)
    b_lines = read_lines(path_b)

    rel_a = path_a.relative_to(ROOT)
    rel_b = path_b.relative_to(ROOT)

    diff_lines = list(
        difflib.unified_diff(
            a_lines,
            b_lines,
            fromfile=str(rel_a),
            tofile=str(rel_b),
            lineterm="",
        )
    )

    if not diff_lines:
        body = (
            f"# Diff: {label_a}/src/agent.py → {label_b}/src/agent.py\n\n"
            "No changes detected.\n"
        )
        return body

    header = f"# Diff: {label_a}/src/agent.py → {label_b}/src/agent.py\n\n"
    fenced = ["```diff"] + diff_lines + ["```", ""]
    return header + "\n".join(fenced)


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        default=str(ROOT / "module_diffs"),
        help="Directory to write markdown diff files (default: module_diffs)",
    )
    args = parser.parse_args(argv)

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    modules = find_agent_files()
    if len(modules) < 2:
        print("Fewer than two modules with src/agent.py found; nothing to diff.")
        return 0

    index_lines = ["# Module Agent Diffs (Sequential)", ""]

    for (name_a, path_a), (name_b, path_b) in zip(modules, modules[1:]):
        filename = f"{name_a}__to__{name_b}.md"
        target = out_dir / filename
        md = make_markdown_diff(path_a, path_b, name_a, name_b)
        target.write_text(md, encoding="utf-8")
        # Resolve to avoid issues when out_dir is relative
        rel = target.resolve().relative_to(ROOT)
        print(f"Wrote {rel}")
        index_lines.append(f"- [{name_a} → {name_b}]({filename})")

    # Write an index for convenience
    index_path = (out_dir / "README.md")
    index_path.write_text("\n".join(index_lines) + "\n", encoding="utf-8")
    print(f"Wrote {index_path.resolve().relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
