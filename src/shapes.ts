export class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

export class Line {
    constructor(point1: Point, point2: Point) {
        this.point1 = point1;
        this.point2 = point2;
    }

    point1: Point;
    point2: Point;
}

export class Circle {
    constructor(center: Point, radius: number) {
        this.center = center;
        this.radius = radius;
    }

    center: Point;
    radius: number;
}

export type Shape = Line | Circle;
