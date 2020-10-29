FROM unocha/nodejs:12

WORKDIR /srv/www

COPY . .

RUN cp run_node /etc/services.d/node/run && \
    npm install
