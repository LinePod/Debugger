#!/usr/bin/env python3
import socket
import struct
import sys


if len(sys.argv) != 2:
    print('Usage: {} filename'.format(sys.argv[0]))
    sys.exit(1)

with open(sys.argv[1], 'rb') as f:
    data = f.read()

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sock.connect(('127.0.0.1', 8082))
    sock.sendall(struct.pack('>I', len(data)))
    sock.sendall(data)
