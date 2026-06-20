import { NotFoundException } from '@nestjs/common';
import { UploadsController } from 'src/modules/uploads/uploads.controller';

describe('UploadsController', () => {
  const storage = {
    getDownloadUrl: jest.fn(),
    getFileStream: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  const response = {
    redirect: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows existing public cover image URLs', async () => {
    configService.get.mockReturnValue('r2');
    storage.getDownloadUrl.mockResolvedValue('https://signed.example/cover.jpg');
    const controller = new UploadsController(storage as never, configService as never);

    await controller.getFile('cover-images,cover.jpg', response as never);

    expect(storage.getDownloadUrl).toHaveBeenCalledWith('cover-images/cover.jpg');
    expect(response.redirect).toHaveBeenCalledWith('https://signed.example/cover.jpg');
  });

  it('rejects unauthenticated private book object access', async () => {
    configService.get.mockReturnValue('r2');
    const controller = new UploadsController(storage as never, configService as never);

    await expect(controller.getFile('books,book.epub', response as never)).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.getDownloadUrl).not.toHaveBeenCalled();
  });
});
