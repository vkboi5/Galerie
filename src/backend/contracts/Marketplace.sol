// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Marketplace is ReentrancyGuard {
    address payable public immutable feeAccount;
    uint public immutable feePercent;
    uint public itemCount;
    uint public auctionCount;

    struct Item {
        uint itemId;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        bool sold;
    }

    struct Auction {
        uint auctionId;
        IERC721 nft;
        uint tokenId;
        address payable seller;
        uint startTime;
        uint endTime;
        uint highestBid;
        address payable highestBidder;
        bool ended;
    }

    mapping(uint => Item) public items;
    mapping(uint => Auction) public auctions;
    mapping(uint => mapping(address => bool)) public userBids; // Track user bids
    mapping(uint => mapping(address => bool)) public userLikes; // Track user likes
    mapping(uint => uint) public itemLikes; // Track item likes count

    event Offered(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller
    );

    event Bought(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller,
        address indexed buyer
    );

    event AuctionCreated(
        uint auctionId,
        address indexed nft,
        uint tokenId,
        address indexed seller,
        uint endTime
    );

    event BidPlaced(
        uint auctionId,
        address indexed nft,
        uint tokenId,
        address indexed bidder,
        uint amount
    );

    event AuctionEnded(
        uint auctionId,
        address indexed nft,
        uint tokenId,
        address indexed seller,
        address indexed highestBidder,
        uint highestBid
    );

    event Removed(
        uint itemId,
        address indexed nft,
        uint tokenId,
        address indexed seller
    );

    event Liked(
        uint itemId,
        address indexed nft,
        uint tokenId,
        address indexed user
    );

    event Unliked(
        uint itemId,
        address indexed nft,
        uint tokenId,
        address indexed user
    );

    constructor(uint _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }

    function makeItem(IERC721 _nft, uint _tokenId, uint _price) external nonReentrant {
        require(_price > 0, "Price must be greater than zero");
        itemCount++;
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        items[itemCount] = Item (
            itemCount,
            _nft,
            _tokenId,
            _price,
            payable(msg.sender),
            false
        );
        emit Offered(
            itemCount,
            address(_nft),
            _tokenId,
            _price,
            msg.sender
        );
    }

    function purchaseItem(uint _itemId) external payable nonReentrant {
        uint _totalPrice = getTotalPrice(_itemId);
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(msg.value >= _totalPrice, "not enough ether to cover item price and market fee");
        require(!item.sold, "item already sold");
        item.seller.transfer(item.price);
        feeAccount.transfer(_totalPrice - item.price);
        item.sold = true;
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);
        emit Bought(
            _itemId,
            address(item.nft),
            item.tokenId,
            item.price,
            item.seller,
            msg.sender
        );
    }

    function removeItem(uint _itemId) external nonReentrant {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(item.seller == msg.sender, "Only the seller can remove the item");
        require(!item.sold, "Cannot remove a sold item");

        item.nft.transferFrom(address(this), msg.sender, item.tokenId);
        delete items[_itemId];

        emit Removed(_itemId, address(item.nft), item.tokenId, item.seller);
    }

    function createAuction(IERC721 _nft, uint _tokenId, uint _duration) external nonReentrant {
        auctionCount++;
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        auctions[auctionCount] = Auction(
            auctionCount,
            _nft,
            _tokenId,
            payable(msg.sender),
            block.timestamp,
            block.timestamp + _duration,
            0,
            payable(address(0)),
            false
        );
        emit AuctionCreated(
            auctionCount,
            address(_nft),
            _tokenId,
            msg.sender,
            block.timestamp + _duration
        );
    }

    function placeBid(uint _auctionId) external payable nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(_auctionId > 0 && _auctionId <= auctionCount, "Auction does not exist");
        require(block.timestamp < auction.endTime, "Auction already ended");
        require(msg.value > auction.highestBid, "There already is a higher bid");
        require(!userBids[_auctionId][msg.sender], "User has already placed a bid");

        if (auction.highestBid != 0) {
            auction.highestBidder.transfer(auction.highestBid); // Refund the previous highest bidder
        }

        auction.highestBid = msg.value;
        auction.highestBidder = payable(msg.sender);
        userBids[_auctionId][msg.sender] = true; // Track the user's bid

        emit BidPlaced(
            _auctionId,
            address(auction.nft),
            auction.tokenId,
            msg.sender,
            msg.value
        );
    }

    function endAuction(uint _auctionId) external nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp >= auction.endTime, "Auction not yet ended");
        require(!auction.ended, "Auction already ended");

        auction.ended = true;

        if (auction.highestBidder != address(0)) {
            auction.nft.transferFrom(address(this), auction.highestBidder, auction.tokenId);
            auction.seller.transfer(auction.highestBid);
        } else {
            auction.nft.transferFrom(address(this), auction.seller, auction.tokenId);
        }

        emit AuctionEnded(
            _auctionId,
            address(auction.nft),
            auction.tokenId,
            auction.seller,
            auction.highestBidder,
            auction.highestBid
        );
    }

    function likeItem(uint _itemId) external nonReentrant {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(!userLikes[_itemId][msg.sender], "Item already liked by user");

        userLikes[_itemId][msg.sender] = true;
        itemLikes[_itemId]++;

        emit Liked(_itemId, address(item.nft), item.tokenId, msg.sender);
    }

    function unlikeItem(uint _itemId) external nonReentrant {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(userLikes[_itemId][msg.sender], "Item not liked by user");

        userLikes[_itemId][msg.sender] = false;
        itemLikes[_itemId]--;

        emit Unliked(_itemId, address(item.nft), item.tokenId, msg.sender);
    }

    function getTotalPrice(uint _itemId) view public returns (uint) {
        return ((items[_itemId].price * (100 + feePercent)) / 100);
    }
}