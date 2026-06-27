import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule', () => {
  it('compiles', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    try {
      expect(moduleRef).toBeDefined();
    } finally {
      await moduleRef.close();
    }
  });
});
