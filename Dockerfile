FROM unocha/nodejs:8.11.3

WORKDIR /srv/www

COPY . .

RUN cp run_node /etc/services.d/node/run && \
    npm install
