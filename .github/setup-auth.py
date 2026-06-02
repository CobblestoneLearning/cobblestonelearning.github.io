#!/usr/bin/env python3
"""
Mr. Meeseeks — one-command "Sign in with GitHub" setup for this repository hub.

  "I'm Mr. Meeseeks! Look at me!"  Run me and I won't rest until GitHub sign-in works.

WHY THIS EXISTS
  This hub is a static, public GitHub Pages site, so it cannot hold the OAuth client
  secret. A tiny Cloudflare Worker (in ./auth) performs the code->token exchange. This
  script wires that up end to end and VERIFIES the credentials against GitHub before it
  declares success. It is idempotent (safe to re-run — it only fixes what's missing) and
  it does NOT delete itself: it's a reusable project tool for teammates and forks.

  Your OAuth *client secret* is never seen by this script and never written to the repo —
  it goes straight into Cloudflare's hidden prompt.

RUN IT (from anywhere inside the repo):
  python3 .github/setup-auth.py

PREREQS
  • node + npx            (for `npx wrangler` — no install needed)
  • git                   (to push the wired config)
  • a free Cloudflare account
  • a GitHub OAuth App whose "Authorization callback URL" is  <your-pages-origin>/callback.html
    Make one at  https://github.com/settings/developers  (or your org's Developer settings).

WHAT IT DOES
  1. Reads this repo's config (account, worker name, origin, client id) from the files.
  2. Cloudflare login (skipped if already logged in).
  3. Deploys the ./auth worker (skipped if already deployed + reachable).
  4. Stores your OAuth client SECRET in Cloudflare and verifies it against GitHub
     (loops until GitHub accepts the credentials — a wrong/made-up value can't slip through).
  5. Writes the worker URL into AUTH_CONFIG.exchangeUrl and (with your OK) commits + pushes.
"""

import os
import re
import sys
import json
import time
import subprocess
import urllib.request
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = HERE if os.path.isfile(os.path.join(HERE, "index.html")) else os.path.dirname(HERE)
INDEX = os.path.join(REPO, "index.html")
AUTH  = os.path.join(REPO, "auth")
TOML  = os.path.join(AUTH, "wrangler.toml")

C = {"b": "\033[1m", "g": "\033[32m", "y": "\033[33m", "r": "\033[31m",
     "c": "\033[36m", "d": "\033[2m", "x": "\033[0m"}
def col(s, k): return f"{C[k]}{s}{C['x']}" if sys.stdout.isatty() else s
def banner(m): print("\n" + col("◈ " + m, "c"))
def ok(m):     print(col("  ✔ " + m, "g"))
def warn(m):   print(col("  ! " + m, "y"))
def info(m):   print("    " + m)
def step(t):   print(col("\n▶ " + t, "b"))
def die(m):
    print(col("\n  ✗ " + m, "r"))
    print(col("  (Nothing destructive done. Fix the above and re-run me anytime.)\n", "d"))
    sys.exit(1)
def ask(p):
    try:
        return input(col("  → " + p + " ", "y")).strip()
    except (EOFError, KeyboardInterrupt):
        die("Aborted.")
def confirm(p): ask(p + col("[Enter to continue, Ctrl-C to abort]", "d"))

def run(cmd, cwd=None, capture=False):
    print(col("  $ " + " ".join(cmd), "d"))
    if capture:
        p = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
        out = (p.stdout or "") + (p.stderr or "")
        if out.strip():
            print(out.rstrip())
        return p.returncode, out
    return subprocess.run(cmd, cwd=cwd).returncode, ""

def npx(*a): return ["npx", "--yes", "wrangler", *a]

def read(path): return open(path, encoding="utf-8").read() if os.path.isfile(path) else ""
def write(path, text): open(path, "w", encoding="utf-8").write(text)

def toml_val(key, default=""):
    m = re.search(key + r'\s*=\s*"([^"]*)"', read(TOML))
    return m.group(1) if m else default
