import { Injectable } from '@nestjs/common'

@Injectable()
export class HealthService {
  check() {
    return {
      checks: {
        api: 'ok',
        database: 'not-configured-until-milestone-2',
      },
      status: 'ok',
    }
  }
}
