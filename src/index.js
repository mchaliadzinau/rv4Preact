// import { createElement, div, h1, h2, h3, button, ul, li } from '../node_modules/preact-hyperscript';
import { Component, createElement, render } from '/libs/preact.mjs';
import App from './app/App.mjs';

const h = createElement;

render(h(App), document.body);