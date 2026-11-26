---
title:  S3 Storage Providers
layout: page.njk
parent: Backup
excerpt: Price and service comparison
eleventyNavigation:
  key: s3 Storage Providers
  parent: backup
  order: 3
tags: [s3, storage, backup, pricing]
---

{# https://markdown-it.github.io/ #}

Prices for storing data in S3-compatible object storage, which is what the backup tools in the [software comparison](/pages/backup/comparison/) can send to.

| Company | $/TB Storage | $/TB Egress | Notes |
|---------|--------------|-------------|-------|
| [Storj](https://www.storj.io/pricing) | $7.00 | $7.00 | 30-day minimum retention, 50 KB minimum object size, no API fees, $5 minimum monthly fee |
| [Wasabi](https://wasabi.com/cloud-storage-pricing) | $7.99 | Free | 90-day minimum storage on pay as you go (30 days on reserved capacity). No egress or API charges. At least 1 TB of storage is billed per account |
| [Backblaze B2](https://www.backblaze.com/cloud-storage/pricing) | $6.95 | Free up to 3x storage, then $10.00 | No minimum storage time, billed by the byte-hour. Free egress to partner CDNs such as Cloudflare and Fastly. First 10 GB free |
| [iDrive e2](https://www.idrive.com/s3-storage-e2/pricing) | $6.00 | Free up to 3x storage, then $10.00 | Pay as you go. No minimum storage duration and no API charges. At least 1 TB is billed per account |
| iDrive e2, yearly plan | $4.96 | Free up to 3x storage, then $10.00 | $59.50 a year for 1 TB, which is $4.96 a month. The first year is $29.75 on a limited-time offer |
| [Amazon S3](https://aws.amazon.com/s3/pricing/) | $23.00 | $90.00 | S3 Standard, first 50 TB, in US East (N. Virginia). The first 100 GB of egress each month is free. Request charges are extra |
| [Amazon S3 Glacier Flexible Retrieval](https://aws.amazon.com/s3/pricing/) | $3.60 | $90.00 + $10.00 retrieval | 90-day minimum storage and 40 KB of extra metadata per object. Standard retrieval costs $10.00/TB, and bulk retrieval is free. Request charges are extra |
| [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/) | $15.00 | Free | Standard storage class, no minimum storage duration. Writes cost $4.50 per million requests and reads $0.36 per million. First 10 GB free each month |

Prices checked on 25 November 2026. All prices are in US dollars per month, with 1 TB counted as 1,000 GB.

## What has changed since July 2024

* Storj has put its storage price up from $4.00 to $7.00 per TB, and now has a 30-day minimum retention and a $5 minimum monthly fee.
* Wasabi has gone from $6.99 to $7.99 per TB, and Backblaze from $6.00 to $6.95.
* iDrive e2 pay as you go is now $6.00 rather than $5.00, and its yearly plan is now priced per 1 TB.
* Amazon's prices per GB are unchanged. The figures here are $23.00 and $3.60 per TB, because they now count a terabyte as 1,000 GB rather than 1,024 GB.
* Cloudflare R2 is new to the table. It charges nothing for egress, and its per-request charges are the catch.
