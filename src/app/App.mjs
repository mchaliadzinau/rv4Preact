import { Component, createElement, render } from '/libs/preact.mjs';
import { ul, li } from '/utils/pelems.mjs';
import Header from './header/Header.mjs'
const h = createElement;

/** Instead of JSX, use: h(type, props, ...children) */
class Main extends Component {
	render() {
		const items = [1,2,3,4,5].map( (item) => (
			li({id:item}, 'Item '+item)
		));
		return (
			h('main', null,
				ul(null, items)
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