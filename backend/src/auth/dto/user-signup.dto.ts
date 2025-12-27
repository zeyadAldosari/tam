import { IsNotEmpty, IsString } from 'class-validator';

export class userSignUpDto {
  @IsNotEmpty()
  @IsString()
  username: string;
  
  @IsNotEmpty()
  @IsString()
  password: string;
}
