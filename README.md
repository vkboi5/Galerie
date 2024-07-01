# NFT Marketplace
# Web3 based Digital MarketPlace for Artisans and Collectors

## Technology Stack & Tools
- Solidity (Writing Smart Contract)
- Javascript (React & Testing)
- [Ethers](https://docs.ethers.io/v5/) (Blockchain Interaction)
- [Hardhat](https://hardhat.org/) (Development Framework)
- [Ipfs](https://ipfs.io/) (Metadata storage)
- [React routers](https://v5.reactrouter.com/) (Navigational components)

## Requirements For Initial Setup
- Install [NodeJS](https://nodejs.org/en/), should work with any node version below 16.5.0
- Install [Hardhat](https://hardhat.org/)


## Setting Up
### 1. Clone/Download the Repository

### 2. Install Dependencies:
```
$ cd Galerie
$ Please delete the yarn.lock file
```
### 3. Install Dependencies:
```
Also after deleting yarn.lock run this command 
if yarn 
$ yarn cache clean

if npm 
$ npm cache clean

$ npm install or yarn 
```

### 3. Boot up local development blockchain
```
$ cd Galerie
$ npx hardhat node
```

### 4. Connect development blockchain accounts to Metamask Browser Extension
- Copy private key of the addresses from the terminal and import to Metamask
- Connect your metamask to hardhat blockchain, network 127.0.0.1:8545.
- If you have not added hardhat to the list of networks on your metamask, open up a browser, click the fox icon, then click the top center dropdown button that lists all the available networks then click add networks. A form should pop up. For the "Network Name" field enter "Hardhat". For the "New RPC URL" field enter "http://127.0.0.1:8545". For the chain ID enter "31337". Then click save.  


### 5. Migrate Smart Contracts
`npx hardhat run src/backend/scripts/deploy.js --network localhost`

### 6. Run Tests
`$ npx hardhat test`

### 7. Launch Frontend
`$ npm run start`

To test as a telegram mini app, install cloudflare extension on VSCode and start it to obtain public accessible URL , use this URL to setup the telegram mini app through
bot.js file or through botfather.
Hopefully your telegram mini app should start without any errors!
