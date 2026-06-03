import socket

UDP_IP = "0.0.0.0"
UDP_PORT = 53317

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
except AttributeError:
    pass

sock.bind((UDP_IP, UDP_PORT))

print(f"Listening for UDP broadcasts on {UDP_PORT}...")
while True:
    data, addr = sock.recvfrom(4096)
    print(f"Received from {addr}: {data}")
