# Certificate Generator App

Certificate App is a full-stack Node.js application built with Express and Vanilla JavaScript that automates the processing of Flight Data Recorder (FDR) Readout Reports. The app allows users to upload CSV files, parse them, convert the data into JSON, and dynamically generate a styled, print-ready HTML report based on a reusable template.

It supports:

CSV Upload and Parsing using multer and csv-parser

Dynamic Report Preview with consistent formatting and serial numbers

Pattern Recognition and Data Validation

File Cleanup and Management

Modular Utilities for cleaner logic (e.g., helpers and filtering functions)

AWS S3 Integration (planned/optional) for storing generated JSON reports

Developer Workflow Enhancements via:

Live reloading with BrowserSync

Auto-restarts using Nodemon

Code quality enforced via ESLint and Prettier

Environment separation using cross-env

This project is ideal for aviation data analysts, maintenance engineers, or internal teams that need quick turnaround times for structured report generation from raw CSV telemetry.

## 📁 Project Structure

certificate-app/
├── public/ # Static frontend assets (HTML, images)
├── routes/ # Express routes (uploads, preview, clear)
├── templates/ # HTML template for previews
├── utils/ # Helper functions
├── uploads/ # Temporary CSV upload storage
├── server.js # Main Express server
├── .env # Environment variables
├── bs-config.js # BrowserSync config
├── eslint.config.mjs # ESLint configuration
├── package.json # NPM project metadata

## 📁 File Distribution

certificate-app/
├── public/ # Static frontend assets
│ ├── images/ # Logos and signatures used in reports
│ │ ├── achhuth-signature.png
│ │ ├── sasi-signature.png
│ │ └── nestlogo.svg
│ └── index.html # Landing page or file upload interface
│
├── routes/ # Express route handlers
│ ├── uploads.js # Handles CSV file uploads
│ ├── preview.js # Generates preview from parsed data
│ └── clearuploads.js # Clears uploaded files from server
│
├── templates/ # HTML templates for report generation
│ └── template.html # Base layout for FDR Readout Report
│
├── utils/ # Utility/helper functions
│ ├── helpers.js # General-purpose functions
│ └── removeSubframeIndex.js # Function to clean specific CSV field
│
├── uploads/ # Temporary storage for uploaded CSVs
│ └── .gitkeep # Keeps empty folder tracked in Git
│
├── .env # Environment variables (NOT committed to Git)
├── .gitignore # Files/folders to exclude from Git
├── .prettierrc # Prettier configuration
├── .prettierignore # Files to ignore during formatting
├── .eslint.config.mjs # ESLint configuration (modular format)
├── bs-config.js # BrowserSync setup for live reloading
├── nodemon.json # Nodemon configuration for server restarts
├── data.json # (Optional) Temporary data cache or sample output
│
├── LICENSE # Project license (e.g., MIT)
├── README.md # Project documentation
├── package.json # Project metadata, scripts, and dependencies
├── package-lock.json # Exact dependency versions
└── server.js # Entry point for the Express server

## 🚀 Features

- Upload and parse multiple CSV files
- Convert to JSON and preview results
- Generate dynamic reports using an HTML template
- Upload processed data to Amazon S3
- Environment-based behavior (dev/production)
- ESLint + Prettier + Cross-env configured

---

## 🛠️ Setup Instructions

1. 📥 Clone the repository
   bash
   Copy
   Edit

# Clone the project repository to your local machine

git clone https://github.com/your-username/certificate-app.git

# Navigate into the project directory

cd certificate-app

2. 📦 Install dependencies and create environment file

# Install all project dependencies listed in package.json

npm install

# Create a .env file to store environment-specific variables

touch .env

# Add your environment variables to the .env file (example shown below)

# You can use any text editor like nano, code, or vim

# For example, using echo:

echo "NODE_ENV=development" >> .env
echo "AWS_ACCESS_KEY_ID=your-access-key" >> .env
echo "AWS_SECRET_ACCESS_KEY=your-secret-key" >> .env
echo "AWS_REGION=us-east-1" >> .env
echo "S3_BUCKET_NAME=certificate-app-01" >> .env
💡 Alternatively, open .env in VS Code to edit manually:

code .env

3. 🧪 Run in development mode (with auto reload)

# Start the dev server using nodemon and browser-sync

npm run dev

4. 🚀 Run in production mode

# Start the app in production mode

npm start

5. ✅ Lint, fix, and format your code

# Run ESLint to find problems

npm run lint

# Automatically fix fixable issues

npm run lint:fix

# Format all files using Prettier

npm run format

## Automated Git Pull Script

To automatically pull the latest changes from the `local-storage` branch every time you unlock your PC, use the script in `/scripts/auto-git-pull.bat`.

**Setup:**

1. Open Windows Task Scheduler.
2. Create a new task with the trigger "On workstation unlock."
3. Set the action to run the script at: `scripts/auto-git-pull.bat`
4. (Optional) Check the logs in `scripts/git-pull-log.txt`.

The script will retry up to 3 times and always keep your local code if there's a conflict.



# Certificate App

A Node.js/Express application with automated browser sync and hot-reload for development.

---

## 🚀 Getting Started

### 1. **Install Dependencies**

```bash
npm install
```

### 2. **Development Workflow**

* **Start the development environment (app + browser sync):**

  ```bash
  npm run dev
  ```

  This will:

  * Automatically kill any existing dev server processes on ports **3000, 3010, 4000, 3001**
  * Start the main server (with `nodemon`)
  * Start BrowserSync (with your custom config)

* **Stop all dev servers manually:**

  ```bash
  npm run stop
  ```

* **Start only the production server:**

  ```bash
  npm start
  ```

---

## 🔄 Automated Git Pull and Dev Restart (Optional)

To ensure your app always has the latest code and a clean dev environment, you can use the included automation scripts.

### **Automated Workflow**

* When you **log in** or **unlock your computer**, the script:

  1. Stops all running dev servers (using `npm run stop`)
  2. Pulls the latest code from the `local-storage` branch, always keeping your local changes if there's a merge conflict
  3. Restarts your development environment (`npm run dev`)

---

### **Setting Up the Automation (Windows)**

1. **Find the scripts:**

   * `scripts/auto-git-pull.bat` (batch script)
   * `scripts/kill-ports.ps1` (PowerShell helper for port management)

2. **(First time only) Install required npm packages:**

   ```bash
   npm install --save-dev kill-port concurrently
   ```

3. **Set up Task Scheduler:**

   * Open **Task Scheduler** (Windows)
   * **Create Task** (not basic)
   * **Triggers:** Add both:

     * At log on
     * On workstation unlock
   * **Action:** Start a program → point to `scripts/auto-git-pull.bat`
   * **(Optional):** Check "Run with highest privileges"

4. **Check `scripts/git-pull-log.txt`** for pull history and errors.

---

## 📦 Scripts in `package.json`

```json
"scripts": {
  "start": "node server.js",
  "dev": "npm run stop && concurrently \"npm:watch-server\" \"npm:browser-sync\"",
  "stop": "npx kill-port 3000 3010 4000 3001",
  "watch-server": "nodemon server.js --watch server.js",
  "browser-sync": "browser-sync start --config bs-config.js",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

---

## 🛠 Troubleshooting

* If you see `EADDRINUSE` or "port in use" errors, make sure to use `npm run stop` before starting the dev server.
* If you get merge conflicts during a `git pull`, your **local code will always be kept** (see the `-X ours` merge strategy in the automation script).
* For logs or debugging, see `scripts/git-pull-log.txt`.

---

## 🤝 Contributing

Feel free to open pull requests or issues!

---
