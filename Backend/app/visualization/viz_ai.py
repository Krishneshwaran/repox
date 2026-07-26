from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Callable

from app.visualization.smart_analyzer import (
    build_mini_summary,
    detect_infra,
    extract_routes,
    get_top_dirs,
    parse_dependencies,
)

_COMPLETE = Callable[[list[dict[str, str]]], str]

_SYSTEM_ENRICH = (
    "You are a software architecture analyst. "
    "You will receive a JSON object describing a real repository (parsed from actual files). "
    "Your job is to enrich this into a visualization graph. "
    "Return ONLY a valid JSON object with this exact shape: "
    '{"nodes": [...], "edges": [...], "insights": ["...", "..."]}. '
    "Node shape: {\"id\": str, \"label\": str, \"kind\": \"frontend|backend|api|service|database|infra|config|dependency|unknown\", "
    "\"importance\": 1-5, \"summary\": \"one sentence\", \"technologies\": [str]}. "
    "Edge shape: {\"id\": str, \"source\": str, \"target\": str, \"label\": str, \"kind\": str, \"risk\": \"low|medium|high\"}. "
    "No markdown. No explanation. JSON only."
)


def _parse_graph(raw: str) -> tuple[list[dict], list[dict], list[str]]:
    raw = raw.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"```$", "", raw.strip())
    try:
        data = json.loads(raw)
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        insights = data.get("insights", [])
        for n in nodes:
            n.setdefault("technologies", [])
            n.setdefault("importance", 3)
            n.setdefault("summary", "")
        return nodes, edges, insights
    except Exception:
        return [], [], ["Could not parse AI response — returning logic-only graph."]


def _enrich(structured: dict, context_hint: str, complete: _COMPLETE) -> tuple[list[dict], list[dict], list[str]]:
    """
    Send compact structured data (~300 tokens) to AI.
    AI returns enriched nodes/edges/insights.
    Falls back to empty lists if AI fails or budget exceeded.
    """
    payload = json.dumps(structured, separators=(",", ":"))
    prompt = (
        f"Repository analysis data (parsed from real files):\n{payload}\n\n"
        f"Context: {context_hint}\n\n"
        "Enrich this into a detailed visualization graph. "
        "Use the real data above as ground truth — do not invent components that aren't there. "
        "Add meaningful summaries, correct kinds, and realistic edges between nodes. "
        "Return ONLY the JSON object."
    )
    try:
        raw = complete([
            {"role": "system", "content": _SYSTEM_ENRICH},
            {"role": "user", "content": prompt},
        ])
        return _parse_graph(raw)
    except Exception as exc:
        return [], [], [f"AI enrichment unavailable ({exc}) — graph built from logic only."]


def _classify_dir(name: str, is_frontend_only: bool, is_backend_only: bool) -> str:
    nl = name.lower()
    # Explicit frontend signals
    if any(k in nl for k in ["front", "client", "ui", "web", "pages", "components", "views", "public", "static", "assets", "styles", "css", "scss", "img", "fonts"]):
        return "frontend"
    # Explicit backend signals — only if not a frontend-only repo
    if not is_frontend_only and any(k in nl for k in ["back", "server", "api", "service", "handler", "controller", "core", "routes", "middleware", "models", "db", "database"]):
        return "backend"
    # Ambiguous names (app, src, lib) — resolve by repo type
    if any(k == nl for k in ["app", "src", "lib", "source"]):
        if is_frontend_only:
            return "frontend"
        if is_backend_only:
            return "backend"
        return "unknown"  # truly ambiguous — let AI decide
    # Infra
    if any(k in nl for k in ["infra", "deploy", "k8s", "docker", "ci", "terraform", "helm", "scripts", "bin"]):
        return "infra"
    # Config
    if any(k in nl for k in ["config", "conf", "env", "setting", "setup"]):
        return "config"
    return "unknown"


