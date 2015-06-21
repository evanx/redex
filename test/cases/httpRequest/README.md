
### Example: HTTP request

Say we pull an HTTP GET request message with specified URL:
```yaml
url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
method: GET
json: true
```
We import this request message using a file importer, or from a Redis queue.

In the case of a file importer, we create the request as follows:
```shell
echo '
  url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
  method: GET
  json: true
' > tmp/fileImporter/watched/hn160705.yaml
```

Alternatively, we push this message onto the Redis queue using `redis-cli` as follows:
```shell
redis-cli lpush redex:test:http:in '{
  "url": "https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty",
  "method": "GET",
  "json": true
}'
```

We expect the following reply to be routed back to the importer:
```json
{
"by": "pg",
"id": 160705,
"parent": 160704,
"score": 335,
"text": "Yes, ban them; I'm tired of seeing Valleywag stories on News.YC.",
"time": 1207886576,
"type": "pollopt"
}
```

We check the reply to the file importer:
```shell
evans@boromir:~/redex$ grep Valleywag tmp/fileImporter/reply/hn160705.json

  "text": "Yes, ban them; I'm tired of seeing Valleywag stories on News.YC.",
```

Finally, we check the reply to the Redis importer:
```shell
evans@boromir:~/redex$ redis-cli lrange redex:test:http:out 0 -1 |
  python -mjson.tool | grep '"text":'

  "text": "Yes, ban them; I'm tired of seeing Valleywag stories on News.YC.",
```

## Learn more

Redex routing:
- https://github.com/evanx/redex/blob/master/docs/redexRouting.md

Redex processor implementations:
- https://github.com/evanx/redex/tree/master/processors/
