import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/health')
  healthCheck() {
    // TODO: Add other health checks (i.e. database connection). Currently just used as an endpoint to test reachability.
    return true;
  }
}
