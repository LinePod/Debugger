import asyncio
from typing import List
import websockets

TCP_BUFFER_SIZE = 4096


class Bridge:
    def __init__(self):
        self._tcp_writers: List[asyncio.StreamWriter] = []
        self._ws_clients:\
            List[(websockets.WebSocketServerProtocol, asyncio.Event)] = []

    @staticmethod
    def _handle_ws_connection_closed(e: websockets.ConnectionClosed,
                                     close_event: asyncio.Event):
        close_event.set()
        # See
        # https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
        # for a list of status codes.
        if e.code != 1000:
            # TODO: Handle better (logging)
            print(f'Websocket connection closed with code: {e.code}'
                  f'and reason: {e.reason}')
        else:
            print('Websocket disconnected normally')

    async def _forward_from_websocket(
            self,
            websocket: websockets.WebSocketServerProtocol,
            close_event: asyncio.Event):
        while True:
            try:
                data = await websocket.recv()
            except websockets.ConnectionClosed as e:
                self._handle_ws_connection_closed(e, close_event)
                self._ws_clients.remove((websocket, close_event))
                return
            data = data.encode('ascii')
            print(f'Forwarding "{data}" to tcp connections')
            for tcp_writer in self._tcp_writers:
                tcp_writer.write(data)
                await tcp_writer.drain()

    async def _forward_from_tcp_connection(self,
                                           reader: asyncio.StreamReader,
                                           writer: asyncio.StreamWriter):
        while True:
            data = await reader.read(TCP_BUFFER_SIZE)
            if not data:
                self._tcp_writers.remove(writer)
                print('TCP connection disconnected due to EOF')
                return
            data = data.decode('ascii')
            print(f'Forwarding "{data}" to websocket connections')
            closed = []
            for websocket, close_event in self._ws_clients:
                try:
                    await websocket.send(data)
                except websockets.ConnectionClosed as e:
                    self._handle_ws_connection_closed(e, close_event)
                    closed.append((websocket, close_event))
            for pair in closed:
                self._ws_clients.remove(pair)

    async def accept_ws_connection(
            self,
            websocket: websockets.WebSocketServerProtocol,
            _):
        """Accept a websocket connection and wait until forwarding completes.

        Forwarding completes when the websocket connection is terminated by the
        client.
        """
        print('Websocket connection established')
        close_event = asyncio.Event()
        self._ws_clients.append((websocket, close_event))
        asyncio.ensure_future(
            self._forward_from_websocket(websocket, close_event))
        await close_event.wait()

    def accept_tcp_connection(self,
                              reader: asyncio.StreamReader,
                              writer: asyncio.StreamWriter):
        """Register a TCP connection and return immediately """
        print('TCP connection established')
        self._tcp_writers.append(writer)
        asyncio.ensure_future(
            self._forward_from_tcp_connection(reader, writer))


bridge = Bridge()
loop = asyncio.get_event_loop()
loop.run_until_complete(websockets.serve(
    bridge.accept_ws_connection,
    'localhost',
    8080
))
loop.run_until_complete(asyncio.start_server(
    bridge.accept_tcp_connection,
    port=8090
))
loop.run_forever()
