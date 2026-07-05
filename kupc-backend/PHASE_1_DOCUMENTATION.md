I actually think you should approach Phase 1 like a mini-course rather than "set up Express and move on." The goal isn't just to finish it—it's to understand why every piece exists. If you do that, building the rest of KUPC will be much easier.
Below is the roadmap I would follow if I were mentoring you.

Phase 1 Goal
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

Step 0 — Install Your Development Environment
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


Step 1 — Learn How Express Works
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

Don't write code yet.

Step 2 — Create the Project
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


Step 3 — Install Dependencies
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

#### Q: What do the Development Packages (-D) do?
* **`typescript`**: The core TypeScript compiler engine that translates strict, type-safe code into raw browser/Node-readable JavaScript[cite: 1].
* **`ts-node-dev`**: A development tool that runs your TypeScript code directly without manual compilation steps. It watches your files for updates and automatically restarts your server on every save.
* **`@types/...`**: These are type definitions. Because raw packages like `express` or `morgan` were originally written in ordinary JavaScript, these types sit on top of them to give VS Code autocomplete features and compile-time validation errors if you write bad code[cite: 1].

What does this do? 
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
Ready for Step 4?
Once these installations finish running in your terminal, the foundational packages will be fully locked into your workspace.
Let me know when the terminal prompt clears, and we will jump into Step 4: Configuring TypeScript by running npx tsc --init!



Step 4 — Configure TypeScript
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

Step 5 — Create the Folder Structure

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

---

#### Q: Explain the flow pattern: Controller → Service → Database (and NOT Controller → Database)

Step 6 — Learn Express Routing
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


Step 7 — Learn Express Middleware
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

Step 8 — Environment Variables
Create
.env

Add
PORT=5000

NODE_ENV=development

Learn
process.env

Never hardcode configuration.

Step 9 — Configuration Module
Instead of
process.env.PORT

everywhere
Create
config/

config.ts

Expose
config.port

config.env

Understand
Centralized configuration.

Step 10 — Logging
Replace
console.log()

with
Morgan (initially).
Learn
Request logging
Status codes
Response times
Later
Pino

Step 11 — Global Error Handling
Learn
Normal errors
vs
Express errors
Create
middleware/

errorHandler.ts

Understand
Throw Error

↓

Error Middleware

↓

JSON Response

Never crash the server.

Step 12 — Create a Custom Error Class
Instead of
throw new Error()

Create
AppError

Support
message
status code
operational error
Example
Student not found

↓
404

Step 13 — Learn Status Codes
Understand
200
201
204
400
401
403
404
409
422
500
Know when to use each.

Step 14 — Create API Response Format
Every endpoint should return
{
    "success": true,
    "data": {},
    "message": "",
    "error": null
}

Consistency matters.

Step 15 — Install Helmet
Learn
What headers it adds
Why
Security
Not just
app.use(helmet())

Know what it protects.

Step 16 — Configure CORS
Understand
Why browsers block requests.
Allow
localhost:5173

Reject others.
Learn
Origins
Credentials
Methods

Step 17 — Rate Limiting
Install
express-rate-limit
Protect
/auth

/login

/register

Understand
Brute force attacks.

Step 18 — Validation
Install
npm install zod

Don't use it yet.
Just learn
Schemas
Parsing
safeParse
You'll need it in Phase 2.

Step 19 — Create the App Entry
Separate
server.ts

from
app.ts

Understand why.
app.ts
Creates Express.
server.ts
Starts Express.
This separation makes testing much easier.

Step 20 — Create Versioned APIs
Instead of
/users

Use
/api/v1/users

Future-proof your API.

Step 21 — Create Health Endpoint
GET /health

Returns
{
    "status":"healthy",
    "uptime":123,
    "timestamp":"..."
}

Very common in production.

Step 22 — Create Base Route
GET /api/v1

Returns
{
    "name":"KUPC API",
    "version":"1.0.0"
}


Step 23 — Test Everything
Use Postman.
Test
GET /
GET /health
Wrong routes
Error handling
CORS
Rate limiting

Step 24 — Refactor
Ask yourself
Can I remove duplicate code?
Can I improve naming?
Can I improve folders?
Can I simplify?
Professional developers refactor constantly.

Step 25 — Final Project Structure
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

