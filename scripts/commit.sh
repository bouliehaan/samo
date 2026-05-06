#!/usr/bin/env bash
set -e

MESSAGE="${1:-Update samo}"

echo "Current changes:"
git status --short

if git diff --quiet && git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

echo
echo "Staging changes..."
git add .

echo
echo "Committing with message: $MESSAGE"
git commit -m "$MESSAGE"
