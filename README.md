# tinyLink

tinyLink is a full-stack URL shortener. Create short links, optionally choose a custom alias or expiration time, and inspect click statistics and analytics from the web interface.

## Features

- Shorten HTTP and HTTPS URLs with generated six-character Base62 codes.
- Choose a custom alias for a short link.
- Set an optional expiration date and time.
- Redirect short links to their original destination.
- Track click counts and recent click details, including referrer, user agent, and client IP.
- View click breakdowns by referrer, hour, and day.
- Delete links and invalidate their cached destination.
- Apply per-client-IP creation rate limits (2 requests per minute and 10 per hour by default).
- Browse links created in the current browser, copy short URLs, and view their live click counts.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Java 25, Spring Boot, Spring Web MVC, Spring Validation |
| Cache and rate-limit support | Redis |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Frontend data and forms | TanStack Query, Axios, React Hook Form, Zod |
| Local Redis runtime | Docker |

The backend listens on port **8080**, Redis on **6379**, and the Vite development server on **5173**. Link records and click analytics are currently kept in backend application memory; Redis is used for URL caching and rate-limit data. Restarting the backend therefore clears its in-memory link records and analytics.

## Local Setup Instructions

### Prerequisites

- Docker
- Java 25
- Node.js and npm

### 1. Start Redis

Run Redis in Docker and expose its default port:

```bash
docker run --name tinylink-redis -p 6379:6379 -d redis
```

If the container already exists, start it with `docker start tinylink-redis`.

### 2. Start the backend

From the repository root, change to the backend directory and start Spring Boot:

**Windows PowerShell:**

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

**macOS/Linux:**

```bash
cd backend
./mvnw spring-boot:run
```

The API is available at `http://localhost:8080`. The default short URL base is `http://localhost:8080`.

### 3. Start the frontend

In a second terminal, install dependencies and run Vite:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in a browser.

## API Endpoints

All API routes are served by the backend at `http://localhost:8080`. JSON timestamps use ISO-8601 date-time format.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/shorten` | Create a short link. Request JSON: `{"originalUrl":"https://example.com","customAlias":"optional","expiresAt":"2026-12-31T23:59:59"}`. `originalUrl` must start with `http://` or `https://`; alias and expiration are optional. Returns the short URL, code, original URL, and timestamps. |
| `GET` | `/api/{shortCode}` | Redirect to the original URL with HTTP 302 and record a click. Returns 404 for an unknown, expired, or inactive code. |
| `GET` | `/api/stats/{shortCode}` | Return link details, click count, creation/expiration times, active status, and creator IP. |
| `GET` | `/api/analytics/{shortCode}` | Return total clicks, up to 10 recent click events, and click counts grouped by referrer, hour, and day. |
| `DELETE` | `/api/{shortCode}` | Deactivate a link and remove its cached URL. Returns 200 on success. |

### Responses and errors

- Creating a link returns `200 OK` with fields such as `shortUrl`, `shortCode`, `originalUrl`, `createdAt`, and `expiresAt`.
- Invalid URL input or a duplicate custom alias returns `400 Bad Request`.
- A creation request over the configured rate limit returns `429 Too Many Requests`.
- Stats, analytics, redirect, or delete requests for unavailable codes return `404 Not Found`.
- Stats and analytics use the response fields returned by their corresponding endpoint; analytics includes `recentClicks`, `clickByReferrer`, `clickByHour`, and `clickByDay`.

OpenAPI/Swagger UI is included by the backend dependency and is typically available at `http://localhost:8080/swagger-ui.html`.

