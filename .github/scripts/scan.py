"""Reject tracked secrets and local artifacts before provisioning or deployment."""

import fnmatch
from pathlib import PurePosixPath
import subprocess
import sys


EXCLUDED_DIRECTORIES = {
    "node_modules", "dist", "dist-ssr", "build", "coverage", "logs",
    ".git", ".aws", ".ssh", ".terraform", ".cache", ".parcel-cache",
    ".vite", ".idea", ".vscode", "__pycache__", ".pytest_cache",
}
EXCLUDED_FILES = {
    ".DS_Store", "Thumbs.db", "id_rsa", "id_ed25519", "id_ecdsa",
    "github-actions-iam-role.json", "github-actions-iam-trust-policy.json",
}
EXCLUDED_PATTERNS = (
    "*.pem", "*.key", "*.p12", "*.pfx", "*.log", "*.pid", "*.pid.lock",
    "*.swp", "*.swo", "*~", "*.tfstate", "*.tfstate.*", "*.tfplan",
    "*.tfvars", "*.tfvars.json", "tfplan", "crash.log", "crash.*.log",
)


def unwanted(path):
    parts = PurePosixPath(path).parts
    name = parts[-1]
    if path == ".vscode/extensions.json":
        return False
    if any(part in EXCLUDED_DIRECTORIES for part in parts[:-1]):
        return True
    # Keep configuration templates and the shared VS Code recommendations.
    if name == ".env.example" or name.endswith((".tfvars.example", ".tfvars.json.example")):
        return False
    return (
        name in EXCLUDED_FILES
        or name == ".env"
        or name.startswith(".env.")
        or any(fnmatch.fnmatchcase(name, pattern) for pattern in EXCLUDED_PATTERNS)
    )


def main():
    # CI checks out tracked files only. Ignore local ignored/untracked artifacts
    # so developers can also run this scan with their dependencies installed.
    result = subprocess.run(["git", "ls-files", "-z"], check=True, capture_output=True)
    files = result.stdout.decode("utf-8", errors="surrogateescape").split("\0")
    failures = sorted(path for path in files if path and unwanted(path))
    if failures:
        print("Scan failed: remove these tracked secrets or local artifacts:", file=sys.stderr)
        for path in failures:
            print(f"  {path!r}", file=sys.stderr)
        return 1
    print("Scan passed: no tracked secrets or common local artifacts found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
