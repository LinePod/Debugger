"""
Debugging server that offers the same interface as the plotter raspberry pi
does via bluetooth but via TCP. The data is exchanged via a websocket server
with loaded versions of the debugging website.

It also offers an additional port to send raw GPGL to print on the website.
"""

import asyncio
import collections
import logging
import struct
import subprocess
import tempfile
import websockets

TCP_BUFFER_SIZE = 4096
WS_PORT = 3000
PI_EMULATION_PORT = 8081
GPGL_PORT = 8082
CONVERTER_PATH = '/svg-converter/build/svg_converter'

# List of non error websocket closing codes
OK_WS_CLOSE_CODES = {
    1000,  # CLOSE_NORMAL
    1001,  # CLOSE_GOING_AWAY (e.g. website closed or reloaded)
}

TcpConnection = collections.namedtuple('TcpConnection',
                                       ('writer', 'reader', 'name'))

WsConnection = collections.namedtuple('WsConnection',
                                      ('socket', 'close_event', 'name'))


def format_connection_name(address):
    """Create a connection name from a remote address.

    The address can either be `None` (if its not known), an IPv4 address
    (`(host, port)`) or an IPv6 address(`(host, port, flowinfo, scopeid)`)
    """
    if address is None:
        return '<unknown address>'
    return '{}:{}'.format(address[0], address[1])


def handle_ws_connection_closed(connection, e, logger):
    connection.close_event.set()
    if e.code not in OK_WS_CLOSE_CODES:
        logger.warning(
            ('Websocket connection from {} closed with unexpected code {} and '
             'reason: "{}"').format(connection.name, e.code, e.reason))
    else:
        logger.info('Websocket connection from {} closed'.format(
            connection.name))


