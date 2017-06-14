import * as React from 'react';
import {parseGPGLCode, Command} from '../gpgl';
import {PlotterView} from './PlotterView';
import {Sidebar} from './Sidebar';
import {A4_PAGE_SIZE, PageSize} from './PageSizeSelector';

interface DebuggerProps {
    websocketPort: number;
}

interface DebuggerState {
    commands: Array<Command>;
    lineThickness: number;
    pageSize: PageSize;
    partialCommand: string;
    reversePageOrientation: boolean;
}

export class Debugger extends React.Component<DebuggerProps, DebuggerState> {
    constructor(props: DebuggerProps) {
        super(props);
        this.state = {
            commands: [],
            lineThickness: 1,
            pageSize: A4_PAGE_SIZE,
            partialCommand: '',
            reversePageOrientation: false,
        };

        const socket = new WebSocket(`ws://localhost:${this.props.websocketPort}`);
        socket.onmessage = (message) => {
            const gpglCode = this.state.partialCommand + message.data;
            const {commands, partialCommand} = parseGPGLCode(gpglCode);
            this.setState({
                commands: this.state.commands.concat(commands),
                partialCommand
            });
        };
    }

    onClear() {
        this.setState({
            commands: [],
        });
    }

    onPageSizeChanged(size: PageSize, reversePageOrientation: boolean) {
        this.setState({
            pageSize: size,
            reversePageOrientation,
        });
    }

    onLineThicknessChanged(thickness: number) {
        this.setState({
            lineThickness: thickness,
        });
    }

    render() {
        let [width, height] = this.state.pageSize.size;
        if (this.state.reversePageOrientation) {
            [width, height] = [height, width];
        }

        return <div>
            <PlotterView
                commands={this.state.commands}
                paperWidth={width}
                paperHeight={height}
                stepsPerMillimeter={20}
                lineThickness={this.state.lineThickness}/>
            <Sidebar
                lineThickness={this.state.lineThickness}
                onClear={() => this.onClear()}
                onLineThicknessChanged={num => this.onLineThicknessChanged(num)}
                onSizeChanged={(size, reverseOrientation) => {
                    this.onPageSizeChanged(size, reverseOrientation)
                }}
                pageSize={this.state.pageSize}
                reverseOrientation={this.state.reversePageOrientation}/>
        </div>;
    }
}
