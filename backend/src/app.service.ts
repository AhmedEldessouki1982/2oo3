import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getRoot() {
    return {
      name: '2oo3 API',
      status: 'ready',
      version: '0.1.0',
    }
  }
}
