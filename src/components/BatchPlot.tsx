import * as React from 'react';
import {Angle, Command, Vector} from '../gpgl';

export interface BatchPlotProps {
    readonly commands: ReadonlyArray<Command>;
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
function circleToSVGPath(center: Vector, radius: number, startAngle: Angle, endAngle: Angle, moveToStart: boolean): { path: string, endPoint: Vector } {
    const startPoint = pointOnCircleOutline(center, radius, startAngle);
    let path = moveToStart ? ` M ${startPoint.x},${startPoint.y}` : '';

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

    path += ` A ${radius},${radius},0,${largeArc},${clockwise},${endPoint.x},${endPoint.y}`;
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
                path += ` M ${cmd.position.x},${cmd.position.y}`;
                position = cmd.position;
                break;
            }
            case 'RELATIVE_MOVE': {
                path += ` m ${cmd.offset.x},${cmd.offset.y}`;
                position = position.add(cmd.offset);
                break;
            }
            case 'DRAW': {
                path += cmd.points.map(p => `L ${p.x},${p.y}`).join(' ');
                position = cmd.points[cmd.points.length - 1];
                break;
            }
            case 'RELATIVE_DRAW': {
                path += cmd.offsets.map(p => `l ${p.x},${p.y}`).join(' ');
                position = cmd.offsets.reduce((p1, p2) => p1.add(p2), position);
                break;
            }
            case 'CIRCLE': {
                if (cmd.startRadius !== cmd.endRadius) {
                    console.warn('Different start and end radii are not currently supported');
                }

                const radius = cmd.startRadius;
                const {path: arcPath, endPoint} = circleToSVGPath(cmd.center, radius, cmd.startAngle, cmd.endAngle, true);
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
                const {path: arcPath, endPoint} = circleToSVGPath(center, radius, cmd.startAngle, cmd.endAngle, false);
                path += arcPath;
                position = endPoint;

                break;
            }
        }
    }

    return path;
}

/**
 * Renders a batch of GPGL commands as an SVG path.
 */
export function BatchPlot(props: BatchPlotProps) {
    const data = commandsToSVGPath(props.commands);
    return <path d={data} className='batch-plot'/>;
}
