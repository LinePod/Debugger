/**
 * Specifies classes for GPGL commands.
 *
 * GPGL coordinate system:
 *
 * The coordinate system originates on the top left, with the positive x axis
 * going down (away from the plotter), and the positive y axis going right.
 * It uses a custom unit (probably motor steps), with 20 steps being equal to
 * 1mm.
 *
 * Angles are expressed in degrees multiplied by 10 (90° = 900). For circles
 * and other shapes, the direction of 0° is along the positive x axis, and then
 * counter clockwise (90° is along the positive y axis).
 */

import { Point } from './geometry';

/**
 * Draws a polyline between a set of points, beginning at the current position.
 */
export class DrawCommand {
    constructor(points: Point[]) {
        this.points = points;
    }

    points: Point[];
}

/**
 * Like `DrawCommand`, but uses relative positioning for its points.
 *
 * Each points coordinates are relative to the previous point, and the first
 * one is relative to the current position.
 */
export class RelativeDrawCommand {
    constructor(offsets: Point[]) {
        this.offsets = offsets;
    }

    offsets: Point[];
}

/**
 * Move the plotter to an absolute position without drawing.
 */
export class MoveCommand {
    constructor(position: Point) {
        this.position = position;
    }

    position: Point;
}

/**
 * Move the plotter to a new position relative to the current one.
 */
export class RelativeMoveCommand {
    constructor(offset: Point) {
        this.offset = offset;
    }

    offset: Point;
}

/**
 * Draw part of a circle outline.
 *
 * The circle is centered on `center`, and the drawn arc begins at `startAngle`
 * and goes to `endAngle`. If the difference between the two angles is greater
 * than 3600, same parts will be drawn multiple times.
 * While drawing, the radius is linearly interpolated from `startRadius` to
 * `endRadius`. This can be used, for example, to create spirals.
 */
export class CircleCommand {
    constructor(center: Point, startRadius: number, endRadius: number, startAngle: number, endAngle: number) {
        this.center = center;
        this.startRadius = startRadius;
        this.endRadius = endRadius;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
    }

    center: Point;
    startRadius: number;
    endRadius: number;
    startAngle: number;
    endAngle: number;
}

/**
 * Draws part of a circle outline beginning on the current position.
 *
 * The current position is interpreted as the point on the outline at
 * `startAngle` with a radius of `startRadius`. From this, a center location
 * can be calculated. In all other aspects, this command behaves like
 * `CircleCommand`.
 */
export class RelativeCircleCommand {
    constructor(startRadius: number, endRadius: number, startAngle: number, endAngle: number) {
        this.startRadius = startRadius;
        this.endRadius = endRadius;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
    }

    startRadius: number;
    endRadius: number;
    startAngle: number;
    endAngle: number;
}

/**
 * Union type for all GPGL command types.
 */
export type Command = DrawCommand | RelativeDrawCommand | MoveCommand |
                      RelativeMoveCommand | CircleCommand |
                      RelativeCircleCommand;

interface SplitCommand {
    instruction: string;
    params: number[];
}

/**
 * Reads GPGL code from the
 * @param gpglCode
 */
export function *readCommands(gpglCode: string): Iterable<Command> {
    const commands = gpglCode.split('\x03');
    // If the last command is complete (i.e. terminated by a \x03), then the
    // last string is empty.
    commands.pop();
    for (const command of commands) {
        const {instruction, params} = splitCommand(command);
        switch (instruction) {
            case 'D': {
                yield new DrawCommand(convertToPoints(params));
                break;
            }
            case 'E': {
                yield new RelativeDrawCommand(convertToPoints(params));
                break;
            }
            case 'M': {
                const [x, y] = params;
                yield new MoveCommand(new Point(x, y));
                break;
            }
            case 'O': {
                const [x, y] = params;
                yield new RelativeMoveCommand(new Point(x, y));
                break;
            }
            case 'W': {
                const [x, y, r1, r2, theta1, theta2] = params;
                const center = new Point(x, y);
                yield new CircleCommand(center, r1, r2, theta1, theta2);
                break;
            }
            case ']': {
                const [r1, r2, theta1, theta2] = params;
                yield new RelativeCircleCommand(r1, r2, theta1, theta2);
                break;
            }
            default: {
                console.warn(`Ignoring unknown command '${command}'`);
                break;
            }
        }
    }
}

function splitCommand(command: string): SplitCommand {
    let instruction = command.substr(0, 1);
    let params = command.substr(1)
                            .split(',')
                            .map(s => Number.parseInt(s, 10));
    return {instruction, params};
}

function convertToPoints(params: number[]): Point[] {
    const points: Point[] = [];
    for (let i = 0; i < params.length; i += 2) {
        points.push(new Point(params[i], params[i + 1]));
    }

    return points;
}
