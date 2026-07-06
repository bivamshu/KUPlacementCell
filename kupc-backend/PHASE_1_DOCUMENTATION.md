

# Phase 1 Goal
    At the end of Phase 1, you should have:
    A professional Express + TypeScript backend
    A clean folder structure
    Environment variable management
    Logging
    Global error handling
    Validation
    Security middleware
    CORS
    Rate limiting
    One sample API (GET /health and GET /api/v1) proving everything works
    No authentication. No database. No Supabase yet.
    Think of this as building the house's foundation.

# Step 0 — Install Your Development Environment
    Install:
    Node.js (LTS)
    VS Code
    Git
    Postman (or Insomnia)
    Bruno (optional, a lightweight API client)
    Docker Desktop (optional for later)
    Verify:
    node -v
    npm -v
    git --version


# Step 1 — Learn How Express Works
    Before coding anything, understand:
    What is Express?
    What happens when a browser sends a request?
    What is HTTP?
    What is a request?
    What is a response?
    What is middleware?
    Understand this flow:
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

# Step 2 — Create the Project
    mkdir kupc-backend

    cd kupc-backend

    npm init -y
        
    PS C:\projects\KU-Placement-Cell\kupc-backend>npm init -y
    Wrote to C:\projects\KU-Placement-Cell\kupc-backend\package.json:

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



    Initialize Git
    git init

    Create
    .gitignore

    Ignore
    node_modules

    dist

    .env

    Commit
    git add .

    git commit -m "Initial project"

    Status Complete 


# Step 3 — Install Dependencies
    Runtime
    npm install express dotenv cors helmet morgan express-rate-limit

    Development
    npm install -D typescript ts-node-dev @types/node @types/express @types/cors @types/morgan

    #### Q: What do the Runtime Packages do?
    * **`express`**: The core framework providing the HTTP server, routing engine, and middleware pipeline wrappers[cite: 1].
    * **`dotenv`**: A utility that loads environment variables from a hidden `.env` file into Node's runtime process (`process.env`), keeping credentials out of source control.
    * **`cors`**: Security middleware that configures Cross-Origin Resource Sharing rules, preventing untrusted frontends from accessing your API.
    * **`helmet`**: A security module that automatically sets various HTTP headers to harden the server against common exploits like Clickjacking and Cross-Site Scripting (XSS)[cite: 1].
    * **`morgan`**: A basic HTTP request logger middleware that outputs incoming request details (method, status code, response time) directly to the console.
    * **`express-rate-limit`**: Basic rate-limiting middleware that limits repeated requests to public endpoints to protect the system against brute-force attacks[cite: 1].

    ## Q: What do the Development Packages (-D) do?
    * **`typescript`**: The core TypeScript compiler engine that translates strict, type-safe code into raw browser/Node-readable JavaScript[cite: 1].
    * **`ts-node-dev`**: A development tool that runs your TypeScript code directly without manual compilation steps. It watches your files for updates and automatically restarts your server on every save.
    * **`@types/...`**: These are type definitions. Because raw packages like `express` or `morgan` were originally written in ordinary JavaScript, these types sit on top of them to give VS Code autocomplete features and compile-time validation errors if you write bad code[cite: 1].

    ## What does this do? 
    Let's break down exactly what these two installation commands do behind the scenes, using plain text.
    Command 1: The Runtime Packages
    Bash
    npm install express dotenv cors helmet morgan express-rate-limit


    When you run this command, you are telling npm (Node Package Manager) to download code libraries that your application needs to live, breathe, and function while it is running in production.
    npm goes out to the public internet registry, downloads these 6 packages, and drops their code folders inside a giant folder called node_modules in your project.
    It automatically logs these package names and their precise version numbers inside your package.json file under a section named "dependencies".
    These packages become an active part of your final software. When your backend is running on a server and a user interacts with it, these modules are actively executing code to handle routing, secure HTTP headers, manage rate limits, and log incoming traffic.
    Command 2: The Development Packages (-D)
    Bash
    npm install -D typescript ts-node-dev @types/node @types/express @types/cors @types/morgan


    The key element here is the -D flag (which stands for Development Dependencies). This tells npm that you only need these tools while you are sitting at your computer actively writing, debugging, and compiling the code. They are completely stripped out when the application is built for production.
    npm downloads these tools into the same node_modules folder, but lists them separately inside your package.json under "devDependencies".
    The Tools: You need typescript to translate your strict TypeScript files into regular JavaScript that Node can actually read. You need ts-node-dev so you don't have to manually restart your server every time you hit Save.
    The @types/... Packages: Regular JavaScript packages don't natively understand TypeScript. These @types/ helper packages are like blueprints or translation dictionaries. They tell your code editor (VS Code) exactly what functions, arguments, and data types exist inside libraries like Express. This is what enables features like autocomplete (IntelliSense) and highlights red squiggly lines if you pass the wrong data type into a function.

# Step 4 — Configure TypeScript
Initialize
npx tsc --init

This command creates a file named tsconfig.json in the kupc-backed directory. It contains massic JSON object with dozens of configuration settings, most which are commented out with //. 

