# Embed an Android emulator in your web application

This example shows how to embed an Android emulator in your web application.

There are two parts to the example:

* [backend](./backend) - A simple Node.js service that creates a new Android
  instance with organization token and returns the instance details including
  the instance-specific connection token.

* [frontend](./frontend) - A simple React application that calls the backend
  and runs the Android emulator instance via `RemoteControl` component from
  `@limbar/ui`.

## Running the example

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
