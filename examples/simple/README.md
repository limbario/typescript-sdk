# Embed an Android emulator in your web application

This example shows how to embed an Android emulator in your web application.

There are two components:
* [backend](./backend) - A simple Node.js service that creates a new Android
  instance in Limbar using the typed client from `@limbar/api` package.
* [frontend](./frontend) - A simple React application that calls the backend
  and connects to the returned Android emulator instance using `RemoteControl`
  component from `@limbar/ui`.

The flow is roughly as the following:
1. The frontend makes a request to backend to trigger creation of Android emulator
   instance.
1. Backend receives request and uses its organization token to create an instance
   at Limbar.
   The response from Limbar includes `webrtcUrl` and `token` that is specific
   to that instance and safe to deliver to browser.
1. Frontend uses the response from backend to mount `RemoteControl` with `webrtcUrl`
   and `token`.

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
