import { useState, useEffect } from 'react';
import { ethers } from "ethers";
import loaderGif from './loader.gif';
import './MyPurchases.css';

export default function MyPurchases({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  
  const loadPurchasedItems = async () => {
    try {
      const filter = marketplace.filters.Bought(null, null, null, null, null, account);
      const results = await marketplace.queryFilter(filter);
      const purchases = await Promise.all(results.map(async i => {
        i = i.args;
        const uri = await nft.tokenURI(i.tokenId);
        const response = await fetch(uri);
        const metadata = await response.json();
        const totalPrice = await marketplace.getTotalPrice(i.itemId);
        let purchasedItem = {
          totalPrice,
          price: i.price,
          itemId: i.itemId,
          name: metadata.name,
          description: metadata.description,
          image: metadata.image
        };
        return purchasedItem;
      }));
      setLoading(false);
      setPurchases(purchases);
    } catch (error) {
      console.error("Error loading purchased items: ", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account && marketplace && nft) {
      loadPurchasedItems();
    }
  }, [account, marketplace, nft]);

  if (loading) return (
    <main style={{ padding: "1rem 0", textAlign: 'center' }}>
      <img src={loaderGif} alt="Loading..." style={{ width: '100px', height: '100px' }} />
    </main>
  );

  return (
    <div>
      {purchases.length > 0 ?
        <div className="gridpurchase">
          {purchases.map((item, idx) => (
            <div key={idx} className="card-custom-purchase">
              <img src={item.image} alt={item.name} className="card-img-purchase" />
              <div className="card-footer-custom-purchase">
                <span className="card-text-purchase">{ethers.utils.formatEther(item.totalPrice)} ETH</span>
              </div>
            </div>
          ))}
        </div>
        : (
          <main className="section-title-no-purchase">
            <h2>No purchases</h2>
          </main>
        )}
    </div>
  );
}
