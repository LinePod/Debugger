# LinePod debugger

Debugger for the LinePod project to preview plotted output.

## Setup

The entire debugger is run inside a docker container for portability.
Therefore, docker is the only dependency.

To (re)build the container, run `./build.sh`.
It creates a container named `linespace-debugger`.

## Running

To run the container, execute `./run.sh`.
It exposes several ports:

 * 8080: Exposes the website for the debugger. Access it via `http://localhost:8080`.
 * 8081: Receives SVGs to convert to GPGL and display.
         Must be send as a 32bit big endian integer containing the byte size of the SVG followed by the SVG itself.
 * 8082: Receives GPGL commands which will then be displayed on the website.
 * 3000: Internal websocket server.

If docker is used through Docker Toolbox, these ports have to be forwarded from the virtual machine docker is running inside.

## Usage

Access the debugger in a browser at `http://localhost:8080`.

Content can be send to the debugger in multiple ways:
  * Apps can connect to the TCP endpoint at port 8081 and use it like they would use the bluetooth connection to the LinePod device.
    The debugger will accept print jobs and preview them in connected webpages.
  * Sending an SVG image directly by using the `send_svg.py` script.
    It can be called with `./send_svg.py svg-file-path`.
    Requirement is a relatively recent python 3 version.
  * Raw GPGL code can be send to port 8082.
    On Linux and macOS, this can be done using the netcat utility:
    ```
    nc localhost 8082 < file.gpgl
    ```
    or:
    ```
    svg_converter svg-file | nc localhost 8082
    ```
