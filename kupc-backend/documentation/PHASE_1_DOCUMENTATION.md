# KUPC Phase 1 — Project Setup & Architecture

**Status:** Complete  
**Stack:** Node.js · Express · TypeScript  
**Depends on:** Nothing (foundation phase)  
**Feeds into:** Phase 2 — Authentication & Authorization

---

## Phase 1 Goal

At the end of Phase 1, you should have: 

- A professional Express + TypeScript backend
- A clean folder structure
- Environment variable management
  
  In web development, Environment variables are key-value pairs configured outside the application code that system's runtime behavior based on the specific computer or server it is executing on(its 'enviroment'). managing them properly means isolating sensitive configurations, secrets, and environment-speicific settings from the core application logic. 

  Instead of writing a database URL or secret token directly in the source code(hardcoding), you deifne a palceholder like process.enc.DATA_URL let the host environment inject the real value.

## Why Enviroment Variable Management Matters for KUPC 

In the KUPC infrastructure variables correctly provides two core architectureal defenses. 

### 1. Security And Leak Prevention(screts Seperation )

KUPC works with highly sensitive cryptographic elements =, such as JWT_SECRET (used to sign student tokens) and SUPABASE_SERVICE_ROLE_KEY (which completely bypasses database row-leevl secuity). Hardcoding these strings means they will evetuallly be checked into Git repositories, exposing the entire platform to attackers. Stroing them as environment variables keeps secretes local to your computer or cloud provider. 

### 2. Environment Agility (Local vs Production)

Your backend must run smoothly across multiple deployment stages without changes to the code: 
- Local Developemnt: You want to run the server on port 5000, print verbose debugging logs(NODE_ENV =development), and output student registration OTPs to the console so you can test them easily. 
- Production Deployment: THe system must run on port 80, mask stack traces, restrict cross-origin access exclusively to the official unversity portal URL, and deliver real emails instead of console logging. 
Changing environement variables allows the exact same compiled TypeScript code to adpat automatically to where it is running. 

How it Flows in Your Architecture

In phase 1, environment handling was introduced using standard .env configureation files loaded into standard Node.js strings(process.env.PORT)

In Phase 2, it was upgraded into a strict, Type-Safe Configuration Gate utilizing the Zod schema parser (src/config.env.ts). Instead of allowing the app to run with missing or misspelled variables, the system executes a "fail-fast" paradigm at boot time. 

Environment Variable management: The practice of isolating externaml system settings, infrastructure thresholds, and sensitive credentials(such as database keys and secrets) from the application source code, In KUPC, this is accomplished using an eco-system aware configuration module(Src/config/env.ts)  backed by Zod validation, ensurung the backend fails isntantly at boot time if vital environment configurations are missing, malformed, or typed incorrectly. 

- Logging
  
  In software engineering, logging is teh practice of recording events, warnings, errors, and operational transactions that occur within your application during runtime. Think of logs as the flight data recorder (the "black box") for your server. Instead of guessing what your code is doing, logs provide an audit trial of exactly what happened, when it happened and what data was involved. 

  Logging with respect to KUPC 

  In a production system like KUPC, the server runs silently in the background on a cloud provider. You cannot use console.log() to debug live requests, nor can you visually inspect what users are doing. Logging gives the application a voice. 

  In Phase 1, structured logging request was introduced by integrating Morgan as a global middleware layer. In the context of our platform, logging serves three vital roles: 

  1. Traffic Visibility and Observability
  Every time a client makes a call - whether a student attempts an OTP verification or an administrator reviews a company profile-Morgan automatically records a clean, single-line record of that network event. It displays: 
  - The HTTP Method (POST, GET, PATCH)
  - THe Target URL Route Path(/api/v1/auth/verify-otp)
  - THe Response Status Code(200 OK, 401 Unauthorized, 500 Interal Error)
  - The Latency/Performance Speed (e.g how many milliseconds it took the database to respond)
  2. Debugging and Root-Cuase Analysis 
    When a user encounter a 500 Internal Server Error, your application doesn't leak raw database failures or long stack traces to the user (becuase that would be a security risk). Instead, the centralized error handler you built captures the ture error code and dumps the full stack trace directly into the secure log stream. Engineers can open these logs later to pinpoint the exact line of code that failed. 
- Global error handling
- Validation (Zod installed)
- Security middleware (Helmet)
- CORS
- Rate limiting
- Sample APIs proving everything works: `GET /`, `GET /health`, `GET /api/v1`


