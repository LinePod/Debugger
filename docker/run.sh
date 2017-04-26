python3 /io/server.py &

cd website/dist
python3 -m http.server 80
