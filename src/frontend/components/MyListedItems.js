import { useState, useEffect } from 'react';
import { ethers } from "ethers";
import './MyListedItems.css';
import loaderGif from './loader.gif';  // Make sure this path is correct

function renderSoldItems(items) {
  return (
    <>
      <h2 className="section-title">Sold</h2>
      <div className="grid">
        {items.map((item, idx) => (
          <div key={idx} className="card-custom">
            <img src={item.image} alt={item.name} className="card-img" />
          </div>
        ))}
      </div>
    </>
  );
}

export default function MyListedItems({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true);
  const [listedItems, setListedItems] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  
  const loadListedItems = async () => {
    const itemCount = await marketplace.itemCount();
    let listedItems = [];
    let soldItems = [];
    for (let indx = 1; indx <= itemCount; indx++) {
      const i = await marketplace.items(indx);
      if (i.seller.toLowerCase() === account) {
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
  };

  useEffect(() => {
    loadListedItems();
  }, []);

  if (loading) return (
    <main style={{ padding: "1rem 0", textAlign: 'center' }}>
      <img src={loaderGif} alt="Loading..." style={{ width: '100px', height: '100px' }} />
    </main>
  );

  return (
    <div className="flex justify-center">
      {listedItems.length > 0 ? (
        <div className="containerListedItems">
          <h2 className="section-title">Listed</h2>
          <div className="grid">
            {listedItems.map((item, idx) => (
              <div key={idx} className="card-custom">
                <img src={item.image} alt={item.name} className="card-img" />
                <div className="card-footer-custom">
                  <span className="card-text">
                    {ethers.utils.formatEther(item.totalPrice)} ETH
                  </span>
                </div>
              </div>
            ))}
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
