Debugger for the linespace project

# Setup

The entire debugger is run inside a docker container for portability.
Therefore, docker is the only dependency.

To (re)build the container, run `./build.sh`.
It creates a container named `linespace-debugger`.

# Usage

To run the container, execute `./run.sh`.
It exposes several ports:

 * 8080: Exposes the website for the debugger. Access it via `http://localhost:8080`.
 * 8081: Receives GPGL commands which will then be displayed on the website.
 * 8082: Receives SVGs to convert to GPGL and display.
         Must be send as a 32bit big endian integer containing the byte size of the SVG followed by the SVG itself.
 * 3000: Internal websocket server.
