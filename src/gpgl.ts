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
 * A GPGL angle.
 */
export class Angle {
    constructor(private readonly value: number) {
    }

    /**
     * Translates the angle into radians.
     */
    get asRadians(): number {
        // Classical degrees -> radians formula with an added division by 10
        return this.value / 10 / 180 * Math.PI;
    }

    /**
     * Unit vector corresponding to the angle (in the GPGL coordinate system).
     */
    get unitVector(): Vector {
        const radians = this.asRadians;
        return new Vector(Math.cos(radians), Math.sin(radians));
    }

    /**
     * Opposite of the angle (rotated by 180°).
     */
    get opposite(): Angle {
        return new Angle(this.value + 1800);
    }

    /**
     * Delta from this angle to another, in degrees.
     */
    degreeDelta(otherAngle: Angle): number {
        return Math.abs(this.value - otherAngle.value) / 10;
    }
}

/**
 * Draws a polyline between a set of points, beginning at the current position.
 */
export interface DrawCommand {
    type: 'DRAW';
    points: Array<Vector>;
}

/**
 * Like `DrawCommand`, but uses relative positioning for its points.
 *
 * Each points coordinates are relative to the previous point, and the first
 * one is relative to the current position.
 */
export interface RelativeDrawCommand {
    type: 'RELATIVE_DRAW';
    offsets: Array<Vector>;
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
    startAngle: Angle;
    endAngle: Angle;
}

/**
 * Draw a cubic bezier curve.
 *
 * All positions are absolute.
 */
export interface BezierCurveCommand {
    type: 'BEZIER_CURVE';
    startPoint: Vector;
    controlPoint1: Vector;
    controlPoint2: Vector;
    endPoint: Vector;
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
    startAngle: Angle;
    endAngle: Angle;
}

/**
 * Union type over all GPGL command types.
 */
export type Command = DrawCommand | RelativeDrawCommand | MoveCommand |
                      RelativeMoveCommand | CircleCommand |
                      RelativeCircleCommand | BezierCurveCommand;

/**
 * Result of parsing a batch of GPGL code.
 */
interface ParseResult {
    /**
     * Commands parsed from the code.
     */
    commands: Array<Command>;

    /**
     * Partial command code found at the end of the input code.
     */
    partialCommand: string;
}

/**
 * Parse GPGL commands from a batch of code.
 */
export function parseGPGLCode(gpglCode: string): ParseResult {
    const textCommands = gpglCode.split('\x03');
    const partialCommand = textCommands.pop();
    const commands: Array<Command> = [];
    for (const command of textCommands) {
        const {instruction, params} = splitCommand(command);
        switch (instruction) {
            case 'D': {
                commands.push({type: 'DRAW', points: convertToPoints(params)});
                break;
            }
            case 'E': {
                commands.push({ type: 'RELATIVE_DRAW', offsets: convertToPoints(params) });
                break;
            }
            case 'M': {
                const [x, y] = params;
                commands.push({type: 'MOVE', position: new Vector(x, y)});
                break;
            }
            case 'O': {
                const [x, y] = params;
                commands.push({ type: 'RELATIVE_MOVE', offset: new Vector(x, y) });
                break;
            }
            case 'W': {
                const center = new Vector(params[0], params[1]);
                commands.push({
                    type: 'CIRCLE',
                    center,
                    startRadius: params[2],
                    endRadius: params[3],
                    startAngle: new Angle(params[4]),
                    endAngle: new Angle(params[5]),
                });
                break;
            }
            case ']': {
                const [startRadius, endRadius, startAngle, endAngle] = params;
                commands.push({
                    type: 'RELATIVE_CIRCLE',
                    startRadius,
                    endRadius,
                    startAngle: new Angle(startAngle),
                    endAngle: new Angle(endAngle)
                });
                break;
            }
            case 'BZ': {
                // Ignore 'a' parameter because we don't know its effect.
                const [startPoint,
                       controlPoint1,
                       controlPoint2,
                       endPoint] = convertToPoints(params.slice(1));
                commands.push({
                    type: 'BEZIER_CURVE',
                    startPoint,
                    controlPoint1,
                    controlPoint2,
                    endPoint
                });
                break;
            }
            default: {
                console.warn(`Ignoring unknown command '${command}'`);
                break;
            }
        }
    }

    return { commands: commands, partialCommand };
}

function splitCommand(command: string): { instruction: string, params: Array<number> } {
    // Just using split(' ', 2) would throw away parts of the command if more
    // than one space exists in it
    const spacePos = command.indexOf(' ');
    const instruction = command.substr(0, spacePos);
    const params = command.substr(spacePos)
        .split(',')
        .map(s => Number.parseInt(s, 10));
    return {instruction, params};
}

function convertToPoints(params: Array<number>): Array<Vector> {
    const points: Array<Vector> = [];
    for (let i = 0; i < params.length; i += 2) {
        points.push(new Vector(params[i], params[i + 1]));
    }

    return points;
}
