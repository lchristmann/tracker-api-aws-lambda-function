# Tracker API AWS Lambda Function - Part of [Tracker project](https://github.com/lchristmann/Tracker)

This project contains the AWS Lambda function `tracker-api` that is part of the ["Tracker" Android app](https://github.com/lchristmann/Tracker)'s system architecture (see diagram in its repo's README.md).

The Lambda function is integrated with an Amazon API Gateway API via proxy-integration (forwarding the request as-is as structured event).

It reads and writes to the S3 bucket `tracker-website` (in region `eu-central-1`) and therefor as appropriate permissions:

- via IAM role that allows access to the S3 bucket
- the S3 bucket has a bucket policy allowing it to be accessed from this Lambda

It lives in Australia's `ap-southeast-2` region (Sydney).

## What this Lambda does

In detail: see well-commented code

In short:

1. It makes required imports, sets constants and initializes the S3 client with eu-central-1 region
2. It tries to read the `locations.json` file from the `tracker-website` bucket. If it doesn't exist it's no big deal - the function will go with an empty array for now and create that file later.
3. If the file is present in the bucket though, the contained array will be used.
4. The current request with the `timestamp`, `longitutde`, `latitude` payload is appended to the array.
5. The array is saved to the `locations.json` file in the `tracker-website` bucket.

## Development

Development on this Lambda function is recommended to be done with the Visual Studio Code Editor.

Run `npm install` in this project directory to install the `@aws-sdk/client-s3` dependency.

The documentation of S3 Client part of the AWS SDK is linked in comments at the very top of the `index.mjs` file.

The code (`index.mjs`) uses the recommended ES6 module format.

## Deployment

To deploy this AWS Lambda function, zip it while excluding the `README.md`, the `.gitignore` and the `.git` folder:

Run `zip -r tracker-api-aws-lambda-function.zip . -x "README.md" -x ".git/*" -x ".gitignore"` (tested on Linux Ubuntu)

Then go to the Lambda function in the AWS Management Console > Upload from > .zip file and choose the created file.

Finally select "Actions > Publish new version > Publish" for the Lambda function.

## Testing

The Lambda function can be tested **in the AWS Management Console** with the "Test" feature in the Lambda console:

- creating a test event (e.g. "LocationTestEvent") with such a JSON body:

```shell
{
  "headers": {
    "x-api-key": "<SECRET_API_KEY>"
  },
  "body": "{\"timestamp\": 1740499200000, \"latitude\": -26.679507, \"longitude\": 153.136417}"
}
```

That should yield below result, but most importantly a `locations.json` file should have been created in the `tracker-website` S3 bucket or - if it already existed - above data should've been appended to it

```shell
Status: Succeeded
Test Event Name: TestLocationEvent

Response:
{
  "statusCode": 200,
  "body": "{\"message\":\"Record saved successfully\"}"
}
```

### Testing with [Postman](https://www.postman.com/)

Create a POST request to `https://x7b9yw5krd.execute-api.ap-southeast-2.amazonaws.com/prod/location` with

- header `Content-Type`: `application/json`
- header `x-api-key`: `<SECRET_API_KEY>` (ask the developer)
- below raw body:

```json
{
  "timestamp": "1740499200000",
  "latitude": -26.679507,
  "longitude": 153.136417
}
```

### Testing with [curl](https://curl.se/)

```shell
curl -X POST https://x7b9yw5krd.execute-api.ap-southeast-2.amazonaws.com/prod/location \
  -H "Content-Type: application/json" \
  -H "x-api-key: <SECRET_API_KEY>" \
  -d '{
    "timestamp": "1740499200000",
    "latitude": -26.679507,
    "longitude": 153.136417
  }'
```