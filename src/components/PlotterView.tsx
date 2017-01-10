import * as React from 'react';
import {BatchPlot} from './BatchPlot';
import {CommandBatch} from '../gpgl';

interface PlotterViewProps {
    /**
     * Received batches of commands.
     */
    readonly commandBatches: ReadonlyArray<CommandBatch>;

    /**
     * Width of the paper that we are plotting on, in millimeters.
     */
    readonly paperWidth: number;

    /**
     * Height of the paper that we are plotting on, in millimeters.
     */
    readonly paperHeight: number;

    /**
     * Number of plotter steps per millimeter.
     */
    readonly stepsPerMillimeter: number;

    /**
     * Thickness of the plotted lines in millimeters.
     */
    readonly lineThickness: number;
}

/**
 * Display the plotted result of GPGL commands.
 *
 * SVG coordinate conversion:
 *
 * As explained in the module documentation of `gpgl.ts`, GPGL switches the
 * x and y axis compared to the SVG coordinate system. This component includes
 * a transformation matrix in the generated SVG to accomodate for this, so that
 * the rendering components can use the SVG coordinates system like the GPGL
 * one. One extra hack is necessary render arcs in right rotation, see the
 * comment in `BatchPlot.tsx` for more info.
 */
export function PlotterView(props: PlotterViewProps) {
    const batches = props.commandBatches.map(batch => (
        <BatchPlot commands={batch.commands} key={batch.id}/>
    ));
    const widthInSteps = props.paperWidth * props.stepsPerMillimeter;
    const heightInSteps = props.paperHeight * props.stepsPerMillimeter;
    const lineThicknessInSteps = props.lineThickness * props.stepsPerMillimeter;
    const viewBox = `0 0 ${widthInSteps} ${heightInSteps}`;
    return (<svg viewBox={viewBox} className="plotter-view">
        <rect
            x="0"
            y="0"
            width={widthInSteps}
            height={heightInSteps}
            className="plotter-outline"
        />
        <g
            transform="matrix(0,1,1,0,0,0)"
            style={{strokeWidth: lineThicknessInSteps}}
        >
            {batches}
        </g>
    </svg>);
}
