import { Test, TestingModule } from '@nestjs/testing'

import { AppController } from './app.controller'
import { AppService } from './app.service'

describe('AppController', () => {
  let controller: AppController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile()

    controller = app.get<AppController>(AppController)
  })

  it('describes the scaffolded API surface', () => {
    expect(controller.getRoot()).toEqual({
      name: '2oo3 API',
      status: 'ready',
      version: '0.1.0',
    })
  })
})
