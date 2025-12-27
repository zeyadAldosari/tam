import { IsNotEmpty, IsString } from 'class-validator';

export class userSignInDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