---

## Table of Contents

0. [Install Your Development Environment](#step-0--install-your-development-environment)
1. [Learn How Express Works](#step-1--learn-how-express-works)
2. [Create the Project](#step-2--create-the-project)
3. [Install Dependencies](#step-3--install-dependencies)
4. [Configure TypeScript](#step-4--configure-typescript)
5. [Create the Folder Structure](#step-5--create-the-folder-structure)
6. [Express Routing Fundamentals](#step-6--express-routing-fundamentals)
7. [Learn Express Middleware](#step-7--learn-express-middleware)
8. [Environment Variables](#step-8--environment-variables)
9. [Configuration Module](#step-9--configuration-module)
10. [Logging](#step-10--logging)
11. [Global Error Handling](#step-11--global-error-handling)
12. [Create a Custom Error Class](#step-12--create-a-custom-error-class)
13. [Learn Status Codes](#step-13--learn-status-codes)
14. [Create API Response Format](#step-14--create-api-response-format)
15. [Install Helmet](#step-15--install-helmet)
16. [Configure CORS](#step-16--configure-cors)
17. [Rate Limiting](#step-17--rate-limiting)
18. [Validation](#step-18--validation)
19. [Create the App Entry](#step-19--create-the-app-entry)
20. [Create Versioned APIs](#step-20--create-versioned-apis)
21. [Create Health Endpoint](#step-21--create-health-endpoint)
22. [Create Base Route](#step-22--create-base-route)
23. [Test Everything](#step-23--test-everything)
24. [Refactor](#step-24--refactor)
25. [Final Project Structure](#step-25--final-project-structure)
26. [Before Moving to Phase 2](#before-moving-to-phase-2)

---

## Step 0 — Install Your Development Environment

### Install

- Node.js (LTS)
- VS Code
- Git
- Postman (or Insomnia)
- Bruno (optional, lightweight API client)
- Docker Desktop (optional for later)

### Verify

```bash
node -v
npm -v
git --version
```

---

## Step 1 — Learn How Express Works

Before coding anything, understand:

- What is Express?
  Express.js is a minimal, flexible web application framework for Node.js. Node.js allows you to execute JavaScript directly on a server, but writing raw server network logic from scratch is tedious. Express acts as a structural layer built on top of Node.js that makes creating robust APIs, handling URLs (routing), and managing request-response lifecycles simple.
  
  Express serves as the engine core for the KUPC backend. It is the structural framework that listens for incoming connection ports, orchestrates access pathways, maps route paths (like /api/v1/auth/login), and safely intercepts server errors before they crash the host environment.

- What happens when a browser sends a request?

  When a student triggers an action in th eKUPC frontend(like logging in), the system follows this precise lifecycle chain: 

  [Student Browser UI] ──(1) Triggers Event──> [Formulate HTTP Request]
                                                        │
                                                        ▼ (2) Travels across Internet
 [Express API Server] <──(3) Listens on Port 5000 ──────┘
         │
         ├───> [Middleware Execution] ──(Security, rate limiting, and inputs)
         │
         ├───> [Controller Layer] ──────(Parses parameters & sanitizes context)
         │
         ├───> [Service Layer] ─────────(Computes hashes, runs business rules)
         │
         └───> [Formulates Response] ───(Sends structured JSON back over HTTP)
                                                        │
                                                        ▼ (4) Travels back
 [Student Browser UI] <──(5) Renders Outcome ───────────┘

 1. Generation: the Browser wraps the action into an Http request and dispatches it over the internet to our backend infrastructure. 
 2. Ingress: The express server, which is running continouslu and listening on a physical post(like port 5000), recieves the inbound request. 
 3. Processing: The server inspects the request path, routes it through security/validation blocks, hands it to a controller to read the body data, and uses services to check database records. 
 4. Resolutions: The server packages the outocme into an HTTP response and passes it back down the network pipe to the client. 

- What is Browser? 
  A web browser is a software application instawlled on a unser's device used to locate, retrieve, and display content in the world wide web. It takes complex source code and turns it into a visual interface.

  The web browser is the home of the frontend interface. Wehn a Kathamndu University student opens the KUPC web application to look for an internship or when an employer uploads corporate verification files, they are interacting with the application rendering directly insdie their browser. 

- What is HTTP?
  HTTP stands for Hypertext Transfer Protocol. It is the standardized operational language and rulebook of the internet. It defines exactly how computers, browsers and server must structure their messages tot talk to one another smoothly. 

  Every single interaction on our placement platform relies on HTTP. Wehn the frontend needs to fetch a list of open jobs or submit an OTP verification, it translates that intent into an HTTP message that travels over the network to our server. 


 - What is a request?
  An HTTP request is a message sent from a client(ht browser)
  to a server asking for a specific action to be performed or data to be sent back. It consists of a method(like GET to fetch data, or POST to send data), a URL path, headers(meta-information), and an optional body payload containing data. 

  When a student fills out their details and clicks the submit button, the frontend browser constructs a POST request targeting the /api/v1/auth/register/student endpoint. The request body contains the raw JSON data string mathcing the student's name and password. 
  
- What is a response?
  An HTTP Response is the message a server sends back to the client browser after receiving and executing an inbound request. It includes an HTTP Status Code signaling the result (like 200 OK for success, 401 Unauthorized for missing tokens, or 500 for server crashes) along with the data payload.
  
  If a company successfully uploads a document, the KUPC server builds a standard JSON success response: res.status(200).json(successResponse(result, 'Document submitted')). The browser reads this status code and dynamically flashes a green success message on the user's dashboard.

- What is middleware?
  Middleware functions are sequential processing blocks executed in Express that tap directly into the request-response pipeline. They execute after the request is received from the browser, but before the final controller logic runs. They have the capability to modify the request object, validate payloads, block unauthorized actors, or automatically pass the request forward using the next() function.

  Middlewares act as the defense checkpoints you built throughout Phase 1 and Phase 2. For instance:

  - helmet hardens browser headers.
  - express-rate-limit limits high-volume attacks.
  - validate(schema) halts execution if fields are malformed
  - authenticate verifies identity and populates req.user.
  - authorize(Role.ADMIN) blocks non-admins from hitting administrative features.

### Request flow

```text
Browser
  ↓
HTTP Request
  ↓
Express Server
  ↓
Middleware
  ↓
Controller
  ↓
Response
  ↓
Browser
```

---

## Step 2 — Create the Project

**Status:** Complete

```bash
mkdir kupc-backend
cd kupc-backend
npm init -y 
```
The command npm init -y is used to automatically initialize a new Node.js project without having to answer interactive setup questions.

This creates `package.json`:

```json
{
  "name": "kupc-backend",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs"
}
```

### Initialize Git

```bash
git init
```

### Create `.gitignore`

Ignore at least:

```text
node_modules
dist
.env
```

### First commit

```bash
git add .
git commit -m "Initial project"
```

---

## Step 3 — Install Dependencies

### Runtime packages

```bash
npm install express dotenv cors helmet morgan express-rate-limit
```

### Development packages

```bash
npm install -D typescript ts-node-dev @types/node @types/express @types/cors @types/morgan
```

### What do the runtime packages do?

| Package | Purpose |
| --- | --- |
| `express` | Core framework: HTTP server, routing, middleware pipeline |
| `dotenv` | Loads `.env` into `process.env` so secrets stay out of source control |
| `cors` | Configures Cross-Origin Resource Sharing rules |
| `helmet` | Sets secure HTTP headers (XSS, clickjacking, MIME sniffing, etc.) |
| `morgan` | Logs method, status code, and response time for each request |
| `express-rate-limit` | Limits repeated requests to protect against brute-force abuse |

**1. What is process.env?**
***General Definition***: process.env is a global object provided naturally by the Node.js runtime environment. It contains the state of your computer's environment variables at the exact moment the Node process started running.

***In the Context of KUPC***: When your backend code evaluates a statement like process.env.PORT, it is asking Node.js: "What port configuration has the host computer set up for me?" Node looks into its global environment table and returns that string value (e.g., "5000").

**2. What is Port?** 

**3. What is dotenv?** 
General Definition: dotenv is a lightweight third-party npm package used during software development. By default, adding variables to a computer's environment requires executing complex terminal shell scripts or modifying operating system files—which is tedious when switching between multiple projects. dotenv solves this by letting you create a simple text file named .env inside your project root.

In the Context of KUPC: When you run dotenv.config() at the entry point of your configuration layout (src/config/config.ts), the dotenv module reads your local, git-ignored .env file, parses the key-value strings, and manually injects them into Node’s native process.env object.

**4. What is runtime enviroment?** 
In software engineering, a Runtime Environment is the execution context or the virtual "sandbox" where a compiled or interpreted program actually runs. It provides all the low-level infrastructure, memory allocations, standard libraries, and hardware interfaces that your software needs to execute its code instructions in real time.Before a program enters its runtime environment, it is just static text files sitting on a hard drive. The runtime environment is what brings those files to life.

**The Runtime Environment of KUPC: Node.js**
For the KUPC placement platform, your runtime environment is Node.js.Browsers naturally contain a JavaScript runtime environment (the V8 engine) to run frontends, but computers cannot run JavaScript natively on their operating systems. Node.js packages that same browser engine so you can execute JavaScript directly on a server infrastructure.

When you boot your server, the Node.js runtime environment steps in to give your code access to vital system resources:
**The Global `process` Object:** It provides tools like `process.env` so your code can read environment keys out of the operating system configuration.
**Network Sockets:** It connects your Express app to a physical network port (like port 5000) so it can listen for incoming web connections.
**File System Access:** It allows libraries like `dotenv` to physically read the `.env` text file from disk at startup.

**Development vs. Production Runtime Environments**

As highlighted in your project architecture documentation, KUPC moves across different runtime environments depending on your stage of engineering:
Environment Mode (NODE_ENV) | Location | Characteristics
Development | Your local laptop | Fast hot-reloading via ts-node-dev, verbose console logs, and full stack traces printed during errors to help you debug.
Production | Live Cloud Server | Hardened HTTP security headers, compressed files, optimized memory, and hidden error stack traces to keep system secrets safe from bad actors.
  

### What do the development packages (`-D`) do?

| Package | Purpose |
| --- | --- |
| `typescript` | Compiles type-safe TypeScript into JavaScript |
| `ts-node-dev` | Runs TypeScript directly and restarts on file changes |
| `@types/...` | Type definitions for JS libraries so VS Code can autocomplete and type-check |

### Runtime vs development install

**Runtime (`npm install ...`)**  
Downloads libraries the app needs while running in production. They are listed under `dependencies` in `package.json` and live in `node_modules`.

**Development (`npm install -D ...`)**  
Downloads tools only needed while writing and compiling code. They are listed under `devDependencies` and are stripped from production builds.

---

## Step 4 — Configure TypeScript

**Status:** Complete

### Initialize

```bash
npx tsc --init
```

This creates `tsconfig.json`. Instead of leaving the bloated commented defaults, configure a clean, strict setup:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

### What do these compiler settings mean?

| Setting | What it does | Why we use it |
| --- | --- | --- |
| `target: "ES2022"` | JS version TypeScript emits | Modern Node supports modern JS; avoids bloated ES5 output |
| `module: "NodeNext"` | Module system for compiled output | Matches modern Node ESM/CJS standards |
| `moduleResolution: "NodeNext"` | How imports are resolved | Mirrors Node's real lookup algorithm |
| `rootDir: "./src"` | Where source `.ts` files live | Keeps compilation scoped to `src/` |
| `outDir: "./dist"` | Where compiled `.js` goes | Separates build output from source |
| `sourceMap: true` | Emits `.js.map` files | Maps runtime stack traces back to `.ts` lines |
| `strict: true` | Maximum type checking | Forces null/undefined handling; catches bugs early |

---

## Step 5 — Create the Folder Structure

**Status:** Complete

### Create

```text
src/
  config/
  controllers/
  routes/
  services/
  middleware/
  validators/
  utils/
  types/
  database/
  models/
  app.ts
  server.ts
```

### Preferred flow

```text
Controller → Service → Database
```

**Not:**

```text
Controller → Database
```

### Why each folder exists

| Folder | Layer | Purpose |
| --- | --- | --- |
| `config/` | Configuration | Centralized env/config. Do not read `process.env` everywhere. |
| `controllers/` | Transport | Extract `req` data, call a service, format `res`. No business rules. |
| `services/` | Business logic | Domain rules and workflows. No HTTP knowledge. |
| `database/` | Data infrastructure | DB clients and connection setup. |
| `models/` | Data representation | Table/entity shapes (later phases). |
| `routes/` | Routing | Map URL paths to middleware + controllers. |
| `middleware/` | Interception | Logging, auth, security, errors — before controllers. |
| `validators/` | Input guard | Schemas that reject bad input early. |
| `utils/` | Helpers | Shared helpers and classes like `AppError`. |
| `types/` | Type system | Shared TypeScript interfaces and declaration merges. |

---

## Step 6 — Express Routing Fundamentals

**Status:** Complete

### Core endpoints

- `GET /` — welcome / root
- `GET /health` — health check

### Concepts

| Concept | Meaning |
| --- | --- |
| `app.get(path, callback)` | Registers a handler for GET requests on a path |
| `req` | Incoming request (headers, params, body, query) |
| `res` | Outgoing response (status, JSON, headers) |

### Example routes

`GET /` returns a welcome payload.

`GET /health` returns something like:

```json
{
  "status": "OK"
}
```

(Later steps wrap these in the standard API response format.)

### Dev automation

Hot reload via `ts-node-dev` so the server restarts on save.

---

## Step 7 — Learn Express Middleware

This is the most important Express concept.

### Flow

```text
Request
  ↓
Logger middleware
  ↓
Route handler
  ↓
Response
```

### Key idea

Middleware sits in the request pipeline. Call `next()` to pass control to the next middleware/route. Call `next(error)` to jump to the error handler.

Middleware exists so cross-cutting concerns (logging, auth, validation, security) do not clutter every controller.

---

## Step 8 — Environment Variables

**Status:** Complete

### Created

`kupc-backend/.env`

```env
PORT=5000
NODE_ENV=development
```

### Why this step exists

Environment variables keep runtime configuration outside source code. Instead of hardcoding the port in `server.ts`, the app reads values from the process environment.

Node exposes them via `process.env`. The `dotenv` package loads `.env` into `process.env` during local development.

### Why this matters for KUPC

KUPC will run in multiple environments (development, staging, production), each with different ports, frontend URLs, database credentials, Supabase keys, and secrets.

Keeping those values in env vars means:

- the same codebase runs everywhere without editing source
- secrets are not committed to Git (`.env` is gitignored)

---

## Step 9 — Configuration Module

**Status:** Complete

### Created

`src/config/config.ts`

```ts
import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT) || 5000;
const env = process.env.NODE_ENV || 'development';

export const config = {
  port,
  env
};
```

### Updated

`src/server.ts` uses:

```ts
app.listen(config.port, () => {
  console.log(`KUPC Server is running in ${config.env} mode on http://localhost:${config.port}`);
});
```

### Why this step exists

Reading `process.env.PORT` everywhere creates duplication. A centralized config module is one trusted place for environment values. The rest of the backend should import `config` instead of reading `process.env` directly.

### Why this matters for KUPC

As KUPC grows, config will include CORS origins, Supabase credentials, JWT settings, upload limits, rate-limit rules, and email providers. Centralizing keeps those decisions organized and makes startup validation easier later.

---

## Step 10 — Logging

**Status:** Complete

### Created

`src/middleware/logger.ts`

```ts
import morgan from 'morgan';

/**
 * Logs each HTTP request with method, URL, status code, and response time.
 */
export const requestLogger = morgan('dev');
```

### Updated

`src/app.ts` registers:

```ts
app.use(requestLogger);
```

### Why this step exists

`console.log()` is fine for a startup message, but not enough for HTTP traffic. Morgan logs method, path, status code, response size, and response time.

Example:

```text
GET /health 200 3.421 ms - 15
```

### Why this matters for KUPC

When students, companies, and admins use the platform, logs answer:

- Which route was called?
- Did it succeed or fail?
- What status code came back?
- How long did it take?

Later, KUPC can move to a structured logger (e.g. Pino) for production.

---

## Step 11 — Global Error Handling

**Status:** Complete

### Created

- `src/middleware/errorHandler.ts`
- `src/middleware/notFound.ts`

### Updated

`src/app.ts` registers after routes:

```ts
app.use(notFound);
app.use(errorHandler);
```

### Error handler shape

```ts
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const isKnownError = err instanceof AppError;
  const statusCode = isKnownError ? err.statusCode : 500;
  const message = isKnownError ? err.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    data: null,
    message,
    error: {
      statusCode,
      isOperational: isKnownError ? err.isOperational : false,
      stack: config.env === 'development' ? err.stack : undefined
    }
  });
};
```

### Why order matters

Express runs middleware top to bottom:

1. Normal routes get first chance
2. If nothing matches → `notFound` creates a 404
3. If anything throws / calls `next(error)` → `errorHandler` sends JSON

### Normal errors vs Express errors

A normal JS error:

```ts
throw new Error('Something went wrong');
```

has a message and stack, but no HTTP status. That tends to become a generic 500.

Express error middleware has **four** parameters:

```ts
(err, req, res, next) => {}
```

Passing `next(error)` skips normal handlers and jumps to that middleware.

### Convert errors into JSON

Example error response:

```json
{
  "success": false,
  "data": null,
  "message": "Route not found: GET /missing-route",
  "error": {
    "statusCode": 404,
    "isOperational": true
  }
}
```

In development, include a stack trace. In production, hide it.

### Never crash for expected failures

Expected failures (wrong route, invalid form, missing profile, expired token) should become clean HTTP responses — not crash the process.

### Why this matters for KUPC

Without a global handler, every controller repeats try/catch formatting. One handler keeps:

- consistent error shapes
- cleaner controllers
- predictable frontend handling
- a single place for future monitoring

---

## Step 12 — Create a Custom Error Class

**Status:** Complete

### Created

`src/utils/AppError.ts`

```ts
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Usage

Instead of:

```ts
throw new Error('Student not found');
```

Use:

```ts
throw new AppError('Student not found', 404);
```

### What each field means

| Field | Purpose |
| --- | --- |
| `message` | Human-readable explanation for clients/logs |
| `statusCode` | Correct HTTP status (400, 404, 409, etc.) |
| `isOperational` | Expected app failure vs unexpected bug |
| stack trace | Points to where `AppError` was created |

### Operational vs non-operational

**Operational (expected):** student not found, invalid login, pending company, duplicate application.

**Non-operational (unexpected):** undefined variable, broken code path, unexpected library failure.

### Why this matters for KUPC

Domain errors appear everywhere (missing profile, unapproved company, closed job). `AppError` gives them one shared structure without scattering response formatting.

---

## Step 13 — Learn Status Codes

**Status:** Complete

Status codes give the official HTTP meaning. The JSON body explains details.

| Code | Name | When to use | KUPC examples |
| --- | --- | --- | --- |
| **200** | OK | Success with a response body | Dashboard, profile, job list, `/health` |
| **201** | Created | New resource created | Profile, job post, application |
| **204** | No Content | Success with empty body | Delete saved job, revoke token |
| **400** | Bad Request | Malformed / missing basics | Missing email, invalid JSON |
| **401** | Unauthorized | Not authenticated | Missing/expired/invalid token |
| **403** | Forbidden | Authenticated but not allowed | Student approving a company |
| **404** | Not Found | Route or resource missing | Unknown student ID, unknown route |
| **409** | Conflict | Valid request, conflicting state | Duplicate application/email |
| **422** | Unprocessable Entity | Shape OK, business data invalid | Bad GPA, weak password |
| **500** | Internal Server Error | Unexpected server failure | Unhandled bug, DB adapter crash |

### 401 vs 403

- **401** = we do not know who you are
- **403** = we know who you are, but you cannot do this

### 400 vs 422

- **400** = malformed or missing request basics
- **422** = valid structure, unacceptable business data

### Quick decision guide

- Fetch / action with body → **200**
- Created something → **201**
- Success, no body → **204**
- Bad request shape → **400**
- Not logged in → **401**
- Logged in, not allowed → **403**
- Missing resource/route → **404**
- Conflicts with existing state → **409**
- Validation rule failed → **422**
- Unexpected server bug → **500**

---

## Step 14 — Create API Response Format

**Status:** Complete

### Created

`src/utils/apiResponse.ts`

### Standard shape

```json
{
  "success": true,
  "data": {},
  "message": "",
  "error": null
}
```

### Helpers

```ts
export function successResponse<T>(data: T, message = 'Success'): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    error: null
  };
}

export function errorResponse(message: string, error: unknown = null): ApiResponse<null> {
  return {
    success: false,
    data: null,
    message,
    error
  };
}
```

### Field meanings

| Field | Success | Failure |
| --- | --- | --- |
| `success` | `true` | `false` |
| `data` | Result payload | Usually `null` |
| `message` | Short explanation | Short explanation |
| `error` | `null` | Structured details (status, stack in dev) |

### Example endpoints after this step

**Root**

```json
{
  "success": true,
  "data": { "name": "KUPC API" },
  "message": "Welcome to KUPC",
  "error": null
}
```

**Health**

```json
{
  "success": true,
  "data": {
    "status": "OK",
    "uptime": 123,
    "timestamp": "2026-07-06T00:00:00.000Z"
  },
  "message": "KUPC API is healthy",
  "error": null
}
```

### Why this matters for KUPC

One response shape lets the frontend build one reusable API client for login, profiles, jobs, applications, matches, chat, and analytics.

---

## Step 15 — Install Helmet

**Status:** Complete

### Package

`helmet`

### Created

`src/middleware/security.ts`

```ts
import helmet from 'helmet';

export const securityMiddleware = helmet();
```

### Updated

`src/app.ts`:

```ts
app.use(securityMiddleware);
```

### What Helmet helps with

| Header / area | Benefit |
| --- | --- |
| `X-Content-Type-Options` | Reduces MIME sniffing attacks |
| `Strict-Transport-Security` | Prefer HTTPS (production) |
| Frame / clickjacking protections | Harder to embed KUPC in a malicious frame |
| `Referrer-Policy` | Limits referrer leakage |
| Content-Security-Policy | Restricts where scripts/resources load from |
| Cross-Origin-Opener-Policy | Isolates browser contexts |

### What Helmet does **not** do

Helmet does not validate input, stop SQL injection, manage sessions, check roles, or replace CORS. It hardens HTTP response headers only.

### Why this matters for KUPC

KUPC will handle student data, resumes, company accounts, and admin actions. Layered security should start before auth and database work.

---

## Step 16 — Configure CORS

**Status:** Complete

### Package

`cors`

### Created / updated

- `src/middleware/cors.ts`
- `src/config/config.ts`
- `src/app.ts`

### Allowed origin (dev)

```ts
cors: {
  allowedOrigins: ['http://localhost:5173']
}
```

### Middleware idea

```ts
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || config.cors.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError(`CORS policy does not allow origin: ${origin}`, 403));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

### Why browsers block requests

CORS = Cross-Origin Resource Sharing.

An origin is `protocol + host + port`. These are different origins:

- `http://localhost:5173` (Vite frontend)
- `http://localhost:5000` (Express backend)

The backend must explicitly allow the frontend origin.

### Important notes

- CORS is a **browser** rule. Postman/curl are not restricted by it.
- `credentials: true` means do **not** use wildcard `*` origins.
- `OPTIONS` supports browser preflight checks.

### Why this matters for KUPC

Frontend and backend are separate apps. Correct CORS is what lets the React app talk to the API in the browser.

---

## Step 17 — Rate Limiting

**Status:** Complete

### Package

`express-rate-limit`

### Created

`src/middleware/rateLimiter.ts`

```ts
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      errorResponse('Too many authentication attempts. Please try again later.', {
        statusCode: 429,
        retryAfter: '15 minutes'
      })
    );
  }
});
```

Applied to future auth paths such as `/auth`, `/login`, `/register`.

### Concepts

| Setting | Meaning |
| --- | --- |
| `windowMs` | Time window (15 minutes) |
| `limit` | Max requests in that window (10) |
| `standardHeaders` | Expose modern rate-limit headers |

### Example 429 response

```json
{
  "success": false,
  "data": null,
  "message": "Too many authentication attempts. Please try again later.",
  "error": {
    "statusCode": 429,
    "retryAfter": "15 minutes"
  }
}
```

### Why this matters for KUPC

Auth endpoints are high-risk. Rate limiting slows brute-force attempts against student, company, and admin accounts. It does not replace strong passwords, MFA, or monitoring.

---

## Step 18 — Validation

**Status:** Complete

### Installed

```bash
npm install zod
```

### What Zod is

A validation library that defines the exact shape of incoming data before controllers/services run.

In Phase 1, Zod is installed and understood. Real route validation lands in Phase 2+.

### Schema example

```ts
const registerStudentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  degree: z.string()
});
```

### `parse` vs `safeParse`

```ts
// throws on invalid data
const data = registerStudentSchema.parse(req.body);

// does not throw
const result = registerStudentSchema.safeParse(req.body);
if (!result.success) {
  // return validation error
}
const data = result.data;
```

`safeParse` is better for middleware because you control the JSON error response.

### Why not use it heavily in Phase 1

There are no real request bodies yet. Installing Zod early prepares Phase 2 without inventing fake validation for fake routes.

### Why this matters for KUPC

Never trust raw request data from registration, login, profiles, jobs, or uploads.

---

## Step 19 — Create the App Entry

**Status:** Complete

### Files

- `src/app.ts` — creates/configures Express (middleware, routes, errors)
- `src/server.ts` — starts listening on a port

### Why separate them

| File | Answers |
| --- | --- |
| `app.ts` | What middleware? What routes? How are errors handled? |
| `server.ts` | Which port? When does the HTTP server start? |

### Why this makes testing easier

Tests can import `app` without opening a real network port:

```ts
import app from '../src/app';
```

### Why this matters for KUPC

Automated tests for auth, roles, applications, and admin workflows are easier when app creation is separate from process startup.

---

## Step 20 — Create Versioned APIs

**Status:** Complete

### Created / updated

- `src/routes/index.ts`
- `src/app.ts`

### Mount

```ts
app.use('/api/v1', apiV1Router);
```

### Why version APIs

Build routes under `/api/v1/...` so future breaking changes can live under `/api/v2` without breaking old clients.

### Route grouping (later)

```ts
router.use('/students', studentRoutes);
router.use('/companies', companyRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
```

---

## Step 21 — Create Health Endpoint

**Status:** Complete

### Endpoint

`GET /health`

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 123,
    "timestamp": "2026-07-06T00:00:00.000Z"
  },
  "message": "KUPC API is healthy",
  "error": null
}
```

| Field | Meaning |
| --- | --- |
| `status` | Process is alive |
| `uptime` | Seconds since Node process started (`process.uptime()`) |
| `timestamp` | ISO time the response was generated |

Later this can also check database / Supabase connectivity.

---

## Step 22 — Create Base Route

**Status:** Complete

### Endpoint

`GET /api/v1`

```json
{
  "success": true,
  "data": {
    "name": "KUPC API",
    "version": "1.0.0"
  },
  "message": "KUPC API base route",
  "error": null
}
```

If `/health` works but `/api/v1` fails, the process is alive but the versioned router is miswired.

---

## Step 23 — Test Everything

**Status:** Complete

Use Postman, Insomnia, Bruno, curl, or a browser for simple GETs.

### Test 1 — Root

`GET http://localhost:5000/` → **200**

```json
{
  "success": true,
  "data": { "name": "KUPC API" },
  "message": "Welcome to KUPC",
  "error": null
}
```

### Test 2 — Health

`GET http://localhost:5000/health` → **200**

Expect `success: true`, `data.status: "healthy"`, `uptime`, `timestamp`.

### Test 3 — Versioned base

`GET http://localhost:5000/api/v1` → **200**

Expect `name: "KUPC API"`, `version: "1.0.0"`.

### Test 4 — Wrong route

`GET http://localhost:5000/does-not-exist` → **404**

```json
{
  "success": false,
  "data": null,
  "message": "Route not found: GET /does-not-exist",
  "error": {
    "statusCode": 404
  }
}
```

### Test 5 — Error pipeline

Wrong-route flow proves:

```text
Request → no match → notFound (AppError) → errorHandler (JSON)
```

### Test 6 — CORS

CORS is a browser rule. Test from the frontend at `http://localhost:5173`. That origin should be allowed; unknown browser origins should be rejected.

### Test 7 — Rate limiting

Hit a protected path more than 10 times in 15 minutes (e.g. `GET http://localhost:5000/login`) → **429** with the standard error envelope.

### Why this matters

If routing, errors, CORS, rate limiting, health checks, and response formats work now, Phase 2 can focus on authentication instead of Express wiring.

---

## Step 24 — Refactor

Ask yourself:

- Can I remove duplicate code?
- Can I improve naming?
- Can I improve folders?
- Can I simplify?

Professional developers refactor constantly.

---

## Step 25 — Final Project Structure

By the end of Phase 1, the project should look like:

```text
kupc-backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   └── config.ts
│   ├── controllers/
│   ├── routes/
│   │   ├── index.ts
│   │   └── health.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   ├── notFound.ts
│   │   ├── logger.ts
│   │   ├── security.ts
│   │   ├── cors.ts
│   │   └── rateLimiter.ts
│   ├── services/
│   ├── validators/
│   ├── utils/
│   │   ├── AppError.ts
│   │   └── apiResponse.ts
│   ├── database/
│   ├── models/
│   └── types/
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Before Moving to Phase 2

Make sure you can confidently answer:

1. Why separate `app.ts` and `server.ts`?
2. What is middleware, and why is it useful?
3. Why shouldn't controllers contain business logic?
4. Why use environment variables instead of hardcoding values?
5. What's the difference between a 404 and a 500?
6. What problem does CORS solve?
7. Why do we use Helmet?
8. Why is rate limiting important?
9. Why use a centralized error handler?
10. Why version APIs with `/api/v1`?

If you can explain those concepts in your own words — not just copy code — you're ready for Phase 2 (authentication with Supabase) on a strong foundation.
