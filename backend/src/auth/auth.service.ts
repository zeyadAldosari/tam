import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify as argonVerify, hash as argonHash } from 'argon2';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma.service';
import { userSignUpDto, userSignInDto } from './dto';
import { JwtPayload } from './types/jwtPayload';
import { User } from 'src/generated/prisma/client';
import { log } from 'console';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private prisma: PrismaService,
  ) {}

  async signIn(signInDto: userSignInDto): Promise<any> {
    console.log('JWT SECRET RUNTIME VALUE =', process.env.JWT_SECRET);
    signInDto.username = signInDto.username?.toLowerCase();
    let user: User;

    if (signInDto.username) {
      user = await this.userService.findByUsername(signInDto.username);
    } else {
      throw new UnauthorizedException('You must provide username');
    }

    if (!user || !(await argonVerify(user.password, signInDto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload: JwtPayload = { sub: user.id };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async signup(signUpDto: userSignUpDto) {
    signUpDto.username = signUpDto.username?.toLowerCase();

    if (!signUpDto.username) {
      throw new UnauthorizedException('You must provide username');
    }

    const existingUsernameUser = await this.prisma.user.findUnique({
      where: { username: signUpDto.username },
    });

    if (existingUsernameUser) {
      throw new HttpException(
        'This username is already in use',
        HttpStatus.CONFLICT,
      );
    }

    const hash = await argonHash(signUpDto.password);

    const user = await this.prisma.user.create({
      data: {
        password: hash,
        username: signUpDto.username,
      },
    });

    const signInDto = new userSignInDto();
    signInDto.password = signUpDto.password;
    signInDto.username = signUpDto.username;
    return { ...(await this.signIn(signInDto)), ...user };
  }
}
