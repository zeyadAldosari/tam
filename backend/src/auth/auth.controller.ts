import {
  Body,
  Controller,
  Post
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { userSignInDto, userSignUpDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signIn')
  signIn(@Body() signInDto: userSignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Post('signUp')
  signUp(
    @Body() body: userSignUpDto,
  ) {

    return this.authService.signup(body);
  }
}