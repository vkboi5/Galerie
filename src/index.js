import { render } from "react-dom";
import 'bootstrap/dist/css/bootstrap.css'
import * as serviceWorker from './serviceWorker';
import { StrictMode } from 'react';
import App from './frontend/components/App';

const rootElement = document.getElementById("root");
render( <StrictMode><App /></StrictMode>, rootElement);


// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();