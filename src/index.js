// import { createElement, div, h1, h2, h3, button, ul, li } from '../node_modules/preact-hyperscript';
import { Component, createElement, render } from '/@/preact.mjs';
import App from './app/App.mjs';
import createStore from '/@/unistore/unistore.mjs';
import devtools    from '/@/unistore/devtools.mjs';

import { Provider } from '/@/unistore/integrations/preact.mjs';

let initialState = { count: 1100 };

let store = !DEV ?  createStore(initialState) : devtools(createStore(initialState));


const h = createElement;

render( h(Provider, {store}, h(App) ), document.body);