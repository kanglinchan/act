import ActDom from "act-dom";
import App from "./App";

const root = document.getElementById("root");


ActDom.render(App, root);

const ENOUGH_TIME = 1; // milliseconds

let workQueue = [];
let nextUnitOfWork = null; // 全局变量, 那么一次只能走一个回调

function schedule(task) { // 1. 加
    workQueue.push(task); // 2. 存好了
    requestIdleCallback(performWork); // 3. 下一次空闲运行, performWork 函数
}

function performWork(deadline) { // 空闲机会来了
    if (!nextUnitOfWork) {
        nextUnitOfWork = workQueue.shift(); // 4. 拿出来,
    }

// 下一回调 与 看看有没有 足够的时间 再走一趟
    while (nextUnitOfWork && deadline.timeRemaining() > ENOUGH_TIME) {
        // 5. DO something
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }

    if (nextUnitOfWork || workQueue.length > 0) {
        // 6. 如果还没有搞定, 那么 再等空闲咯
        requestIdleCallback(performWork);
    }
}