Instead of leaving the bloated file full of commented text, it was configured into a clean, strict, production-ready set up. 

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

### ── STEP 4: TypeScript Configuration ──
*Status: Completed*
* **Configuration File Installed:** `tsconfig.json` initialized via `npx tsc --init`.

#### Q: What do these specific compiler settings mean?

*   **`target` ("ES2022")**
    *   **What it does:** Defines which version of JavaScript the compiler outputs.
    *   **Why we use it:** Modern versions of Node.js natively support modern JavaScript features (like async/await, optional chaining). Setting this to `ES2022` prevents TypeScript from translating clean code into old, bloated ES5 boilerplate.

*   **`module` ("NodeNext")**
    *   **What it does:** Specifies the module system used for the compiled output code.
    *   **Why we use it:** Working with `NodeNext` ensures compatibility with modern Node.js standards (like EcmaScript Modules (ESM) using `import/export`), matching modern runtime capabilities perfectly.

*   **`moduleResolution` ("NodeNext")**
    *   **What it does:** Tells TypeScript how to look up and resolve file paths when you import a file from another folder.
    *   **Why we use it:** Setting this to `NodeNext` mirrors the actual algorithm Node.js uses to search your files and `node_modules` directory, preventing path resolution mismatch errors at runtime.

*   **`rootDir` ("./src")**
    *   **What it does:** Pinpoints the exact location of your raw, uncompiled TypeScript source files.
    *   **Why we use it:** It tells the compiler to only look inside the `src/` directory and prevents temporary build artifacts or random root scripts from accidentally bloating your final build.

*   **`outDir` ("./dist")**
    *   **What it does:** Specifies the output directory where all the compiled production JavaScript files go.
    *   **Why we use it:** When building for production, you do not deploy raw `.ts` files. The compiler outputs clean `.js` files here, keeping your build output organized and separated from your source code.

*   **`sourceMap` (true)**
    *   **What it does:** Generates `.js.map` files alongside your compiled code.
    *   **Why we use it:** Since the server actually runs compiled JavaScript out of the `dist/` directory, debugging crashes can be hard. Source maps act as a bridge, mapping lines of execution back to your original `.ts` source files so your stack traces tell you exactly where the error happened in your raw code.

*   **`strict` (true)**
    *   **What it does:** Turns on TypeScript's maximum type-checking settings.
    *   **Why we use it:** It activates `noImplicitAny`, strict null checks, and strict function types. This turns TypeScript into an uncompromising gatekeeper, forcing you to handle potential `null` or `undefined` values explicitly, which eliminates a massive class of common runtime bugs.
outDir
rootDir
strict
moduleResolution
sourceMap

# Step 5 — Create the Folder Structure

Create
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

Understand why each folder exists.
Example
Controller
↓
Service
↓
Database
NOT
Controller
↓
Database

### ── STEP 5: Architecture & Decoupled Folder Structure ──
*Status: Completed*
* **Directory Trees Created:** `src/` core subsystem folders initialized.
* **Root File Boundaries Created:** `src/app.ts` and `src/server.ts`.

#### Q: Why does each folder exist? What are their boundaries?

*   **`config/` (Configuration Layer)**
    *   **Purpose:** Houses centralized configuration modules (like reading environment variables). Code elements across the system should never read `process.env` directly; they read from here instead.

*   **`controllers/` (Transport & Orchestration Layer)**
    *   **Purpose:** The immediate receivers of a request after passing middleware hurdles[cite: 1]. The controller's ONLY jobs are to extract incoming data from `req` (params, body, query), hand that data to a service, collect the result, and format the HTTP response (`res`)[cite: 1]. **Zero business rules or database logic live here.**

*   **`services/` (Business Logic Layer)**
    *   **Purpose:** The absolute brain of the application. All core domain logic, algorithms, status logic, and transaction coordinates live here. Services don't know or care about HTTP requests or responses; they accept raw data parameters, run calculations or workflows, and return JavaScript objects or throw raw errors.

*   **`database/` (Data Infrastructure Layer)**
    *   **Purpose:** Houses the core configurations for external databases, database client initializations, and indexing routines.

*   **`models/` (Data Representation Layer)**
    *   **Purpose:** Defines your data access structures, database tables, collections, or ORM/ODM entities. 

*   **`routes/` (Routing Ledger Layer)**
    *   **Purpose:** A declarative map linking URL paths (e.g., `/api/v1/jobs`) to specific middleware stacks and their target execution controllers[cite: 1].

*   **`middleware/` (Interception Layer)**
    *   **Purpose:** Sequential checkpoints that tap into the request-response stream before it targets controllers[cite: 1]. Handles logging, global error catches, token validation, and security tasks[cite: 1].

*   **`validators/` (Data Boundary Guard Layer)**
    *   **Purpose:** Houses data validation schemas (like Zod schemas). This layer strictly sanitizes data entering the system, short-circuiting malformed client requests before they hit controllers or deep business logic paths.

*   **`utils/` (Utility Layer)**
    *   **Purpose:** Reusable, isolated helper files, custom formatting operations, and global shared classes (like an explicit custom error class).

