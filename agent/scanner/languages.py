"""Language and framework detection for scanned repositories.

Analyzes file extensions, package manifests, and framework-specific markers
to build a profile of the repository's tech stack.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

# Maps file extensions → language name
_EXTENSION_MAP: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".jsx": "javascript",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".java": "java",
    ".kt": "kotlin",
    ".cs": "csharp",
    ".php": "php",
    ".swift": "swift",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".scala": "scala",
    ".sol": "solidity",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
    ".xml": "xml",
    ".html": "html",
    ".css": "css",
    ".sql": "sql",
    ".sh": "shell",
    ".bash": "shell",
    ".dockerfile": "docker",
    ".tf": "terraform",
    ".hcl": "terraform",
}

# Package manifest → language / ecosystem
_MANIFEST_MAP: dict[str, dict[str, str]] = {
    "package.json": {"language": "javascript", "ecosystem": "npm"},
    "package-lock.json": {"language": "javascript", "ecosystem": "npm"},
    "yarn.lock": {"language": "javascript", "ecosystem": "npm"},
    "pnpm-lock.yaml": {"language": "javascript", "ecosystem": "npm"},
    "requirements.txt": {"language": "python", "ecosystem": "pip"},
    "Pipfile": {"language": "python", "ecosystem": "pipenv"},
    "Pipfile.lock": {"language": "python", "ecosystem": "pipenv"},
    "pyproject.toml": {"language": "python", "ecosystem": "pypi"},
    "setup.py": {"language": "python", "ecosystem": "pypi"},
    "setup.cfg": {"language": "python", "ecosystem": "pypi"},
    "poetry.lock": {"language": "python", "ecosystem": "poetry"},
    "go.mod": {"language": "go", "ecosystem": "go"},
    "go.sum": {"language": "go", "ecosystem": "go"},
    "Cargo.toml": {"language": "rust", "ecosystem": "cargo"},
    "Cargo.lock": {"language": "rust", "ecosystem": "cargo"},
    "Gemfile": {"language": "ruby", "ecosystem": "rubygems"},
    "Gemfile.lock": {"language": "ruby", "ecosystem": "rubygems"},
    "pom.xml": {"language": "java", "ecosystem": "maven"},
    "build.gradle": {"language": "java", "ecosystem": "gradle"},
    "build.gradle.kts": {"language": "kotlin", "ecosystem": "gradle"},
    "composer.json": {"language": "php", "ecosystem": "composer"},
    "composer.lock": {"language": "php", "ecosystem": "composer"},
    "Package.swift": {"language": "swift", "ecosystem": "swift"},
    "pubspec.yaml": {"language": "dart", "ecosystem": "pub"},
    "mix.exs": {"language": "elixir", "ecosystem": "hex"},
}

# Framework markers — file name patterns that indicate a specific framework
_FRAMEWORK_MARKERS: dict[str, str] = {
    "next.config.js": "Next.js",
    "next.config.ts": "Next.js",
    "next.config.mjs": "Next.js",
    "nuxt.config.js": "Nuxt",
    "nuxt.config.ts": "Nuxt",
    "angular.json": "Angular",
    "vue.config.js": "Vue",
    "svelte.config.js": "SvelteKit",
    "astro.config.mjs": "Astro",
    "remix.config.js": "Remix",
    "vite.config.ts": "Vite",
    "vite.config.js": "Vite",
    "webpack.config.js": "Webpack",
    "tsconfig.json": "TypeScript",
    "manage.py": "Django",
    "settings.py": "Django",
    "wsgi.py": "Django",
    "app.py": "Flask",
    "main.py": "FastAPI",
    "Dockerfile": "Docker",
    "docker-compose.yml": "Docker Compose",
    "docker-compose.yaml": "Docker Compose",
    "compose.yaml": "Docker Compose",
    "compose.yml": "Docker Compose",
    ".github/workflows": "GitHub Actions",
    "terraform.tfvars": "Terraform",
    "serverless.yml": "Serverless",
    "fly.toml": "Fly.io",
    "vercel.json": "Vercel",
    "netlify.toml": "Netlify",
    "railway.json": "Railway",
}


class LanguageProfile:
    """Describes the detected tech stack of a repository."""

    def __init__(self) -> None:
        self.languages: dict[str, int] = {}   # language → file count
        self.ecosystems: set[str] = set()
        self.frameworks: set[str] = set()
        self.manifests: list[str] = []        # paths to dependency manifests

    @property
    def primary_language(self) -> str | None:
        """The most common language by file count."""
        if not self.languages:
            return None
        return max(self.languages, key=self.languages.get)  # type: ignore[arg-type]

    @property
    def language_list(self) -> list[str]:
        """All detected languages, sorted by file count descending."""
        return sorted(self.languages, key=lambda k: self.languages[k], reverse=True)

    def to_dict(self) -> dict[str, Any]:
        return {
            "languages": self.languages,
            "primary_language": self.primary_language,
            "ecosystems": sorted(self.ecosystems),
            "frameworks": sorted(self.frameworks),
            "manifests": self.manifests,
        }


def detect_languages(repo_path: str | Path, excluded_dirs: list[str] | None = None) -> LanguageProfile:
    """Walk a cloned repository and build a LanguageProfile.

    Parameters
    ----------
    repo_path:
        Root directory of the cloned repo.
    excluded_dirs:
        Directory basenames to skip (e.g. ``["node_modules", ".git"]``).
    """
    root = Path(repo_path)
    if excluded_dirs is None:
        excluded_dirs = ["node_modules", ".git", "__pycache__", "vendor",
                         "dist", "build", ".next", "venv", ".venv"]

    profile = LanguageProfile()
    exclude_set = set(excluded_dirs)

    for dirpath, dirnames, filenames in os.walk(root):
        # Prune excluded dirs in-place
        dirnames[:] = [d for d in dirnames if d not in exclude_set]

        rel_dir = Path(dirpath).relative_to(root)

        for fname in filenames:
            # Check framework markers
            if fname in _FRAMEWORK_MARKERS:
                profile.frameworks.add(_FRAMEWORK_MARKERS[fname])

            # Check manifests
            if fname in _MANIFEST_MAP:
                info = _MANIFEST_MAP[fname]
                profile.ecosystems.add(info["ecosystem"])
                lang = info["language"]
                profile.languages[lang] = profile.languages.get(lang, 0) + 1
                profile.manifests.append(str(rel_dir / fname))

            # Count by extension
            ext = Path(fname).suffix.lower()
            if ext in _EXTENSION_MAP:
                lang = _EXTENSION_MAP[ext]
                profile.languages[lang] = profile.languages.get(lang, 0) + 1

    # Check for GitHub Actions directory
    actions_dir = root / ".github" / "workflows"
    if actions_dir.is_dir():
        profile.frameworks.add("GitHub Actions")

    return profile
