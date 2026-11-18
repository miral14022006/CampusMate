import { createServer } from 'vite';

const server = await createServer({
  server: { port: 5178 }
});
console.log('Calling server.pluginContainer.buildStart()...');
// trigger optimizeDeps
await server.pluginContainer.buildStart({});
console.log('buildStart finished!');
await server.close();
