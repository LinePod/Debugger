import * as React from 'react';
import {parseGPGLCode, CommandBatch} from '../gpgl';
import {PlotterView} from './PlotterView';
import {A4_PAGE_SIZE, PageSize, Sidebar} from './Sidebar';

interface DebuggerProps {
    websocketPort: number;
}

interface DebuggerState {
    commandBatches: Array<CommandBatch>;
    lineThickness: number;
    pageSize: PageSize;
    partialCommand: string;
}

export class Debugger extends React.Component<DebuggerProps, DebuggerState> {
    constructor(props: DebuggerProps) {
        super(props);
        this.state = {
            commandBatches: [],
            lineThickness: 1,
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

    onLineThicknessChanged(thickness: number) {
        this.setState({
            lineThickness: thickness,
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
                lineThickness={this.state.lineThickness}/>
            <Sidebar
                lineThickness={this.state.lineThickness}
                onClear={() => this.onClear()}
                onLineThicknessChanged={num => this.onLineThicknessChanged(num)}
                onSizeChanged={size => this.onPageSizeChanged(size)}
                pageSize={this.state.pageSize} />
        </div>;
    }
}
