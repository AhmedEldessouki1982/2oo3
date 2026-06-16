import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import { CreateRoutineDto } from './dto/create-routine.dto'
import { UpdateRoutineDto } from './dto/update-routine.dto'

@Injectable()
export class RoutinesService {
  private readonly logger = new Logger(RoutinesService.name)

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRoutineDto) {
    const routine = await this.prisma.routine.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        schedule: dto.schedule,
      },
    })
    return this.toJson(routine)
  }

  async findAll(userId: string) {
    const routines = await this.prisma.routine.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
    return routines.map((r) => this.toJson(r))
  }

  async findOne(userId: string, id: string) {
    const routine = await this.prisma.routine.findFirst({
      where: { id, userId },
    })
    if (!routine) throw new NotFoundException('Routine not found')
    return this.toJson(routine)
  }

  async update(userId: string, id: string, dto: UpdateRoutineDto) {
    const existing = await this.prisma.routine.findFirst({
      where: { id, userId },
    })
    if (!existing) throw new NotFoundException('Routine not found')
    const routine = await this.prisma.routine.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.schedule !== undefined && { schedule: dto.schedule }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    })
    return this.toJson(routine)
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.routine.findFirst({
      where: { id, userId },
    })
    if (!existing) throw new NotFoundException('Routine not found')
    await this.prisma.routine.delete({ where: { id } })
  }

  async findDueRoutines() {
    const routines = await this.prisma.routine.findMany({
      where: { active: true },
    })
    const now = new Date()
    return routines.filter((r) => {
      if (!r.lastRunAt) return true
      const diffMs = now.getTime() - r.lastRunAt.getTime()
      if (r.schedule === 'HOURLY') return diffMs >= 3_600_000
      if (r.schedule === 'DAILY') return diffMs >= 86_400_000
      return false
    })
  }

  async recordRun(id: string, response: string) {
    await this.prisma.routine.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        lastResponse: response,
      },
    })
  }

  private toJson(routine: {
    id: string
    userId: string
    name: string
    description: string
    schedule: string
    active: boolean
    lastRunAt: Date | null
    lastResponse: string | null
    createdAt: Date
    updatedAt: Date
  }) {
    return {
      id: routine.id,
      name: routine.name,
      description: routine.description,
      schedule: routine.schedule,
      active: routine.active,
      lastRunAt: routine.lastRunAt?.toISOString() ?? null,
      lastResponse: routine.lastResponse,
      createdAt: routine.createdAt.toISOString(),
      updatedAt: routine.updatedAt.toISOString(),
    }
  }
}
