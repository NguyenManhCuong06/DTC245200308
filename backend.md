# BACKEND FOLDER STRUCTURE

```
backend/
├── src/                          # Root source folder
│   ├── config/                   # Database, env, and other configurations
│   │   ├── db.ts
│   │   └── env.ts
│   ├── controllers/              # Request handlers & Response logic
│   │   ├── user.controller.ts
│   │   └── auth.controller.ts
│   ├── routes/                   # API route definitions and endpoints
│   │   ├── user.routes.ts
│   │   └── auth.routes.ts
│   ├── models/                   # Database models / schemas (Mongoose, Prisma, etc.)
│   │   ├── user.model.ts
│   │   └── auth.model.ts
│   ├── services/                 # Business logic and reusable services
│   │   ├── user.service.ts
│   │   └── email.service.ts
│   ├── middlewares/              # Custom middlewares (auth, error handling, validation, etc.)
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validate.middleware.ts
│   ├── utils/                    # Utility functions and helper methods
│   │   ├── catchAsync.ts
│   │   ├── AppError.ts
│   │   └── generateToken.ts
│   ├── types/                    # Global types and TypeScript definitions
│   │   ├── index.d.ts
│   │   └── express.d.ts
│   ├── validators/               # Request validation (Joi, Zod, Yup, etc.)
│   │   ├── user.validator.ts
│   │   └── auth.validator.ts
│   ├── app.ts                    # Express app & configurations
│   └── server.ts                 # Entry point of the server
├── .env                          # Environment variables
├── .gitignore                    # Git ignore file
├── package.json                  # Project metadata and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Project documentation
```

## Mô tả từng thư mục / file

| Đường dẫn | Mô tả |
|---|---|
| `src/` | Root source folder |
| `config/` | Database, env, and other configurations |
| `controllers/` | Request handlers & Response logic |
| `routes/` | API route definitions and endpoints |
| `models/` | Database models / schemas (Mongoose, Prisma, etc.) |
| `services/` | Business logic and reusable services |
| `middlewares/` | Custom middlewares (auth, error handling, validation, etc.) |
| `utils/` | Utility functions and helper methods |
| `types/` | Global types and TypeScript definitions |
| `validators/` | Request validation (Joi, Zod, Yup, etc.) |
| `app.ts` | Express app & configurations |
| `server.ts` | Entry point of the server |
| `.env` | Environment variables |
| `.gitignore` | Git ignore file |
| `package.json` | Project metadata and scripts |
| `tsconfig.json` | TypeScript configuration |
| `README.md` | Project documentation |

## Notes

- Keep controllers thin, move logic to services.
- Use middlewares for auth, error handling, validation.
- Keep config, utils, and types separate for scalability.
- This structure is scalable for small to large applications.

## Tech Stack Example

- Node.js
- Express.js
- TypeScript
- MongoDB (Mongoose)
- JWT, Bcrypt, etc.
