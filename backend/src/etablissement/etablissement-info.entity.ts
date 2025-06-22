import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('etablissement_info')
export class EtablissementInfo {
  @PrimaryColumn({ type: 'int', default: 1 }) // ID fixe pour l'unique enregistrement
  id: number;

  @Column({ type: 'varchar', length: 255 })
  schoolName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  directorName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string;

  

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Assure que l'ID est toujours 1 lors de la création
  constructor() {
    this.id = 1;
  }
}
