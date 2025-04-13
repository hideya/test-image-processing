// R2 client for Cloudflare Storage
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

class R2Client {
  constructor() {
    // Get R2 credentials from environment variables
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!accessKeyId || !secretAccessKey || !endpoint || !bucketName) {
      console.error('R2 configuration missing. Please set environment variables: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME');
    }

    this.bucketName = bucketName;
    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }

  /**
   * Upload a file to R2 storage
   * @param {Buffer} fileBuffer - The file content as a buffer
   * @param {string} key - The storage key (path within the bucket)
   * @param {string} contentType - The file's content type
   * @returns {Promise<string>} - The full URL to the uploaded file
   */
  async uploadFile(fileBuffer, key, contentType = 'image/jpeg') {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType
      });

      await this.client.send(command);
      return key;
    } catch (error) {
      console.error('Error uploading file to R2:', error);
      throw error;
    }
  }

  /**
   * Get a file from R2 storage
   * @param {string} key - The storage key (path within the bucket)
   * @returns {Promise<Buffer>} - The file content as a buffer
   */
  async getFile(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.client.send(command);
      
      // Convert stream to buffer
      return await streamToBuffer(response.Body);
    } catch (error) {
      console.error(`Error getting file from R2: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete a file from R2 storage
   * @param {string} key - The storage key (path within the bucket)
   * @returns {Promise<void>}
   */
  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.client.send(command);
    } catch (error) {
      console.error(`Error deleting file from R2: ${key}`, error);
      throw error;
    }
  }

  /**
   * Get a URL for a file in R2 storage
   * @param {string} key - The storage key
   * @returns {string} - The URL
   */
  getPublicUrl(key) {
    const endpoint = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT;
    return `${endpoint}/${this.bucketName}/${key}`;
  }
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// Create a singleton instance
const r2Client = new R2Client();

module.exports = { r2Client };
