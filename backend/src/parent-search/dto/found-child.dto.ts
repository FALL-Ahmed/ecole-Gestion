import { ApiProperty } from '@nestjs/swagger';

class StudentInfoDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  nom: string;
  @ApiProperty()
  prenom: string;
}

export class FoundChildDto {
  @ApiProperty({ type: StudentInfoDto })
  studentInfo: StudentInfoDto;
  @ApiProperty()
  schoolInfo: { id: number; nom: string }; // id is the blocId
}

