export class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

interface Line {
    type: 'line';
    point1: Point;
    point2: Point;
}

interface Circle {
    type: 'circle';
    center: Point;
    radius: number;
}

export type Shape = Line | Circle;
