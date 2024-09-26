// Fiber tags
import {createDomElement, updateDomProperties} from "act-dom/utils";

const HOST_COMPONENT = "host";
const CLASS_COMPONENT = "class";
const HOST_ROOT = "root";

// Global state
const updateQueue = [];
let nextUnitOfWork = null;
let pendingCommit = null;

export default function render(elements, containerDom) {
    updateQueue.push({ // 用作一个队列, 先进先出
        from: HOST_ROOT,
        dom: containerDom,
        newProps: { children: elements }
    });
    requestIdleCallback(performWork); // 下一个浏览器空闲时
}

export function scheduleUpdate(instance, partialState) { // 提供给 setState 使用
    updateQueue.push({
        from: CLASS_COMPONENT,
        instance: instance,
        partialState: partialState
    });
    requestIdleCallback(performWork);
}

const ENOUGH_TIME = 1; // milliseconds

// 执行工作
function performWork(deadline) {
    workLoop(deadline);
    if (nextUnitOfWork || updateQueue.length > 0) {
        requestIdleCallback(performWork);
    }
}

// 工作循环，
function workLoop(deadline) {
    // 下一个工作不是空，进入重置工作单元
    if (!nextUnitOfWork) {
        resetNextUnitOfWork();
    }
    while (nextUnitOfWork && deadline.timeRemaining() > ENOUGH_TIME) {
        // 关注时间 是否足够 运行另一个工作单元
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }
    if (pendingCommit) {
        commitAllWork(pendingCommit);
    }
}

function resetNextUnitOfWork() {
    // 取出第一个 update，如果没有 update 了则结束重置工作
    const update = updateQueue.shift();
    if (!update) {
        return;
    }

    // 如果有 partialState ，将新状态给到 fiber
    if (update.partialState) {
        update.instance.__fiber.partialState = update.partialState;
    }

    const root =
        update.from == HOST_ROOT
            ? update.dom._rootContainerFiber
            : getRoot(update.instance.__fiber);

    nextUnitOfWork = {
        tag: HOST_ROOT,
        // 两种情况 这stateNode将是对Component实例的引用. 它可以是DOM元素, 也可以是用户定义的Component-class的实例.
        stateNode: update.dom || root.stateNode,
        props: update.newProps || root.props,
        alternate: root
    };
}

// 获取根节点
function getRoot(fiber) {
    let node = fiber;
    while (node.parent) {
        node = node.parent;
    }
    return node;
}


function performUnitOfWork(wipFiber) {
    beginWork(wipFiber);
    if (wipFiber.child) { // 深度优先
        return wipFiber.child;
    }

    // 到达最低层，
    let uow = wipFiber;
    while (uow) {
        completeWork(uow);
        if (uow.sibling) { // 如果有兄弟节点，返回到 beginWork
            return uow.sibling;
        }
        uow = uow.parent;
    }
}


function beginWork(wipFiber) {
    if (wipFiber.tag == CLASS_COMPONENT) {
        updateClassComponent(wipFiber);
    } else {
        updateHostComponent(wipFiber);
    }
}

function updateHostComponent(wipFiber) {
    if (!wipFiber.stateNode) {
        wipFiber.stateNode = createDomElement(wipFiber);
    }
    const newChildElements = wipFiber.props.children;
    reconcileChildrenArray(wipFiber, newChildElements);
}

function createInstance(fiber) {
    const instance = new fiber.type(fiber.props);
    instance.__fiber = fiber;
    return instance;
}

function updateClassComponent(wipFiber) {
    let instance = wipFiber.stateNode;
    if (instance == null) {
        // 调用类初始化
        instance = wipFiber.stateNode = createInstance(wipFiber);
    } else if (wipFiber.props == instance.props && !wipFiber.partialState) {
        // 不需要更新,最后 复制 孩子
        cloneChildFibers(wipFiber);
        return;
    }

    instance.props = wipFiber.props;
    instance.state = Object.assign({}, instance.state, wipFiber.partialState);
    wipFiber.partialState = null;

    const newChildElements = wipFiber.stateNode.render();
    reconcileChildrenArray(wipFiber, newChildElements);
}

