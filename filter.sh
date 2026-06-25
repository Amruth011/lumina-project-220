#!/bin/bash
git filter-branch -f --env-filter '
if echo "$GIT_AUTHOR_NAME" | grep -qi "gpt-engineer"; then
    export GIT_AUTHOR_NAME="Amruth Kumar M"
    export GIT_AUTHOR_EMAIL="amruth.kumar.portfolio@gmail.com"
fi
if echo "$GIT_COMMITTER_NAME" | grep -qi "gpt-engineer"; then
    export GIT_COMMITTER_NAME="Amruth Kumar M"
    export GIT_COMMITTER_EMAIL="amruth.kumar.portfolio@gmail.com"
fi
' -- --all
