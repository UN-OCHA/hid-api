FROM public.ecr.aws/unocha/nodejs:14-alpine

WORKDIR /srv/www

COPY . .

RUN cp run_node /etc/services.d/node/run && \
    npm install && \
    npm run docs
