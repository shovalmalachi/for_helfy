const { Kafka } = require("kafkajs");
const log4js = require("log4js");

log4js.configure({
  appenders: {
    out: { type: "stdout" }
  },
  categories: {
    default: { appenders: ["out"], level: "info" }
  }
});

const logger = log4js.getLogger();


const kafka = new Kafka({
  clientId: "cdc-consumer",
  brokers: ["kafka:9092"]
});

const consumer = kafka.consumer({ groupId: "cdc-group" });

async function run() {
  await consumer.connect();
  await consumer.subscribe({
    topic: "appdb-cdc",
    fromBeginning: true
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      logger.info({
        source: "tidb-cdc",
        event: message.value.toString()
      });
    }
  });
}

run().catch(console.error);

