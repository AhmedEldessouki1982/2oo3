import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Response } from 'express'

import { Public } from '../auth/decorators/public.decorator'
import { CompareStreamingService } from './streaming.service'
import { LiveComparisonService } from './comparison.service'

@Controller('compare')
export class CompareStreamingController {
  private readonly logger = new Logger(CompareStreamingController.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly streaming: CompareStreamingService,
    private readonly comparison: LiveComparisonService,
  ) {}

  @Public()
  @Get('stream')
  async stream(
    @Query('prompt') prompt: string,
    @Query('token') token: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    if (!prompt || !prompt.trim()) {
      throw new BadRequestException('Prompt cannot be empty')
    }

    if (!token) {
      this.writeEvent(res, { source: 'system', error: 'Unauthorized' })
      res.end()
      return
    }

    let payload: any
    try {
      payload = this.jwtService.verify(token)
    } catch (error) {
      this.logger.warn(`Invalid JWT token for compare stream: ${error}`)
      this.writeEvent(res, { source: 'system', error: 'Unauthorized' })
      res.end()
      return
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const abortController = new AbortController()
    const onClose = () => abortController.abort()
    req.on('close', onClose)

    try {
      const summaries = await this.streaming.streamAll(
        payload.sub,
        prompt,
        (chunk) => this.writeEvent(res, chunk),
        abortController.signal,
      )

      if (abortController.signal.aborted) {
        return
      }

      const comparison = await this.comparison.analyze(
        summaries,
        payload.sub,
      )

      if (!abortController.signal.aborted) {
        this.writeEvent(res, {
          source: 'comparison',
          token: JSON.stringify(comparison),
          done: true,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Streaming failed'
      this.logger.error(`Streaming failed: ${message}`)
      this.writeEvent(res, { source: 'system', error: message })
    } finally {
      req.off('close', onClose)
      res.end()
    }
  }

  private writeEvent(res: Response, data: unknown) {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }
}
