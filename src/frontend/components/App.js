import { Web3OnboardProvider, init } from '@web3-onboard/react';
import injectedModule from '@web3-onboard/injected-wallets';
import coinbaseModule from '@web3-onboard/coinbase';
import metamaskModule from '@web3-onboard/metamask';
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from './Navbar';
import Home from './Home.js';
import Create from './Create.js';
import MyListedItems from './MyListedItems.js';
import MyPurchases from './MyPurchases.js';
import MarketplaceAbi from '../contractsData/Marketplace.json';
import MarketplaceAddress from '../contractsData/Marketplace-address.json';
import NFTAbi from '../contractsData/NFT.json';
import NFTAddress from '../contractsData/NFT-address.json';
import { ethers } from "ethers";
import './App.css';

const INFURA_KEY = 'cd1f481035af45bd84d3b7589667d7e9';
const injected = injectedModule();
const coinbase = coinbaseModule();
const metamask = metamaskModule({
  options: {
    extensionOnly: false,
    i18nOptions: {
      enabled: true
    },
    dappMetadata: {
      name: 'ART Marketplace',
    }
  }
});

const wallets = [injected, coinbase, metamask];

const chains = [{
  id: '0x1',
  token: 'ETH',
  label: 'Ethereum Mainnet',
  rpcUrl: `https://mainnet.infura.io/v3/${INFURA_KEY}`
}];

const appMetadata = {
  name: "Connect Wallet Example",
  icon: "<svg>My App Icon</svg>",
  description: "Example showcasing how to connect a wallet.",
  recommendedInjectedWallets: [
    { name: "MetaMask", url: "https://metamask.io" },
    { name: "Coinbase", url: "https://wallet.coinbase.com/" }
  ]
};

const web3Onboard = init({
  wallets,
  chains,
  appMetadata
});

function App() {
  const [account, setAccount] = useState(null);
  const [nft, setNFT] = useState(null);
  const [marketplace, setMarketplace] = useState(null);
  
  const web3Handler = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(accounts[0]);
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    window.ethereum.on('chainChanged', (chainId) => {
      window.location.reload();
    });

    window.ethereum.on('accountsChanged', async function (accounts) {
      setAccount(accounts[0]);
      await web3Handler();
    });

    loadContracts(signer);
  };

  const loadContracts = async (signer) => {
    try {
      const marketplace = new ethers.Contract(MarketplaceAddress.address, MarketplaceAbi.abi, signer);
      setMarketplace(marketplace);
      const nft = new ethers.Contract(NFTAddress.address, NFTAbi.abi, signer);
      setNFT(nft);
    } catch (error) {
      console.error('Error loading contracts:', error);
      setMarketplace(null);
      setNFT(null);
    }
  };

  useEffect(() => {
    if (account) {
      web3Handler();
    }
  }, [account]);

  return (
    <Web3OnboardProvider web3Onboard={web3Onboard}>
      <BrowserRouter>
        <div className="App">
          <>
            <Navigation web3Handler={web3Handler} account={account} />
          </>
          <div>
            <Routes>
              <Route path="/" element={
                <Home marketplace={marketplace} nft={nft} />
              } />
              <Route path="/create" element={
                <Create marketplace={marketplace} nft={nft} />
              } />
              <Route path="/my-listed-items" element={
                <MyListedItems marketplace={marketplace} nft={nft} account={account} />
              } />
              <Route path="/my-purchases" element={
                <MyPurchases marketplace={marketplace} nft={nft} account={account} />
              } />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </Web3OnboardProvider>
  );
}

export default App;
