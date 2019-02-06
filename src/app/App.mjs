import { Component } from '/libs/preact.mjs';
import * as preact from '/libs/preact.mjs';
import { $, _, div, ul, li, h1, h2, h3 } from '/utils/pelems.mjs';
import Header from './header/Header.mjs'
import { connect } from '/libs/unistore/integrations/preact.mjs'

/** Instead of JSX, use: h(type, props, ...children) */
class Main extends Component {
	render() {
		console.log(preact);
		const items = [1,2,3,4,5].map( (item) => (
			li({id:item}, 'Item '+item)
		));
		return (
			div({class: 'main'}, 
				ul(_, items)
			)
		);
	}
}

class App extends Component {
	componentDidMount() {
		this.setState({ message:'Hello!' });
	}
	render(props, state) {
		return (
			div({id:'app'},
				Header({ message: state.message, onClickHandler : (e) => {alert('click inside header') }}, 
					h1(_, "HEADER"),
					h2(_, "LOWERHEADER"),
					h3(_,props.count)
				),
				$(Main)(_)
			)
		);
	}
}

export default connect('count')(App);