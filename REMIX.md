How to access the contracts in the Remix IDE
====

It is possible to use the docker container to modify, test and deploy the contracts in the Remix IDE.

## Read-Only Access

If it is not needed to modify the contracts, they can be opened in the Remix IDE without necessity to clone the repo:

1. Pull the docker image 
   ```
   docker pull omnibridge/nft-contracts:latest
   ```

2. Run the container
   ```
   docker run -d --rm --name nft-ob-remixd -p 65520:65520 
       omnibridge/nft-contracts:latest yarn remixd
   ```

3. Open a new workspace [through connectivity to localhost](https://remix-ide.readthedocs.io/en/latest/remixd.html) in the Remix IDE. It is important to use HTTPS to access the IDE: https://remix.ethereum.org/.

## Keep the changes

In case of the modification of the contracts it makes sense to mount the local directory with the git repo in the Remix IDE.

1. Pull the docker image 
   ```
   docker pull omnibridge/nft-contracts:latest
   ```
2. Move to the directory with the contracts.
   ```
   cd omnibridge-nft
   ```

3. Run the container
   ```
   docker run -d --rm --name nft-ob-remixd -p 65520:65520
       -v $(pwd):/workdir omnibridge/nft-contracts:latest yarn remixd
   ```

4. Open a new workspace [through connectivity to localhost](https://remix-ide.readthedocs.io/en/latest/remixd.html) in the Remix IDE. It is important to use HTTPS to access the IDE: https://remix.ethereum.org/.