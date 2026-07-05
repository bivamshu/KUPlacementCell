/**
 * TOPIC: HOW EXPRESS WORKS, HTTP LIFECYCLE & CORE CONCEPTS
 * FILE: express-basics.js
 * 
 * =========================================================================
 * 1. WHAT IS HTTP? (Hypertext Transfer Protocol)
 * =========================================================================
 * Q: What is it?
 * A: HTTP is the foundational data protocol of the World Wide Web. It is a 
 *    "stateless, request-response" protocol that defines how messages are formatted 
 *    and transmitted across the internet. 
 * 
 * KUPC Context: 
 * Every time a client app talks to your Node.js backend, they communicate via HTTP[cite: 1]. 
 * Because HTTP is stateless, the server doesn't inherently remember who a user is from 
 * one request to the next. This is why KUPC uses JWT access tokens in the HTTP headers 
 * to prove identity with every single interaction[cite: 1].
 * 
 * =========================================================================
 * 2. WHAT IS A REQUEST? (req)
 * =========================================================================
 * Q: What is it?
 * A: An HTTP request is a message sent by a client to a server to initiate an action. 
 *    In Express, this is represented by the `req` object.
 * 
 * Core Components of a Request:
 * - Method (or Verb): Tells the server what action to perform (GET to read, POST to create, 
 *   PUT/PATCH to update, DELETE to remove)[cite: 1].
 * - URL/Path: The address being hit (e.g., `/api/v1/jobs`)[cite: 1].
 * - Headers: Metadata about the request (e.g., `Authorization: Bearer <token>` or `Content-Type`)[cite: 1].
 * - Body: The payload data being sent (e.g., a JSON object containing registration fields)[cite: 1].
 * - Query Parameters: Optional key-value pairs appended to the URL for filtering (e.g., `?location=Lalitpur`)[cite: 1].
 * 
 * =========================================================================
 * 3. WHAT IS A RESPONSE? (res)
 * =========================================================================
 * Q: What is it?
 * A: An HTTP response is the message sent by the server back to the client after processing 
 *    a request. In Express, this is represented by the `res` object.
 * 
 * Core Components of a Response:
 * - Status Code: A 3-digit number indicating the outcome (e.g., 200 OK, 201 Created, 400 Bad Request, 500 Server Error)[cite: 1].
 * - Headers: Metadata about the server and data formatting (e.g., `Content-Type: application/json`).
 * - Body: The actual data or payload being returned to the client (e.g., the KUPC standardized response envelope)[cite: 1].
 * 
 * =========================================================================
 * 4. WHAT IS MIDDLEWARE?
 * =========================================================================
 * Q: What is it?
 * A: Middleware functions are functions that have access to the request object (`req`), the 
 *    response object (`res`), and the `next` middleware function in the application’s 
 *    request-response cycle. They execute sequentially *before* the request hits your controller logic.
 * 
 * Capabilities of Middleware:
 * - Execute any code.
 * - Make changes to the request and response objects (e.g., validation middleware stripping unknown fields)[cite: 1].
 * - End the request-response cycle immediately (e.g., blocking an unauthorized user with a 401 status)[cite: 1].
 * - Call the `next()` function to pass control to the next middleware in line. If a middleware 
 *   does not call `next()` or end the response, the request will hang indefinitely.
 * 
 * KUPC Context:
 * Middleware forms the protective pipeline of KUPC. For instance, an incoming request to 
 * post a job will pass through: Helmet (Security) -> Rate Limiter -> JWT Token Validator -> 
 * Role-Based Access Controller (checking for verified Company role) -> Zod Input Validator[cite: 1]. 
 * Only if it passes all these middleware hurdles does it finally reach the Job Controller[cite: 1].
 */

console.log("HTTP, Request, Response, and Middleware definitions documented successfully.");