// import { createElement, div, h1, h2, h3, button, ul, li } from '../node_modules/preact-hyperscript';
import { Component, createElement, render } from '/libs/preact.mjs';
import App from './app/App.mjs';
import createStore from '/libs/unistore/unistore.mjs'
import { Provider } from '/libs/unistore/integrations/preact.mjs'

let store = createStore({ count: 1110 })

const h = createElement;

render( h(Provider, {store}, h(App) ), document.body);