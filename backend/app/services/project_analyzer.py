"""
Project Analyzer & Secure ZIP Inspection Service.
Provides AST/Static Analysis of agent codebases with strict ZIP-Slip,
ZIP-Bomb, and malicious path traversal protection.
"""

import ast
import io
import json
import logging
import os
import re
import zipfile
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Security boundaries
MAX_ZIP_SIZE_BYTES = 25 * 1024 * 1024      # 25 MB max compressed archive
MAX_UNCOMPRESSED_BYTES = 75 * 1024 * 1024  # 75 MB max total uncompressed payload
MAX_FILE_COUNT = 1500                      # 1500 files max
MAX_NESTING_DEPTH = 12                     # Max directory nesting depth

KNOWN_FRAMEWORKS = {
    "langchain": ["langchain", "langchain_core", "langchain_community"],
    "llamaindex": ["llama_index", "llama_hub"],
    "crewai": ["crewai"],
    "autogen": ["autogen", "pyautogen"],
    "openai": ["openai"],
    "fastapi": ["fastapi"],
    "express": ["express"],
}

ENTRY_POINT_CANDIDATES = [
    "main.py", "app.py", "agent.py", "run.py", "server.py",
    "index.ts", "agent.ts", "server.ts", "main.ts",
    "index.js", "agent.js", "server.js",
]


class SecureZipValidator:
    """Validates ZIP archives for Zip-Slip, Zip-Bomb, and malicious paths."""

    @staticmethod
    def validate_and_read(zip_bytes: bytes) -> tuple[bool, str, list[zipfile.ZipInfo]]:
        if len(zip_bytes) > MAX_ZIP_SIZE_BYTES:
            return False, f"ZIP archive exceeds size limit ({len(zip_bytes) / 1024 / 1024:.1f}MB > {MAX_ZIP_SIZE_BYTES / 1024 / 1024}MB)", []

        try:
            zip_buffer = io.BytesIO(zip_bytes)
            zf = zipfile.ZipFile(zip_buffer, "r")
        except zipfile.BadZipFile as e:
            return False, f"Corrupted or invalid ZIP archive: {str(e)}", []

        infolist = zf.infolist()
        if len(infolist) > MAX_FILE_COUNT:
            return False, f"ZIP contains {len(infolist)} files (limit is {MAX_FILE_COUNT})", []

        total_uncompressed = 0
        for info in infolist:
            total_uncompressed += info.file_size
            if total_uncompressed > MAX_UNCOMPRESSED_BYTES:
                return False, f"Zip-Bomb protection: uncompressed size exceeds {MAX_UNCOMPRESSED_BYTES / 1024 / 1024}MB", []

            filename = info.filename

            # Path traversal / Zip-Slip checks
            if filename.startswith("/") or filename.startswith("\\"):
                return False, f"Zip-Slip vulnerability detected: absolute path '{filename}'", []

            parts = os.path.normpath(filename).replace("\\", "/").split("/")
            if ".." in parts:
                return False, f"Zip-Slip vulnerability detected: directory traversal in '{filename}'", []

            if len(parts) > MAX_NESTING_DEPTH:
                return False, f"Nesting depth exceeds maximum allowed limit ({len(parts)} > {MAX_NESTING_DEPTH})", []

            # Check for symlink flags in external attributes
            is_symlink = (info.external_attr >> 16) & 0o120000 == 0o120000
            if is_symlink:
                return False, f"Symbolic links are prohibited for security: '{filename}'", []

        return True, "Archive verified safe", infolist


