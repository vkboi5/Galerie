import './Navbar.css';
import { Link } from "react-router-dom";
import { Navbar, Nav, Button, Container } from 'react-bootstrap';
import { useConnectWallet } from '@web3-onboard/react';
import logo from './logo.png';

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
                <Navbar.Brand as={Link} to="/">
                    <img src={logo} width="100" height="40" className="logo-img" alt="Logo" />
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={Link} to="/">Home</Nav.Link>
                        <Nav.Link as={Link} to="/create">Create</Nav.Link>
                        <Nav.Link as={Link} to="/my-listed-items">My Listed Items</Nav.Link>
                        <Nav.Link as={Link} to="/my-purchases">My Purchases</Nav.Link>
                    </Nav>
                </Navbar.Collapse>
                <div className="connect-wallet-wrapper">
                    {account && (
                        <Nav.Link
                            href={`https://etherscan.io/address/${account}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button nav-button btn-sm mx-4">
                            <Button variant="outline-light">
                                {account.slice(0, 5) + '...' + account.slice(38, 42)}
                            </Button>
                        </Nav.Link>
                    )}
                    {!account && (
                        <Button onClick={handleConnect} variant="outline-light" className="connect-wallet-button">
                            {connecting ? 'Connecting...' : 'Connect Wallet'}
                        </Button>
                    )}
                </div>
            </Container>
        </Navbar>
    );
}

export default Navigation;