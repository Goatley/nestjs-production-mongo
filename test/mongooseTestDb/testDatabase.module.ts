import { Module } from '@nestjs/common';
import { testDatabaseProviders } from './testDatabase.providers';

@Module({
	providers: [...testDatabaseProviders],
	exports: [...testDatabaseProviders],
})
export class TestDatabaseModule {}
