import * as React from 'react';
import {Angle, Command, Vector} from '../gpgl';
import {LayoutSettings} from './LayoutSettingsPanel';

const SVG_DEFS = <defs>
        <filter id="drop-shadow">
            <feOffset in="SourceAlpha" result="alpha-offset" dx="20" dy="20"/>
            <feGaussianBlur in="alpha-offset" result="alpha-blurred" stdDeviation="10"/>
            <feColorMatrix
                in="alpha-blurred"
                result="alpha-more-transparency"
                type="matrix"
                values={`1 0 0 0  0
                             0 1 0 0  0
                             0 0 1 0  0
                             0 0 0 .4 0`}/>
            <feBlend in="SourceGraphic" in2="alpha-more-transparency" mode="normal"/>
        </filter>
    </defs>;

function formatSVGCommand(instruction: string, ...args: Array<number>): string {
    return ` ${instruction} ${args.join(' ')}`;
}

/**
 * Return the point on the circle outline at the given GPGL angle.
 */
function pointOnCircleOutline(center: Vector, radius: number, angle: Angle): Vector {
    return center.add(angle.unitVector.scale(radius));
}

/**
 * Convert a circle/arc command to SVG path commands.
 *
 * @param center Center of the circle.
 * @param radius Radius of the circle.
 * @param startAngle Start angle in GPGL format.
 * @param endAngle End angle in GPGL format.
 * @param moveToStart Whether to add a move command to the beginning of the arc.
 */
function circleToSVGPath(center: Vector,
                         radius: number,
                         startAngle: Angle,
                         endAngle: Angle,
                         moveToStart: boolean): { path: string, endPoint: Vector } {
    const startPoint = pointOnCircleOutline(center, radius, startAngle);
    let path = moveToStart
        ? formatSVGCommand('M', startPoint.x, startPoint.y)
        : '';

    let angleDeltaDegrees = startAngle.degreeDelta(endAngle);
    if (Math.abs(angleDeltaDegrees) >= 360) {
        // Full circle, which can't be displayed with a single SVG arc.
        // Therefore we use 2 180° arcs here.
        const oppositePoint = pointOnCircleOutline(center, radius, startAngle.opposite);
        path += `A ${radius},${radius},0,0,0,${oppositePoint.x},${oppositePoint.y}`;
        path += `A ${radius},${radius},0,0,0,${startPoint.x},${startPoint.y}`;
        return {path, endPoint: startPoint};
    }

    // As described in the module documentation of `gpgl.ts`, the x and y axis
    // in GPGL are exchanged compared to the SVG coordinate system. We use a
    // transformation matrix in the `PlotterView` component to adjust for this.
    // However because this transformation "flips" the view plane on its back,
    // arcs that were previously clockwise are now rendered counter-clockwise.
    // To alleviate that, we purposefully assign the "wrong" value here, so that
    // the arc is rendered correctly after the transformation has been applied.
    const clockwise = angleDeltaDegrees < 0 ? 0 : 1;
    const largeArc = Math.abs(angleDeltaDegrees) > 180 ? 1 : 0;
    const endPoint = pointOnCircleOutline(center, radius, endAngle);

    path += formatSVGCommand('A', radius, radius, 0, largeArc, clockwise, endPoint.x, endPoint.y);
    return {path, endPoint};
}

/**
 * Convert a GPGL command to SVG path commands.
 */
