import tracer from 'dd-trace'

tracer.init({
  service: process.env.DD_SERVICE ?? 'salonin-api',
  env: process.env.DD_ENV ?? 'development',
  hostname: process.env.DD_AGENT_HOST ?? 'localhost',
  logInjection: true,
})

export { tracer }
