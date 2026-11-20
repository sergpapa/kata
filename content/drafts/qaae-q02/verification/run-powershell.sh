#!/usr/bin/env bash
# Runs one command list in a single Windows PowerShell 5.1 session, echoing each line before its output.
# Usage (Git Bash):  run-powershell.sh <kit folder> <command list>
# The kit folder must be a COPY of the kit, outside the repository: several lists write files.
kit="$(cd "$1" && pwd -W)"
{
  echo "\$env:KIT = '$kit'; Set-Location \$env:KIT"
  while IFS= read -r line || [ -n "$line" ]; do
    [ -z "$line" ] && continue
    echo "Write-Host 'PS> ${line//\'/\'\'}'"
    echo "$line"
  done < "$2"
} | powershell.exe -NoProfile -Command - 2>&1 | sed -E 's/[[:space:]]+$//' | cat -s
