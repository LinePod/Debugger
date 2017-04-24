FROM ubuntu:16.04

ADD docker /
ADD gpgl_input /gpgl_input
ADD website /website

RUN /setup.sh

ENTRYPOINT /run.sh
