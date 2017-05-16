FROM ubuntu:17.04

# The order of the following commands is organized so that the most costly
# steps come first, so that they can be reused from cache most often

# Add and build svg simplifier
ADD svg-simplifier /svg-simplifier
RUN apt-get update && \
    apt-get install -y cmake libboost-dev libeigen3-dev libxml2-dev libspdlog-dev g++ && \
    cd /svg-simplifier && \
    mkdir build && \
    cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make svg_converter

# Add and build the website
ADD website /website
RUN apt-get install -y apt-transport-https nodejs curl && \
    # Provide nodejs under the executable name node
    update-alternatives --install /usr/bin/node node /usr/bin/nodejs 10 && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update && \
    apt-get install yarn && \
    cd /website && \
    yarn install && \
    yarn build

# Add the io server
ADD io /io

# Install python
RUN apt-get install -y python3 python3-pip && \
    pip3 install -r /io/requirements.txt

# Add the run script
ADD docker /

ENTRYPOINT /run.sh
