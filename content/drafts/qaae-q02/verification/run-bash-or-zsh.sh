#!/usr/bin/env bash
# Runs one command list in a single bash or zsh session inside WSL, with each line echoed as it is read.
# Usage (Git Bash):  run-bash-or-zsh.sh <bash|zsh> <kit folder inside WSL> <command list> [folder holding node] [path to zsh]
# The shells start without their start-up files, so the output shows none of a system's extras
# (Ubuntu's "command not found" suggestions, aliases, comments at an interactive zsh prompt).
shell="$1"; kit="$2"; list="$3"; node_bin="${4:-}"; zsh_bin="${5:-zsh}"
if [ "$shell" = zsh ]; then first='setopt verbose'; start="$zsh_bin -f -s"; else first='set -v'; start='bash --norc --noprofile -s'; fi
{ echo "export KIT=\"$kit\"; cd \"\$KIT\""; echo "$first"; cat "$list"; echo; } |
  wsl -e bash -lc "[ -n \"$node_bin\" ] && export PATH=\"$node_bin:\$PATH\"; exec $start" 2>&1 | tr -d '\0' | cat -s
