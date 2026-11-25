# Caddy avec module DNS (certificat joker via DNS-01). Changer DNS_PLUGIN selon le fournisseur de la zone DNS :
# cloudflare, route53, ovh, gandi, digitalocean, ... (voir https://github.com/caddy-dns).
ARG CADDY_VERSION=2.8
FROM caddy:${CADDY_VERSION}-builder AS builder
ARG DNS_PLUGIN=cloudflare
RUN xcaddy build --with github.com/caddy-dns/${DNS_PLUGIN}

FROM caddy:${CADDY_VERSION}-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
