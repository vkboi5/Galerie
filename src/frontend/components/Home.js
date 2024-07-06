import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import noAssetsGif from './crying.gif';
import { FaHeart,FaTimes } from 'react-icons/fa';
import Confetti from 'react-dom-confetti';
import loaderGif from './loader.gif';
import './Home.css';
import Popup from 'reactjs-popup';
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
  const [bidAmounts, setBidAmounts] = useState({}); 
  const [userBids, setUserBids] = useState({}); // Track user bids
  const [timeRemaining, setTimeRemaining] = useState({});

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [currentBidItem, setCurrentBidItem] = useState(null);
  const [popupBidAmount, setPopupBidAmount] = useState('');

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
      const auctionCount = await marketplace.auctionCount();
      let fetchedItems = [];

      for (let i = 1; i <= itemCount.toNumber(); i++) {
        const item = await marketplace.items(i);
        if (!item.sold) {
          const tokenId = item.tokenId;

          try {
            const uri = await nft.tokenURI(tokenId);
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
              creator: metadata.creator,
              name: metadata.name,
              description: metadata.description,
              image: metadata.image,
              category: metadata.category,
              saleType: 'Fixed Price',
              likes: likes
            });
          } catch (fetchError) {
            console.error(`Error fetching metadata for item ${tokenId}:`, fetchError);
          }
        }
      }

      for (let i = 1; i <= auctionCount.toNumber(); i++) {
        const auction = await marketplace.auctions(i);
        if (!auction.ended) {
          const tokenId = auction.tokenId;

          try {
            const uri = await nft.tokenURI(tokenId);
            const response = await fetch(uri);

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const metadata = await response.json();
            const likes = await loadLikesFromPinata(auction.auctionId);

            fetchedItems.push({
              auctionId: auction.auctionId,
              seller: auction.seller,
              creator: metadata.creator,
              name: metadata.name,
              description: metadata.description,
              image: metadata.image,
              category: metadata.category,
              saleType: 'Timed Auction',
              auctionEnd: new Date(auction.endTime * 1000),
              highestBid: auction.highestBid,
              likes: likes
            });
          } catch (fetchError) {
            console.error(`Error fetching metadata for auction ${tokenId}:`, fetchError);
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
      }

      setItems(sortedItems);
      setLoading(false);
    } catch (error) {
      console.error('Error loading marketplace items:', error);
      setLoading(false);
    }
  };

  const handleOpenPopup = (item) => {
    setCurrentBidItem(item);
    setPopupBidAmount('');
    setIsPopupOpen(true);
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

  const handlePlaceBid = async () => {
    const item = currentBidItem;
    const bidAmount = ethers.utils.parseEther(popupBidAmount);

    if (userBids[item.auctionId] && bidAmount <= userBids[item.auctionId]) {
      toast.error('Bid must be higher than the current bid');
      return;
    }

    if (bidAmount <= item.highestBid) {
      toast.error('Bid must be higher than the current highest bid');
      return;
    }

    try {
      await marketplace.placeBid(item.auctionId, { value: bidAmount });
      setUserBids((prevBids) => ({
        ...prevBids,
        [item.auctionId]: bidAmount
      }));
      await loadMarketplaceItems();
      toast.success('Bid placed successfully!', { position: 'top-center' });

      // Close the popup after placing the bid
      setIsPopupOpen(false);
    } catch (error) {
      console.error('Error placing bid:', error);
      toast.error('Failed to place bid', { position: 'top-center' });
    }
  };


  const handleBidChange = (itemId, value) => {
    setBidAmounts((prevBidAmounts) => ({
      ...prevBidAmounts,
      [itemId]: value
    }));
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

  const getTimeRemaining = (endTime) => {
    const total = Date.parse(endTime) - Date.now();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return {
      total,
      days,
      hours,
      minutes,
      seconds,
    };
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTimeRemaining((prevRemaining) => {
        const newRemaining = {};
        items.forEach((item) => {
          if (item.saleType === 'Timed Auction') {
            const timeLeft = item.auctionEnd - now;
            newRemaining[item.auctionId] = timeLeft > 0 ? timeLeft : 0;
          }
        });
        return newRemaining;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [items]);

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
              <h1>
                Connecting Artists <br /> and Collectors <br /> through
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
                    <button className="like-button" onClick={() => handleLike(item.itemId || item.auctionId)}>
                      <FaHeart className="like-icon" style={{ color: likedItems[item.itemId || item.auctionId] ? 'red' : 'white' }} /> {likes[item.itemId || item.auctionId] || 0}
                    </button>
                    <img src={item.image} alt={item.name} className="nft-card-img" />
                  </div>
                  <div className="nft-card-body">
                    <h3 className="nft-card-title">{item.name}</h3>
                    <p className="nft-card-description">{item.description}</p>
                    <p className="nft-card-creator">Created By: {formatWalletAddress(item.creator)}</p>
                    <p className="nft-card-price">
                      {item.saleType === 'Fixed Price' ? (
                        `${ethers.utils.formatEther(item.totalPrice)} ETH`
                      ) : (
                        <>
                          <span>Auction Ends:<br />{getTimeRemaining(item.auctionEnd).days}d {getTimeRemaining(item.auctionEnd).hours}h {getTimeRemaining(item.auctionEnd).minutes}m {getTimeRemaining(item.auctionEnd).seconds}s</span>
                        </>
                      )}
                    </p>
                    {item.saleType === 'Fixed Price' ? (
                      <button className="buy-button" onClick={() => buyMarketItem(item)}>Buy</button>
                    ) : (
                      <>
                        <button className="place-bid-button" onClick={() => handleOpenPopup(item)}>Place Bid</button>
                      </>
                    )}
                    <div className="nft-card-actions">
                      <Confetti active={confettiTrigger[item.itemId]} />
                      <Popup
                        trigger={<button className="share-button">Share</button>}
                        position="center center"
                        closeOnDocumentClick
                        contentStyle={{ padding: '0', border: 'none', width: '300px', height: '200px' }}
                        overlayStyle={{ background: 'rgba(0, 0, 0, 0.5)' }}
                      >
                        {close => (
                          <div className="popup-content-home">
                            <FaTimes className="close-icon" onClick={close} />
                          </div>
                        )}
                      </Popup>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="no-assets">
            <img src={noAssetsGif} alt="No listed assets" className="no-assets-gif" /> 
            <span className="lastline">No listed assets</span>
          </div>
        )}
      </div>
  
      <Popup open={isPopupOpen} closeOnDocumentClick onClose={() => setIsPopupOpen(false)}>
        <div className="popup-content-home">
          <FaTimes className="close-icon-home" onClick={() => setIsPopupOpen(false)} />
          <h3>Place Your Bid</h3>
          {currentBidItem && (
            <>
              <span>Highest Bid: {ethers.utils.formatEther(currentBidItem.highestBid || '0')} ETH</span>
              <input
                type="number"
                placeholder="Enter bid amount in ETH"
                value={popupBidAmount}
                onChange={(e) => setPopupBidAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className="popup-bid-input-home"
              />
              <button className="place-bid-button" onClick={handlePlaceBid}>
                Confirm Bid
              </button>
            </>
          )}
        </div>
      </Popup>
    </div>
  );
};

export default HomePage;