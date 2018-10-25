import { _, div, h1, h2 } from '/utils/pelems.mjs';


/** Components can just be pure functions */
const Header = (props) => {
	return _('header')(null,
		h1(null, 'App'),
		!!props.message && h2(null, props.message),
		!!props.onClickHandler && _('button')({onclick: props.onClickHandler}, 'clickMe'),
		!!props.children && div(null, props.children),
	);
};

export default _(Header);