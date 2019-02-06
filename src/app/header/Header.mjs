import { $, _, div, h1, h2 } from '/utils/pelems.mjs';


/** Components can just be pure functions */
const Header = (props) => {
	return $('header')(_,
		h1(_, 'App'),
		!!props.message && h2(_, props.message),
		!!props.onClickHandler && $('button')({onclick: props.onClickHandler}, 'clickMe'),
		!!props.children && div(_, props.children),
	);
};

export default $(Header);