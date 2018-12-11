const AST_EXPRESSIONS = require("./ast.expressions.json");

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
    // not implemented:
    EXPORT_NAMED_DECLARATION:     'ExportNamedDeclaration',
    EXPORT_DEFAULT_DECLARATION:   'ExportDefaultDeclaration',
    IMPORT_SPECIFIER:            'ImportSpecifier',
    IMPORT_NAMESPACE_SPECIFIER:   'ImportNamespaceSpecifier',
    IMPORT_DEFAULT_SPECIFIER:     'ImportDefaultSpecifier',
}

function Literal(value, raw) {
    return {"type": TYPES.LITERAL, value, "raw": (raw ? raw : `"'${value}'"`) };
}
function Identifier(name) {
    return {"type": TYPES.IDENTIFIER, name};
}
function Property(key,value, params = {}) {
    return Object.assign({
        "type": TYPES.PROPERTY,
        "method": false,
        "shorthand": false,
        "computed": false,
        "key": key,
        "kind": "init",
        "value": value
    }, params);
}
function Block(body) {
    return {
        "type": TYPES.BLOCK_STATEMENT,
        "body": body
    };
}
function Return(argument) {
    return {
        "type": TYPES.RETURN_STATEMENT,
        "argument": argument
    }
}
function Expression(expression){
    return {
        "type": TYPES.EXPRESSION_STATEMENT,
        "expression": expression
    }
}
function ObjectExpression(properties) {
    properties = typeof properties === 'undefined' ? [] : properties;
    return {"type": TYPES.OBJECT_EXPRESSION,   properties};
}
function ObjectPattern(properties) {
    properties = typeof properties === 'undefined' ? [] : properties;
    return {"type": TYPES.OBJECT_PATTERN, "properties": properties};
}
function MemberExpression(object,property,computed = true) {
    return Object.assign({}, AST_EXPRESSIONS.member, {
        object,
        property,
        computed
    });
}
function VariableDeclaration(declarations, kind = 'const') {
    declarations = typeof declarations === 'undefined' ? [] : declarations;
    if(!Array.isArray(declarations)) throw new Error('VariableDeclaration expects declarations to be an array.');
    return {
        "type": TYPES.VARIABLE_DECLARATION,
        "declarations": declarations,
        "kind": kind
    }
}
function VariableDeclarator(id,init) { 
    return {"type": TYPES.VARIABLE_DECLARATOR, id,         init};
}
function Assignment(left, right, operator = '=') {
    return {
        "type": TYPES.ASSIGNMENT_EXPRESSION, operator, left, right
    }
}
function FunctionExpression(id = null, params = [], body = {}, expression = false, generator = false, async = false ) {
    return {
        "type": TYPES.FUNCTION_EXPRESSION, id, expression, generator, async, params, body
    };
}
function FunctionDeclaration(id = null, params = [], body = {}, expression = false, generator = false, async = false ) {
    return {
        "type": TYPES.FUNCTION_DECLARATION, id, expression, generator, async, params, body
    };
}
function CallExpression(callee, arguments = []) {
    return {
        "type": TYPES.CALL_EXPRESSION, callee, arguments
    }
}
function Conditional(test, consequent, alternate) {
    return {
        "type": TYPES.CONDITIONAL_EXPRESSION, test, consequent, alternate
    }
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