import asyncio
import subprocess
import struct
import tempfile

SIMPLIFIER_PATH = '/svg-simplifier/build/svg_converter'


def convert_svg(svg_bytes):
    with tempfile.NamedTemporaryFile() as f:
        f.write(svg_bytes)
        f.flush()
        gpgl_out = subprocess.run([SIMPLIFIER_PATH, f.name],
                                  stdout=subprocess.PIPE).stdout
        return gpgl_out


async def forward_gpgl(gpgl_bytes):
    """Forward GPGL code to the GPGL input handler"""
    _, writer = await asyncio.open_connection('127.0.0.1', 8081)
    writer.write(gpgl_bytes)


async def handle_connection(loop, reader):
    while True:
        try:
            len_bytes = await reader.readexactly(4)
            svg_len = struct.unpack('>I', len_bytes)[0]
            svg_bytes = await reader.readexactly(svg_len)
            gpgl_bytes = await loop.run_in_executor(None, convert_svg,
                                                    svg_bytes)
            await forward_gpgl(gpgl_bytes)
        except asyncio.IncompleteReadError:
            return


def main():
    loop = asyncio.get_event_loop()
    loop.run_until_complete(asyncio.start_server(
        lambda reader, _: handle_connection(loop, reader),
        host=None, port=8082
    ))
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
