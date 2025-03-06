# Embed an Android emulator in your web application

This example shows how to embed an Android emulator in your web application.

## Running the example

The [backend](./backend) is a simple Node.js service that creates a new Android instance and returns the connection token.

1. You need to acquire a valid API token from Limbar and set it in the `.env` file.
   See [backend/.env.example](./backend/.env.example) for the required variables.

2. Run the backend:

   ```bash
   cd backend
   npm install
   npm start
   ```

3. Run the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open the app in your browser: [http://localhost:5173](http://localhost:5173)

Enjoy!

## License

MIT
