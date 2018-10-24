import { createElement } from '/libs/preact.mjs';

function childCheck(child) {
    return typeof child !== 'undefined' && (
        child instanceof Element            ||  
        typeof child === "string"           || 
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

export function ul(props, ...children) {
    typesCheck(props, children);
    return createElement('ul', props, children);
} 

export function li(props, ...children) {
    typesCheck(props, children);
    return createElement('li', props, children);
} 