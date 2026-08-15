#!/usr/bin/env bash
#
# commit.sh — gate the working tree, commit it, and get it onto GitHub.
#
#   ./scripts/commit.sh "what changed and why"
#   ./scripts/commit.sh --skip-gates "docs only"
#   ./scripts/commit.sh                          # no message: just push what is committed
#
# The trunk here is `development`, not `main`. That is inherited from the
# feishin fork — origin/HEAD points at it and every commit lives there. `main`
# is a 2026-06-28 snapshot kept deliberately behind until the fork is done with
# upstream; do not push to it by reflex.

set -euo pipefail

BRANCH="development"
SKIP_GATES=0

for arg in "$@"; do
  case "$arg" in
    --skip-gates|-n) SKIP_GATES=1; shift ;;
  esac
done

MESSAGE="${*:-}"

# ---------------------------------------------------------------- preflight

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not inside a git repository." >&2
  exit 1
fi

# Run from the repo root whatever directory this was invoked from, so `git add`
# below stages the whole repo and not just the subtree you happen to be in.
cd "$(git rev-parse --show-toplevel)"

CURRENT="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT" != "$BRANCH" ]; then
  # Refusing is the point. This repo has extra worktrees under ../claude/samo,
  # each on its own branch, and `git add . && git commit` would happily bury an
  # afternoon's work on one of them without ever saying so.
  echo "Error: on '$CURRENT', expected '$BRANCH'." >&2
  echo "       git switch $BRANCH" >&2
  exit 1
fi

# --porcelain, NOT `git diff --quiet`: diff only sees files git already tracks.
# The old script used diff, so a change made entirely of NEW files — which is
# what a new feature usually is — printed "No changes to commit" and exited 0.
DIRTY="$(git status --porcelain)"

git fetch --quiet origin "$BRANCH"
AHEAD="$(git rev-list --count "origin/$BRANCH..HEAD")"

if [ -z "$DIRTY" ] && [ "$AHEAD" -eq 0 ]; then
  echo "Nothing to do — tree is clean and origin/$BRANCH is up to date."
  exit 0
fi

if [ -n "$DIRTY" ] && [ -z "$MESSAGE" ]; then
  echo "Error: uncommitted changes need a message." >&2
  echo "       ./scripts/commit.sh \"what changed and why\"" >&2
  exit 1
fi

# -------------------------------------------------------------------- gates
#
# The android app is a separate vitest project on its own config, so the root
# `pnpm test` does NOT run it — its 162 tests were invisible to any gate that
# only called the root one. Both suites run here.

run_gates() {
  echo "==> typecheck (core, node, web)"
  pnpm run typecheck

  echo "==> eslint"
  pnpm run lint-code

  echo "==> stylelint"
  pnpm run lint-styles

  echo "==> vitest (desktop + core)"
  pnpm test

  echo "==> android typecheck + eslint"
  pnpm -C apps/android run verify

  echo "==> vitest (android)"
  pnpm -C apps/android test
}

if [ "$SKIP_GATES" -eq 0 ]; then
  run_gates
else
  echo "==> Gates SKIPPED (--skip-gates)"
fi

# ------------------------------------------------------------------- commit

if [ -n "$DIRTY" ]; then
  echo "==> Changes:"
  git status --short

  git add -A
  git commit -m "$MESSAGE"
fi

# --------------------------------------------------------------------- push

# Fetch again — the gates above take minutes, and a push rejected for being
# behind is the most common way this ends in a mess.
git fetch --quiet origin "$BRANCH"

if [ "$(git rev-list --count "HEAD..origin/$BRANCH")" -gt 0 ]; then
  echo "==> origin/$BRANCH moved; rebasing onto it..."
  # Stops here on conflict or on unrelated histories, which is correct: both
  # need a human, and neither should be resolved by a script holding a commit.
  git pull --rebase origin "$BRANCH"

  if [ "$SKIP_GATES" -eq 0 ]; then
    echo "==> Re-running tests after rebase..."
    pnpm test
    pnpm -C apps/android test
  fi
fi

echo "==> Pushing to origin/$BRANCH..."
git push origin "$BRANCH"

# ------------------------------------------------------------------- verify

git fetch --quiet origin "$BRANCH"
read -r BEHIND STILL_AHEAD <<<"$(git rev-list --left-right --count "origin/$BRANCH...HEAD")"

if [ "$BEHIND" -eq 0 ] && [ "$STILL_AHEAD" -eq 0 ] && [ -z "$(git status --porcelain)" ]; then
  echo "==> Done. origin/$BRANCH == $(git rev-parse --short HEAD), tree clean."
else
  echo "Error: still out of sync (behind $BEHIND, ahead $STILL_AHEAD)." >&2
  exit 1
fi
