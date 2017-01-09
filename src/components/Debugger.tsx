import * as React from 'react';
import {readCommandBatch, CommandBatch} from '../gpgl';
import {PlotterView} from './PlotterView';

interface DebuggerState {
    commandBatches: Array<CommandBatch>;
}

export class Debugger extends React.Component<undefined, DebuggerState> {
    constructor() {
        super();
        this.state = {
            commandBatches: []
        };

        const socket = new WebSocket('ws://localhost:8080');
        socket.onmessage = (message) => {
            const batchesCopy = this.state.commandBatches.slice();
            batchesCopy.push(readCommandBatch(message.data));
            this.setState({
                commandBatches: batchesCopy
            });
        };
    }

    render() {
        return <PlotterView
            commandBatches={this.state.commandBatches}
            paperWidth={210}
            paperHeight={297}
            stepsPerMillimeter={20}
            lineThickness={1}/>;
    }
}
