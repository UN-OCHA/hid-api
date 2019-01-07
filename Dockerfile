FROM unocha/nodejs:8.11.3

WORKDIR /srv/www

COPY . .

RUN npm install
