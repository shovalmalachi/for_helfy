#!/bin/bash
set -e

PROJECT_NAME="my-project"
NETWORK="${PROJECT_NAME}_default"
CDC_CONTAINER="${PROJECT_NAME}-cdc-consumer-1"

docker compose up -d

sleep 30
echo
echo "Waiting for API to become healthy..."
for i in {1..10}; do
  if curl -s http://localhost:3001/health | grep -q ok; then
    echo "API is healthy"
    break
  fi
  echo "API not ready yet... retrying"
  sleep 3
done

sleep 20

echo
echo "Checking CDC consumer status..."
if ! docker ps --format '{{.Names}}' | grep -q "$CDC_CONTAINER"; then
  echo "ERROR: CDC consumer is not running"
  exit 1
fi
echo "CDC consumer is running."

echo "Waiting for Kafka metadata..."
until docker exec my-project-kafka-1 \
  kafka-topics --bootstrap-server kafka:29092 --list >/dev/null 2>&1
do
  sleep 3
done

echo "Kafka is ready."
sleep 5

echo
echo "Triggering CDC with database UPDATE..."
docker run --rm \
  --network "$NETWORK" \
  mysql:8 \
  mysql -h tidb -P 4000 -u root appdb \
  -e "UPDATE users SET password = UUID() WHERE email = 'test@test.com';"

echo "Database UPDATE executed."

echo
echo "Waiting for CDC event..."
sleep 5

echo
echo "CDC logs:"
echo 
docker logs --tail 30 -f "$CDC_CONTAINER" 