def convert_svg(svg_bytes, logger):
    with tempfile.NamedTemporaryFile() as f:
        f.write(svg_bytes)
        f.flush()
        proc = subprocess.run([CONVERTER_PATH, f.name],
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.stderr:
            logger.warn("Errors from converter: {}".format(
                proc.stderr.decode('utf-8')))
        return proc.stdout


async def try_write_to_all(data, ws_connections, logger):
    """
    Write to all websocket connections, handling closed connections.
    """
    closed = []
    for ws_connection in ws_connections:
        try:
            await ws_connection.socket.send(data)
        except websockets.ConnectionClosed as e:
            handle_ws_connection_closed(ws_connection, e, logger)
            closed.append(ws_connection)
    for ws_connection in closed:
        ws_connections.remove(ws_connection)


async def handle_websocket_data(connection, ws_connections,
                                emulator_tcp_connections, logger):
    """
    Forwards data send by a connected website to all emulator TCP connections.
    """
    while True:
        try:
            data = await connection.socket.recv()
        except websockets.ConnectionClosed as e:
            handle_ws_connection_closed(connection, e, logger)
            ws_connections.remove(connection)
            return
        data = data.encode('utf-8')
        logger.debug(
            ('Sending {} bytes of data from debugger website {} to {} TCP '
             'connections').format(len(data), connection.name,
                                   len(emulator_tcp_connections)))
        # Its important, that we don't await in this block, so that all TCP
        # connections get send all data in the same order
        for tcp_connection in emulator_tcp_connections:
            tcp_connection.writer.write(data)


async def handle_emulator_tcp_connection(connection, loop, ws_connections,
                                         emulator_tcp_connections, logger):
    """
    Accepts data from a TCP connection emulating the raspberry pi API.
    """
    try:
        while True:
            try:
                svg_uuid = await connection.reader.readexactly(36)
            except asyncio.IncompleteReadError as e:
                if len(e.partial) == 0:
                    logger.debug('TCP connection from {} disconnected'.format(
                        connection.name))
                    emulator_tcp_connections.remove(connection)
                    return
                raise
            logger.debug('Receiving SVG with UUID ' + svg_uuid.decode('ascii'))
            svg_len_bytes = await connection.reader.readexactly(4)
            svg_len = struct.unpack('>I', svg_len_bytes)[0]
            svg_bytes = await connection.reader.readexactly(svg_len)
            logger.debug('Converting SVG of size {}b'.format(svg_len))
            gpgl_code = await loop.run_in_executor(None, convert_svg,
                                                   svg_bytes, logger)

            logger.debug('Converted SVG to {}b GPGL'.format(len(gpgl_code)))
            logger.debug(('Forwarding converted GPGL to {} websocket '
                          'connections').format(len(ws_connections)))
            await try_write_to_all(gpgl_code.decode('utf-8'), ws_connections,
                                   logger)
    except asyncio.IncompleteReadError:
        # If we get here, the incomplete read signals an unexpected close of
        # the connection
        logger.warning('TCP connection {} dropped while reading message'
                       .format(connection.name))
    emulator_tcp_connections.remove(connection)


async def handle_raw_gpgl_tcp_connection(connection, ws_connections, logger):
    while True:
        data = await connection.reader.read(TCP_BUFFER_SIZE)
        if not data:
            logger.debug('GPGL connection {} was closed'.format(
                connection.name))
            return
        logger.debug('Forwarding {}b of raw GPGL'.format(len(data)))
        gpgl_code = data.decode('ascii')
        await try_write_to_all(gpgl_code, ws_connections, logger)


async def accept_ws_connection(websocket, ws_connections,
                               emulator_tcp_connections, logger):
    name = format_connection_name(websocket.remote_address)
    logger.info('Websocket connection from {} established'.format(name))
    connection = WsConnection(
        socket=websocket,
        close_event=asyncio.Event(),
        name=name
    )
    ws_connections.append(connection)
    asyncio.ensure_future(handle_websocket_data(connection,
                                                ws_connections,
                                                emulator_tcp_connections,
                                                logger))
    await connection.close_event.wait()


def accept_emulator_tcp_connection(reader, writer, loop, ws_connections,
                                   emulator_tcp_connections, logger):
    name = format_connection_name(writer.get_extra_info('peername'))
    logger.info('Emulator TCP connection from {} established'.format(name))
    connection = TcpConnection(writer=writer, reader=reader, name=name)
    emulator_tcp_connections.append(connection)
    asyncio.ensure_future(handle_emulator_tcp_connection(
        connection, loop, ws_connections, emulator_tcp_connections, logger))


def accept_gpgl_tcp_connection(reader, writer, ws_connections, logger):
    name = format_connection_name(writer.get_extra_info('peername'))
    logger.info('GPGL TCP connection from {} established'.format(name))
    connection = TcpConnection(name=name, reader=reader, writer=writer)
    asyncio.ensure_future(handle_raw_gpgl_tcp_connection(
        connection, ws_connections, logger))


def setup_logger() -> logging.Logger:
    logger = logging.getLogger('gpgl_server')
    logger.setLevel(logging.DEBUG)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('[{levelname}] {msg}', style='{'))
    logger.addHandler(handler)
    return logger


def main():
    logger = setup_logger()
    tcp_connections = []
    ws_connections = []
    loop = asyncio.get_event_loop()
    loop.run_until_complete(websockets.serve(
        lambda socket, _: accept_ws_connection(socket,
                                               ws_connections,
                                               tcp_connections,
                                               logger),
        port=WS_PORT
    ))
    loop.run_until_complete(asyncio.start_server(
        lambda reader, writer: accept_emulator_tcp_connection(
            reader, writer, loop, ws_connections, tcp_connections, logger),
        port=PI_EMULATION_PORT
    ))
    loop.run_until_complete(asyncio.start_server(
        lambda reader, writer: accept_gpgl_tcp_connection(
            reader, writer, ws_connections, logger),
        port=GPGL_PORT
    ))
    logger.info('IO server started')
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