def auth_cfg(field):
    m = re.search(field + r":\s*'([^']*)'", read(INDEX))
    return m.group(1) if m else ""
def account():
    m = re.search(r"api\.github\.com/users/([A-Za-z0-9-]+)/repos", read(INDEX))
    return m.group(1) if m else "your-github-account"

ORIGIN = toml_val("ALLOWED_ORIGIN") or ("https://" + account().lower() + ".github.io")
WORKER = toml_val("name") or "oauth-worker"
CALLBACK = ORIGIN.rstrip("/") + "/callback.html"

def set_in_index(field, value):
    txt = read(INDEX)
    new, n = re.subn(r"(" + field + r":\s*)'[^']*'", r"\1'" + value + "'", txt, count=1)
    if n == 1 and new != txt:
        write(INDEX, new); return True
    return False
def set_in_toml(key, value):
    txt = read(TOML)
    new, n = re.subn(r"(" + key + r'\s*=\s*)"[^"]*"', r'\1"' + value + '"', txt, count=1)
    if n == 1 and new != txt:
        write(TOML, new); return True
    return False

def probe(url):
    """POST a fake code; return GitHub's error string (None if a token came back)."""
    data = json.dumps({"code": "meeseeks_probe"}).encode()
    # A real User-Agent is required — Cloudflare's edge blocks the default
    # "Python-urllib" UA with a 1010 error before the request reaches the worker.
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Origin": ORIGIN, "Content-Type": "application/json",
                                          "User-Agent": "Mozilla/5.0 cobblestone-setup"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode()).get("error")
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode()).get("error", f"http_{e.code}")
        except Exception:
            return f"http_{e.code}"
    except Exception as e:
        return f"unreachable:{e}"


def preflight():
    banner(f'Mr. Meeseeks here! Wiring up "Sign in with GitHub" for {account()}.')
    for t in ("node", "npx", "git"):
        if subprocess.run(["which", t], capture_output=True).returncode != 0:
            die(f"'{t}' isn't on PATH — install it and re-run.")
    if not os.path.isfile(INDEX) or not os.path.isfile(TOML):
        die("Run me from inside the repo (couldn't find index.html / auth/wrangler.toml).")
    ok(f"Repo: {REPO}")
    ok(f"Account: {account()}   Origin: {ORIGIN}   Worker: {WORKER}")


def ensure_client_id():
    step("OAuth App Client ID")
    cid = auth_cfg("clientId")
    if cid:
        ok(f"Client ID already set: {cid}")
        return
    info("No Client ID yet. Create/open your OAuth App and copy its Client ID (public, not secret):")
    info(col("  https://github.com/settings/developers", "b") + "  → OAuth Apps → New/Choose app")
    info(f"Set the app's Authorization callback URL to:  {col(CALLBACK, 'b')}")
    cid = ask("Paste the Client ID:")
    if not re.match(r"^[A-Za-z0-9._-]{8,}$", cid):
        die("That doesn't look like a Client ID.")
    set_in_index("clientId", cid)
    set_in_toml("GITHUB_CLIENT_ID", cid)
    ok(f"Wrote Client ID into index.html + auth/wrangler.toml: {cid}")


def ensure_login():
    step("Cloudflare login")
    rc, out = run(npx("whoami"), capture=True)
    if rc == 0 and "not authenticated" not in out.lower():
        ok("Already logged in to Cloudflare.")
        return
    info("A browser window opens — log in (free account if needed) and approve.")
    confirm("Ready?")
    run(npx("login"))
    rc, out = run(npx("whoami"), capture=True)
    if rc != 0 or "not authenticated" in out.lower():
        die("Still not logged in to Cloudflare.")
    ok("Logged in to Cloudflare.")


