# UNICoup
UNICoup/
│── backend/                  # Express.js backend
│   ├── src/                  # Source files
│   │   ├── controllers/      # Route logic (API endpoints)
│   │   ├── models/           # Mongoose models (MongoDB)
│   │   ├── routes/           # API route definitions
│   │   ├── middleware/       # Express middleware
│   │   ├── utils/            # Utility/helper functions
│   │   ├── config/           # Config files (DB, env, etc.)
│   │   ├── app.js            # Main Express app
│   │   ├── server.js         # Server entry point
│   ├── tests/                # Backend test cases (Jest)
│   ├── .env                  # Environment variables (backend)
│   ├── package.json          # Backend dependencies & scripts
│   ├── tsconfig.json         # TypeScript config (if using TS)
│   ├── nodemon.json          # Nodemon config for development
│   ├── Dockerfile            # Backend Dockerfile
│   ├── docker-compose.yml    # Docker config for services
│   ├── README.md             # Backend documentation
│
│── frontend/                 # React.js frontend
│   ├── public/               # Static assets
│   ├── src/                  # Source files
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components (React Router)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── context/          # React Context API (state management)
│   │   ├── services/         # API service calls
│   │   ├── utils/            # Utility/helper functions
│   │   ├── styles/           # Global styles (CSS/SASS)
│   │   ├── App.js            # Main app component
│   │   ├── index.js          # React entry point
│   ├── tests/                # Frontend test cases (Jest + React Testing Library)
│   ├── .env                  # Environment variables (frontend)
│   ├── package.json          # Frontend dependencies & scripts
│   ├── tsconfig.json         # TypeScript config (if using TS)
│   ├── vite.config.js        # Vite config (or webpack.config.js)
│   ├── Dockerfile            # Frontend Dockerfile
│   ├── README.md             # Frontend documentation
│
│── scripts/                  # Deployment, setup, automation scripts
│   ├── deploy.sh             # Deployment script (CI/CD)
│   ├── setup-dev.sh          # Local setup script
│   ├── backup-db.sh          # Database backup script
│
│── docs/                     # Documentation
│   ├── API.md                # API Documentation
│   ├── ARCHITECTURE.md       # High-level system architecture
│   ├── README.md             # Main project documentation
│
│── .github/                   # GitHub Actions (CI/CD)
│   ├── workflows/            # GitHub workflows (build/test/deploy)
│   │   ├── ci.yml            # CI/CD pipeline
│
│── .gitignore                # Ignore files for Git
│── .editorconfig             # Consistent coding styles
│── .prettierrc               # Prettier config (formatting)
│── .eslintrc.js              # ESLint config (linting)
│── docker-compose.yml        # Docker compose for full-stack setup
│── README.md                 # Main project README
