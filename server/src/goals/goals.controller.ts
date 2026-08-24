import { Body, Controller, Get, Post } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { UpdateGoalsDto } from './dto/goals.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  get(@CurrentUser('userId') userId: string) {
    return this.goals.get(userId);
  }

  /** The app's sync queue always POSTs, so this doubles as the update route. */
  @Post()
  update(@CurrentUser('userId') userId: string, @Body() dto: UpdateGoalsDto) {
    return this.goals.update(userId, dto);
  }
}
