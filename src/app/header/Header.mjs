import { Component, createElement, render } from '../../lib/preact.mjs';
const h = createElement;

/** Components can just be pure functions */
export default (props) => {
	return h('header', null,
		h('h1', null, 'App'),
		props.message && h('h2', null, props.message)
	);
};