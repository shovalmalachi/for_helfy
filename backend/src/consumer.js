const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "cdc-consumer",
  brokers: ["kafka:29092"],
});

const consumer = kafka.consumer({ groupId: "cdc-group" });

function parseTiCDCMessage(buffer) {
  if (!buffer || buffer.length <= 8) return { parsed: null, jsonStr: null };

  
  const jsonStr = buffer.slice(8).toString();

  try {
    const parsed = JSON.parse(jsonStr);
    return { parsed, jsonStr };
  } catch {
    return { parsed: null, jsonStr };
  }
}

function detectOperation(parsed) {
  if (!parsed) return "unknown";
  const s = JSON.stringify(parsed);

  if (s.includes('"INSERT"') || s.includes('"c":')) return "insert";
  if (s.includes('"UPDATE"') || s.includes('"u":')) return "update";
  if (s.includes('"DELETE"') || s.includes('"d":')) return "delete";
  return "unknown";
}

async function run() {
  await consumer.connect();
  await consumer.subscribe({
    topic: "appdb-cdc",
    fromBeginning: true,
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return;

      const { parsed, jsonStr } = parseTiCDCMessage(message.value);

      const base = {
        timestamp: new Date().toISOString(),
        source: "cdc-app",
        topic,
        partition,
      };

    
      if (!parsed) {
        console.log(
          JSON.stringify({
            ...base,
            operation: "unknown",
            raw: jsonStr ?? message.value.toString("latin1"),
          })
        );
        return;
      }

      const operation = detectOperation(parsed);
      const schema = parsed.schema || parsed.database || "unknown";
      const table = parsed.table || "unknown";

      console.log(
        JSON.stringify({
          ...base,
          schema,
          table,
          operation,  
          payload: parsed,
        })
      );
    },
  });
}

run().catch((err) => {
  console.error("CDC consumer failed", err);
  process.exit(1);
});