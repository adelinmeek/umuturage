const fs = require('fs');
const pg = require('pg');
const url = require('url');

const config = {
    user: "avnadmin",
    password: "<redacted>",
    host: "pg-2188b39e-adelinmeek-4b6a.c.aivencloud.com",
    port: 19940,
    database: "defaultdb",
    ssl: {
        rejectUnauthorized: true,
        ca: `-----BEGIN CERTIFICATE-----
MIIERDCCAqygAwIBAgIUKbVFkaDPvoPBQzKbaH9R+cVu95kwDQYJKoZIhvcNAQEM
BQAwOjE4MDYGA1UEAwwvMjY1ZmM0MjMtNDE2Ni00MzU1LThhZTgtNTg3ZWQ3YWYz
ODliIFByb2plY3QgQ0EwHhcNMjYwOTI0MDkwNzI2WhcNMzYwOTIxMDkwNzI2WjA6
MTgwNgYDVQQDDC8yNjVmYzQyMy00MTY2LTQzNTUtOGFlOC01ODdlZDdhZjM4OWIg
UHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCCAYoCggGBANIjhLG4
WggmJLwjpLOZnTkNDvygFARGZkQplXSS7qk7Yg11TWYoN5LlqoPvXj79HqYq7eYn
DfnXeYjgRN1E45JS1blgGZePDH0TmwPMCA4xECayK0Zfs9DTILleTvORfnmnVfDl
p9kgKJdZaU4PXpstaVHHrqHfUbrq/G8Y9ugMKyoL0LS+a84hrRlB6YKTJaJOj/xE
FL5TgknHg93cLqJUjWU9TJTKq7rgPoeczOTIesTOlcVrMFJ/HCSBX3sXlaF3gqWG
Zfx0hXLZIfgS7mREXbliDZ2b4TtEuP08/CbBrVNQS+frDEMwDtfnlpX7mJUjbdbs
Sx6Zd7kr4BFsNGCw33CXipcXuUCSa/KEgvSvLWW5GS3JcpzRQdr1Y1HeSwx1wrYj
42JT23OjMI4OXXtxge3ZIjH/1p1J8mfVD7Iaabp0kAXqvniyRFz5/mKxoeyk5TRG
3pB37zsCaN5VXCgzWvEGqnqil0C0TzH4AhcllEdXD2xCPxtZBRRACr7sSQIDAQAB
o0IwQDAdBgNVHQ4EFgQUvK80w+b2czBg4zIKsSMSMzUaHrMwEgYDVR0TAQH/BAgw
BgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQADggGBAHCS6CvJDnOX
SaZ42NJHtKyiMH86hVIXaJRWYDlek31hUPDbSfTVrGJm2XeCTjAkZ2N9H/n0bSqP
LhbaMNpUNqlU+K/NyEgaR4CJxXnWSkpMxZmNnPvw1dTsV0xObyoITu0KXz1ZUJeN
vZoPxUf7NhIQZIrpP3LOS3I7JtUi97dMT1Nmeo70O2yjKpi3T11GX+HGFM0hr1Vd
qeqWAhttAUrY2x17OUx4ng6ZDw9qscHtl2jIUn626TGc1eoH3ImAB2xqJzbnQ/DT
4r/ZCbPYPK50T1N5SYRRaiiEg5iA1bOLVkFz67z8OIjslxzEijiYjHAsfRMIAo8C
ZhyEybQtY6pQ0DaEiB2R8NmKwl57wV7z+HI6Q/hFAcs5Tv9gb2XJskUyqLcFLfOQ
8pBZ9O0eFzYFKI9QU0c2Ejv6bfeqpKYkI4C6CCVVbFOmnvy2j+pcimFF3WMBAJaq
9AnyFwo47eJF1uIxuZKGaRq1DN/RuFJ8HsblqZhR+7HUY2HVSfPKEA==
-----END CERTIFICATE-----`,
    },
};

const client = new pg.Client(config);
client.connect(function (err) {
    if (err)
        throw err;
    client.query("SELECT VERSION()", [], function (err, result) {
        if (err)
            throw err;

        console.log(result.rows[0].version);
        client.end(function (err) {
            if (err)
                throw err;
        });
    });
});
