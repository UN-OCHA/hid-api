FROM public.ecr.aws/unocha/nodejs:14-alpine

WORKDIR /srv/www

RUN apk add \
      cracklib \
      cracklib-dev \
      docker \
      git \
      gpg \
      gpg-agent && \
    rm -rf /var/cache/apk/*
