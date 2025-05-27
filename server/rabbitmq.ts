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

export async function consumeTasks(queueName: string, processor: (task: any) => Promise<void>) {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  await channel.assertQueue(queueName, { durable: true });

  channel.consume(queueName, async (msg) => {
    if (msg) {
      try {
        const task = JSON.parse(msg.content.toString());
        await processor(task);
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing task:', error);
        channel.nack(msg, false, false); // Dead letter the message
      }
    }
  });
}

export async function checkRabbitMQHealth(): Promise<boolean> {
  try {
    if (!connection || !channel) {
      return false;
    }

    // Check if connection is still open
    if (connection.connection && !connection.connection.destroyed) {
      // Try to declare a temporary queue to test channel health
      const testQueue = `health_check_${Date.now()}`;
      await channel.assertQueue(testQueue, { 
        durable: false, 
        autoDelete: true,
        expires: 10000 // Auto-delete after 10 seconds
      });
      await channel.deleteQueue(testQueue);
      return true;
    }
    return false;
  } catch (error) {
    console.error('RabbitMQ health check failed:', error);
    return false;
  }
}

export { channel, connection };