class ProjectAnalyzer:
    """
    Performs static inspection on uploaded agent archives.
    Extracts frameworks, prompts, tools, dependencies, and security posture.
    """

    @staticmethod
    def analyze_zip(zip_bytes: bytes) -> Dict[str, Any]:
        is_safe, error_msg, infolist = SecureZipValidator.validate_and_read(zip_bytes)
        if not is_safe:
            return {
                "success": False,
                "error": error_msg,
                "security_scan": {"passed": False, "reason": error_msg},
            }

        zf = zipfile.ZipFile(io.BytesIO(zip_bytes), "r")

        files_found = []
        detected_languages = set()
        detected_frameworks = set()
        entry_points = []
        prompt_files = []
        tools_detected = []
        manifests_found = []
        security_findings = []
        total_lines_of_code = 0

        for info in infolist:
            fname = info.filename
            if info.is_dir() or fname.startswith("__MACOSX/") or "/." in fname:
                continue

            files_found.append(fname)
            lower_name = fname.lower()
            base_name = os.path.basename(lower_name)

            # Language detection
            if fname.endswith(".py"):
                detected_languages.add("Python")
            elif fname.endswith((".ts", ".tsx")):
                detected_languages.add("TypeScript")
            elif fname.endswith((".js", ".jsx")):
                detected_languages.add("JavaScript")
            elif fname.endswith((".json", ".yaml", ".yml")):
                detected_languages.add("YAML/JSON")

            # Entry point detection
            if base_name in ENTRY_POINT_CANDIDATES:
                entry_points.append(fname)

            # Manifests
            if base_name in ("requirements.txt", "package.json", "pyproject.toml", "pipfile"):
                manifests_found.append(fname)

            # Prompt / instruction files
            if "prompt" in lower_name or "instruction" in lower_name or "system" in lower_name:
                prompt_files.append(fname)

            # Read text files under 200KB for AST and pattern inspection
            if info.file_size < 200 * 1024 and any(fname.endswith(ext) for ext in (".py", ".ts", ".js", ".json", ".txt")):
                try:
                    content = zf.read(info).decode("utf-8", errors="ignore")
                    total_lines_of_code += content.count("\n") + 1

                    # Scan for frameworks
                    for fw, tokens in KNOWN_FRAMEWORKS.items():
                        if any(token in content for token in tokens):
                            detected_frameworks.add(fw)

                    # Scan for Python tools
                    if fname.endswith(".py"):
                        try:
                            tree = ast.parse(content)
                            for node in ast.walk(tree):
                                if isinstance(node, ast.FunctionDef):
                                    for dec in node.decorator_list:
                                        dec_id = getattr(dec, "id", "") or getattr(getattr(dec, "value", None), "id", "")
                                        if "tool" in str(dec_id).lower():
                                            tools_detected.append({
                                                "name": node.name,
                                                "file": fname,
                                                "type": "decorator",
                                            })
                        except Exception:
                            # Regex fallback
                            matches = re.findall(r"@(?:tool|agent\.tool)\s+def\s+([a-zA-Z0-9_]+)", content)
                            for m in matches:
                                tools_detected.append({"name": m, "file": fname, "type": "decorator"})

                    # Security checks for dangerous patterns
                    if "eval(" in content:
                        security_findings.append({"file": fname, "issue": "Use of eval() detected", "severity": "HIGH"})
                    if "shell=True" in content:
                        security_findings.append({"file": fname, "issue": "subprocess with shell=True detected", "severity": "HIGH"})
                    if re.search(r'(?:api_key|secret|password|auth_token)\s*=\s*["\'][a-zA-Z0-9_\-]{16,}["\']', content, re.I):
                        security_findings.append({"file": fname, "issue": "Potential hardcoded API key or credential", "severity": "CRITICAL"})

                except Exception as e:
                    logger.debug("Skipping deep parse for %s: %s", fname, e)

        # Primary framework determination
        primary_framework = "Custom / Native"
        for fw in ("crewai", "autogen", "langchain", "llamaindex", "openai", "fastapi"):
            if fw in detected_frameworks:
                primary_framework = fw.capitalize()
                break

        primary_entry = entry_points[0] if entry_points else (files_found[0] if files_found else "None")

        return {
            "success": True,
            "security_scan": {
                "passed": len([f for f in security_findings if f["severity"] == "CRITICAL"]) == 0,
                "zip_slip_safe": True,
                "zip_bomb_safe": True,
                "findings": security_findings,
            },
            "manifest": {
                "file_count": len(files_found),
                "total_loc": total_lines_of_code,
                "languages": list(detected_languages),
                "primary_language": "Python" if "Python" in detected_languages else ("TypeScript" if "TypeScript" in detected_languages else "JavaScript"),
                "frameworks": list(detected_frameworks),
                "primary_framework": primary_framework,
                "entry_points": entry_points,
                "primary_entry_point": primary_entry,
                "dependency_manifests": manifests_found,
                "prompt_files": prompt_files,
                "tools_detected": tools_detected,
            },
            "runtime_capabilities": {
                "static_analysis": "Supported (Full AST & Security Inspection)",
                "config_inspection": "Supported (Prompts & Tool Schemas Extracted)",
                "runtime_execution": "Isolated Container Required (Direct server execution restricted for security)",
                "api_evaluations": "Supported (Expose endpoint via HTTP to evaluate autonomously)",
            },
        }
