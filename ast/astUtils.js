const TYPES = {
    LITERAL:                'Literal',
    IDENTIFIER:             'Identifier',
    PROPERTY:               'Property',
    BLOCK_STATEMENT:         'BlockStatement',
    RETURN_STATEMENT:        'ReturnStatement',
    EXPRESSION_STATEMENT:    'ExpressionStatement',
    OBJECT_EXPRESSION:       'ObjectExpression',
    OBJECT_PATTERN:          'ObjectPattern',
    VARIABLE_DECLARATION:    'VariableDeclaration',
    VARIABLE_DECLARATOR:     'VariableDeclarator',
    ASSIGNMENT_EXPRESSION:   'AssignmentExpression',
    FUNCTION_EXPRESSION:     'FunctionExpression',
    FUNCTION_DECLARATION:    'FunctionDeclaration',
    CALL_EXPRESSION:         'CallExpression',
    CONDITIONAL_EXPRESSION:  'ConditionalExpression',
    MEMBER_EXPRESSION:        'MemberExpression',
    // not implemented:
    EXPORT_NAMED_DECLARATION:     'ExportNamedDeclaration',
    EXPORT_DEFAULT_DECLARATION:   'ExportDefaultDeclaration',
    IMPORT_SPECIFIER:            'ImportSpecifier',
    IMPORT_NAMESPACE_SPECIFIER:   'ImportNamespaceSpecifier',
    IMPORT_DEFAULT_SPECIFIER:     'ImportDefaultSpecifier',
}

function Literal(value, raw) {
    const type = TYPES.LITERAL;
    const raw = raw ? raw : `"'${value}'"`;
    return { type, value, raw };
}
function Identifier(name) {
    const type = TYPES.IDENTIFIER;
    return { type, name };
}
function Property(key,value, params = {}) {
    const type = TYPES.PROPERTY;
    return Object.assign({
        type,
        "method": false,
        "shorthand": false,
        "computed": false,
        key,
        "kind": "init",
        value
    }, params);
}
function Block(body) {
    const type = TYPES.BLOCK_STATEMENT;
    return { type, body };
}
function Return(argument) {
    const type = TYPES.RETURN_STATEMENT;
    return { type, argument };
}
function Expression(expression){
    const type = TYPES.EXPRESSION_STATEMENT;
    return { type, expression }
}
function ObjectExpression(properties) {
    properties = typeof properties === 'undefined' ? [] : properties;
    const type = TYPES.OBJECT_EXPRESSION;
    return { type, properties };
}
function ObjectPattern(properties) {
    properties = typeof properties === 'undefined' ? [] : properties;
    const type = TYPES.OBJECT_PATTERN;
    return { type, properties };
}
function MemberExpression(object,property,computed = true) {
    const type = TYPES.MEMBER_EXPRESSION;
    return { type, object, property, computed };
}
function VariableDeclaration(declarations, kind = 'const') {
    declarations = typeof declarations === 'undefined' ? [] : declarations;
    if(!Array.isArray(declarations)) throw new Error('VariableDeclaration expects declarations to be an array.');
    const type = TYPES.VARIABLE_DECLARATION;
    return { type, declarations, kind }
}
function VariableDeclarator(id,init) {
    const type = TYPES.VARIABLE_DECLARATOR
    return { type, id, init};
}
function Assignment(left, right, operator = '=') {
    const type = TYPES.ASSIGNMENT_EXPRESSION;
    return { type, operator, left, right };
}
function FunctionExpression(id = null, params = [], body = {}, expression = false, generator = false, async = false ) {
    const type = TYPES.FUNCTION_EXPRESSION
    return { type, id, expression, generator, async, params, body };
}
function FunctionDeclaration(id = null, params = [], body = {}, expression = false, generator = false, async = false ) {
    const type = TYPES.FUNCTION_DECLARATION;
    return { type, id, expression, generator, async, params, body };
}
function CallExpression(callee, arguments = []) {
    const type = TYPES.CALL_EXPRESSION;
    return { type, callee, arguments };
}
function Conditional(test, consequent, alternate) {
    const type = TYPES.CONDITIONAL_EXPRESSION;
    return { type, test, consequent, alternate };
}


module.exports = {
    TYPES,
    Literal, Identifier, Property, ObjectExpression, MemberExpression, 
    VariableDeclaration, VariableDeclarator,
    Block,Return,Expression,
    Assignment, CallExpression,
    FunctionExpression, FunctionDeclaration,
    Conditional,
    $constant: (id, init) => VariableDeclaration([VariableDeclarator(id, init)]),
    $constants: (idProperties, initProperties) => VariableDeclaration([
        VariableDeclarator(
            ObjectPattern(idProperties), 
            ObjectExpression(initProperties)
        )
    ]),
    $destructuringAssignmentConst: (identifiers, props) => {
        const leftProps = identifiers.map(name =>
            Property(
                Identifier(name),
                Identifier(name),
                {"shorthand": true,}
            )             
        );
        const rightValues = props.map(prop => 
            Property(
                Identifier(prop.name),
                prop.valueAst
            )    
        );

        return VariableDeclaration([
            VariableDeclarator(
                ObjectPattern(leftProps),
                ObjectExpression(rightValues)
            )
        ]);
    }
}