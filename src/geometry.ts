export class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add(other: Point): Point {
        return new Point(this.x + other.x, this.y + other.y);
    }
}