function commandsToSVGPath(commands: ReadonlyArray<Command>): string {
    let path = 'M 0,0';
    let position = new Vector(0, 0);
    for (const cmd of commands) {
        switch (cmd.type) {
            case 'MOVE': {
                path += formatSVGCommand('M', cmd.position.x, cmd.position.y);
                position = cmd.position;
                break;
            }
            case 'RELATIVE_MOVE': {
                path += formatSVGCommand('m', cmd.offset.x, cmd.offset.y);
                position = position.add(cmd.offset);
                break;
            }
            case 'DRAW': {
                path += cmd.points.map(p => formatSVGCommand('L', p.x, p.y)).join('');
                position = cmd.points[cmd.points.length - 1];
                break;
            }
            case 'RELATIVE_DRAW': {
                path += cmd.offsets.map(p => formatSVGCommand('l', p.x, p.y)).join('');
                position = cmd.offsets.reduce((p1, p2) => p1.add(p2), position);
                break;
            }
            case 'CIRCLE': {
                if (cmd.startRadius !== cmd.endRadius) {
                    console.warn('Different start and end radii are not currently supported');
                }

                const radius = cmd.startRadius;
                const {path: arcPath, endPoint} = circleToSVGPath(
                    cmd.center,
                    radius,
                    cmd.startAngle,
                    cmd.endAngle,
                    true
                );
                path += arcPath;
                position = endPoint;
                break;
            }
            case 'RELATIVE_CIRCLE': {
                if (cmd.startRadius !== cmd.endRadius) {
                    console.warn('Different start and end radii are not currently supported');
                }

                const radius = cmd.startRadius;

                // Current position is on the circle around the center at angle
                // `cmd.startAngle`, therefore the center is on a circle around
                // the current position at the opposite angle.
                const currentToCenter = cmd.startAngle.opposite.unitVector;
                const center = position.add(currentToCenter.scale(radius));
                const {path: arcPath, endPoint} = circleToSVGPath(
                    center,
                    radius,
                    cmd.startAngle,
                    cmd.endAngle,
                    false
                );
                path += arcPath;
                position = endPoint;

                break;
            }
            case 'BEZIER_CURVE': {
                path += formatSVGCommand('M', cmd.startPoint.x, cmd.startPoint.y);
                path += formatSVGCommand(
                    'C',
                    cmd.controlPoint1.x,
                    cmd.controlPoint1.y,
                    cmd.controlPoint2.x,
                    cmd.controlPoint2.y,
                    cmd.endPoint.x,
                    cmd.endPoint.y
                );
                position = cmd.endPoint;
                break;
            }
        }
    }

    return path;
}

interface PlotterViewProps {
    /**
     * Received commands.
     */
    readonly commands: ReadonlyArray<Command>;

    /**
     * Width of the paper that we are plotting on, in millimeters.
     */
    readonly paperWidth: number;

    /**
     * Height of the paper that we are plotting on, in millimeters.
     */
    readonly paperHeight: number;

    /**
     * Settings for the page layout.
     */
    readonly layoutSettings: LayoutSettings;

    /**
     * Number of plotter steps per millimeter.
     */
    readonly stepsPerMillimeter: number;

    /**
     * Thickness of the plotted lines in millimeters.
     */
    readonly lineThickness: number;
}

function generatePrintMargins(settings: LayoutSettings, stepsPerMillimeter: number,
                              paperWidth: number, paperHeight: number) {
    const {marginTop, marginLeft, plotWidth} = settings;
    const printMarginOutlines = [];
    if (marginTop > 0) {
        const y = marginTop * stepsPerMillimeter;
        printMarginOutlines.push(
            <line x1={marginLeft * stepsPerMillimeter} y1={y}
                  x2={(Math.min(marginLeft + plotWidth, paperWidth)) * stepsPerMillimeter}
                  y2={y}/>);
    }

    if (marginLeft > 0) {
        const x = marginLeft * stepsPerMillimeter;
        printMarginOutlines.push(
            <line x1={x} y1={marginTop * stepsPerMillimeter} x2={x}
                  y2={paperHeight * stepsPerMillimeter}/>);
    }

    if (marginLeft + plotWidth < paperWidth) {
        const x = (marginLeft + plotWidth) * stepsPerMillimeter;
        printMarginOutlines.push(
            <line x1={x} y1={marginTop * stepsPerMillimeter} x2={x}
                  y2={paperHeight * stepsPerMillimeter}/>);
    }

    return printMarginOutlines;
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
    const widthInSteps = props.paperWidth * props.stepsPerMillimeter;
    const heightInSteps = props.paperHeight * props.stepsPerMillimeter;
    const viewBox = `0 0 ${widthInSteps} ${heightInSteps}`;
    const marginTopInSteps = props.layoutSettings.marginTop * props.stepsPerMillimeter;
    const marginLeftInSteps = props.layoutSettings.marginLeft * props.stepsPerMillimeter;

    let printMargins = generatePrintMargins(
        props.layoutSettings, props.stepsPerMillimeter, props.paperWidth, props.paperHeight);

    return (<svg viewBox={viewBox} className="plotter-view">
        {SVG_DEFS}
        <rect
            x="0"
            y="0"
            width={widthInSteps}
            height={heightInSteps}
            className="plotter-paper" />
        <g className="print-margins">
            {...printMargins}
        </g>
        <path
            className="plot"
            transform={`matrix(0, 1, 1, 0, ${marginLeftInSteps}, ${marginTopInSteps})`}
            style={{strokeWidth: props.lineThickness * props.stepsPerMillimeter}}
            d={commandsToSVGPath(props.commands)}
        />
    </svg>);
}
