FROM ubuntu:17.04

ENV DEBIAN_FRONTEND=noninteractive

# The order of the following commands is organized so that the most costly
# steps come first, so that they can be reused from cache most often

RUN apt-get update && \
    apt-get install -y cmake libboost-dev libeigen3-dev libxml2-dev libspdlog-dev g++ apt-transport-https nodejs curl python3 python3-pip && \
    # Provide nodejs under the executable name node
    update-alternatives --install /usr/bin/node node /usr/bin/nodejs 10 && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update && \
    apt-get install yarn

ADD svg-converter /svg-converter
RUN cd /svg-converter && \
    mkdir build && \
    cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make svg_converter

ADD website /website
RUN cd /website && \
    yarn install && \
    yarn build
    
ADD io /io
RUN pip3 install -r /io/requirements.txt

# Add the run script
ADD docker /

ENTRYPOINT /run.sh
