python3.6 /gpgl_input/bridge.py &
python3.6 /svg_input/server.py &

cd website/dist
python3.6 -m http.server 80
