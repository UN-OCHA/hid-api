FROM unocha/nodejs:10.14.2

WORKDIR /srv/www

COPY . .

RUN rm -rf .git && \
    cp run_node /etc/services.d/node/run && \
    npm install
