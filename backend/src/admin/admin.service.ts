import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from './admin.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Admin, 'central')
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async findByEmail(email: string): Promise<Admin | null> {
    try {
      return await this.adminRepository.findOne({ where: { email } });
    } catch (error) {
      this.logger.error(`Failed to find admin by email "${email}".`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve admin data.');
    }
  }

  async findByEmailWithPassword(email: string): Promise<Admin | null> {
    try {
      return await this.adminRepository.findOne({
        where: { email },
        select: ['id', 'email', 'mot_de_passe', 'role'],
      });
    } catch (error) {
      this.logger.error(
        `Failed to find admin with password by email "${email}".`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve admin credentials.');
    }
  }

  async findById(id: number): Promise<Admin | null> {
    try {
      return await this.adminRepository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(`Failed to find admin by id "${id}".`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve admin data.');
    }
  }
}
