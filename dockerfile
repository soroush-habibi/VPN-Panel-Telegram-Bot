FROM node

RUN mkdir -p /home/bot

COPY . /home/bot

CMD [ "npm" , "start" ]