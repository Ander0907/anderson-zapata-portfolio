import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

@Injectable()
class Dependency {}

@Injectable()
class Consumer {
  constructor(readonly dependency: Dependency) {}
}

describe('Constructor injection under Vitest (G7, ADR-010)', () => {
  it('injects a provider into a consumer by constructor type alone', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [Dependency, Consumer],
    }).compile();

    const consumer = moduleRef.get(Consumer);

    expect(consumer.dependency).toBeInstanceOf(Dependency);
  });
});
