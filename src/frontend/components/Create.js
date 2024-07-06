import axios from 'axios';
import { useState, useRef, useEffect } from 'react';
import { ethers } from "ethers";
import { Row, Col, Form, Button, Spinner } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import { FaTag, FaGavel, FaUsers } from 'react-icons/fa';
import Confetti from 'react-dom-confetti';
import 'react-toastify/dist/ReactToastify.css';
import './Create.css';
import nftImage from './arebg.png'; // Replace with your image path

const Create = ({ marketplace, nft }) => {
  const [fileImg, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [name, setName] = useState("");
  const [desc, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [minBid, setMinBid] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('fixed');
  const [showConfetti, setShowConfetti] = useState(false);
  const [isNameValid, setIsNameValid] = useState(true);
  const [isPriceValid, setIsPriceValid] = useState(true);
  const [isFileValid, setIsFileValid] = useState(true);
  const [isMinBidValid, setIsMinBidValid] = useState(true);
  const [isStartDateValid, setIsStartDateValid] = useState(true);
  const [isEndDateValid, setIsEndDateValid] = useState(true);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFile(file);
    setFileName(file ? file.name : "");
    setIsFileValid(true);
  };

  useEffect(() => {
    setIsNameValid(true);
    setIsPriceValid(true);
    setIsFileValid(true);
    setIsMinBidValid(true);
    setIsStartDateValid(true);
    setIsEndDateValid(true);
  }, []);

  const validateForm = () => {
    let isValid = true;

    if (!name) {
      setIsNameValid(false);
      isValid = false;
    }

    if (!fileImg) {
      setIsFileValid(false);
      isValid = false;
    }

    if (selectedMethod === 'fixed' && !price) {
      setIsPriceValid(false);
      isValid = false;
    }

    if ((selectedMethod === 'auction' || selectedMethod === 'bids') && !minBid) {
      setIsMinBidValid(false);
      isValid = false;
    }

    if ((selectedMethod === 'auction' || selectedMethod === 'bids') && !startDate) {
      setIsStartDateValid(false);
      isValid = false;
    }

    if ((selectedMethod === 'auction' || selectedMethod === 'bids') && !endDate) {
      setIsEndDateValid(false);
      isValid = false;
    }

    if (selectedMethod === 'bids' && !price) {
      setIsPriceValid(false);
      isValid = false;
    }

    return isValid;
  };

  const sendJSONtoIPFS = async (ImgHash, walletAddress) => {
    try {
      const resJSON = await axios({
        method: "post",
        url: "https://api.pinata.cloud/pinning/pinJsonToIPFS",
        data: {
          name,
          description: desc,
          image: ImgHash,
          creator: walletAddress
        },
        headers: {
          pinata_api_key: process.env.REACT_APP_PINATA_API_KEY,
          pinata_secret_api_key: process.env.REACT_APP_PINATA_SECRET_API_KEY
        }
      });

      const tokenURI = `https://gateway.pinata.cloud/ipfs/${resJSON.data.IpfsHash}`;
      console.log("Token URI", tokenURI);
      mintThenList(tokenURI, walletAddress);
    } catch (error) {
      console.log("JSON to IPFS: ", error);
      setIsLoading(false);
    }
  };

  const sendFileToIPFS = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation check
    if (!name || !fileImg || (selectedMethod === 'fixed' && !price) ||
        (selectedMethod === 'auction' && (!minBid || !startDate || !endDate)) ||
        (selectedMethod === 'bids' && (!price || !minBid || !startDate || !endDate))) {
      
      setIsNameValid(!!name);
      setIsFileValid(!!fileImg);
      if (selectedMethod === 'fixed') {
        setIsPriceValid(!!price);
      } else if (selectedMethod === 'auction' || selectedMethod === 'bids') {
        setIsMinBidValid(!!minBid);
        setIsStartDateValid(!!startDate);
        setIsEndDateValid(!!endDate);
        if (selectedMethod === 'bids') {
          setIsPriceValid(!!price);
        }
      }
      toast.error("Please fill in all required fields!", {
        position: "top-center"
      });
      setIsLoading(false);
      return;
    }

    if (fileImg) {
      try {
        const formData = new FormData();
        formData.append("file", fileImg);

        const resFile = await axios({
          method: "post",
          url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
          data: formData,
          headers: {
            pinata_api_key: process.env.REACT_APP_PINATA_API_KEY,
            pinata_secret_api_key: process.env.REACT_APP_PINATA_SECRET_API_KEY,
            "Content-Type": "multipart/form-data"
          }
        });

        const ImgHash = `https://gateway.pinata.cloud/ipfs/${resFile.data.IpfsHash}`;
        console.log(ImgHash);

        // Get the user's wallet address
        const signer = nft.signer;
        const walletAddress = await signer.getAddress();

        sendJSONtoIPFS(ImgHash, walletAddress);
      } catch (error) {
        console.log("File to IPFS: ", error);
        setIsLoading(false);
      }
    }
  };

  const mintThenList = async (uri, walletAddress) => {
    try {
      // mint nft
      await (await nft.mint(uri)).wait();
      // get tokenId of new nft
      const id = await nft.tokenCount();
      // approve marketplace to spend nft
      await (await nft.setApprovalForAll(marketplace.address, true)).wait();

      if (selectedMethod === 'fixed') {
        // add nft to marketplace as fixed price item
        const listingPrice = ethers.utils.parseEther(price.toString());
        await (await marketplace.makeItem(nft.address, id, listingPrice)).wait();
        // Show success notification
        toast.success("NFT Listed Successfully!", {
          position: "top-center"
        });
      } else if (selectedMethod === 'auction') {
        // add nft to marketplace as auction item
        const auctionDuration = Math.floor((new Date(endDate).getTime() - new Date().getTime()) / 1000);
        await (await marketplace.createAuction(nft.address, id, auctionDuration)).wait();
        // Show success notification
        toast.success("NFT Auction Created Successfully!", {
          position: "top-center"
        });
      } else if (selectedMethod === 'bids') {
        // add nft to marketplace as bids item
        const auctionDuration = Math.floor((new Date(endDate).getTime() - new Date().getTime()) / 1000);
        await (await marketplace.createAuction(nft.address, id, auctionDuration)).wait();
        // Show success notification
        toast.success("NFT Bids Created Successfully!", {
          position: "top-center"
        });
      }

      setIsSuccess(true);
      setShowConfetti(true); // Show confetti
      setTimeout(() => {
        resetForm();
        setShowConfetti(false); // Hide confetti after some time
      }, 5000); // Display success for 5 seconds before resetting the form and hiding confetti
    } catch (error) {
      console.log("Minting/Listing: ", error);
      toast.error("Failed to list NFT.", {
        position: "top-center"
      });
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setFileName("");
    setName("");
    setDescription("");
    setPrice("");
    setMinBid("");
    setStartDate("");
    setEndDate("");
    setIsLoading(false);
    setIsSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const confettiConfig = {
    angle: 90,
    spread: 360,
    startVelocity: 40,
    elementCount: 79,
    dragFriction: 0.12,
    duration: 3000,
    stagger: 3,
    width: "10px",
    height: "10px",
    colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"]
  };

  return (
    <div className="container-fluid mt-5">
      <ToastContainer />
      <div className="row">
        <div className="col-lg-3">
          <div className="image-container">
            <img src={nftImage} alt="NFT Image" />
          </div>
        </div>
        <div className="col-lg-9">
          <main role="main" className="mx-auto" style={{ maxWidth: '1000px' }}>
            <div className="content mx-auto">
              <Row className="g-4">
                <Form onSubmit={sendFileToIPFS}>
                  <Form.Group controlId="formFile" className="mb-3">
                    <div className="upload-container">
                      <label htmlFor="file-upload" className="custom-file-upload">
                        Upload file
                      </label>
                      <span>{fileName || "PNG, JPG, GIF, WEBP or MP4. Max 200mb."}</span>
                      <input
                        id="file-upload"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        type="file"
                        className={`form-control ${!isFileValid ? 'is-invalid' : ''}`}
                      />
                      <div className="invalid-feedback">
                        Please upload an image.
                      </div>
                    </div>
                  </Form.Group>
  
                  {/* Select Method Section */}
                  <div className="method-selection mb-3">
                    <Form.Label>Select method</Form.Label>
                    <div className="method-options d-flex">
                      <button
                        type="button"
                        className={`me-2 method-option ${selectedMethod === 'fixed' ? 'selected' : ''}`}
                        onClick={() => setSelectedMethod('fixed')}
                      >
                        <FaTag /> Fixed Price
                      </button>
                      <button
                        type="button"
                        className={`me-2 method-option ${selectedMethod === 'auction' ? 'selected' : ''}`}
                        onClick={() => setSelectedMethod('auction')}
                      >
                        <FaGavel /> Time Auctions
                      </button>
                      <button
                        type="button"
                        className={`me-2 method-option ${selectedMethod === 'bids' ? 'selected' : ''}`}
                        onClick={() => setSelectedMethod('bids')}
                      >
                        <FaUsers /> Open For Bids
                      </button>
                    </div>
                  </div>
  
                  {selectedMethod === 'fixed' && (
                    <Form.Group controlId="formPrice" className="mb-3">
                      <Form.Control
                        type="text"
                        placeholder="Enter price in ETH"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className={`form-control ${!isPriceValid ? 'is-invalid' : ''}`}
                      />
                      <div className="invalid-feedback">
                        Please enter a valid price.
                      </div>
                    </Form.Group>
                  )}
  
                  {(selectedMethod === 'auction' || selectedMethod === 'bids') && (
                    <>
                      {selectedMethod === 'bids' && (
                        <Form.Group controlId="formPrice" className="mb-3">
                          <Form.Control
                            type="text"
                            placeholder="Enter price in ETH"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className={`form-control ${!isPriceValid ? 'is-invalid' : ''}`}
                          />
                          <div className="invalid-feedback">
                            Please enter a valid price.
                          </div>
                        </Form.Group>
                      )}
                      <Form.Group controlId="formMinBid" className="mb-3">
                        <Form.Control
                          type="text"
                          placeholder="Enter minimum bid in ETH"
                          value={minBid}
                          onChange={(e) => setMinBid(e.target.value)}
                          className={`form-control ${!isMinBidValid ? 'is-invalid' : ''}`}
                        />
                        <div className="invalid-feedback">
                          Please enter a valid minimum bid.
                        </div>
                      </Form.Group>
                      <Row>
                        <Col md={6}>
                          <Form.Group controlId="formStartDate" className="mb-3">
                            <Form.Label>Start Date</Form.Label>
                            <Form.Control
                              type="datetime-local"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className={`form-control ${!isStartDateValid ? 'is-invalid' : ''}`}
                            />
                            <div className="invalid-feedback">
                              Please enter a valid start date.
                            </div>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group controlId="formEndDate" className="mb-3">
                            <Form.Label>End Date</Form.Label>
                            <Form.Control
                              type="datetime-local"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className={`form-control ${!isEndDateValid ? 'is-invalid' : ''}`}
                            />
                            <div className="invalid-feedback">
                              Please enter a valid end date.
                            </div>
                          </Form.Group>
                        </Col>
                      </Row>
                    </>
                  )}
  
                  <Form.Group controlId="formName" className="mb-3">
                    <Form.Control
                      type="text"
                      placeholder="Enter name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`form-control ${!isNameValid ? 'is-invalid' : ''}`}
                    />
                    <div className="invalid-feedback">
                      Please enter a name.
                    </div>
                  </Form.Group>
                  <Form.Group controlId="formDescription" className="mb-3">
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="Enter description"
                      value={desc}
                      onChange={(e) => setDescription(e.target.value)}
                      className="form-control"
                    />
                  </Form.Group>
                  <div className="d-grid px-0">
                    <Button className="gradient-button" type="submit" size="lg" disabled={isLoading || isSuccess}>
                      {isLoading ? (
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      ) : isSuccess ? (
                        <span>&#10003; NFT Listed Successfully!</span>
                      ) : (
                        'Create & List NFT!'
                      )}
                    </Button>
                  </div>
                </Form>
              </Row>
            </div>
          </main>
        </div>
      </div>
      <div className={`fullscreen-confetti ${showConfetti ? 'show' : 'hide'}`}>
        <Confetti active={showConfetti} config={confettiConfig} />
      </div>
    </div>
  );
};
export default Create;  