import app from './app';
import { startOutboxPoller } from './automation/workers/outboxWorker';
import { startAutomationWorker } from './automation/workers/automationWorker';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Mini CRM Backend running on http://localhost:${PORT}`);
  console.log(`=================================================`);

  // Start Transactional Outbox Poller
  startOutboxPoller(3000);

  // Start BullMQ Automation Worker
  try {
    startAutomationWorker();
  } catch (err) {
    console.warn('BullMQ worker warning (Redis offline or fallback active):', err);
  }
});
