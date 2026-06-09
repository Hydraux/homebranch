import { SavedPositionEntity } from 'src/modules/saved-position/saved-position.entity';

export const mockSavedPosition: SavedPositionEntity = {
  bookId: 'book-456',
  userId: 'user-1',
  position: 'epubcfi(/6/4!/4/2/1:0)',
  deviceName: 'Chrome Desktop',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  percentage: 0.42,
};
