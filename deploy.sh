#!/bin/bash

if [ -f /.dockerenv ]; then
  # the script is run within the container
  echo "Omnibridge contract deployment started"
  yarn deploy
  if [ -f bridgeDeploymentResults.json ]; then
    cat bridgeDeploymentResults.json
    echo
  fi
  exit 0
fi

echo "The deployment must start withing the docker container"
exit 1