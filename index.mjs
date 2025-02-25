// Importing necessary AWS SDK clients using ES modules
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
// Documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
// Documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/GetObjectCommand/
// Documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/PutObjectCommand/
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
// Documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cloudfront/
// Documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cloudfront/command/CreateInvalidationCommand/

// Initialize S3 client for eu-central-1 region
const s3 = new S3Client({ region: 'eu-central-1' });

const BUCKET_NAME = 'tracker-website';
const FILE_KEY = 'locations.json';

// Initialize CloudFront Client
const cloudFront = new CloudFrontClient();
const DISTRIBUTION_ID = 'E20PANU5T6FM4G';

export const handler = async (event) => {
  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { timestamp, latitude, longitude } = body;

    // Validate input
    if (!timestamp || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input payload' })
      };
    }

    // Construct new record
    const newRecord = { timestamp, latitude, longitude };

    // Retrieve existing file from S3
    let records = [];
    try {
      const data = await s3.send(new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: FILE_KEY
      }));
      const fileContent = await data.Body.transformToString();
      records = JSON.parse(fileContent);
      if (!Array.isArray(records)) {
        records = [];
      }
    } catch (err) {
      // If file doesn't exist, continue with empty array
      if (err.name !== 'NoSuchKey') {
        throw err;
      }
    }

    // Append new record
    records.push(newRecord);

    // Write updated file back to S3
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: FILE_KEY,
      Body: JSON.stringify(records, null, 2),
      ContentType: 'application/json',
      CacheControl: 'no-cache, must-revalidate'
    }));

    // Create CloudFront invalidation for /locations.json
    const invalidationCommand = new CreateInvalidationCommand({
      DistributionId: DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: `invalidation-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: ['/locations.json']
        }
      }
    });

    await cloudFront.send(invalidationCommand);
    console.log('CloudFront invalidation triggered for /locations.json');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Record saved successfully' })
    };

  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