*   **`types/` (Type System Layer)**
    *   **Purpose:** Global custom TypeScript type definitions, structural contracts, interface models, and request space overrides.

#### Q: Explain the flow pattern: Controller → Service → Database (and NOT Controller → Database)


# ----- STEP 6: Express Routing Fundamentals -----
*Status: Completed*
* **Core Endpoints Operational:** Root ('GET /') and Health ('GET /health') implemented.
* **Automation Configured:** Dev compilation hot-reloading active via 'ts-node-dev'.

#### Q: Explain 'app.get()', 'req', and 'res' in your own words.
* **'app.get(path, callback)'**
    * **What it does:** This registers a specific **route handler** on the Express

##  What is Routing? 
    ** GET/ **
    **health**
    **requests**
    **response**

Create one route.
GET /

returns

Hello KUPC

Then
GET /health

Returns
{
  "status":"OK"
}

Understand
app.get()

req

res


# Step 7 — Learn Express Middleware
This is the most important topic.
Create your own middleware.
Example
Request

↓

Logger

↓

Route

↓

Response

Then understand
next()

Understand why middleware exists.

# Step 8 — Environment Variables
*Status: Completed*

Created:
`kupc-backend/.env`

Added:
```env
PORT=5000
NODE_ENV=development
```

#### Why this step is being done
Environment variables keep runtime configuration outside the source code. Instead of hardcoding values like the port number directly inside `server.ts`, the app reads those values from the process environment.

Node exposes environment values through `process.env`. The `dotenv` package loads values from `.env` into `process.env` during local development.

#### Why this matters for KUPC
KUPC will eventually run in multiple environments:
development on a laptop, testing/staging during review, and production on a real server. Each environment may need different values for ports, frontend URLs, database credentials, Supabase keys, email services, and secrets.

Keeping those values in environment variables means the same codebase can run safely in all those places without editing source files. It also prevents sensitive values from being committed to Git. The root `.gitignore` already excludes `kupc-backend/.env`, which is correct.

# Step 9 — Configuration Module
*Status: Completed*

Created:
`src/config/config.ts`

Current config module:
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

Updated:
`src/server.ts`

The server now uses:
```ts
app.listen(config.port, () => {
  console.log(`KUPC Server is running in ${config.env} mode on http://localhost:${config.port}`);
});
```

#### Why this step is being done
Reading `process.env.PORT` everywhere creates duplication and makes the project harder to maintain. A centralized config module gives the app one trusted place for environment values.

The rest of the backend should import `config` instead of reading `process.env` directly.

#### Why this matters for KUPC
As KUPC grows, the backend will need configuration for CORS origins, Supabase credentials, JWT settings, upload limits, rate-limit rules, and email providers. Centralizing configuration keeps those decisions organized and prevents scattered environment access across controllers, services, and middleware.

This also makes validation easier later. For example, the config module can eventually reject startup if a required secret is missing.

# Step 10 — Logging
*Status: Completed*

Updated:
`src/middleware/logger.ts`

Current logger middleware:
```ts
import morgan from 'morgan';

/**
 * Logs each HTTP request with method, URL, status code, and response time.
 */
