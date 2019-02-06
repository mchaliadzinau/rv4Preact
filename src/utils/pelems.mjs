import { createElement } from '/libs/preact.mjs';

function childCheck(child) {
    return typeof child !== 'undefined' && ( // Not necessary in Preact, because props.children is always an Array.
        child === null                      || 
        typeof child === "boolean"          || 
        typeof child === "string"           || 
        typeof child === "number"           || 
        child instanceof Element            ||  
        child.constructor.name == 'VNode'   || 
        ( Array.isArray(child) && child.every(childCheck) )
    )
}

function typesCheck(props, children) {
    if(DEV) {
        props === null || typeof props === 'object' || console.error('Wrong props type:', typeof props, '. (Expected Object)');
        children.forEach(child=>{
            childCheck(child) || console.error('Wrong child type:', typeof child, '(Expected Element, string, VNode or array of items of these types)');
        })
    }
}
/**
 * function for instatiotion of component or custom element 
 * @param name - name or instance of HTMLElement | PreactElement
 */
export function $(name) {
    return (props, ...children) => {
        typesCheck(props, children);
        return createElement(name, props, children);
    }
}

export function div(props, ...children) {
    return $('div')(props, ...children);
}

export function ul(props, ...children) {
    return $('ul')(props, ...children);
}

export function ol(props, ...children) {
    return $('ol')(props, ...children);
}

export function li(props, ...children) {
    return $('li')(props, ...children);
}

export function p(props, ...children) {
    return $('p')(props, ...children);
}

export function a(props, ...children) {
    return $('a')(props, ...children);
}

export function span(props, ...children) {
    return $('span')(props, ...children);
}

export const h1 = (props, ...children) =>  ( $('h1')(props, ...children) );
export const h2 = (props, ...children) =>  ( $('h2')(props, ...children) );
export const h3 = (props, ...children) =>  ( $('h3')(props, ...children) );
export const h4 = (props, ...children) =>  ( $('h4')(props, ...children) );
export const h5 = (props, ...children) =>  ( $('h5')(props, ...children) );
export const h6 = (props, ...children) =>  ( $('h6')(props, ...children) );

export const table = (props, ...children) =>  ( $('table')(props, ...children) );
export const thead = (props, ...children) =>  ( $('thead')(props, ...children) );
export const tbody = (props, ...children) =>  ( $('tbody')(props, ...children) );
export const tfoot = (props, ...children) =>  ( $('tfoot')(props, ...children) );
export const tr = (props, ...children) =>  ( $('tr')(props, ...children) );
export const th = (props, ...children) =>  ( $('th')(props, ...children) );
export const td = (props, ...children) =>  ( $('td')(props, ...children) );

export const canvas = (props, ...children) =>  ( $('canvas')(props, ...children) );

export const _ = null;
