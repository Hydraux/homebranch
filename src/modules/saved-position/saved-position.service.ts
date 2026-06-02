import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedPositionEntity } from 'src/modules/saved-position/saved-position.entity';

@Injectable()
export class SavedPositionService {
  constructor(
    @InjectRepository(SavedPositionEntity)
    private readonly savedPositionsRepository: Repository<SavedPositionEntity>,
  ) {}

  findAllByUser(userId: string): Promise<SavedPositionEntity[]> {
    return this.savedPositionsRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async findByBookAndUser(bookId: string, userId: string): Promise<SavedPositionEntity> {
    const savedPosition = await this.savedPositionsRepository.findOne({
      where: { bookId, userId },
    });

    if (!savedPosition) {
      throw new NotFoundException('Saved position not found');
    }

    return savedPosition;
  }

  async save(params: {
    bookId: string;
    userId: string;
    position: string;
    deviceName: string;
    percentage?: number | null;
  }): Promise<SavedPositionEntity> {
    await this.savedPositionsRepository.save({
      bookId: params.bookId,
      userId: params.userId,
      position: params.position,
      deviceName: params.deviceName,
      percentage: params.percentage ?? null,
    });

    return this.findByBookAndUser(params.bookId, params.userId);
  }

  async delete(bookId: string, userId: string): Promise<void> {
    const result = await this.savedPositionsRepository.delete({ bookId, userId });
    if (result.affected === 0) {
      throw new NotFoundException('Saved position not found');
    }
  }
}
