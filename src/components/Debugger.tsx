import * as React from 'react';
import {parseGPGLCode, CommandBatch} from '../gpgl';
import {PlotterView} from './PlotterView';
import {A4_PAGE_SIZE, PageSize, Sidebar} from './Sidebar';

interface DebuggerProps {
    websocketPort: number;
}

interface DebuggerState {
    commandBatches: Array<CommandBatch>;
    pageSize: PageSize;
    partialCommand: string;
}

export class Debugger extends React.Component<DebuggerProps, DebuggerState> {
    constructor(props: DebuggerProps) {
        super(props);
        this.state = {
            commandBatches: [],
            pageSize: A4_PAGE_SIZE,
            partialCommand: '',
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

    onClear() {
        this.setState({
            commandBatches: [],
        });
    }

    onPageSizeChanged(size: PageSize) {
        this.setState({
            pageSize: size,
        });
    }

    render() {
        const [width, height] = this.state.pageSize.size;
        return <div>
            <PlotterView
                commandBatches={this.state.commandBatches}
                paperWidth={width}
                paperHeight={height}
                stepsPerMillimeter={20}
                lineThickness={1}/>
            <Sidebar
                onClear={() => this.onClear()}
                onSizeChanged={size => this.onPageSizeChanged(size)}
                pageSize={this.state.pageSize} />
        </div>;
    }
}
