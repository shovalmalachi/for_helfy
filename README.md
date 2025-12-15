# SRE Home Assignment – Full Stack with TiDB CDC

## Overview
This project demonstrates a full-stack application with authentication, database integration, CDC, and monitoring.

**Tech Stack**
- Backend: Node.js (Express)
- Frontend: HTML
- Database: TiDB
- CDC: TiCDC
- Message Queue: Apache Kafka
- Logging: log4js
- Containerization: Docker & Docker Compose

---

## Architecture
- API service exposes REST endpoints
- TiDB stores users, tokens, and data
- TiCDC captures DB changes
- Kafka acts as message broker
- CDC consumer processes change events
- Frontend interacts with API

---

## Services
- `api` – Node.js REST API (port 3001)
- `web` – frontend (port 8082)
- `tidb`, `tikv`, `pd` – TiDB cluster
- `ticdc` – Change Data Capture
- `kafka`, `zookeeper` – messaging
- `cdc-consumer` – Kafka consumer

---

## Running the Project

chmod +x bootstrap.sh && ./bootstrap.sh