def ensure_worker():
    step("Token-exchange worker (./auth)")
    url = auth_cfg("exchangeUrl")
    if url and probe(url) is not None:
        ok(f"Worker already deployed and reachable: {url}")
        return url
    info("Deploying the worker from ./auth (Client ID + ALLOWED_ORIGIN come from wrangler.toml).")
    info("If wrangler offers to register a *.workers.dev subdomain, say yes.")
    confirm("Ready to deploy?")
    rc, out = run(npx("deploy"), cwd=AUTH, capture=True)
    if rc != 0:
        die("Deploy failed (see output above).")
    m = re.search(r"https://[\w.-]+\.workers\.dev", out)
    url = m.group(0) if m else ""
    while not re.match(r"^https://[\w.-]+\.workers\.dev$", url):
        url = ask("Paste the https://...workers.dev URL wrangler printed:")
    ok(f"Worker deployed: {url}")
    return url


def fix_secret(url):
    # If GitHub already accepts the stored secret, nothing to do.
    if probe(url) == "bad_verification_code":
        ok("Stored client secret already matches GitHub — nothing to change.")
        return
    step("OAuth client SECRET")
    print(col("    ┌─ WHAT TO PASTE ──────────────────────────────────────────────┐", "c"))
    print(col("    │ NOT a made-up value. GitHub GENERATES this ~40-char secret    │", "c"))
    print(col("    │ for your OAuth App — it is the app's password.                │", "c"))
    print(col("    └───────────────────────────────────────────────────────────────┘", "c"))
    info("Get it here (working link):")
    info(col("  https://github.com/settings/developers", "b") + "  → OAuth Apps → your app")
    info("→ under 'Client secrets' → 'Generate a new client secret' → copy the full value (shown once).")
    info("Don't paste the Client ID by mistake.")
    while True:
        confirm("Got the real GitHub secret? Press Enter to paste it at the hidden prompt.")
        rc, _ = run(npx("secret", "put", "GITHUB_CLIENT_SECRET"), cwd=AUTH)
        if rc != 0:
            warn("wrangler couldn't store it. Try again.")
            continue
        print("    Verifying against GitHub …")
        time.sleep(3)
        err = probe(url)
        if err == "bad_verification_code":
            ok("GitHub ACCEPTS the credentials. 🎉  (It rejected only my fake test code — perfect.)")
            return
        if err == "incorrect_client_credentials":
            warn("GitHub still rejects it — that secret doesn't match this app (partial copy, a space, or the Client ID).")
            if ask("Generate a fresh secret and try again? [y/N]").lower() not in ("y", "yes"):
                die("Stopping so you can sort the secret. Re-run me anytime.")
            continue
        warn(f"Unexpected worker response: {err!r}")
        if ask("Try again? [y/N]").lower() not in ("y", "yes"):
            die("Stopping. Re-run me anytime.")


def wire_and_push(url):
    step("Wire config + push")
    if set_in_index("exchangeUrl", url):
        ok(f"Set AUTH_CONFIG.exchangeUrl = {url}")
    else:
        ok("exchangeUrl already correct.")
    rc, out = run(["git", "status", "--porcelain", "index.html", "auth/wrangler.toml"], cwd=REPO, capture=True)
    if not out.strip():
        ok("No config changes to push — already live.")
        return
    if ask("Commit + push the wired config to origin/main? [Y/n]").lower() in ("n", "no"):
        warn("Left changes uncommitted — push them yourself when ready.")
        return
    run(["git", "add", "index.html", "auth/wrangler.toml"], cwd=REPO)
    run(["git", "commit", "-m", "Configure GitHub sign-in (client id + worker exchange URL)"], cwd=REPO)
    rc, _ = run(["git", "push", "origin", "main"], cwd=REPO)
    if rc != 0:
        die("git push failed — config is wired locally; push manually.")
    ok("Pushed. GitHub Pages redeploys in ~1 min.")


def main():
    preflight()
    ensure_client_id()
    ensure_login()
    url = ensure_worker()
    fix_secret(url)
    wire_and_push(url)
    banner("All set. \"Ooh yeah, can do!\"")
    print(col(f"  Test it: open {ORIGIN}/ → 'Sign in with GitHub' → approve → private repos appear.\n", "b"))

if __name__ == "__main__":
    main()
