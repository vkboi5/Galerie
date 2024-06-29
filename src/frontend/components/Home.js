import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa';
import loaderGif from './loader.gif';
import './Home.css';
import backgroundImg from './bgfinal.png';

const HomePage = ({ marketplace, nft }) => {
  const navigate = useNavigate();
  const nftCardSectionRef = useRef(null);

  const handleCreateClick = () => {
    navigate('/create');
  };

  const handleExploreClick = () => {
    if (nftCardSectionRef.current) {
      nftCardSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);
  const [likes, setLikes] = useState({});

  const loadMarketplaceItems = async () => {
    try {
      const itemCount = await marketplace.itemCount();
      let fetchedItems = [];

      for (let i = 1; i <= itemCount.toNumber(); i++) {
        const item = await marketplace.items(i);
        if (!item.sold) {
          const uri = await nft.tokenURI(item.tokenId);
          try {
            const response = await fetch(uri);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const metadata = await response.json();
            const totalPrice = await marketplace.getTotalPrice(item.itemId);

            fetchedItems.push({
              totalPrice,
              itemId: item.itemId,
              seller: item.seller,
              name: metadata.name,
              description: metadata.description,
              image: metadata.image,
              category: metadata.category,
              saleType: metadata.saleType
            });
          } catch (fetchError) {
            console.error(`Error fetching metadata for item ${item.tokenId}:`, fetchError);
            toast.error(`Failed to fetch metadata for item ${item.tokenId}`, { position: 'top-center' });
          }
        }
      }

      let sortedItems = [...fetchedItems];

      if (selectedFilter === 'price') {
        if (sortOrder === 'highToLow') {
          sortedItems.sort((a, b) => b.totalPrice - a.totalPrice);
        } else if (sortOrder === 'lowToHigh') {
          sortedItems.sort((a, b) => a.totalPrice - b.totalPrice);
        }
      } else if (selectedFilter === 'category') {
        // Implement category filtering logic if needed
      } else if (selectedFilter === 'saleType') {
        // Implement sale type filtering logic if needed
      }

      setItems(sortedItems);
      setLoading(false);
    } catch (error) {
      console.error('Error loading marketplace items:', error);
      toast.error('Failed to load marketplace items', { position: 'top-center' });
    }
  };

  const buyMarketItem = async (item) => {
    try {
      await marketplace.purchaseItem(item.itemId, { value: item.totalPrice });
      await loadMarketplaceItems();
      toast.success('Item bought successfully!', { position: 'top-center' });
    } catch (error) {
      console.error('Error buying item:', error);
      toast.error('Failed to buy item', { position: 'top-center' });
    }
  };

  const handleLike = (itemId) => {
    setLikes((prevLikes) => ({
      ...prevLikes,
      [itemId]: (prevLikes[itemId] || 0) + 1
    }));
  };

  useEffect(() => {
    loadMarketplaceItems();
  }, [selectedFilter, sortOrder]);

  if (loading) {
    return (
      <main style={{ padding: '1rem 0', textAlign: 'center' }}>
        <img src={loaderGif} alt="Loading..." style={{ width: '100px', height: '100px' }} />
      </main>
    );
  }

  return (
    <div>
      <div className="gradient-section">
        <div className="gradient-sphere sphere1"></div>
        <div className="gradient-sphere sphere2"></div>
        <div className="gradient-sphere sphere3"></div>
        <div className="curved-line"></div>
        <div className="home-container">
          <ToastContainer />
          <div className="home-content">
            <div className="home-text">
              <h1>Connecting Artists <br/> and Collectors through NFT Innovation</h1>
              <p>Discover, collect, and trade exclusive NFTs effortlessly!</p>
              <div className="home-buttons">
                <button className="explore-button" onClick={handleExploreClick}>Explore</button>
                <button className="create-button" onClick={handleCreateClick}>Create</button>
              </div>
            </div>
            <div className="home-image">
              <img src={backgroundImg} alt="Monster NFTs" />
            </div>
          </div>
        </div>
      </div>
      <div className="white-section">
        <div className="filters">
          <h2>Today's Picks</h2>
          <div className="filter-options">
            <div className="filter-dropdown">
              <button className="filter-button" onClick={() => setSelectedFilter('price')}>
                Price range
              </button>
              {selectedFilter === 'price' && (
                <div className="dropdown-content">
                  <button onClick={() => setSortOrder('highToLow')}>High to Low</button>
                  <button onClick={() => setSortOrder('lowToHigh')}>Low to High</button>
                </div>
              )}
            </div>
            <div className="filter-dropdown">
              <button className="filter-button" onClick={() => setSelectedFilter('category')}>
                Category
              </button>
              {selectedFilter === 'category' && (
                <div className="dropdown-content">
                  <button>All</button>
                  <button>Art</button>
                  <button>Music</button>
                  <button>Photography</button>
                  {/* Add more category options as needed */}
                </div>
              )}
            </div>
            <div className="filter-dropdown">
              <button className="filter-button" onClick={() => setSelectedFilter('saleType')}>
                Sale Type
              </button>
              {selectedFilter === 'saleType' && (
                <div className="dropdown-content">
                  <button>Fixed Price</button>
                  <button>Timed Auction</button>
                  <button>Not For Sale</button>
                  {/* Add more sale type options as needed */}
                </div>
              )}
            </div>
          </div>
        </div>
        {items.length > 0 ? (
          <div ref={nftCardSectionRef} className="NftCardContainer">
            <div className="grid">
              {items.map((item, idx) => (
                <div key={idx} className="nft-card">
                  <div className="nft-image-container">
                    <img src={item.image} alt={item.name} className="nft-card-img" />
                  </div>
                  <div className="nft-card-body">
                    <h3 className="nft-card-title">{item.name}</h3>
                    <p className="nft-card-text">{item.description}</p>
                    <div className="nft-card-footer">
                      <span className="nft-card-price">{ethers.utils.formatEther(item.totalPrice)} ETH</span>
                      <button onClick={() => buyMarketItem(item)} className="buy-button">
                        Buy
                      </button>
                    </div>
                  </div>
                  <button className="like-button" onClick={() => handleLike(item.itemId)}>
                    <FaHeart className="heart-icon" />
                    {likes[item.itemId] || 0}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <main style={{ padding: '1rem 0' }}>
            <h2>No listed assets</h2>
          </main>
        )}
      </div>
    </div>
  );
};

export default HomePage;
