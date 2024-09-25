const TEXT_ELEMENT = "TEXT ELEMENT"; // 类型

export default function createElement(type, config, ...args) {
    const props = Object.assign({}, config);
    const hasChildren = args.length > 0;
    const rawChildren = hasChildren ? [].concat(...args) : [];
    props.children = rawChildren
        .filter(c => c != null && c !== false)
        .map(c => c instanceof Object ? c : createTextElement(c));
    // 过滤-空-值, 剩下的-不属于-Object的值 -> createTextElement -> 变为 类型为TEXT_ELEMENT- Didact元素
    return { type, props };
}

function createTextElement(value) {
    // 规范数据
    return createElement(TEXT_ELEMENT, { nodeValue: value });
}