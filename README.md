# QR-scanner-backend-express

Express.js backend server for the QR Scanner application. Handles receipt processing, user authentication, and data management.

## Features

- JWT-based authentication system with token refresh
- Modular service architecture
- Receipt QR code processing and data extraction
- MongoDB integration with Mongoose
- Geocoding integration for store locations
- Comprehensive API routes for receipt and user management

## Prerequisites

- Node.js (v21.7.1 as specified in .nvmrc)
- MongoDB
- Yarn (or npm)

## Project Setup

1. Clone the repository
```bash
git clone https://github.com/vuk-arandjelovic/QR-scanner-backend-express.git
cd QR-scanner-backend-express
```

2. Install dependencies
```bash
yarn
# or using npm
npm i
```

3. Create a `.env` file in the root directory:
```env
DEVELOPMENT=[true_or_false]
JWT_SECRET=[your_jwt_secret]
JWT_EXPIRATION_TIME=[token_expiration_time]
DB_CONN_STRING=[your_mongodb_connection_string]
GEOCODING_API_KEY=[your_geoapify_api_key]
PORT=[your_port_number]
```

1. Start the server
```bash
# Using nodemon (if installed)
yarn watch
# or
npm run watch

# Without nodemon
yarn start
# or
npm run start
```

## API Structure

```
/api/
├── auth/           # Authentication routes
├── bills/          # Receipt management
├── guarantees/     # Warranty management
├── items/          # Product management
├── scrape/         # QR code processing
├── stores/         # Store management
└── user/           # User management
```

## Technical Implementation

- **Authentication**: JWT-based with refresh token mechanism
- **Database**: MongoDB with Mongoose ODM
- **Middleware**: Custom auth middleware and request logging
- **Error Handling**: Centralized response handler
- **Data Processing**: Custom scraping and parsing utilities

## Project Structure

```
QR-scanner-backend-express/
├── config/         # Database and passport configuration
├── middleware/     # Custom middleware functions
├── models/         # Mongoose models
├── routes/         # API routes
├── services/       # Business logic
└── utils/          # Utility functions
```

## Contributing

Feel free to submit issues and enhancement requests.

## License

MIT License

Copyright (c) 2024 Vuk Arandjelovic