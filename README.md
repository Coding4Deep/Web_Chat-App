
# 🚀 Full-Stack Express Application with Real-time Chat

A modern, production-ready full-stack application built with Express.js, React, TypeScript, and WebSockets. Features real-time chat, user authentication, comprehensive monitoring, and a complete DevOps stack.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │───▶│   (Express)     │───▶│  (PostgreSQL)   │
│   Port: 80      │    │   Port: 5000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │     Redis       │              │
         │              │   (Caching)     │              │
         │              │   Port: 6379    │              │
         │              └─────────────────┘              │
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   RabbitMQ      │              │
         │              │ (Message Queue) │              │
         │              │   Port: 5672    │              │
         │              └─────────────────┘              │
         │                                               │
┌─────────────────┐              ┌─────────────────┐    │
│   Prometheus    │              │    Grafana      │    │
│  (Metrics)      │─────────────▶│ (Visualization) │    │
│   Port: 9090    │              │   Port: 3000    │    │
└─────────────────┘              └─────────────────┘    │
```

## ✨ Features

- 🔐 **Authentication**: Secure user registration and login with sessions
- 💬 **Real-time Chat**: WebSocket-powered instant messaging
- 📊 **Monitoring**: Prometheus metrics and Grafana dashboards
- 🚀 **Caching**: Redis for improved performance
- 📨 **Message Queue**: RabbitMQ for background task processing
- 🐳 **Containerized**: Complete Docker setup for all services
- 📱 **Responsive UI**: Modern React interface with Tailwind CSS
- 🔍 **Type Safety**: Full TypeScript implementation
- 🏥 **Health Checks**: Built-in service health monitoring

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** components
- **React Query** for state management
- **Wouter** for routing
- **WebSocket** for real-time features

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** with Drizzle ORM
- **Redis** for caching
- **RabbitMQ** for message queuing
- **Passport.js** for authentication
- **WebSocket** server
- **Prometheus** metrics

### DevOps & Monitoring
- **Docker** & **Docker Compose**
- **Nginx** reverse proxy
- **Prometheus** for metrics collection
- **Grafana** for monitoring dashboards
- **Health checks** for all services

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)
- Git

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd repl-express-app
```

### 2. Environment Setup
Create environment files:

```bash
# Copy example environment file
cp .env.example .env

# Edit environment variables
nano .env
```

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/repl_express

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin@localhost:5672

# Session
SESSION_SECRET=your-super-secret-session-key

# Environment
NODE_ENV=production
```

### 3. Run with Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 4. Database Migration
```bash
# Run database migrations
docker-compose exec backend npm run db:push
```

## 🌐 Access the Application

Once all services are running:

- **Application**: http://localhost
- **Backend API**: http://localhost:5000
- **Grafana Dashboard**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **RabbitMQ Management**: http://localhost:15672 (admin/admin)

## 📊 Monitoring & Analytics

### Grafana Dashboards
Access Grafana at http://localhost:3000 with credentials `admin/admin`. Pre-configured dashboards include:

- **Application Metrics**: HTTP requests, response times, error rates
- **WebSocket Metrics**: Active connections, message throughput
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Database Metrics**: Query performance, connection pool status
- **Cache Metrics**: Redis hit/miss ratios, memory usage

### Prometheus Metrics
The application exposes custom metrics at `/metrics`:

- `http_requests_total`: Total HTTP requests by method, route, and status
- `http_request_duration_seconds`: Request duration histogram
- `websocket_connections_active`: Active WebSocket connections
- `chat_messages_total`: Total chat messages sent

## 🛠️ Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Start PostgreSQL, Redis, and RabbitMQ
docker-compose up -d postgres redis rabbitmq

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### Building for Production
```bash
# Build both frontend and backend
npm run build

# Start production server
npm run start
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🐳 Docker Commands

### Individual Services
```bash
# Build specific service
docker-compose build backend

# Restart a service
docker-compose restart backend

# View service logs
docker-compose logs -f backend

# Execute commands in container
docker-compose exec backend npm run db:push
```

### Scaling Services
```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Scale with load balancer
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

## 📁 Project Structure

```
repl-express-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and configurations
│   └── index.html
├── server/                 # Express backend
│   ├── auth.ts            # Authentication logic
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   ├── redis.ts           # Redis client
│   ├── rabbitmq.ts        # RabbitMQ client
│   ├── metrics.ts         # Prometheus metrics
│   └── index.ts           # Server entry point
├── shared/                 # Shared TypeScript types
│   └── schema.ts          # Database schema
├── grafana/               # Grafana configurations
│   ├── provisioning/      # Auto-provisioning configs
│   └── dashboards/        # Dashboard definitions
├── docker-compose.yml     # Multi-service orchestration
├── Dockerfile.backend     # Backend container
├── Dockerfile.frontend    # Frontend container
├── prometheus.yml         # Prometheus configuration
└── nginx.conf            # Nginx configuration
```

## 🔧 Configuration

### Database Configuration
The application uses PostgreSQL with Drizzle ORM. Schema is defined in `shared/schema.ts`.

### Redis Configuration
Redis is used for:
- Session storage
- Chat message caching (30-second TTL)
- Rate limiting data

### RabbitMQ Configuration
Message queues:
- `notification_queue`: User notifications
- `task_queue`: Background tasks

### Monitoring Configuration
Prometheus scrapes metrics every 15 seconds. Custom metrics include:
- HTTP request metrics
- WebSocket connection metrics
- Business logic metrics (chat messages, user actions)

## 🚨 Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check Docker resources
docker system df
docker system prune

# Check logs
docker-compose logs [service-name]
```

**Database connection issues:**
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -d repl_express
```

**Redis connection issues:**
```bash
# Test Redis connection
docker-compose exec redis redis-cli ping

# Check Redis logs
docker-compose logs redis
```

**Frontend not loading:**
```bash
# Rebuild frontend
docker-compose build frontend

# Check Nginx logs
docker-compose logs frontend
```

### Performance Tuning

**Database:**
- Adjust PostgreSQL configuration in `docker-compose.yml`
- Monitor query performance in Grafana
- Consider connection pooling for high traffic

**Redis:**
- Adjust cache TTL values based on usage patterns
- Monitor memory usage and eviction policies

**Application:**
- Use Redis for session storage in production
- Implement rate limiting for API endpoints
- Consider horizontal scaling with load balancer

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Monitoring with [Prometheus](https://prometheus.io/) & [Grafana](https://grafana.com/)
- Containerized with [Docker](https://www.docker.com/)

---

For deployment on Replit, simply push your code and use the built-in deployment features. The application is configured to work seamlessly on Replit's infrastructure.