export const requestLogger = morgan('dev');
```

Updated:
`src/app.ts`

The app now registers the logger middleware:
```ts
app.use(requestLogger);
```

#### Why this step is being done
`console.log()` is fine for a one-line startup message, but it is not enough for tracking incoming HTTP traffic. Morgan logs every request with useful details such as:
method, path, status code, response size, and response time.

Example development log:
```text
GET /health 200 3.421 ms - 15
```

#### Why this matters for KUPC
When students, companies, and admins start using the platform, request logging helps answer basic debugging questions:
Which route was called?
Did it succeed or fail?
What status code came back?
How long did the request take?

For now, Morgan gives simple request visibility during development. Later, KUPC can move to a structured logger like Pino for production logs, searchable log streams, request IDs, and better monitoring.

# Step 11 — Global Error Handling
*Status: Completed*

Created:
`src/middleware/errorHandler.ts`

Also created:
`src/middleware/notFound.ts`

Updated:
`src/app.ts`

#### What this step adds
The backend now has one central middleware responsible for converting thrown errors into JSON responses:

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

The app registers the error-related middleware after the normal routes:

```ts
app.use(notFound);
app.use(errorHandler);
```

This order matters. Express checks middleware and routes from top to bottom. Normal routes should get the first chance to respond. If no route matches, `notFound` creates a 404 error. If any route or middleware throws/passes an error, `errorHandler` sends the final JSON response.

#### Sub-step: Understand normal errors
A normal JavaScript error is created with:

```ts
throw new Error('Something went wrong');
```

This kind of error has a message and stack trace, but it does not naturally know which HTTP status code should be sent. If the backend only throws normal errors, every failure tends to become a generic 500 response.

That is not enough for an API. A missing student should be a 404. A duplicate email should be a 409. Invalid input should be a 400 or 422.

#### Sub-step: Understand Express errors
Express has a special error flow. When an error is passed to `next(error)`, Express skips normal route handlers and jumps to error-handling middleware.

An Express error middleware has four parameters:

```ts
(err, req, res, next) => {}
```

That first `err` parameter is what makes it an error middleware. Without four parameters, Express treats it like normal middleware.

#### Sub-step: Convert errors into JSON
KUPC is an API backend. That means errors should be returned as JSON, not as random HTML pages or crashed terminal output.

The current error response shape is:

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

In development, the response also includes a stack trace. In production, stack traces should be hidden because they can reveal internal file paths and implementation details.

#### Sub-step: Never crash the server for expected failures
Expected failures are normal in real applications:
wrong route, invalid form, missing profile, expired token, unverified company, duplicate job application.

Those should not crash the server. They should become clean HTTP responses. The server should only crash for truly unsafe startup or infrastructure problems, such as a missing required production secret or database connection failure during boot.

#### Why this matters for KUPC
KUPC will have students, companies, and admins using many workflows. Without global error handling, every controller would need to repeat its own `try/catch` response logic. That creates inconsistent error formats and makes bugs harder to debug.

With one global error handler:
all API errors look consistent,
controllers stay cleaner,
frontend developers can handle errors predictably,
and future logs/monitoring can capture failures from one place.

# Step 12 — Create a Custom Error Class
*Status: Completed*

Created:
`src/utils/AppError.ts`

Current class:
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

#### What this step adds
`AppError` is a custom error class for errors that the application intentionally creates and understands.

Instead of this:

```ts
throw new Error('Student not found');
```

Use this:

```ts
throw new AppError('Student not found', 404);
```

Now the error carries both the message and the correct HTTP status code.

#### Sub-step: Support message
The message explains what went wrong in human-readable form.

Examples:
`Student not found`
`Company is not verified`
`Email already exists`
`Resume file is required`

The message is what the frontend can show to the user, as long as it is safe and clear.

#### Sub-step: Support status code
The status code tells the client what kind of failure happened.

Examples:
`404` means the requested record was not found.
`403` means the user is known but not allowed.
`409` means the request conflicts with existing data.

Without this field, the error handler cannot know whether a failure should be 400, 404, 409, or 500.

#### Sub-step: Support operational error
`isOperational` tells the backend whether the error is expected and safe to return.

Operational errors are normal application failures:
student not found,
invalid login,
company account pending approval,
duplicate application,
bad request body.

Non-operational errors are unexpected bugs or system failures:
undefined variable,
broken code path,
failed assumption inside business logic,
unexpected library failure.

This distinction becomes important later for logging, alerting, and deciding whether a process should restart.

#### Sub-step: Preserve the stack trace
`Error.captureStackTrace(this, this.constructor)` keeps the stack trace useful by pointing at where the `AppError` was created.

That helps during development because the terminal and development JSON response can show the exact file and line where the problem started.

#### Why this matters for KUPC
KUPC will have domain-specific errors everywhere:
student profile missing,
resume not uploaded,
company not approved,
job post closed,
application already submitted,
admin permission required.

`AppError` gives all of those cases one shared structure. That keeps controllers and services expressive without scattering response formatting logic across the backend.

# Step 13 — Learn Status Codes
*Status: Completed*

Status codes are how the backend tells the client the result of a request. The JSON body explains details, but the status code gives the official HTTP meaning.

#### 200 — OK
Use `200` when a request succeeded and the server is returning data.

KUPC examples:
fetching the student dashboard,
loading a company profile,
getting a list of jobs,
checking `/health`.

Example:
```ts
res.status(200).json({ success: true, data: jobs });
```

#### 201 — Created
Use `201` when the request successfully created a new resource.

KUPC examples:
creating a student profile,
posting a new job,
submitting an application,
creating a company account request.

Example:
```ts
res.status(201).json({ success: true, data: newJob });
```

#### 204 — No Content
Use `204` when the request succeeded but there is no response body to send back.

KUPC examples:
deleting a saved job,
removing a notification,
revoking a token,
clearing a draft.

Important: a `204` response should not include JSON data. It means success with an empty body.

Example:
```ts
res.status(204).send();
```

#### 400 — Bad Request
Use `400` when the request itself is malformed or missing basic required information.

KUPC examples:
missing email field,
invalid JSON body,
missing job title,
invalid query parameter format.

This means the client sent something the server could not understand or process at the basic request level.

Example:
```ts
throw new AppError('Email is required', 400);
```

#### 401 — Unauthorized
Use `401` when the user is not authenticated.

KUPC examples:
request has no access token,
token is expired,
token is invalid,
student tries to access profile data without signing in.

The word "Unauthorized" is a little confusing. In HTTP, `401` really means "not logged in or not authenticated correctly."

Example:
```ts
throw new AppError('Authentication required', 401);
```

#### 403 — Forbidden
Use `403` when the user is authenticated but not allowed to perform the action.

KUPC examples:
student tries to approve a company,
company tries to access admin analytics,
unverified company tries to post a job,
one student tries to edit another student's profile.

Difference from `401`:
`401` means "we do not know who you are."
`403` means "we know who you are, but you cannot do this."

Example:
```ts
throw new AppError('Admin access required', 403);
```

#### 404 — Not Found
Use `404` when the requested route or resource does not exist.

KUPC examples:
student ID does not exist,
job post was deleted,
company profile cannot be found,
client calls `/api/v1/unknown`.

The new `notFound` middleware uses this status for unmatched routes.

Example:
```ts
throw new AppError('Student not found', 404);
```

#### 409 — Conflict
Use `409` when the request is valid, but it conflicts with something that already exists or with the current state of the system.

KUPC examples:
student applies to the same job twice,
email is already registered,
company tries to create a duplicate active job post,
admin tries to approve a company that has already been rejected.

Example:
```ts
throw new AppError('Application already submitted', 409);
```

#### 422 — Unprocessable Entity
Use `422` when the request is shaped correctly, but the data fails deeper validation rules.

KUPC examples:
resume file type is unsupported,
GPA is outside the allowed range,
job deadline is in the past,
password is too weak,
LinkedIn URL format is invalid.

Difference from `400`:
`400` is for malformed or missing request basics.
`422` is for valid request structure with unacceptable business data.

Example:
```ts
throw new AppError('Application deadline cannot be in the past', 422);
```

#### 500 — Internal Server Error
Use `500` when something unexpected went wrong on the server.

KUPC examples:
unexpected database failure,
unhandled code bug,
third-party service failure,
undefined runtime error.

The client usually cannot fix a `500`. The backend team must inspect logs and fix the cause.

Example:
```ts
throw new Error('Unexpected database adapter failure');
```

The global error handler converts unknown errors into:
```json
{
  "success": false,
  "message": "Internal server error"
}
```

#### Quick status code decision guide
Use `200` when data was fetched or an action succeeded with a response body.
Use `201` when something new was created.
Use `204` when something succeeded and no body is needed.
Use `400` when the request is malformed or missing required basics.
Use `401` when the user is not authenticated.
Use `403` when the authenticated user is not allowed.
Use `404` when a route or resource does not exist.
Use `409` when the request conflicts with existing state.
Use `422` when submitted data fails validation rules.
Use `500` when the server hit an unexpected bug or infrastructure failure.

# Step 14 — Create API Response Format
*Status: Completed*

Created:
`src/utils/apiResponse.ts`

Updated:
`src/app.ts`
`src/middleware/errorHandler.ts`

#### What this step adds
Every API response should follow one predictable shape:

```json
{
  "success": true,
  "data": {},
  "message": "",
  "error": null
}
```

The backend now has helper functions for success and error responses:

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

#### Sub-step: Understand `success`
`success` is a simple boolean that tells the frontend whether the request succeeded.

For successful requests:
```json
"success": true
```

For failed requests:
```json
"success": false
```

This lets the frontend make quick decisions without guessing from the message text.

#### Sub-step: Understand `data`
`data` contains the actual result of the request.

KUPC examples:
student profile data,
company profile data,
job listings,
resume analysis result,
application status,
admin dashboard metrics.

For errors, `data` should usually be `null` because the request did not produce the expected result.

#### Sub-step: Understand `message`
`message` gives a short human-readable explanation.

Examples:
`KUPC API is healthy`
`Student profile fetched successfully`
`Application already submitted`
`Authentication required`

The message is useful for frontend notifications, logs, and debugging.

#### Sub-step: Understand `error`
`error` is `null` when the request succeeds.

For failed requests, `error` can contain structured debugging details:
status code,
validation errors,
operational error flag,
development stack trace.

In production, avoid exposing sensitive internal details in `error`.

#### Sub-step: Update existing endpoints
The root endpoint now returns:

```json
{
  "success": true,
  "data": {
    "name": "KUPC API"
  },
  "message": "Welcome to KUPC",
  "error": null
}
```

The health endpoint now returns:

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

#### Why this matters for KUPC
Consistency matters because the frontend will eventually call many endpoints:
login,
student profiles,
company approvals,
job posts,
applications,
matches,
chat,
analytics.

If every endpoint returns a different shape, frontend code becomes messy and fragile. A shared API response format lets frontend developers build one reusable API client and handle loading, success, and error states predictably.

# Step 15 — Install Helmet
*Status: Completed*

Package:
`helmet`

Created:
`src/middleware/security.ts`

Updated:
`src/app.ts`

#### What this step adds
Helmet is now registered as security middleware:

```ts
import helmet from 'helmet';