def _logic_architecture(
    repo_dir: Path,
    repo_name: str,
    top_dirs: list[tuple[str, int]],
    deps: dict[str, list[str]],
    infra: dict[str, bool],
    routes: list[dict[str, str]],
) -> tuple[list[dict], list[dict]]:
    """Pure-logic fallback graph — zero AI tokens."""
    # Determine repo type from real manifest files
    has_npm = "npm" in deps
    has_backend = any(k in deps for k in ["pip", "go", "cargo"])
    is_frontend_only = has_npm and not has_backend
    is_backend_only = has_backend and not has_npm

    nodes: list[dict] = []
    edges: list[dict] = []

    repo_type = "frontend" if is_frontend_only else "backend" if is_backend_only else "fullstack"
    nodes.append({
        "id": "repo", "label": repo_name.split("/")[-1],
        "kind": "repository", "importance": 5,
        "summary": f"{repo_type} repository.",
        "technologies": list(deps.keys()),
    })

    for dir_name, file_count in top_dirs[:8]:
        if dir_name in (".", "root"):
            continue
        nl = dir_name.lower()
        kind = _classify_dir(nl, is_frontend_only, is_backend_only)
        nid = f"dir-{re.sub(r'[^a-z0-9]', '-', nl)}"
        nodes.append({
            "id": nid, "label": f"/{dir_name}", "kind": kind,
            "importance": min(5, max(2, file_count // 5 + 2)),
            "summary": f"{file_count} files.",
            "technologies": [],
        })
        edges.append({"id": f"e-repo-{nid}", "source": "repo", "target": nid, "label": "contains", "kind": "contains", "risk": "low"})

    if infra.get("docker"):
        nodes.append({"id": "docker", "label": "Docker", "kind": "infra", "importance": 3, "summary": "Container runtime.", "technologies": ["Docker"]})
        edges.append({"id": "e-repo-docker", "source": "repo", "target": "docker", "label": "packages", "kind": "contains", "risk": "low"})
    if infra.get("github_actions"):
        nodes.append({"id": "ci", "label": "GitHub Actions", "kind": "infra", "importance": 3, "summary": "CI/CD pipeline.", "technologies": ["GitHub Actions"]})
        edges.append({"id": "e-repo-ci", "source": "repo", "target": "ci", "label": "automates", "kind": "contains", "risk": "low"})

    return nodes, edges


# ── Architecture ─────────────────────────────────────────────

def architecture_graph(repo_dir: Path, repo_name: str, complete: _COMPLETE) -> tuple[list[dict], list[dict], list[str]]:
    top_dirs = get_top_dirs(repo_dir)
    deps = parse_dependencies(repo_dir)
    infra = detect_infra(repo_dir)
    routes = extract_routes(repo_dir)

    # Step 1 — logic builds real structure
    logic_nodes, logic_edges = _logic_architecture(repo_dir, repo_name, top_dirs, deps, infra, routes)

    # Step 2 — compact structured payload to AI for enrichment
    has_npm = "npm" in deps
    has_backend = any(k in deps for k in ["pip", "go", "cargo"])
    repo_type = "frontend-only" if (has_npm and not has_backend) else "backend-only" if (has_backend and not has_npm) else "fullstack"
    structured = {
        "repo": repo_name,
        "repo_type": repo_type,
        "directories": [{"name": d, "files": c} for d, c in top_dirs[:10]],
        "package_managers": list(deps.keys()),
        "top_deps": {mgr: pkgs[:8] for mgr, pkgs in deps.items()},
        "route_count": len(routes),
        "sample_routes": [f"{r['method']} {r['path']}" for r in routes[:8]],
        "infra": {k: v for k, v in infra.items() if v},
        "logic_nodes": [{"id": n["id"], "label": n["label"], "kind": n["kind"]} for n in logic_nodes],
    }

    ai_nodes, ai_edges, insights = _enrich(structured, f"Architecture overview for a {repo_type} project — only show layers that actually exist in the repo.", complete)

    # Prefer AI result if it returned nodes, else use logic fallback
    final_nodes = ai_nodes if ai_nodes else logic_nodes
    final_edges = ai_edges if ai_edges else logic_edges
    if not insights:
        insights = ["Graph built from real directory structure and package manifests."]

    return final_nodes, final_edges, insights


# ── Dependencies ─────────────────────────────────────────────

def dependency_graph(repo_dir: Path, repo_name: str, complete: _COMPLETE) -> tuple[list[dict], list[dict], list[str]]:
    deps = parse_dependencies(repo_dir)
    top_dirs = get_top_dirs(repo_dir)
    infra = detect_infra(repo_dir)

    # Logic fallback nodes
    HIGH_RISK = {"express", "fastapi", "django", "flask", "spring", "axios", "requests", "httpx",
                 "jwt", "passport", "bcrypt", "crypto", "sqlalchemy", "prisma", "mongoose", "sequelize"}
    logic_nodes: list[dict] = [{"id": "core", "label": repo_name.split("/")[-1], "kind": "internal", "importance": 5, "summary": "Application core.", "technologies": list(deps.keys())}]
    logic_edges: list[dict] = []
    for manager, packages in deps.items():
        for pkg in packages[:10]:
            nid = f"dep-{re.sub(r'[^a-z0-9]', '-', pkg.lower())}"
            risk = "high" if pkg.lower() in HIGH_RISK else "medium" if any(k in pkg.lower() for k in ["auth", "db", "sql", "crypto", "jwt"]) else "low"
            logic_nodes.append({"id": nid, "label": pkg, "kind": "dependency", "importance": 3 if risk == "high" else 2, "summary": f"{manager} package.", "technologies": [manager]})
            logic_edges.append({"id": f"e-core-{nid}", "source": "core", "target": nid, "label": manager, "kind": "dependency", "risk": risk})

    structured = {
        "repo": repo_name,
        "dependencies": {mgr: pkgs[:15] for mgr, pkgs in deps.items()},
        "total_dep_count": sum(len(v) for v in deps.values()),
        "infra": {k: v for k, v in infra.items() if v},
    }

    ai_nodes, ai_edges, insights = _enrich(structured, "Dependency graph — show real package relationships, highlight security-sensitive ones.", complete)

    final_nodes = ai_nodes if ai_nodes else logic_nodes
    final_edges = ai_edges if ai_edges else logic_edges
    if not insights:
        insights = [f"Parsed {sum(len(v) for v in deps.values())} real dependencies from manifest files."]
    return final_nodes, final_edges, insights


# ── API Flow ─────────────────────────────────────────────────

def api_flow_graph(repo_dir: Path, repo_name: str, complete: _COMPLETE) -> tuple[list[dict], list[dict], list[str]]:
    routes = extract_routes(repo_dir)
    deps = parse_dependencies(repo_dir)
    top_dirs = get_top_dirs(repo_dir)
    infra = detect_infra(repo_dir)

    # Group routes by source file for logic fallback
    by_file: dict[str, list[dict]] = {}
    for r in routes:
        by_file.setdefault(r["file"], []).append(r)

    logic_nodes: list[dict] = [{"id": "client", "label": "Client", "kind": "frontend", "importance": 4, "summary": "HTTP request origin.", "technologies": []}]
    logic_edges: list[dict] = []
    for idx, (fpath, froutes) in enumerate(list(by_file.items())[:6]):
        fname = fpath.split("/")[-1].rsplit(".", 1)[0]
        nid = f"router-{idx}"
        methods = list({r["method"] for r in froutes})
        logic_nodes.append({"id": nid, "label": fname, "kind": "api", "importance": 4, "summary": f"{len(froutes)} routes in {fpath}.", "technologies": methods})
        logic_edges.append({"id": f"e-client-{nid}", "source": "client", "target": nid, "label": "/".join(methods[:2]), "kind": "api-flow", "risk": "low"})

    structured = {
        "repo": repo_name,
        "routes_by_file": {
            fpath: [f"{r['method']} {r['path']}" for r in froutes[:10]]
            for fpath, froutes in list(by_file.items())[:8]
        },
        "total_routes": len(routes),
        "top_deps": {mgr: pkgs[:6] for mgr, pkgs in deps.items()},
    }

    ai_nodes, ai_edges, insights = _enrich(structured, "API flow graph — show real request path through routes, middleware, services, and data layers.", complete)

    final_nodes = ai_nodes if ai_nodes else logic_nodes
    final_edges = ai_edges if ai_edges else logic_edges
    if not insights:
        insights = [f"{len(routes)} routes extracted from real source files across {len(by_file)} route handlers."]
    return final_nodes, final_edges, insights


# ── Repository Map ───────────────────────────────────────────

def repository_map(repo_dir: Path, repo_name: str, complete: _COMPLETE) -> tuple[list[dict], list[dict], list[str]]:
    top_dirs = get_top_dirs(repo_dir)
    deps = parse_dependencies(repo_dir)
    infra = detect_infra(repo_dir)

    logic_nodes: list[dict] = [{"id": "root", "label": repo_name.split("/")[-1], "kind": "repository", "importance": 5, "summary": f"{len(top_dirs)} top-level directories.", "technologies": list(deps.keys())}]
    logic_edges: list[dict] = []
    for dir_name, file_count in top_dirs[:12]:
        if dir_name in (".", "root"):
            continue
        nid = f"map-{re.sub(r'[^a-z0-9]', '-', dir_name.lower())}"
        logic_nodes.append({"id": nid, "label": f"/{dir_name}", "kind": "unknown", "importance": min(5, 1 + file_count // 8), "summary": f"{file_count} files.", "technologies": []})
        logic_edges.append({"id": f"e-root-{nid}", "source": "root", "target": nid, "label": "contains", "kind": "contains", "risk": "low"})

    structured = {
        "repo": repo_name,
        "directories": [{"name": d, "files": c} for d, c in top_dirs[:12]],
        "package_managers": list(deps.keys()),
        "infra": {k: v for k, v in infra.items() if v},
    }

    ai_nodes, ai_edges, insights = _enrich(structured, "Repository map — assign correct kinds to directories based on their names and file counts.", complete)

    final_nodes = ai_nodes if ai_nodes else logic_nodes
    final_edges = ai_edges if ai_edges else logic_edges
    if not insights:
        insights = [f"Repository map from {len(top_dirs)} real directories."]
    return final_nodes, final_edges, insights


# ── Timeline ─────────────────────────────────────────────────

def timeline(repo_dir: Path, repo_name: str, complete: _COMPLETE) -> tuple[list[dict[str, str]], str]:
    deps = parse_dependencies(repo_dir)
    infra = detect_infra(repo_dir)
    top_dirs = get_top_dirs(repo_dir)
    routes = extract_routes(repo_dir)

    # Logic builds real events from detected files
    events: list[dict[str, str]] = []
    stack = [mgr for mgr in ["npm", "pip", "go", "cargo"] if mgr in deps]

    events.append({
        "title": "Repository Bootstrap",
        "date_hint": "Project start",
        "detail": f"Initialized with {', '.join(stack) or 'unknown'} stack. {len(top_dirs)} top-level modules created.",
        "category": "foundation",
    })
    if sum(len(v) for v in deps.values()) > 20:
        events.append({
            "title": "Dependency Expansion",
            "date_hint": "Growth phase",
            "detail": f"{sum(len(v) for v in deps.values())} packages across {', '.join(deps.keys())} — feature-driven growth.",
            "category": "scalability",
        })
    if infra.get("docker"):
        events.append({"title": "Containerization Added", "date_hint": "Mid-stage", "detail": "Dockerfile/docker-compose detected — deployment standardization.", "category": "infrastructure"})
    if infra.get("github_actions"):
        events.append({"title": "CI/CD Automation", "date_hint": "Post-bootstrap", "detail": "GitHub Actions workflows — automated testing and delivery pipeline.", "category": "automation"})
    if routes:
        events.append({"title": "API Surface Established", "date_hint": "Feature phase", "detail": f"{len(routes)} routes extracted from {len({r['file'] for r in routes})} handler files.", "category": "scalability"})
    if infra.get("kubernetes"):
        events.append({"title": "Kubernetes Deployment", "date_hint": "Production phase", "detail": "K8s manifests found — production-grade orchestration.", "category": "infrastructure"})
    events.append({
        "title": "Current State",
        "date_hint": "Present",
        "detail": f"{sum(len(v) for v in deps.values())} deps, {len(routes)} routes, {len(top_dirs)} modules.",
        "category": "current",
    })

    # AI enriches the summary only (1 sentence, ~50 tokens)
    mini = build_mini_summary(repo_name, top_dirs, deps, routes, infra)
    summary = "Timeline inferred from real files."
    try:
        summary = complete([
            {"role": "system", "content": "One sentence summarizing this project's evolution based on the data. Be specific."},
            {"role": "user", "content": mini},
        ]).strip()
    except Exception:
        pass

    return events, summary
