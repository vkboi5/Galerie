import React, { useState, useEffect } from 'react';
import { ethers } from "ethers";
import Popup from 'reactjs-popup';
import { FaTimes, FaWhatsapp, FaTwitter, FaFacebook, FaLinkedin, FaPinterest, FaTimesCircle, FaShareAlt } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
  const [itemToDelete, setItemToDelete] = useState(null); // State to hold the item to delete

  // Function to load listed items from the marketplace
  const loadListedItems = async () => {
    try {
      const itemCount = await marketplace.itemCount();
      const auctionCount = await marketplace.auctionCount();
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
            image: metadata.image,
            saleType: 'Fixed Price'
          };
          listedItems.push(item);
          if (i.sold) soldItems.push(item);
        }
      }
      for (let indx = 1; indx <= auctionCount; indx++) {
        const i = await marketplace.auctions(indx);
        if (i.seller.toLowerCase() === account.toLowerCase()) {
          const uri = await nft.tokenURI(i.tokenId);
          const response = await fetch(uri);
          const metadata = await response.json();
          const totalPrice = await marketplace.getTotalPrice(i.auctionId); // Fetch total price for auction
          let item = {
            auctionId: i.auctionId,
            totalPrice, // Use total price for rendering
            itemId: i.tokenId,
            name: metadata.name,
            description: metadata.description,
            image: metadata.image,
            saleType: 'Auction'
          };
          listedItems.push(item);
          if (i.ended) soldItems.push(item);
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

  const deleteItem = async (item) => {
    try {
      // Call the marketplace contract to delete the item
      await marketplace.removeItem(item.itemId);
      // Reload the listed items
      loadListedItems();
      // Close the delete confirmation popup
      setItemToDelete(null);
      // Show toast notification
      toast.success('Item Deleted Successfully!', {
        position: "top-center"
      });
    } catch (error) {
      console.error("Error deleting item: ", error);
    }
  };

  // Effect to load items when component mounts or dependencies change
  useEffect(() => {
    if (account && marketplace && nft) {
      loadListedItems();
    }
  }, [account, marketplace, nft]);

  // Function to handle sharing
  const handleShare = (item, platform) => {
    const shareUrl = item.image; // Using the image URL directly
    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this NFT: ${item.name}\n${shareUrl}`)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this NFT: ${item.name}`)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'pinterest':
        url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(item.name)}`;
        break;
      default:
        break;
    }
    window.open(url, '_blank');
  };

  // Loading state rendering
  if (loading) return (
    <main style={{ padding: "1rem 0", textAlign: 'center' }}>
      <img src={loaderGif} alt="Loading..." style={{ width: '100px', height: '100px' }} />
    </main>
  );

  // Main content rendering
  return (
    <div className="flex justify-center">
      <ToastContainer />
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
                    <FaTimesCircle 
                      className="delete-icon" 
                      size={24} 
                      onClick={() => setItemToDelete(item)} // Set the item to delete when icon is clicked
                    />
                    <Popup
                      trigger={<button className="share-button"><FaShareAlt size={16} style={{ marginRight: '8px' }} /> Share</button>}
                      position="center center"
                      closeOnDocumentClick
                      contentStyle={{ padding: '0', border: 'none', width: '100%', height: '100%' }}
                      overlayStyle={{ background: 'rgba(0, 0, 0, 0.5)' }}
                    >
                      {close => (
                        <div className="share-popup-container">
                          <div className="share-popup">
                            <FaTimes className="close-icon" onClick={close} />
                            <h3>Share on Social Media</h3>
                            <div className="share-options">
                              <button onClick={() => handleShare(item, 'whatsapp')}>
                                <FaWhatsapp size={32} style={{ color: '#25D366' }} /><span>WhatsApp</span>
                              </button>
                              <button onClick={() => handleShare(item, 'twitter')}>
                                <FaTwitter size={32} style={{ color: '#1DA1F2' }} /><span>Twitter</span>
                              </button>
                              <button onClick={() => handleShare(item, 'facebook')}>
                                <FaFacebook size={32} style={{ color: '#1877F2' }} /><span>Facebook</span>
                              </button>
                              <button onClick={() => handleShare(item, 'linkedin')}>
                                <FaLinkedin size={32} style={{ color: '#0077B5' }} /><span>LinkedIn</span>
                              </button>
                              <button onClick={() => handleShare(item, 'pinterest')}>
                                <FaPinterest size={32} style={{ color: '#E60023' }} /><span>Pinterest</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Popup>
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
      {itemToDelete && (
        <Popup
          open={true}
          closeOnDocumentClick
          onClose={() => setItemToDelete(null)}
          contentStyle={{ padding: '0', border: 'none', width: '300px', textAlign: 'center' }}
          overlayStyle={{ background: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="delete-confirmation-popup">
            <h3>Delete Item</h3>
            <p>Are you sure you want to delete this item?</p>
            <div className="popup-buttons">
              <button className="confirm-button" onClick={() => deleteItem(itemToDelete)}>Delete</button>
              <button className="cancel-button" onClick={() => setItemToDelete(null)}>Cancel</button>
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
}