export const securityMiddleware = helmet();
```

And in `app.ts`:

```ts
app.use(securityMiddleware);
```

Helmet sets several HTTP response headers that make common browser-based attacks harder.

#### Sub-step: Understand why headers matter
HTTP headers are metadata sent with requests and responses. Browsers use response headers to decide what behavior is allowed.

Security headers can tell the browser:
do not guess file types,
do not expose referrer details unnecessarily,
restrict risky browser features,
reduce clickjacking risk,
control cross-origin resource behavior.

Helmet does not replace authentication, validation, or authorization. It is one security layer.

#### Sub-step: Know what Helmet protects against
Helmet helps reduce risk from several classes of attacks and misconfigurations.

`X-Content-Type-Options`
Prevents browsers from guessing a different content type than the one the server declared. This helps reduce MIME sniffing attacks.

`Strict-Transport-Security`
Tells browsers to prefer HTTPS for future requests. This is most useful in production over HTTPS.

`X-Frame-Options` or frame-related policy
Helps prevent clickjacking, where a malicious site embeds KUPC inside a hidden or misleading frame.

`Referrer-Policy`
Controls how much URL information the browser sends as the referrer when navigating away.

`Content-Security-Policy`
Restricts where scripts, images, styles, and other resources can load from. Helmet enables a default CSP that is safer than having none.

`Cross-Origin-Opener-Policy` and related headers
Help isolate browser contexts and reduce cross-origin attack surface.

#### Sub-step: Understand "not just app.use(helmet())"
Calling `app.use(helmet())` is the implementation, but the important learning is why it exists.

Helmet is not magic security. It does not:
validate user input,
stop SQL injection by itself,
manage user sessions,
check roles,
protect passwords,
replace CORS.

It hardens HTTP responses so browsers follow safer rules when interacting with the KUPC API.

#### Why this matters for KUPC
KUPC will handle sensitive placement workflows:
student profile data,
resume metadata,
company accounts,
admin actions,
job applications.

Security should be layered from the beginning. Helmet gives the backend a safer default posture before authentication and database work begin.

# Step 16 — Configure CORS
*Status: Completed*

Package:
`cors`

Created:
`src/middleware/cors.ts`

Updated:
`src/config/config.ts`
`src/app.ts`

#### What this step adds
The API now allows browser requests from:

```text
http://localhost:5173
```

That is the default Vite frontend development server origin.

Other browser origins are rejected.

Current config:

```ts
cors: {
  allowedOrigins: ['http://localhost:5173']
}
```

Current CORS middleware:

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

#### Sub-step: Understand why browsers block requests
CORS means Cross-Origin Resource Sharing.

Browsers enforce the same-origin policy. A frontend running on one origin is not automatically allowed to read responses from another origin.

An origin is made of:
protocol,
host,
port.

These are different origins:
`http://localhost:5173`
`http://localhost:5000`
`https://ku.edu.np`
`http://127.0.0.1:5173`

