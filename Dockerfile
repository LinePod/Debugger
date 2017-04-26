FROM ubuntu:16.04

ADD docker /
ADD gpgl_input /gpgl_input
ADD svg_input /svg_input
ADD website /website
ADD svg-simplifier /svg-simplifier

RUN /setup.sh

ENTRYPOINT /run.sh
