import './Navbar.css';
import { Link } from "react-router-dom";
import { Navbar, Nav, Button, Container } from 'react-bootstrap';
import { useConnectWallet } from '@web3-onboard/react';
import logo from './logo.png'; // Add your logo image here




const Navigation = ({ web3Handler, account }) => {
    const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();

    const handleConnect = async () => {
        const [connectedWallet] = await connect();
        if (connectedWallet) {
            await web3Handler(connectedWallet);
        }
    };

    return (
        <Navbar expand="lg" bg="secondary" variant="dark" className="custom-navbar">
            <Container>
                <Navbar.Brand href="/">
                    <img src={logo} width="100" height="40" className="" alt="Logo" /> {/* Adjust width and height as needed */}
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={Link} to="/">Home</Nav.Link>
                        <Nav.Link as={Link} to="/create">Create</Nav.Link>
                        <Nav.Link as={Link} to="/my-listed-items">My Listed Items</Nav.Link>
                        <Nav.Link as={Link} to="/my-purchases">My Purchases</Nav.Link>
                    </Nav>
                    <Nav>
                        {account ? (
                            <Nav.Link
                                href={`https://etherscan.io/address/${account}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="button nav-button btn-sm mx-4">
                                <Button variant="outline-light">
                                    {account.slice(0, 5) + '...' + account.slice(38, 42)}
                                </Button>
                            </Nav.Link>
                        ) : (
                            <Button onClick={handleConnect} variant="outline-light" disabled={connecting}>
                                {connecting ? 'Connecting...' : 'Connect Wallet'}
                            </Button>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    )
}

export default Navigation;
