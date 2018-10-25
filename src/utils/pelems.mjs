import { createElement } from '/libs/preact.mjs';

function childCheck(child) {
    return typeof child !== 'undefined' && (
        typeof child === "boolean"          || 
        typeof child === "string"           || 
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
export function _(name) {
    return (props, ...children) => {
        typesCheck(props, children);
        return createElement(name, props, children);
    }
}

export function div(props, ...children) {
    return _('div')(props, ...children);
}

export function ul(props, ...children) {
    return _('ul')(props, ...children);
}

export function ol(props, ...children) {
    return _('ol')(props, ...children);
}

export function li(props, ...children) {
    return _('li')(props, ...children);
}

export function p(props, ...children) {
    return _('p')(props, ...children);
}

export function a(props, ...children) {
    return _('a')(props, ...children);
}

export function span(props, ...children) {
    return _('span')(props, ...children);
}

export const h1 = (props, ...children) =>  ( _('h1')(props, ...children) );
export const h2 = (props, ...children) =>  ( _('h2')(props, ...children) );
export const h3 = (props, ...children) =>  ( _('h3')(props, ...children) );
export const h4 = (props, ...children) =>  ( _('h4')(props, ...children) );
export const h5 = (props, ...children) =>  ( _('h5')(props, ...children) );
export const h6 = (props, ...children) =>  ( _('h6')(props, ...children) );

export const table = (props, ...children) =>  ( _('table')(props, ...children) );
export const thead = (props, ...children) =>  ( _('thead')(props, ...children) );
export const tbody = (props, ...children) =>  ( _('tbody')(props, ...children) );
export const tfoot = (props, ...children) =>  ( _('tfoot')(props, ...children) );
export const tr = (props, ...children) =>  ( _('tr')(props, ...children) );
export const th = (props, ...children) =>  ( _('th')(props, ...children) );
export const td = (props, ...children) =>  ( _('td')(props, ...children) );

export const canvas = (props, ...children) =>  ( _('canvas')(props, ...children) );
