import React, { useState, useEffect } from 'react';
import { ethers } from "ethers";
import './MyListedItems.css';
import loaderGif from './loader.gif';  // Ensure the path to the loader gif is correct

// Function to render sold items
function renderSoldItems(items) {
  return (
    <div className="section-title-sold">
      <h2>Sold</h2>
      <div className="grid">
        {items.map((item, idx) => (
          <div key={idx} className="card-custom sold-card">
            <img src={item.image} alt={item.name} className="card-img" />
            <div className="card-footer-custom">
              <span className="card-text">{item.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main component for listed items
export default function MyListedItems({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true);
  const [listedItems, setListedItems] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  
  // Function to load listed items from the marketplace
  const loadListedItems = async () => {
    try {
      const itemCount = await marketplace.itemCount();
      let listedItems = [];
      let soldItems = [];
      for (let indx = 1; indx <= itemCount; indx++) {
        const i = await marketplace.items(indx);
        if (i.seller.toLowerCase() === account.toLowerCase()) {
          const uri = await nft.tokenURI(i.tokenId);
          const response = await fetch(uri);
          const metadata = await response.json();
          const totalPrice = await marketplace.getTotalPrice(i.itemId);
          let item = {
            totalPrice,
            price: i.price,
            itemId: i.itemId,
            name: metadata.name,
            description: metadata.description,
            image: metadata.image
          };
          listedItems.push(item);
          if (i.sold) soldItems.push(item);
        }
      }
      setLoading(false);
      setListedItems(listedItems);
      setSoldItems(soldItems);
    } catch (error) {
      console.error("Error loading listed items: ", error);
      setLoading(false);
    }
  };

  // Effect to load items when component mounts or dependencies change
  useEffect(() => {
    if (account && marketplace && nft) {
      loadListedItems();
    }
  }, [account, marketplace, nft]);

  // Loading state rendering
  if (loading) return (
    <main style={{ padding: "1rem 0", textAlign: 'center' }}>
      <img src={loaderGif} alt="Loading..." style={{ width: '100px', height: '100px' }} />
    </main>
  );

  // Main content rendering
  return (
    <div className="flex justify-center">
      {listedItems.length > 0 ? (
        <div className="containerListedItems">
          <div className="section-title-listed">
            <h2>Listed</h2>
            <div className="grid">
              {listedItems.map((item, idx) => (
                <div key={idx} className="card-custom listed-card">
                  <img src={item.image} alt={item.name} className="card-img" />
                  <div className="card-footer-custom">
                    <span className="card-text">
                      {ethers.utils.formatEther(item.totalPrice)} ETH
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {soldItems.length > 0 && renderSoldItems(soldItems)}
        </div>
      ) : (
        <main style={{ padding: "1rem 0" }}>
          <h2 className="section-title">No listed assets</h2>
        </main>
      )}
    </div>
  );
}