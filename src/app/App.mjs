import { Component, createElement, render } from '../lib/preact.mjs';
import Header from './header/Header.mjs'
const h = createElement;

/** Instead of JSX, use: h(type, props, ...children) */
class Main extends Component {
	render() {
		const items = [1,2,3,4,5].map( (item) => (
			h('li', {id:item}, 'Item '+item)
		));
		return (
			h('main', null,
				h('ul', null, items)
			)
		);
	}
}

export default class App extends Component {
	componentDidMount() {
		this.setState({ message:'Hello!' });
	}
	render(props, state) {
		return (
			h('div', {id:'app'},
				h(Header, { message: state.message }),
				h(Main)
			)
		);
	}
}