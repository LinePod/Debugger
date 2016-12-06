/**
 * Handling of GPGL commands and the GPGL coordinate system.
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

/**
 * 2 dimensional vector.
 */
export class Vector {
    constructor(readonly x: number, readonly y: number) {
    }

    add(other: Vector): Vector {
        return new Vector(this.x + other.x, this.y + other.y);
    }

    scale(scalar: number): Vector {
        return new Vector(this.x * scalar, this.y * scalar);
    }
}

/**
 * Draws a polyline between a set of points, beginning at the current position.
 */
export interface DrawCommand {
    type: 'DRAW';
    points: Vector[];
}

/**
 * Like `DrawCommand`, but uses relative positioning for its points.
 *
 * Each points coordinates are relative to the previous point, and the first
 * one is relative to the current position.
 */
export interface RelativeDrawCommand {
    type: 'RELATIVE_DRAW';
    offsets: Vector[];
}

/**
 * Move the plotter to an absolute position without drawing.
 */
export interface MoveCommand {
    type: 'MOVE';
    position: Vector;
}

/**
 * Move the plotter to a new position relative to the current one.
 */
export interface RelativeMoveCommand {
    type: 'RELATIVE_MOVE';
    offset: Vector;
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
export interface CircleCommand {
    type: 'CIRCLE';
    center: Vector;
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
export interface RelativeCircleCommand {
    type: 'RELATIVE_CIRCLE';
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
                yield {type: 'DRAW', points: convertToPoints(params)};
                break;
            }
            case 'E': {
                yield {type: 'RELATIVE_DRAW', offsets: convertToPoints(params)};
                break;
            }
            case 'M': {
                const [x, y] = params;
                yield {type: 'MOVE', position: new Vector(x, y)};
                break;
            }
            case 'O': {
                const [x, y] = params;
                yield {type: 'RELATIVE_MOVE', offset: new Vector(x, y)};
                break;
            }
            case 'W': {
                const center = new Vector(params[0], params[1]);
                yield {
                    type: 'CIRCLE',
                    center,
                    startRadius: params[2],
                    endRadius: params[3],
                    startAngle: params[4],
                    endAngle: params[5],
                };
                break;
            }
            case ']': {
                const [startRadius, endRadius, startAngle, endAngle] = params;
                yield {
                    type: 'RELATIVE_CIRCLE',
                    startRadius,
                    endRadius,
                    startAngle,
                    endAngle
                };
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

function convertToPoints(params: number[]): Vector[] {
    const points: Vector[] = [];
    for (let i = 0; i < params.length; i += 2) {
        points.push(new Vector(params[i], params[i + 1]));
    }

    return points;
}
