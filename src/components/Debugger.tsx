import * as React from 'react';
import {parseGPGLCode, CommandBatch} from '../gpgl';
import {PlotterView} from './PlotterView';

interface DebuggerProps {
    websocketPort: number;
}

interface DebuggerState {
    commandBatches: Array<CommandBatch>;
    partialCommand: string;
}

export class Debugger extends React.Component<DebuggerProps, DebuggerState> {
    constructor(props: DebuggerProps) {
        super(props);
        this.state = {
            commandBatches: [],
            partialCommand: ''
        };

        const socket = new WebSocket(`ws://localhost:${this.props.websocketPort}`);
        socket.onmessage = (message) => {
            const gpglCode = this.state.partialCommand + message.data;
            const { commands, partialCommand }  = parseGPGLCode(gpglCode);
            this.setState({
                commandBatches: this.state.commandBatches.concat([commands]),
                partialCommand
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
