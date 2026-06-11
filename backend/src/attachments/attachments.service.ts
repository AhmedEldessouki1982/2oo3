import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import * as fs from 'node:fs'
import * as path from 'node:path'

import { PrismaService } from '../prisma/prisma.service'

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? path.resolve(__dirname, '../../uploads'))

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name)

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }
  }

  async upload(
    userId: string,
    conversationId: string,
    file: Express.Multer.File,
  ) {
    const ext = path.extname(file.originalname) || '.bin'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    const storagePath = path.join(UPLOAD_DIR, filename)

    fs.writeFileSync(storagePath, file.buffer)

    const attachment = await this.prisma.attachment.create({
      data: {
        userId,
        conversationId,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageUri: storagePath,
        extractionStatus: 'PENDING',
      },
    })

    this.extractAndUpdate(attachment.id, file, storagePath)

    this.logger.debug(`Attachment saved: ${attachment.id} (${file.originalname})`)

    return this.findAttachment(attachment.id)
  }

  async findByConversation(conversationId: string) {
    return this.prisma.attachment.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        extractionStatus: true,
        createdAt: true,
      },
    })
  }

  async findAttachment(id: string) {
    return this.prisma.attachment.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        extractionStatus: true,
        createdAt: true,
      },
    })
  }

  async deleteAttachment(userId: string, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, userId },
    })
    if (!attachment) {
      throw new NotFoundException('Attachment not found')
    }

    if (attachment.storageUri && fs.existsSync(attachment.storageUri)) {
      fs.unlinkSync(attachment.storageUri)
    }

    await this.prisma.attachment.delete({ where: { id } })

    this.logger.debug(`Attachment deleted: ${id}`)
  }

  private async extractAndUpdate(
    attachmentId: string,
    file: Express.Multer.File,
    storagePath: string,
  ) {
    try {
      await this.prisma.attachment.update({
        where: { id: attachmentId },
        data: { extractionStatus: 'PROCESSING' },
      })

      const extractedText = await this.extractText(file, storagePath)

      const status = extractedText ? 'COMPLETED' : 'FAILED'
      const distilledContext = extractedText
        ? `Attachment "${file.originalname}" contains:\n${extractedText.slice(0, 3000)}`
        : null

      await this.prisma.attachment.update({
        where: { id: attachmentId },
        data: {
          extractedText: extractedText?.slice(0, 5000) ?? null,
          distilledContext,
          extractionStatus: status,
        },
      })

      this.logger.debug(`Extraction ${status} for attachment ${attachmentId}`)
    } catch (err) {
      this.logger.error(`Extraction failed for attachment ${attachmentId}: ${err}`)
      await this.prisma.attachment.update({
        where: { id: attachmentId },
        data: { extractionStatus: 'FAILED' },
      })
    }
  }

  private async extractText(
    file: Express.Multer.File,
    storagePath: string,
  ): Promise<string | null> {
    const mime = file.mimetype

    try {
      if (mime === 'application/pdf') {
        return await this.extractPdf(storagePath)
      }

      if (
        mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        return await this.extractDocx(storagePath)
      }

      if (
        mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mime === 'application/vnd.ms-excel'
      ) {
        return await this.extractXlsx(storagePath)
      }

      if (mime === 'text/csv' || mime.startsWith('text/')) {
        return file.buffer.toString('utf-8').slice(0, 5000)
      }

      if (mime === 'application/json') {
        return file.buffer.toString('utf-8').slice(0, 5000)
      }

      if (mime.startsWith('image/')) {
        return await this.extractImage(storagePath)
      }

      return null
    } catch {
      return null
    }
  }

  private async extractPdf(filePath: string): Promise<string | null> {
    const { PDFParse } = await import('pdf-parse')
    const dataBuffer = fs.readFileSync(filePath)
    const pdf = new PDFParse({ data: dataBuffer })
    const result = await pdf.getText()
    pdf.destroy()
    return result.text.slice(0, 5000)
  }

  private async extractDocx(filePath: string): Promise<string | null> {
    const mammoth = await import('mammoth')
    const dataBuffer = fs.readFileSync(filePath)
    const result = await mammoth.extractRawText({ buffer: dataBuffer })
    return result.value.slice(0, 5000)
  }

  private async extractXlsx(filePath: string): Promise<string | null> {
    const XLSX = await import('xlsx')
    const workbook = XLSX.readFile(filePath)
    const lines: string[] = []
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(sheet)
      lines.push(`[Sheet: ${sheetName}]`, csv)
    }
    return lines.join('\n').slice(0, 5000)
  }

  private async extractImage(filePath: string): Promise<string | null> {
    try {
      const Tesseract = await import('tesseract.js')
      const { data } = await Tesseract.recognize(filePath, 'eng')
      return data.text.slice(0, 5000)
    } catch {
      this.logger.warn(`OCR failed for ${filePath}, returning null`)
      return null
    }
  }

  async linkToMessage(attachmentIds: string[], messageId: string) {
    if (attachmentIds.length === 0) return

    await this.prisma.attachment.updateMany({
      where: { id: { in: attachmentIds }, messageId: null },
      data: { messageId },
    })

    this.logger.debug(`Linked ${attachmentIds.length} attachments to message ${messageId}`)
  }

  async getAttachmentContext(conversationId: string): Promise<string> {
    const attachments = await this.prisma.attachment.findMany({
      where: { conversationId, extractionStatus: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    if (attachments.length === 0) return ''

    return attachments
      .filter((a) => a.distilledContext)
      .map((a) => a.distilledContext)
      .join('\n\n---\n\n')
  }
}