function cloneChildFibers(parentFiber) {
    const oldFiber = parentFiber.alternate;
    if (!oldFiber.child) {
        return;
    }

    let oldChild = oldFiber.child;
    let prevChild = null;
    while (oldChild) {
        const newChild = {
            type: oldChild.type,
            tag: oldChild.tag,
            stateNode: oldChild.stateNode,
            props: oldChild.props,
            partialState: oldChild.partialState,
            alternate: oldChild,
            parent: parentFiber
        };
        if (prevChild) {
            prevChild.sibling = newChild;
        } else {
            parentFiber.child = newChild;
        }
        prevChild = newChild;
        oldChild = oldChild.sibling;
    }
}

// Effect tags
const PLACEMENT = 1;
const DELETION = 2;
const UPDATE = 3;

function arrify(val) {
    return val == null ? [] : Array.isArray(val) ? val : [val];
}

function reconcileChildrenArray(wipFiber, newChildElements) {
    const elements = arrify(newChildElements);

    let index = 0;
    let oldFiber = wipFiber.alternate ? wipFiber.alternate.child : null;
    let newFiber = null;
    while (index < elements.length || oldFiber != null) {
        const prevFiber = newFiber;
        const element = index < elements.length && elements[index];
        const sameType = oldFiber && element && element.type == oldFiber.type;

        if (sameType) {
            newFiber = {
                type: oldFiber.type,
                tag: oldFiber.tag,
                stateNode: oldFiber.stateNode,
                props: element.props,
                parent: wipFiber,
                alternate: oldFiber,
                partialState: oldFiber.partialState,
                effectTag: UPDATE
            };
        }

        if (element && !sameType) {
            newFiber = {
                type: element.type,
                tag:
                    typeof element.type === "string" ? HOST_COMPONENT : CLASS_COMPONENT,
                props: element.props,
                parent: wipFiber,
                effectTag: PLACEMENT
            };
        }

        if (oldFiber && !sameType) {
            oldFiber.effectTag = DELETION;
            wipFiber.effects = wipFiber.effects || [];
            wipFiber.effects.push(oldFiber);
        }

        if (oldFiber) {
            oldFiber = oldFiber.sibling;
        }

        if (index == 0) {
            wipFiber.child = newFiber;
        } else if (prevFiber && element) {
            prevFiber.sibling = newFiber;
        }

        index++;
    }
}


function completeWork(fiber) {
    if (fiber.tag == CLASS_COMPONENT) {
        fiber.stateNode.__fiber = fiber;
    }

    if (fiber.parent) {
        const childEffects = fiber.effects || [];
        const thisEffect = fiber.effectTag != null ? [fiber] : [];
        const parentEffects = fiber.parent.effects || [];
        fiber.parent.effects = parentEffects.concat(childEffects, thisEffect);
    } else {
        pendingCommit = fiber;
    }
}

function commitAllWork(fiber) {
    fiber.effects.forEach(f => {
        commitWork(f);
    });
    fiber.stateNode._rootContainerFiber = fiber;
    nextUnitOfWork = null; // Reset
    pendingCommit = null;
}

function commitWork(fiber) {
    if (fiber.tag == HOST_ROOT) {
        return;
    }

    let domParentFiber = fiber.parent;
    while (domParentFiber.tag == CLASS_COMPONENT) {
        domParentFiber = domParentFiber.parent;
    }
    const domParent = domParentFiber.stateNode;

    if (fiber.effectTag == PLACEMENT && fiber.tag == HOST_COMPONENT) {
        domParent.appendChild(fiber.stateNode); // add
    } else if (fiber.effectTag == UPDATE) {
        updateDomProperties(fiber.stateNode, fiber.alternate.props, fiber.props);
    } else if (fiber.effectTag == DELETION) {
        commitDeletion(fiber, domParent);
    }
}

function commitDeletion(fiber, domParent) {
    let node = fiber;
    while (true) {
        if (node.tag == CLASS_COMPONENT) {
            node = node.child;
            continue;
        }
        domParent.removeChild(node.stateNode);
        while (node != fiber && !node.sibling) {
            node = node.parent;
        }
        if (node == fiber) {
            return;
        }
        node = node.sibling;
    }
}