import {scheduleUpdate} from "./render";

export class Component {
    constructor(props) {
        this.props = props || {};
        this.state = this.state || {};
    }

    setState(partialState) {
        scheduleUpdate(this, partialState); // <==
    }
}
