import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetCurrentUserId } from 'src/auth/decorators/get-current-user-id.decorator';
import { AuthGuard } from 'src/auth/auth.guard';
import { Priority, Status as DBStatus } from 'src/generated/prisma/client';

@Controller('task')
@UseGuards(AuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@GetCurrentUserId() id: string, @Body() createTaskDto: CreateTaskDto) {
    return this.taskService.createTask(id, createTaskDto);
  }

  @Get()
  findAll(
    @GetCurrentUserId() id: string,
    @Query('q') q?: string,
    @Query('status') status?: DBStatus,
    @Query('priority') priority?: Priority,
  ) {
    return this.taskService.findUserTasks(
      id,
      q,
      status,
      priority,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskService.findById(id);
  }

  @Patch(':id')
  update(
    @GetCurrentUserId() userId: string,
    @Param('id') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.taskService.updateTask(userId, taskId, updateTaskDto);
  }

  @Delete(':id')
  remove(@GetCurrentUserId() userId: string, @Param('id') taskId: string) {
    return this.taskService.deleteTask(userId, taskId);
  }
}
