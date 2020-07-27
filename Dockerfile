FROM unocha/nodejs:10.14.2

WORKDIR /srv/www

COPY . .

RUN cp run_node /etc/services.d/node/run && \
    npm install
