# Limbar Instance Backend

A simple Express.js backend for creating Android instances through the Limbar API.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file with your credentials:

   ```bash
   API_TOKEN=your_api_token_here
   ORGANIZATION_ID=your_organization_id_here
   REGION=us-east1  # The region for the Limbar API
   ```

3. Start the server:

   ```bash
   npm start
   ```

## Usage

To create a new Android instance, send a POST request to the `/create-instance` endpoint with a simple JSON body containing the instance name:

```bash
curl -X POST http://localhost:3000/create-instance \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-android-instance",
    "wait": true  # Optional, defaults to true
  }'
```

The endpoint will:

1. Transform this request into the proper format required by the Limbar API
2. Return the created instance details as defined in the OpenAPI specification, including the connection token.

The service automatically uses your organization ID from the environment variables.

## License

MIT
