import { Controller, Post, Get, Body, Param, UseGuards, Request, Headers } from '@nestjs/common';
import { WebService, CampaignByDomainDto, LoginDto, SubmitPredictionsDto } from './web.service';
import { EmployeeAuthGuard } from './employee-auth.guard';

@Controller('web')
export class WebController {
  constructor(private service: WebService) {}

  @Post('campaign-by-domain')
  campaignByDomain(@Body() dto: CampaignByDomainDto) {
    return this.service.campaignByDomain(dto.domain, dto.slug);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @Get('instructions')
  getInstructions() {
    return this.service.getInstructions();
  }

  @UseGuards(EmployeeAuthGuard)
  @Get('phase')
  getPhase(@Request() req) {
    return this.service.getPhase(req.employee.id);
  }

  @UseGuards(EmployeeAuthGuard)
  @Post('predict')
  submitPredictions(@Request() req, @Body() dto: SubmitPredictionsDto) {
    return this.service.submitPredictions(req.employee.id, dto);
  }

  @UseGuards(EmployeeAuthGuard)
  @Get('my-predictions')
  myPredictions(@Request() req) {
    return this.service.myPredictions(req.employee.id);
  }

  @UseGuards(EmployeeAuthGuard)
  @Get('ranking')
  getRanking(@Request() req) {
    return this.service.getRanking(req.employee.id);
  }

  @UseGuards(EmployeeAuthGuard)
  @Post('log')
  writeLog(@Request() req, @Body() body: { action: string; metadata?: any }) {
    return this.service.writeLog(req.employee.id, body);
  }
}
