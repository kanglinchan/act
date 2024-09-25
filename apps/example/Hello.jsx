import Act from "act";


export default class Hello extends Act.Component {

    constructor() {
        super();
        this.state = {
            message: 'Hello'
        }
    }

    handleClick = () => {
        this.setState({message: 'Hello world'});
    }

    render(){
        return <div onClick={this.handleClick}>{this.state.message}</div>;
    }
}