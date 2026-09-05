#!/usr/bin/env bash
#
# commit.sh — gate the working tree, commit it, and get it onto GitHub.
#
#   ./scripts/commit.sh "what changed and why"
#   ./scripts/commit.sh --skip-gates "docs only"
#   ./scripts/commit.sh                          # no message: just push what is committed
#
# The trunk here is `development`, not `main`. That is inherited from the
# feishin fork — origin/HEAD points at it and every commit lives there, and
# there are extra worktrees under ../claude/samo on their own branches, so this
# refuses to run anywhere else.
#
# `main` used to be a 2026-06-28 fork snapshot held deliberately behind. It is
# not any more: releases are cut from it, so it has to be development's
# published face rather than a branch with a life of its own. Once development
# is pushed and verified, main is fast-forwarded to match.
#
# Fast-forward ONLY. If main ever holds a commit development lacks, someone
# committed to it directly, and a script standing on a finished push is the
# wrong place to reconcile that — it says so and stops.

set -euo pipefail

BRANCH="development"
RELEASE_BRANCH="main"
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

# ----------------------------------------------------------- release branch
#
# Pushes HEAD straight at the remote ref rather than checking main out: the
# branch guard above exists precisely so work cannot happen on the wrong
# branch, and this must not be the thing that leaves you standing on one.
#
# Fast-forward ONLY. If main ever holds a commit development lacks, someone
# committed to it directly, and a script standing on a finished push is the
# wrong place to reconcile that.
sync_release_branch() {
  git fetch --quiet origin "$RELEASE_BRANCH"

  if ! git rev-parse --verify --quiet "origin/$RELEASE_BRANCH" >/dev/null; then
    echo "Error: origin/$RELEASE_BRANCH does not exist." >&2
    echo "       origin/$BRANCH is correct; create $RELEASE_BRANCH by hand." >&2
    return 1
  fi

  if ! git merge-base --is-ancestor "origin/$RELEASE_BRANCH" HEAD; then
    local diverged
    diverged="$(git rev-list --count "HEAD..origin/$RELEASE_BRANCH")"
    echo "Error: origin/$RELEASE_BRANCH has $diverged commit(s) $BRANCH does not." >&2
    echo "       origin/$BRANCH is pushed and correct — this is only the release branch." >&2
    echo "       Inspect: git log --oneline $BRANCH..origin/$RELEASE_BRANCH" >&2
    return 1
  fi

  local behind
  behind="$(git rev-list --count "origin/$RELEASE_BRANCH..HEAD")"
  if [ "$behind" -eq 0 ]; then
    echo "==> origin/$RELEASE_BRANCH already level."
  else
    echo "==> Fast-forwarding origin/$RELEASE_BRANCH ($behind commit(s))..."
    git push origin "HEAD:$RELEASE_BRANCH"
  fi

  git fetch --quiet origin "$RELEASE_BRANCH"
  if [ "$(git rev-parse "origin/$RELEASE_BRANCH")" != "$(git rev-parse HEAD)" ]; then
    echo "Error: origin/$RELEASE_BRANCH did not end up level with $BRANCH." >&2
    return 1
  fi
}

if [ -z "$DIRTY" ] && [ "$AHEAD" -eq 0 ]; then
  # Nothing to commit does NOT mean nothing to do. A previous run can have
  # pushed development and then failed before mirroring, and an early exit here
  # would leave the release branch lagging with no way to notice.
  sync_release_branch
  echo "Nothing to commit — tree is clean and origin/$BRANCH is up to date."
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

if [ "$BEHIND" -ne 0 ] || [ "$STILL_AHEAD" -ne 0 ] || [ -n "$(git status --porcelain)" ]; then
  echo "Error: still out of sync (behind $BEHIND, ahead $STILL_AHEAD)." >&2
  exit 1
fi

# Only ever mirrors a development that has just been verified above.
sync_release_branch

echo "==> Done. origin/$BRANCH and origin/$RELEASE_BRANCH == $(git rev-parse --short HEAD), tree clean."
