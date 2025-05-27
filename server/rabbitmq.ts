
import amqp from 'amqplib';

let connection: amqp.Connection;
let channel: amqp.Channel;

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

export async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    
    // Create queues
    await channel.assertQueue('task_queue', { durable: true });
    await channel.assertQueue('notification_queue', { durable: true });
    
    console.log('Connected to RabbitMQ');
    return { connection, channel };
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

export async function publishTask(queue: string, task: any) {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  
  const message = JSON.stringify(task);
  channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
  console.log('Task published to queue:', queue);
}

export async function consumeTasks(queue: string, processor: (task: any) => Promise<void>) {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  
  await channel.consume(queue, async (msg) => {
    if (msg) {
      try {
        const task = JSON.parse(msg.content.toString());
        await processor(task);
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing task:', error);
        channel.nack(msg, false, false);
      }
    }
  });
}

export { channel, connection };