Even though `localhost:5173` and `localhost:5000` are both local, the ports are different, so the browser treats them as different origins.

#### Sub-step: Allow the frontend origin
During development, the KUPC frontend runs on Vite:

```text
http://localhost:5173
```

The backend runs on:

```text
http://localhost:5000
```

The backend must explicitly allow the frontend origin so the browser will let frontend code read API responses.

#### Sub-step: Reject unknown origins
Rejecting unknown browser origins helps prevent random websites from calling the KUPC API from a user's browser and reading responses.

CORS is not full backend security. Tools like Postman, curl, or server-side scripts are not restricted by browser CORS rules. Authentication and authorization are still required later.

But CORS is still important because KUPC's real users will mostly interact through browsers.

#### Sub-step: Understand credentials
`credentials: true` allows browsers to include credentials such as cookies or authorization-related data when the frontend is allowed.

Later, if KUPC uses cookies for auth, this setting will matter. If KUPC uses only `Authorization: Bearer <token>` headers, the allowed headers setting also matters.

Important: when credentials are enabled, the backend should not use wildcard origins like `*`.

#### Sub-step: Understand methods
The CORS config allows:

`GET` for reading data.
`POST` for creating data.
`PUT` and `PATCH` for updating data.
`DELETE` for deleting data.
`OPTIONS` for browser preflight checks.

A preflight request is the browser asking the backend, "Is this real request allowed?" before sending requests with certain methods or headers.

#### Why this matters for KUPC
The frontend and backend are separate apps. Without CORS, the React frontend may be running correctly and the backend may be running correctly, but the browser will still block API calls between them.

Correct CORS setup is what lets the KUPC frontend safely talk to the KUPC backend during development.

# Step 17 — Rate Limiting
*Status: Completed*

Package:
`express-rate-limit`

Created:
`src/middleware/rateLimiter.ts`

Updated:
`src/app.ts`

#### What this step adds
The backend now has an authentication-focused rate limiter:

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

It is applied to:

```ts
app.use(['/auth', '/login', '/register'], authRateLimiter);
```

There are no real authentication routes yet, but the protection is now in place for those future paths.

#### Sub-step: Understand brute force attacks
A brute force attack is when someone repeatedly tries many combinations until something works.

For KUPC authentication, that could mean:
trying many passwords for one student email,
trying many email/password combinations,
repeatedly hitting registration endpoints,
trying to guess admin credentials.

Even if every login attempt is technically valid HTTP, too many attempts in a short time is suspicious.

#### Sub-step: Understand rate-limit window
`windowMs` defines the time window.

Current setting:

```ts
windowMs: 15 * 60 * 1000
```

That means 15 minutes.

#### Sub-step: Understand request limit
`limit` defines how many requests are allowed inside that window.

Current setting:

```ts
limit: 10
```

