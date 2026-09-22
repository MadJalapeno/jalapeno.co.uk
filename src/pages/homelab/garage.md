---
title: garage
excerpt: Self Hosted S3 distributed storage
layout: page.njk
eleventyNavigation:
  parent: homelab
  title: garage
  key: homelab
---

Garage is a lightweight geo-distributed data store that implements the Amazon S3 object storage protocol. It enables applications to store large blobs such as pictures, video, images, documents, etc., in a redundant multi-node setting. S3 is versatile enough to also be used to publish a static website.

docker-compose.yml
```
services:
  garage:
    image: dxflrs/garage:v2.1.0
    network_mode: host
    restart: unless-stopped
    volumes:
      - ./garage.toml:/etc/garage.toml
      - ./meta:/var/lib/garage/meta
      - ./data:/var/lib/garage/data
    ports:
      - 3901:3901
      - 3902:3902
      - 3903:3903
      - 9000:9000
networks: {}
```

garage.toml
```
metadata_dir = "/meta"
data_dir = "/data"
db_engine = "lmdb"

replication_factor = 3
consistency_mode = "consistent"

rpc_bind_addr = "[::]:3901"
rpc_public_addr = "my-ip-address:3901"
rpc_secret = "64-char-shared-secret-string"

[s3_api]
s3_region = "garage"
api_bind_addr = "0.0.0.0:9000"
root_domain = ".s3.garage.localhost"

[s3_web]
bind_addr = "[::]:3902"
root_domain = ".web.garage.localhost"
index = "index.html"

[k2v_api]
api_bind_addr = "[::]:3904"

[admin]
api_bind_addr = "0.0.0.0:3903"
admin_token = "secret-admin-token"
```

To get to the status page
```sudo docker exec -it garage /garage status```
