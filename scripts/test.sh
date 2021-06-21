#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit
node_modules/.bin/truffle version
# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}

kill -9 $(lsof -t -i:8080) > /dev/null 2>&1 || true

echo "Starting our own ganache instance"

if [ "$SOLIDITY_COVERAGE" != true ]; then
  node --max-old-space-size=4096 node_modules/.bin/ganache-cli --chainId 1337 --gasLimit 0xfffffffffff --deterministic > /dev/null &
  ganache_pid=$!
  node --max-old-space-size=4096 node_modules/.bin/truffle test --network ganache "$@"
else
  node --max-old-space-size=4096 node_modules/.bin/truffle run coverage --network ganache 2>/dev/null
fi
