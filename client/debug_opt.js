import { createServer } from 'vite';

const server = await createServer({
  server: { port: 5178 },
  logLevel: 'info'
});
await server.listen();
console.log('Optimizing deps directly via server.optimizer...');
const opt = server.depsOptimizer;
console.log('Is opt null?', opt === null);
if (opt) {
  console.log('Scanning...');
  await opt.scanProcessing;
  console.log('Scan done! Metadata:', opt.metadata);
}
await server.close();
