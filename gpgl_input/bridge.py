"""
Bidirectional bridge between TCP and websocket connections.

Used to connect bridge a TCP connection from an android app to the debugger
webpage.
"""

import asyncio
import logging
from typing import List, NamedTuple, Optional, Tuple, Union
import websockets

TCP_BUFFER_SIZE = 4096
WS_PORT = 8080
TCP_PORT = 8090

# List of non error websocket closing codes
OK_WS_CLOSE_CODES = {
    1000,  # CLOSE_NORMAL
    1001,  # CLOSE_GOING_AWAY (e.g. website closed or reloaded)
}

# Type aliases
IPV4Address = Tuple[str, int]
IPV6Address = Tuple[str, int, int, int]
GenericAddress = Union[IPV4Address, IPV6Address]


class TcpConnection(NamedTuple):
    writer: asyncio.StreamWriter
    reader: asyncio.StreamReader
    name: str


class WsConnection(NamedTuple):
    socket: websockets.WebSocketServerProtocol
    close_event: asyncio.Event
    name: str


def format_connection_name(address: Optional[GenericAddress]) -> str:
    """Create a connection name from a remote address.

    The address can either be `None` (if its not known), an IPv4 address
    (`(host, port`)) or an IPv6 address(`(host, port, flowinfo, scopeid)`)
    """
    if address is None:
        return '<unknown address>'
    return f'{address[0]}:{address[1]}'


def handle_ws_connection_closed(connection: WsConnection,
                                e: websockets.ConnectionClosed,
                                logger: logging.Logger):
    connection.close_event.set()
    if e.code not in OK_WS_CLOSE_CODES:
        logger.warning(
            f'Websocket connection from {connection.name} closed with '
            f'unexpected code {e.code} and reason: "{e.reason}"'
        )
    else:
        logger.info(f'Websocket connection from {connection.name} closed')


async def forward_from_websocket(connection: WsConnection,
                                 ws_connections: List[WsConnection],
                                 tcp_connections: List[TcpConnection],
                                 logger: logging.Logger):
    while True:
        try:
            data = await connection.socket.recv()
        except websockets.ConnectionClosed as e:
            handle_ws_connection_closed(connection, e, logger)
            ws_connections.remove(connection)
            return
        data = data.encode('ascii')
        logger.debug(
            f'Forwarding {len(data)} bytes from {connection.name} to '
            f'{len(tcp_connections)} TCP connection(s)'
        )
        for tcp_connection in tcp_connections:
            tcp_connection.writer.write(data)
            await tcp_connection.writer.drain()


async def forward_from_tcp(connection: TcpConnection,
                           ws_connections: List[WsConnection],
                           tcp_connections: List[TcpConnection],
                           logger: logging.Logger):
    while True:
        data = await connection.reader.read(TCP_BUFFER_SIZE)
        if not data:
            tcp_connections.remove(connection)
            logger.info(f'TCP connection from {connection.name} closed')
            return
        data = data.decode('ascii')
        logger.debug(
            f'Forwarding {len(data)} bytes from {connection.name} to '
            f'{len(ws_connections)} websocket connection(s)'
        )
        closed = []
        for ws_connection in ws_connections:
            try:
                await ws_connection.socket.send(data)
            except websockets.ConnectionClosed as e:
                handle_ws_connection_closed(connection, e, logger)
                closed.append(ws_connection)
        for ws_connection in closed:
            ws_connections.remove(ws_connection)


async def accept_ws_connection(websocket: websockets.WebSocketServerProtocol,
                               ws_connections: List[WsConnection],
                               tcp_connections: List[TcpConnection],
                               logger: logging.Logger):
    name = format_connection_name(websocket.remote_address)
    logger.info(f'Websocket connection from {name} established')
    connection = WsConnection(
        socket=websocket,
        close_event=asyncio.Event(),
        name=name
    )
    ws_connections.append(connection)
    asyncio.ensure_future(forward_from_websocket(connection,
                                                 ws_connections,
                                                 tcp_connections,
                                                 logger))
    await connection.close_event.wait()


def accept_tcp_connection(reader: asyncio.StreamReader,
                          writer: asyncio.StreamWriter,
                          ws_connections: List[WsConnection],
                          tcp_connections: List[TcpConnection],
                          logger: logging.Logger):
    name = format_connection_name(writer.get_extra_info('peername'))
    logger.info(f'TCP connection from {name} established')
    connection = TcpConnection(writer=writer, reader=reader, name=name)
    tcp_connections.append(connection)
    asyncio.ensure_future(forward_from_tcp(connection,
                                           ws_connections,
                                           tcp_connections,
                                           logger))


def setup_logger() -> logging.Logger:
    logger = logging.getLogger('bridge')
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
        'localhost',
        WS_PORT
    ))
    loop.run_until_complete(asyncio.start_server(
        lambda reader, writer: accept_tcp_connection(reader,
                                                     writer,
                                                     ws_connections,
                                                     tcp_connections,
                                                     logger),
        port=TCP_PORT
    ))
    logger.info('Bridge started')
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
