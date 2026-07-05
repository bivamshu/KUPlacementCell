# KUPC Backend Engineering Documentation — Phase 1 Base Foundation
> **Project Reference File:** KUPC_Backend_Specification_v2.pdf

---

## ── STEP 0 & 1: Core Mechanics & Architecture ──
*Status: Completed*

### Q: What is Express?
Express is a minimalist, fast, and unopinionated web framework for Node.js. It acts as an abstraction layer over Node's native `http` module, providing a robust suite of tools to handle routing, HTTP requests, responses, and middleware without massive boilerplate.

### Q: What is HTTP?
Hypertext Transfer Protocol (HTTP) is the foundational data transfer protocol of the web. It is inherently **stateless**, meaning the server does not remember anything about a client between separate requests. This is why KUPC explicitly relies on attaching JSON Web Tokens (JWT) to HTTP headers later on to safely prove identity with every independent interaction[cite: 1].

### Q: What is an HTTP Request?
An HTTP request is a structured message sent from a client (like a student's web browser) to the server[cite: 1]. It consists of a **Method/Verb** (`GET`, `POST`, `PUT`, `DELETE`), a **URL/Path** (e.g., `/api/v1/jobs`), **Headers** (metadata like Auth tokens), and an optional **Body** containing client data payload[cite: 1].

### Q: What is an HTTP Response?
An HTTP response is the structured message your Node.js server transmits back to the client. It contains an **HTTP Status Code** (indicating success or specific errors), **Headers** (like `Content-Type: application/json`), and the **Body/Payload** (the requested data or error breakdown)[cite: 1].

### Q: What is Middleware?
Middleware functions are sequential checkpoints sitting in the middle of the request-response cycle. They have access to the `req` object, `res` object, and the `next()` function. They can modify requests, execute custom validation, short-circuit requests entirely (like blocking an unauthenticated client), or hand off execution downstream using `next()`.

---

## ── STEP 2: Project Creation ──
*Status: Completed*
* **Package File Installed:** `package.json` created via `npm init -y`.
* **Git Repository:** Initialized via `git init`.
* **Exclusions Configured:** `.gitignore` properly hiding `node_modules`, `dist`, and `.env` files.

When you run `npm init -y` inside a new folder, you are initializing a brand-new Node.js project.

The `-y` flag stands for **"yes"**, which tells npm to skip the interactive questionnaire it normally asks you (like project name, version, description) and automatically accept all the default values.

Here is what it actually does behind the scenes:

### 1. It creates a `package.json` file

This is the single most important file in any Node.js project. It acts as the manifest, configuration ledger, and brain of your backend.

### 2. It populates it with default metadata

Open up your new `package.json` file in VS Code right now. You will see a JSON object that looks similar to this:

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
  "license": "ISC"
}

```

### Why this file is critical for your KUPC Backend:

* **Dependency Tracker:** As we move to **Step 3** and install packages like Express, TypeScript, and Helmet, npm will automatically list them inside this file under `"dependencies"` or `"devDependencies"`. If another developer copies your code, they just type `npm install` and npm reads this file to install everything automatically.


* **Automation Hub:** The `"scripts"` section is where you will write custom automation commands. Later on, you will configure a command like `"dev": "ts-node-dev src/server.ts"` so you can launch your entire production-grade server with a simple shortcode.

Now that your project brain is initialized, let's step up to **Step 3** and pull down the actual tools we need to start building! Let me know when you are ready to run the install command.

---

## ── STEP 3: Dependency Installation ──
*Status: Pending*

[Your questions and answers for Step 3 will be pasted here...]