That means a client can make 10 requests to protected auth paths within 15 minutes before receiving a `429 Too Many Requests` response.

#### Sub-step: Understand standard headers
`standardHeaders: true` sends modern rate-limit headers so clients can understand their limit state.

These headers can communicate:
the total request limit,
remaining attempts,
when the limit resets.

This is useful for debugging and later frontend handling.

#### Sub-step: Understand custom rate-limit response
When the limit is exceeded, the backend returns the same API response format:

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

#### Why this matters for KUPC
Authentication endpoints are high-risk because attackers often target them first.

Rate limiting helps protect:
student accounts,
company recruiter accounts,
admin accounts,
server resources,
database resources.

It does not replace strong passwords, account lockout rules, MFA, or authentication monitoring. It is an early protective layer that slows abuse and makes attacks more expensive.

# Step 18 — Validation
*Status: Completed*

Installed:
`zod`

Command concept:
```bash
npm install zod
```

Note: in this workspace, `npm` was not available on the shell path, so the dependency was installed with the bundled package manager. The result is the same for the project code: `zod` is now listed in `package.json` and installed in `node_modules`.

#### What this step adds
Zod is a validation library. It lets the backend define the exact shape of incoming data before that data reaches controllers and services.

We are not using Zod in routes yet. This step is about installing it and understanding the concepts before Phase 2.

#### Sub-step: Understand schemas
A schema is a description of what valid data looks like.

Example for a future student registration request:

```ts
const registerStudentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  degree: z.string()
});
```

This schema says:
`name` must be a non-empty string,
`email` must be a valid email,
`password` must be at least 8 characters,
`degree` must be a string.

#### Sub-step: Understand parsing
Parsing means taking unknown input and checking whether it matches a schema.

With Zod:

```ts
const data = registerStudentSchema.parse(req.body);
```

If `req.body` is valid, Zod returns typed data. If it is invalid, Zod throws an error.

That is useful, but throwing directly means the route must either catch the error or let the global error handler deal with it.

#### Sub-step: Understand `safeParse`
`safeParse` checks the data without throwing.

Example:

```ts
const result = registerStudentSchema.safeParse(req.body);

if (!result.success) {
  // return validation error
}

const data = result.data;
```

`safeParse` returns an object with `success: true` or `success: false`. This makes it good for validation middleware because the middleware can decide exactly what JSON response to send.

#### Sub-step: Why not use it yet
The backend does not have real request bodies yet. There are no authentication, profile, job, or application endpoints to validate.

Using Zod too early would create fake validation for fake routes. For now, it is installed and ready.

#### Why this matters for KUPC
KUPC will accept user input from students, companies, and admins:
registration forms,
login forms,
profile updates,
job posts,
resume uploads,
company approval decisions.

Never trust raw request data. Validation protects the backend from malformed input and gives the frontend useful error messages before bad data reaches business logic or the database.

# Step 19 — Create the App Entry
*Status: Completed*

Current files:
`src/app.ts`
`src/server.ts`

#### What this step adds
The project already separates Express app creation from server startup.

`app.ts` creates and configures the Express app:
middleware,
routes,
not-found handling,
global error handling.

`server.ts` starts the app by listening on a port:

