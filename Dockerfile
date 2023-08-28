FROM public.ecr.aws/unocha/nodejs:18-alpine
WORKDIR /srv/www

COPY . .

RUN cp run_node /etc/services.d/node/run && \
    apk add cracklib cracklib-dev && \
    apk add --virtual .build-deps python3 python3-dev build-base && \
    npm install && \
    npm run docs && \
    apk del .build-deps && \
    rm -rf /var/cache/apk/*
