const TEXT_ELEMENT = "TEXT ELEMENT"; // 类型

let rootInstance = null;

export default function render(element, container) {

    const prevInstance = rootInstance; // 1-虚拟dom主树干- == null
    const nextInstance = reconcile(container, prevInstance, element);
    rootInstance = nextInstance; // 2-支树干- 领头啦
}

function createPublicInstance(element, internalInstance) {
    // 当 元素进到这里来, 说明
    // type 是 一个函数
    const { type, props } = element;
    // 新建-实例
    const publicInstance = new type(props);
    //
    publicInstance.__internalInstance = internalInstance; //
    return publicInstance;
}

// 对比-元素 并 更新 html
export function reconcile(parentDom, instance, element) {
    if (instance == null) {
        // Create instance
        const newInstance = instantiate(element);
        parentDom.appendChild(newInstance.dom);
        return newInstance;
    } else if (element == null) {
        // Remove instance
        parentDom.removeChild(instance.dom);
        return null;
    } else if (instance.element.type !== element.type) {
        // Replace instance
        const newInstance = instantiate(element);
        parentDom.replaceChild(newInstance.dom, instance.dom);
        return newInstance;
    } else if (typeof element.type === "string") {
        // Update dom instance
        updateDomProperties(instance.dom, instance.element.props, element.props);
        instance.childInstances = reconcileChildren(instance, element);
        instance.element = element;
        return instance;
    } else {
        //Update composite instance
        // 更新-组件-

        // parentDom 真实-html-树
        // element Didact元素 新
        // instance  旧

        instance.publicInstance.props = element.props; // 更新-props
        const childElement = instance.publicInstance.render(); // 组件的render函数
        const oldChildInstance = instance.childInstance;
        const childInstance = reconcile(parentDom, oldChildInstance, childElement); // 对比-剩下-孩子
        instance.dom = childInstance.dom; // 更新-dom
        instance.childInstance = childInstance; // 更新-虚拟dom数
        instance.element = element; // 更新-Didact元素
        return instance;
    }
}

function reconcileChildren(instance, element) {
    const dom = instance.dom;
    const childInstances = instance.childInstances;
    const nextChildElements = element.props.children || [];
    const newChildInstances = [];
    const count = Math.max(childInstances.length, nextChildElements.length);
    for (let i = 0; i < count; i++) {
        const childInstance = childInstances[i];
        const childElement = nextChildElements[i];
        const newChildInstance = reconcile(dom, childInstance, childElement);
        newChildInstances.push(newChildInstance);
    }
    return newChildInstances.filter(instance => instance != null); // <---- 2
}

// ------ 递归 - instantiate - 运行一次以上 -----
function instantiate(element) {
    const { type, props } = element;
    const isDomElement = typeof type === "string";
    //

    if (isDomElement) {
        // Instantiate DOM element
        // 初始化 Didact 元素
        const isTextElement = type === TEXT_ELEMENT;
        const dom = isTextElement
            ? document.createTextNode("")
            : document.createElement(type);

        updateDomProperties(dom, [], props);

        const childElements = props.children || [];
        const childInstances = childElements.map(instantiate);
        const childDoms = childInstances.map(childInstance => childInstance.dom);
        childDoms.forEach(childDom => dom.appendChild(childDom));

        const instance = { dom, element, childInstances };
        return instance;
    } else {
        // Instantiate component element
        // 初始化 组件 <App />
        const instance = {};

        // createPublicInstance
        // 1. 新建 newApp = new App()
        // 2. newApp.__internalInstance = instance
        // 3. publicInstance = newApp
        const publicInstance = createPublicInstance(element, instance);
        //
        const childElement = publicInstance.render(); // 自己定义的 渲染-render-函数

        const childInstance = instantiate(childElement); // 递归 孩子拿到 { dom, element, childInstances }
        const dom = childInstance.dom;

        Object.assign(instance, { dom, element, childInstance:childInstance, publicInstance }); // >> 组件元素比Didact元素 多了本身- 实例
        return instance;
    }
}

function updateDomProperties(dom, prevProps, nextProps) {
    const isEvent = name => name.startsWith("on");
    const isAttribute = name => !isEvent(name) && name != "children";

// preProps Remove
    // Remove event listeners
    Object.keys(prevProps).filter(isEvent).forEach(name => {
        const eventType = name.toLowerCase().substring(2);
        dom.removeEventListener(eventType, prevProps[name]);
    });

    // Remove attributes
    Object.keys(prevProps).filter(isAttribute).forEach(name => {
        dom[name] = null;
    });

// nextProps Add
    // Set attributes
    Object.keys(nextProps).filter(isAttribute).forEach(name => {
        dom[name] = nextProps[name];
    });

    // Add event listeners
    Object.keys(nextProps).filter(isEvent).forEach(name => {
        const eventType = name.toLowerCase().substring(2);
        dom.addEventListener(eventType, nextProps[name]);
    });
}