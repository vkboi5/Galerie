import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa';
import Confetti from 'react-dom-confetti';
import loaderGif from './loader.gif';
import './Home.css';
import backgroundImg from './bgfinal.png';

const PINATA_BASE_URL = 'https://api.pinata.cloud';

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
  const [likedItems, setLikedItems] = useState({});
  const [confettiTrigger, setConfettiTrigger] = useState({});

  const loadLikesFromPinata = async (itemId) => {
    try {
      const response = await axios.get(`${PINATA_BASE_URL}/data/pinList?status=pinned&metadata[keyvalues][itemId]={"value": "${itemId}", "op": "eq"}`, {
        headers: {
          pinata_api_key: process.env.REACT_APP_PINATA_API_KEY,
          pinata_secret_api_key: process.env.REACT_APP_PINATA_SECRET_API_KEY
        }
      });

      const pinataItems = response.data.rows;
      if (pinataItems.length > 0) {
        const metadata = pinataItems[0].metadata.keyvalues;
        return metadata.likes ? parseInt(metadata.likes) : 0;
      }
    } catch (error) {
      console.error('Error loading likes from Pinata:', error);
    }
    return 0;
  };

  const updateLikesOnPinata = async (itemId, likes) => {
    try {
      const metadata = {
        name: `likes-${itemId}`,
        keyvalues: {
          itemId: itemId,
          likes: likes.toString()
        }
      };

      const response = await axios.post(`${PINATA_BASE_URL}/pinning/pinJSONToIPFS`, metadata, {
        headers: {
          pinata_api_key: process.env.REACT_APP_PINATA_API_KEY,
          pinata_secret_api_key: process.env.REACT_APP_PINATA_SECRET_API_KEY
        }
      });

      return response.data.IpfsHash;
    } catch (error) {
      console.error('Error updating likes on Pinata:', error);
    }
  };

  const loadMarketplaceItems = async () => {
    if (!marketplace || !nft) {
      setLoading(false);
      return;
    }

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
            const likes = await loadLikesFromPinata(item.itemId);

            fetchedItems.push({
              totalPrice,
              itemId: item.itemId,
              seller: item.seller,
              creator: metadata.creator,  // Fetch creator address from metadata
              name: metadata.name,
              description: metadata.description,
              image: metadata.image,
              category: metadata.category,
              saleType: metadata.saleType,
              likes: likes
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

      // Trigger the confetti effect for the purchased item
      setConfettiTrigger((prev) => ({ ...prev, [item.itemId]: true }));

      // Reset the confetti trigger after a short duration
      setTimeout(() => {
        setConfettiTrigger((prev) => ({ ...prev, [item.itemId]: false }));
      }, 3000); // 3 seconds duration for confetti
    } catch (error) {
      console.error('Error buying item:', error);
      toast.error('Failed to buy item', { position: 'top-center' });
    }
  };

  const handleLike = async (itemId) => {
    const currentLikes = likes[itemId] || 0;
    const userHasLiked = likedItems[itemId] || false;

    const newLikes = userHasLiked ? currentLikes - 1 : currentLikes + 1;
    setLikes((prevLikes) => ({
      ...prevLikes,
      [itemId]: newLikes
    }));
    setLikedItems((prevLikedItems) => ({
      ...prevLikedItems,
      [itemId]: !userHasLiked
    }));

    await updateLikesOnPinata(itemId, newLikes);
  };

  useEffect(() => {
    const storedLikes = JSON.parse(localStorage.getItem('likes')) || {};
    const storedLikedItems = JSON.parse(localStorage.getItem('likedItems')) || {};
    setLikes(storedLikes);
    setLikedItems(storedLikedItems);
  }, []);

  useEffect(() => {
    localStorage.setItem('likes', JSON.stringify(likes));
    localStorage.setItem('likedItems', JSON.stringify(likedItems));
  }, [likes, likedItems]);

  useEffect(() => {
    loadMarketplaceItems();
  }, [selectedFilter, sortOrder, marketplace, nft]);

  const formatWalletAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 5)}***${address.slice(-4)}`;
  };

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
              <h1>Connecting Artists <br /> and Collectors <br />through
                <span className='Fonteffect'>
                <br /> NFT Innovation
                </span>
              </h1>
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
          <h2 className='section-title-today'>Today's Picks</h2>
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
        {loading ? (
          <main style={{ padding: '1rem 0', textAlign: 'center' }}>
            <img src={loaderGif} alt="Loading..." style={{ width: '100px', height: '100px' }} />
          </main>
        ) : items.length > 0 ? (
          <div ref={nftCardSectionRef} className="NftCardContainer">
            <div className="grid">
              {items.map((item, idx) => (
                <div key={idx} className="nft-card">
                  <div className="nft-image-container">
                    <button className="like-button" onClick={() => handleLike(item.itemId)}>
                      <FaHeart className="like-icon" style={{ color: likedItems[item.itemId] ? 'red' : 'white' }} /> {likes[item.itemId] || 0}
                    </button>
                    <img src={item.image} alt={item.name} className="nft-card-img" />
                  </div>
                  <div className="nft-card-body">
                    <h3 className="nft-card-title">{item.name}</h3>
                    <p className="nft-card-description">{item.description}</p>
                    <p className="nft-card-creator">Created By: {formatWalletAddress(item.creator)}</p> {/* Display formatted creator address */}
                    <p className="nft-card-price">
                      {ethers.utils.formatEther(item.totalPrice)} ETH
                    </p>
                    <button className="buy-button" onClick={() => buyMarketItem(item)}>
                      Buy
                    </button>
                    <div className="nft-card-actions">
                      <Confetti active={confettiTrigger[item.itemId]} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <main style={{ padding: '1rem 0', textAlign: 'center' }}>No listed assets</main>
        )}
      </div>
    </div>
  );
};

export default HomePage;