```ts
app.listen(config.port, () => {
  console.log(`KUPC Server is running in ${config.env} mode on http://localhost:${config.port}`);
});
```

#### Sub-step: Understand `app.ts`
`app.ts` should answer:
What middleware does the API use?
What routes exist?
How are errors handled?

It should not decide how the process is started.

#### Sub-step: Understand `server.ts`
`server.ts` should answer:
Which port should the server listen on?
When does the HTTP server start?
What startup message should be logged?

It should not contain route definitions or business logic.

#### Sub-step: Why this makes testing easier
Tests can import `app` directly without starting a real network server.

Future example:

```ts
import app from '../src/app';
```

Then a test tool can call routes in memory. This is faster and cleaner than starting and stopping a port for every test.

#### Why this matters for KUPC
KUPC will eventually need automated tests for authentication, role permissions, job applications, company approval, and admin workflows.

Keeping `app.ts` separate from `server.ts` makes those tests easier to write and keeps the backend architecture professional from the start.

# Step 20 — Create Versioned APIs
*Status: Completed*

Created:
`src/routes/index.ts`

Updated:
`src/app.ts`

Current route mount:

```ts
app.use('/api/v1', apiV1Router);
```

#### What this step adds
The backend now has a versioned API base route:

```text
GET /api/v1
```

Instead of building future routes like:

```text
/users
/jobs
/applications
```

KUPC should build them under:

```text
/api/v1/users
/api/v1/jobs
/api/v1/applications
```

#### Sub-step: Understand API versioning
API versioning lets the backend evolve without breaking existing clients.

If version 1 is already used by the frontend, mobile app, or external integrations, a future breaking change can be introduced under:

```text
/api/v2
```

That way, old clients can keep using `/api/v1` while new clients move to `/api/v2`.

#### Sub-step: Understand route grouping
The versioned router is created in `src/routes/index.ts`.

Right now it only exposes the base route, but later it can mount route groups:

```ts
router.use('/students', studentRoutes);
router.use('/companies', companyRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
```

#### Why this matters for KUPC
Placement systems change over time. KUPC may start with simple student and company records, then later add matching algorithms, resume analysis, interview scheduling, and admin workflows.

Versioned APIs create room for growth without forcing every frontend change to happen at once.

# Step 21 — Create Health Endpoint
*Status: Completed*

Endpoint:
```text
GET /health
```

Current response uses the standard API response format:

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

#### Sub-step: Understand `status`
`status` tells whether the service is alive.

Current value:

```json
"status": "healthy"
```

This means the Express process is running and able to respond.

#### Sub-step: Understand `uptime`
`uptime` is how long the Node process has been running, in seconds.

Current code:

```ts
process.uptime()
```

This is useful during deployment because it can show whether the server recently restarted.

#### Sub-step: Understand `timestamp`
`timestamp` shows when the health response was generated.

Current code:

```ts
new Date().toISOString()
```

This helps debugging because logs, Postman responses, and monitoring dashboards can be compared using the same time format.

#### Why this matters for KUPC
Health endpoints are common in production systems. Hosting platforms, load balancers, uptime monitors, and developers can call `/health` to check whether the API is alive.

Later, this endpoint can also check database connectivity, Supabase availability, or other critical services.

# Step 22 — Create Base Route
*Status: Completed*

Endpoint:
```text
GET /api/v1
```

Current response uses the standard API response format:

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

#### Sub-step: Understand the base route
The base route confirms that the versioned API is mounted correctly.

If `GET /health` works but `GET /api/v1` fails, the server is alive but the API router may be wired incorrectly.

#### Sub-step: Understand `name`
`name` identifies the API.

Current value:

```json
"name": "KUPC API"
```

This is useful when debugging environments because it confirms which backend responded.

#### Sub-step: Understand `version`
`version` identifies the API version or application release.

Current value:

```json
"version": "1.0.0"
```

The value is centralized in `config.api.version`.

#### Why this matters for KUPC
The base route gives developers a quick sanity check for the versioned API. It also creates the starting point for future routes like students, companies, jobs, applications, matches, and admin tools.

# Step 23 — Test Everything
*Status: Completed*

Use Postman, Insomnia, Bruno, curl, or a browser for simple GET requests.

#### Test 1: Root route
Request:

```text
GET http://localhost:5000/
```

Expected:
status `200`.

Response should include:

```json
{
  "success": true,
  "data": {
    "name": "KUPC API"
  },
  "message": "Welcome to KUPC",
  "error": null
}
```

#### Test 2: Health route
Request:

```text
GET http://localhost:5000/health
```

Expected:
status `200`.

Response should include:
`success: true`,
`data.status: healthy`,
`data.uptime`,
`data.timestamp`.

#### Test 3: Versioned API base route
Request:

```text
GET http://localhost:5000/api/v1
```

Expected:
status `200`.

Response should include:
`name: KUPC API`,
`version: 1.0.0`.

#### Test 4: Wrong route
Request:

```text
GET http://localhost:5000/does-not-exist
```

Expected:
status `404`.

Response should use the standard error format:

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

#### Test 5: Error handling
The wrong-route test already proves the error pipeline:

Request
goes to no matching route,
`notFound` creates an `AppError`,
`errorHandler` converts it into JSON.

Later, controller errors will use the same path.

#### Test 6: CORS
In Postman, CORS will not behave exactly like a browser because CORS is a browser security rule.

To test browser CORS, call the API from the frontend running at:

```text
http://localhost:5173
```

That origin should be allowed.

A different browser origin should be rejected by the backend CORS configuration.

#### Test 7: Rate limiting
Protected paths:

```text
/auth
/login
/register
```

There are no real auth routes yet, but the limiter is already attached to those paths.

Send more than 10 requests within 15 minutes to one of those paths:

```text
GET http://localhost:5000/login
```

Expected after the limit:
status `429`.

Response:

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

#### Why this matters for KUPC
Testing the foundation before adding authentication or a database prevents confusion later.

If routing, error handling, CORS, rate limiting, health checks, and response formats work now, Phase 2 can focus on authentication instead of debugging basic Express wiring.

# Step 24 — Refactor
Ask yourself
Can I remove duplicate code?
Can I improve naming?
Can I improve folders?
Can I simplify?
Professional developers refactor constantly.

# Step 25 — Final Project Structure
By the end, your project should look like this:
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
│   │   └── logger.ts
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


Before Moving to Phase 2
Make sure you can confidently answer these questions:
Why do we separate app.ts and server.ts?
What is middleware, and why is it useful?
Why shouldn't controllers contain business logic?
Why use environment variables instead of hardcoding values?
What's the difference between a 404 and a 500?
What problem does CORS solve?
Why do we use Helmet?
Why is rate limiting important?
Why use a centralized error handler?
Why version APIs with /api/v1?
If you can explain those concepts in your own words—not just copy code—you'll be ready to tackle Phase 2 (authentication with Supabase) on a strong foundation.

