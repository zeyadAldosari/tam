import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PrismaService } from 'src/prisma.service';
import {
  Prisma,
  Status as DBStatus,
  Priority,
  Task,
} from 'src/generated/prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    try {
      return await this.prisma.task.findUniqueOrThrow({
        where: {
          id,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw new HttpException(
          'No account with the provided id has been found',
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findUserTasks(
    userId: string,
    q?: string,
    status?: DBStatus,
    priority?: Priority,
  ) {
    try {
      return this.prisma.task.findMany({
        where: {
          userId,
          ...(q && {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }),
          ...(status && { status }),
          ...(priority && { priority }),
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new HttpException(
          'No account with the provided username has been found',
          HttpStatus.NOT_FOUND,
        );
      }
      if (error instanceof PrismaClientKnownRequestError) {
        throw new HttpException('Database error', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createTask(userId: string, dto: CreateTaskDto): Promise<Task> {
    return this.prisma.task.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async updateTask(
    userId: string,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    const exists = await this.prisma.task.findFirst({
      where: { id, userId },
    });

    if (!exists) throw new NotFoundException('Task not found');

    return this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });
  }

  async deleteTask(userId: string, id: string): Promise<{ message: string }> {
    const exists = await this.prisma.task.findFirst({
      where: { id, userId },
    });

    if (!exists) throw new NotFoundException('Task not found');

    await this.prisma.task.delete({ where: { id } });

    return { message: 'Task deleted successfully' };
  }
}
