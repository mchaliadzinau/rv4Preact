# `pelem`
  `Pelem` is shorhand for `preact element`. It is alternative way to create HyperText the main targets of which are:
  * to get rid of dependencies like JSX transpiler etc; 
  * define layout only with JavaScript;
  
  The main idea is to wrap a `createElement` function for easier usage:
  > `$(name)` - is base higher order function which provides ability to define element-functions.
  > If global variable `DEV` is set it also provides params and children typechecks. 
  > * @ `name` : String|Component|HTMLElement
  >
  > `div(props, ...children)` - element-function used for wrapping `createElement` is a more convinient way. Under the hood it utilizes `$('div')` function.
  > * @ `props`: Object | null 
  > * @ `children` : String|Component|HTMLElement | ArrayOf(String|Component|HTMLElement))
  >
  > See `'/utils/pelems.mjs'` for implementation details.

  Example: 

    // component declaration
    import { $, div, ul, li } from '/utils/pelems.mjs';
    const Header = (props) => (
        return div({class: 'header'}, props.children);
    );
    export default _(Header);

    // invokation
    import Header from './header/Header.mjs'
    ...
        Header({ message: state.message},
            $('h1')(null, "H E A D E R"),
            ul(null, 
                li(null, "LOWERHEADER")
            )
        ),
    ...